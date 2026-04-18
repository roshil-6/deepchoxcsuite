import type { ImpactResult, Severity } from '../types';
import { clampScore } from '../utils/scoring';
import { mergeUniqueStrings } from '../utils/merge';

function scoreToSeverity(score: number): Severity {
    if (score < 30) return 'critical';
    if (score < 50) return 'high';
    if (score < 70) return 'medium';
    return 'low';
}

/**
 * Map dashboard execution checklist index (0–100) into execution-weighted impact.
 */
/**
 * Distinct strategic / financial / execution pillars from venture fields (strategy doc + budget).
 * Use this for company health instead of {@link fromExecutionScore}, which duplicates execution into other axes and fixes financial at 50.
 */
export function fromVenturePillarScores(
    scores: { strategic: number; financial: number; execution: number },
    source = 'venture-pillars'
): ImpactResult {
    const strategic = clampScore(scores.strategic);
    const financial = clampScore(scores.financial);
    const execution = clampScore(scores.execution);
    const severity = scoreToSeverity(Math.min(strategic, financial, execution));

    const recommendations: string[] = [];
    if (strategic < 55) {
        recommendations.push(
            'Add real strategy depth on the CEO desk: intent lines, narrative, a timeline you own, and concrete priorities.'
        );
    }
    if (financial < 55) {
        recommendations.push('Capture runway and burn in Finance (structured metrics or clear notes) for an accurate read.');
    }
    if (execution < 55) {
        recommendations.push('Advance in-progress phases and close priorities to lift execution health.');
    }
    if (!recommendations.length) {
        recommendations.push('Keep cadence: refresh health when strategy or budget materially changes.');
    }

    const roles: string[] = [];
    if (strategic < 55) roles.push('CEO');
    if (financial < 55) roles.push('CFO');
    if (execution < 55) roles.push('PM');

    return {
        source,
        strategic,
        financial,
        operational: clampScore((strategic + execution) / 2),
        market: 50,
        execution,
        severity,
        confidence: 0.72,
        affectedRoles: mergeUniqueStrings(roles.length ? roles : ['PM']),
        recommendations,
        timestamp: new Date().toISOString(),
    };
}

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
