import type { AnalysisResult } from '@/lib/aiAnalysisEngine';
import type { ImpactResult, Severity } from '../types';
import { clampScore } from '../utils/scoring';

function threatPressure(threats: string[]): number {
    return clampScore(100 - threats.length * 6);
}

function combinedSeverity(runwayMonths: number, threatCount: number): Severity {
    if (runwayMonths < 3 || threatCount > 10) return 'critical';
    if (runwayMonths < 6 || threatCount > 6) return 'high';
    if (runwayMonths < 9 || threatCount > 3) return 'medium';
    return 'low';
}

/**
 * Map `AIAnalysisEngine.analyzeProject` output into strategic / market / financial impact.
 */
export function fromAnalysisResult(result: AnalysisResult, source = 'ai-analysis-engine'): ImpactResult {
    const objectives = result.strategy.objectives?.length ?? 0;
    const milestones =
        result.strategy.roadmap?.reduce((n, q) => n + (q.milestones?.length ?? 0), 0) ?? 0;
    const strategic = clampScore(35 + Math.min(40, objectives * 4) + Math.min(25, milestones * 2));

    const threats = result.market.threats ?? [];
    const opportunities = result.market.opportunities ?? [];
    const market = clampScore(threatPressure(threats) * 0.65 + Math.min(100, opportunities.length * 5) * 0.35);

    const runway = result.financial.metrics?.runway ?? 12;
    const financialRaw = clampScore(Math.min(100, runway * 8));
    const financial = clampScore(financialRaw - (result.financial.metrics?.burnRate && result.financial.metrics.burnRate > 40000 ? 12 : 0));

    const scaling = result.financial.scalingAnalysis?.score ?? 5;
    const operational = clampScore(40 + scaling * 6);

    const highPri = result.strategy.actionItems?.filter((a) => a.priority === 'High').length ?? 0;
    const execution = clampScore(45 + highPri * 5 + (result.strategy.actionItems?.length ?? 0) * 2);

    const severity = combinedSeverity(runway, threats.length);

    return {
        source,
        strategic,
        financial,
        operational,
        market,
        execution,
        severity,
        confidence: 0.71,
        affectedRoles: ['CEO', 'CFO', 'CMO', 'PM'],
        recommendations: [
            'Synthesize analysis into CEO narrative and PM roadmap deltas.',
            'Reconcile financial runway with scenario table from CFO desk.',
        ],
        timestamp: new Date().toISOString(),
    };
}
