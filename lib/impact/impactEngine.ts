import type { AggregatedImpact, ImpactResult, ImpactSnapshot, Severity } from './types';
import { average, clampScore } from './utils/scoring';
import { deriveSeverity } from './utils/severity';
import { mergeUniqueStrings } from './utils/merge';

function escalationRequired(severity: Severity, financial: number, strategic: number): boolean {
    return severity === 'critical' || financial < 35 || strategic < 30;
}

/**
 * Merge multiple subsystem impacts into one business intelligence row.
 */
export function aggregateImpact(impacts: ImpactResult[]): AggregatedImpact {
    if (!impacts.length) {
        const now = new Date().toISOString();
        return {
            source: 'aggregate-empty',
            strategic: 50,
            financial: 50,
            operational: 50,
            market: 50,
            execution: 50,
            severity: 'low',
            confidence: 0,
            affectedRoles: [],
            recommendations: [],
            timestamp: now,
            trend: 'stable',
            requiresEscalation: false,
        };
    }

    const strategic = average(impacts.map((i) => i.strategic));
    const financial = average(impacts.map((i) => i.financial));
    const operational = average(impacts.map((i) => i.operational));
    const market = average(impacts.map((i) => i.market));
    const execution = average(impacts.map((i) => i.execution));
    const confidence =
        impacts.reduce((sum, i) => sum + (Number.isFinite(i.confidence) ? i.confidence : 0), 0) / impacts.length;

    const severity = deriveSeverity(impacts);
    const affectedRoles = mergeUniqueStrings(impacts.flatMap((i) => i.affectedRoles));
    const recommendations = mergeUniqueStrings(impacts.flatMap((i) => i.recommendations));

    const source = mergeUniqueStrings(impacts.map((i) => i.source)).join(' + ') || 'aggregated';

    const requiresEscalation = escalationRequired(severity, financial, strategic);

    return {
        source,
        strategic,
        financial,
        operational,
        market,
        execution,
        severity,
        confidence,
        affectedRoles,
        recommendations,
        timestamp: new Date().toISOString(),
        trend: 'stable',
        requiresEscalation,
    };
}

/**
 * Persistence-ready snapshot for Postgres (or any store) — no DB call here.
 */
export function createImpactSnapshot(impact: AggregatedImpact): ImpactSnapshot {
    return {
        ...impact,
        createdAt: new Date().toISOString(),
    };
}

/**
 * Route work to executive desks from aggregate scores and roles.
 */
export function getAffectedDesks(impact: AggregatedImpact): string[] {
    const desks = new Set<string>(impact.affectedRoles);
    if (impact.financial < 40) desks.add('CFO');
    if (impact.strategic < 50) desks.add('CEO');
    if (impact.execution < 50) desks.add('PM');
    if (impact.market > 80) {
        desks.add('CMO');
        desks.add('CEO');
    }
    if (impact.operational < 50) desks.add('CTO');
    return mergeUniqueStrings([...desks]);
}

/**
 * Auto-generated follow-ups from aggregate impact (product / ops playbook strings).
 */
export function generateActionItems(impact: AggregatedImpact): string[] {
    const actions: string[] = [];

    if (impact.severity === 'critical' || impact.financial < 35) {
        actions.push('Immediate budget review with CFO.');
        actions.push('Freeze discretionary spend until plan is updated.');
    }

    if (impact.execution < 50) {
        actions.push('Milestone recovery sprint: reprioritize top 3 deliverables.');
        actions.push('Task audit across kanban and calendar.');
    }

    if (impact.market > 75 || impact.severity === 'high') {
        actions.push('Competitor response review (scout + CMO).');
        actions.push('GTM sync: messaging vs. current pipeline reality.');
    }

    if (impact.strategic < 40) {
        actions.push('CEO strategy session: restate thesis and kill criteria.');
    }

    if (impact.operational < 45) {
        actions.push('CTO reliability review: incidents, SLOs, and build capacity.');
    }

    if (impact.requiresEscalation) {
        actions.push('Escalation huddle: CEO + CFO + affected desk leads.');
    }

    return mergeUniqueStrings([...actions, ...impact.recommendations]);
}
