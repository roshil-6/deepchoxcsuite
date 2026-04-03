import type { ImpactResult, Severity } from '../types';
import { clampScore } from '../utils/scoring';

function scoreToSeverity(score: number): Severity {
    if (score < 30) return 'critical';
    if (score < 50) return 'high';
    if (score < 70) return 'medium';
    return 'low';
}

/**
 * Map dashboard execution checklist index (0–100) into execution-weighted impact.
 */
export function fromExecutionScore(executionScore: number, source = 'dashboard-execution'): ImpactResult {
    const execution = clampScore(executionScore);
    const neutral = 50;
    const strategic = clampScore(execution * 0.85 + 7);
    const severity = scoreToSeverity(execution);

    return {
        source,
        strategic,
        financial: neutral,
        operational: clampScore(execution * 0.9 + 5),
        market: neutral,
        execution,
        severity,
        confidence: 0.68,
        affectedRoles: execution < 50 ? ['PM', 'CEO'] : ['PM'],
        recommendations:
            execution < 50
                ? ['Milestone recovery sprint: tighten phases and priorities.', 'Audit open tasks vs. stated strategy.']
                : ['Keep cadence: review execution score when phases or priorities change.'],
        timestamp: new Date().toISOString(),
    };
}
