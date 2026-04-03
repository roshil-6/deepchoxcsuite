import type { CFOResponse } from '@/lib/orchestrator/types';
import type { AggregatedImpact, ImpactResult, Severity } from '../types';
import { aggregateImpact } from '../impactEngine';
import { mergeUniqueStrings } from '../utils/merge';
import { clampScore } from '../utils/scoring';

function parseRunwayMonthsFromCfo(cfo: CFOResponse): number | undefined {
    for (const row of cfo.scenario_table || []) {
        const v = row.metrics?.runway;
        if (typeof v === 'number' && Number.isFinite(v)) return clampMonths(v);
        if (typeof v === 'string') {
            const m = v.match(/(\d+(?:\.\d+)?)/);
            if (m) return clampMonths(parseFloat(m[1]));
        }
    }
    return undefined;
}

function clampMonths(m: number): number {
    return Math.min(120, Math.max(0, m));
}

function runwayToFinancialHealth(months: number | undefined, burnWarning: boolean, feasible: boolean): {
    financial: number;
    severity: Severity;
    recommendations: string[];
} {
    const recommendations: string[] = [];
    if (months !== undefined && months < 3) {
        recommendations.push('Immediate budget review and cash forecast.');
        recommendations.push('Freeze discretionary spend until runway extends ≥3 months.');
        return { financial: clampScore(15 + months * 5), severity: 'critical', recommendations };
    }
    if (months !== undefined && months < 6) {
        recommendations.push('Tighten opex and revisit hiring plan.');
        recommendations.push('Scenario-plan funding or revenue acceleration.');
        return { financial: clampScore(25 + months * 8), severity: 'high', recommendations };
    }
    if (!feasible) {
        recommendations.push('Re-scope budget to restore feasibility.');
        return { financial: 40, severity: 'high', recommendations };
    }
    if (burnWarning) {
        recommendations.push('Monitor burn rate weekly; align spend to milestones.');
        return { financial: 55, severity: 'medium', recommendations };
    }
    if (months !== undefined) {
        return {
            financial: clampScore(40 + Math.min(60, months * 2)),
            severity: 'low',
            recommendations: ['Maintain runway dashboard in monthly cadence.'],
        };
    }
    return {
        financial: 65,
        severity: 'medium',
        recommendations: ['Confirm runway months from finance source of truth.'],
    };
}

/**
 * Map CFO orchestration JSON into a unified impact row.
 */
export function cfoToImpactResult(cfo: CFOResponse, source = 'cfo-orchestrator'): ImpactResult {
    const months = parseRunwayMonthsFromCfo(cfo);
    const { financial, severity, recommendations } = runwayToFinancialHealth(
        months,
        cfo.burn_rate_warning,
        cfo.budget_feasibility
    );

    const capStress = Math.min(1, cfo.capax_impact / 1_000_000);
    const opexStress = Math.min(1, cfo.opex_impact / 100_000);
    const operational = clampScore(100 - capStress * 35 - opexStress * 25 - (cfo.burn_rate_warning ? 15 : 0));

    const cashDelta = cfo.cash_runway_impact;
    const financialAdj = clampScore(financial + financial * (cashDelta < -1 ? -0.15 : cashDelta < 0 ? -0.05 : 0));

    const extra: string[] = [];
    if (months !== undefined && months < 6) extra.push(`Runway ≈ ${months.toFixed(1)} mo (from scenario table).`);

    return {
        source,
        strategic: 55,
        financial: financialAdj,
        operational,
        market: 50,
        execution: clampScore(60 + (cfo.budget_feasibility ? 15 : -20)),
        severity,
        confidence: 0.74,
        affectedRoles: ['CFO', 'CEO'],
        recommendations: mergeUniqueStrings([...recommendations, ...extra]),
        timestamp: new Date().toISOString(),
    };
}

export function cfoToAggregatedImpact(cfo: CFOResponse): AggregatedImpact {
    return aggregateImpact([cfoToImpactResult(cfo)]);
}
