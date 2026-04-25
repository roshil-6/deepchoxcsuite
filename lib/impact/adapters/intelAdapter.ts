import type { ImpactResult, Severity } from '../types';
import { clampScore } from '../utils/scoring';

export type IntelLegacyLabel = 'Critical' | 'High' | 'Medium' | 'Low';

const CRITICAL_KW = ['funding', 'acquisition', 'lawsuit', 'regulations', 'breach', 'security', 'collapse'];
const HIGH_KW = ['launch', 'partnership', 'growth', 'revenue', 'record', 'new feature'];
const MEDIUM_KW = ['update', 'release', 'hire', 'change'];

const FINANCE_KW = ['funding', 'capital', 'acquisition', 'revenue', 'runway', 'burn', 'ipo', 'raise'];
const SECURITY_KW = ['breach', 'security', 'hack', 'ransomware', 'cve'];

/**
 * Same keyword ladder as legacy `/api/intel` — kept here so the route can delegate without behavior drift.
 */
export function intelLegacyLabelFromTitle(title: string): IntelLegacyLabel {
    const lower = title.toLowerCase();
    if (CRITICAL_KW.some((k) => lower.includes(k))) return 'Critical';
    if (HIGH_KW.some((k) => lower.includes(k))) return 'High';
    if (MEDIUM_KW.some((k) => lower.includes(k))) return 'Medium';
    return 'Low';
}

function legacyLabelToMarketScore(label: IntelLegacyLabel): number {
    switch (label) {
        case 'Critical':
            return 90;
        case 'High':
            return 75;
        case 'Medium':
            return 55;
        case 'Low':
        default:
            return 25;
    }
}

function legacyLabelToSeverity(label: IntelLegacyLabel): Severity {
    switch (label) {
        case 'Critical':
            return 'critical';
        case 'High':
            return 'high';
        case 'Medium':
            return 'medium';
        case 'Low':
        default:
            return 'low';
    }
}

function inferRolesFromTitle(title: string, label: IntelLegacyLabel): string[] {
    const lower = title.toLowerCase();
    const roles = new Set<string>();
    roles.add('CMO');
    if (label === 'Critical' || label === 'High') roles.add('CEO');
    if (FINANCE_KW.some((k) => lower.includes(k))) roles.add('CFO');
    if (SECURITY_KW.some((k) => lower.includes(k))) roles.add('CTO');
    return [...roles].sort();
}

/**
 * Map a news headline into a normalized `ImpactResult` for aggregation.
 */
export function intelTitleToImpactResult(title: string, source = 'intel-feed'): ImpactResult {
    const label = intelLegacyLabelFromTitle(title);
    const market = legacyLabelToMarketScore(label);
    const neutral = 50;
    return {
        source,
        strategic: neutral,
        financial: neutral,
        operational: neutral,
        market,
        execution: neutral,
        severity: legacyLabelToSeverity(label),
        confidence: 0.35, // keyword-match heuristic — not AI-scored
        affectedRoles: inferRolesFromTitle(title, label),
        recommendations:
            label === 'Critical' || label === 'High'
                ? ['Review headline against venture thesis and calendar within 24h.', 'Brief CEO + relevant desk owner.']
                : ['Monitor feed; no mandatory escalation from keyword tier alone.'],
        timestamp: new Date().toISOString(),
    };
}

/** Convert legacy API label (if you already computed it) without re-parsing title. */
export function intelLegacyLabelToImpactResult(title: string, label: IntelLegacyLabel, source = 'intel-feed'): ImpactResult {
    const market = legacyLabelToMarketScore(label);
    const neutral = 50;
    return {
        source,
        strategic: neutral,
        financial: neutral,
        operational: neutral,
        market,
        execution: neutral,
        severity: legacyLabelToSeverity(label),
        confidence: 0.35, // keyword-match heuristic — not AI-scored
        affectedRoles: inferRolesFromTitle(title, label),
        recommendations:
            label === 'Critical' || label === 'High'
                ? ['Review headline against venture thesis and calendar within 24h.', 'Brief CEO + relevant desk owner.']
                : ['Monitor feed; no mandatory escalation from keyword tier alone.'],
        timestamp: new Date().toISOString(),
    };
}

/** Optional: market pulse intensity 0–100 for dashboards. */
export function intelMarketIntensityFromTitle(title: string): number {
    return clampScore(legacyLabelToMarketScore(intelLegacyLabelFromTitle(title)));
}
