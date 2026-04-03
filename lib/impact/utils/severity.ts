import type { ImpactResult, Severity } from '../types';

const ORDER: Record<Severity, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
};

/** Return the highest severity across impact rows (critical > high > medium > low). */
export function deriveSeverity(impacts: ImpactResult[]): Severity {
    if (!impacts.length) return 'low';
    let best: Severity = 'low';
    let bestRank = -1;
    for (const i of impacts) {
        const r = ORDER[i.severity] ?? 0;
        if (r > bestRank) {
            bestRank = r;
            best = i.severity;
        }
    }
    return best;
}
