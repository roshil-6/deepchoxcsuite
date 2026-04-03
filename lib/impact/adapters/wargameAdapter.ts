import type { ImpactResult, Severity } from '../types';
import { clampScore } from '../utils/scoring';

export interface WargameStats {
    resilience: number;
    velocity: number;
    cashRunway: number;
    marketFit: number;
}

function deriveSeverityFromWargame(stats: WargameStats): Severity {
    const minDim = Math.min(stats.resilience, stats.velocity, stats.cashRunway, stats.marketFit);
    if (minDim < 25) return 'critical';
    if (minDim < 45) return 'high';
    if (minDim < 60) return 'medium';
    return 'low';
}

/**
 * Map Wargame Nexus simulation bars into unified impact dimensions.
 * resilience → operational; velocity → execution; cashRunway → financial;
 * marketFit → market + strategic (strategic blends market fit with resilience).
 */
export function wargameStatsToImpactResult(stats: WargameStats, source = 'wargame-nexus'): ImpactResult {
    const operational = clampScore(stats.resilience);
    const execution = clampScore(stats.velocity);
    const financial = clampScore(stats.cashRunway);
    const market = clampScore(stats.marketFit);
    const strategic = clampScore((stats.marketFit + stats.resilience) / 2);

    const severity = deriveSeverityFromWargame(stats);

    return {
        source,
        strategic,
        financial,
        operational,
        market,
        execution,
        severity,
        confidence: 0.58,
        affectedRoles: severity === 'high' || severity === 'critical' ? ['CEO', 'PM', 'CFO'] : ['PM'],
        recommendations:
            severity === 'critical' || severity === 'high'
                ? [
                      'Run cross-functional drill: product, finance, and GTM assumptions.',
                      'Capture top 3 scenario learnings into venture directives.',
                  ]
                : ['Log simulation outcome to journal for next staff sync.'],
        timestamp: new Date().toISOString(),
    };
}
