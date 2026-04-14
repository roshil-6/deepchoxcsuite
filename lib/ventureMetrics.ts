import { parseStrategy } from '@/lib/strategyDoc';
import { safeJsonParse } from '@/lib/utils';

function clampPillar(n: number): number {
    return Math.min(100, Math.max(0, n));
}

/**
 * Strategy clarity and roadmap shape: intent, narrative, and whether phases/priorities exist.
 * Independent of how many milestones are already marked done (that is execution).
 */
export function computeStrategicCoverageScore(strategyRaw: string | undefined): number {
    const strategyDoc = parseStrategy(strategyRaw || '');
    const phases = strategyDoc.phases || [];
    const priorities = strategyDoc.priorities || [];
    const hasIntent = !!(strategyDoc.strategicIntent?.trim() || strategyDoc.vision?.trim());
    const narrativeRich = (strategyDoc.content || '').trim().length > 80;
    const hasPhasePlan = phases.length > 0;
    const hasPriorityPlan = priorities.length > 0;
    const parts = [
        hasIntent ? 100 : 0,
        narrativeRich ? 100 : 0,
        hasPhasePlan ? 100 : 0,
        hasPriorityPlan ? 100 : 0,
    ];
    const raw = parts.reduce((a, b) => a + b, 0) / parts.length;
    return Math.round(raw * 1000) / 10;
}

/**
 * Delivery progress: completion ratio of defined phases and priorities only.
 * When neither exists yet, returns neutral 50 (nothing to measure).
 */
export function computeExecutionDeliveryScore(strategyRaw: string | undefined): number {
    const strategyDoc = parseStrategy(strategyRaw || '');
    const phases = strategyDoc.phases || [];
    const priorities = strategyDoc.priorities || [];
    const phaseDone = phases.filter((p) => p.status === 'done').length;
    const phaseTotal = phases.length;
    const priDone = priorities.filter((p) => p.done).length;
    const priTotal = priorities.length;
    const parts: number[] = [];
    if (phaseTotal > 0) parts.push((100 * phaseDone) / phaseTotal);
    if (priTotal > 0) parts.push((100 * priDone) / priTotal);
    if (parts.length === 0) return 50;
    const raw = parts.reduce((a, b) => a + b, 0) / parts.length;
    return Math.round(raw * 1000) / 10;
}

function runwayMonthsToFinancialScore(months: number): number {
    if (months < 3) return clampPillar(15 + months * 5);
    if (months < 6) return clampPillar(25 + months * 8);
    return clampPillar(Math.min(100, 40 + months * 2));
}

function pickRunwayFromFinanceJson(obj: Record<string, unknown>): number | undefined {
    const m = obj.metrics as Record<string, unknown> | undefined;
    const fin = obj.financial as Record<string, unknown> | undefined;
    const nestedM = fin?.metrics as Record<string, unknown> | undefined;
    const candidates = [m?.runway, obj.runway, nestedM?.runway];
    for (const c of candidates) {
        if (typeof c === 'number' && Number.isFinite(c)) return Math.min(120, Math.max(0, c));
        if (typeof c === 'string') {
            const n = parseFloat(String(c).replace(/[^0-9.]/g, ''));
            if (Number.isFinite(n)) return Math.min(120, Math.max(0, n));
        }
    }
    return undefined;
}

function pickBurnFromFinanceJson(obj: Record<string, unknown>): number | undefined {
    const m = obj.metrics as Record<string, unknown> | undefined;
    const b = m?.burnRate ?? obj.burnRate;
    if (typeof b === 'number' && Number.isFinite(b)) return b;
    if (typeof b === 'string') {
        const n = parseFloat(String(b).replace(/[^0-9.]/g, ''));
        if (Number.isFinite(n)) return n;
    }
    return undefined;
}

function extractRunwayMonthsFromBudgetText(s: string): number | undefined {
    const patterns: RegExp[] = [
        /(?:runway|months?\s+of\s+runway)[^:.\d]{0,28}(\d+(?:\.\d+)?)\s*(?:mo|months?)?/i,
        /(\d+(?:\.\d+)?)\s*(?:months?|mo)\b[^.\n]{0,40}runway/i,
    ];
    for (const re of patterns) {
        const m = s.match(re);
        if (m) {
            const v = parseFloat(m[1]);
            if (Number.isFinite(v)) return Math.min(120, Math.max(0, v));
        }
    }
    return undefined;
}

function extractRunwayFromMarkdownTable(s: string): number | undefined {
    for (const line of s.split('\n')) {
        if (!line.includes('|')) continue;
        const cells = line.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
        if (cells.length < 2) continue;
        const label = cells[0].toLowerCase();
        if (!/runway|cash runway|months? of runway/.test(label)) continue;
        const joined = cells.join(' ');
        const nums = joined.match(/(\d+(?:\.\d+)?)/g);
        if (nums?.length) {
            const v = parseFloat(nums[nums.length - 1]);
            if (Number.isFinite(v)) return Math.min(120, Math.max(0, v));
        }
    }
    return undefined;
}

/**
 * Financial health from `Project.budget`: AI analysis JSON (`metrics.runway`), loose JSON, markdown tables, or prose with runway hints.
 * Sparse budget text yields a modest score so the bar reflects “signal not yet captured”.
 */
export function computeFinancialHealthScore(budgetRaw: string | undefined): number {
    const s = (budgetRaw || '').trim();
    if (!s) return 44;

    const parsed = safeJsonParse(s);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const o = parsed as Record<string, unknown>;
        const months = pickRunwayFromFinanceJson(o);
        const burn = pickBurnFromFinanceJson(o);
        if (months !== undefined) {
            let score = runwayMonthsToFinancialScore(months);
            if (typeof burn === 'number' && burn > 40_000) score = clampPillar(score - 12);
            return Math.round(score * 1000) / 10;
        }
        if (typeof burn === 'number') {
            const score = burn > 50_000 ? 48 : burn > 20_000 ? 55 : 62;
            return score;
        }
    }

    const fromText =
        extractRunwayMonthsFromBudgetText(s) ?? extractRunwayFromMarkdownTable(s);
    if (fromText !== undefined) return Math.round(runwayMonthsToFinancialScore(fromText) * 1000) / 10;

    if (s.length > 160) return 56;
    if (s.length > 60) return 52;
    if (s.length > 12) return 48;
    return 44;
}

/** Same heuristic as Dashboard execution index (0–100): blend of intent, narrative, and completion. */
export function computeExecutionScore(strategyRaw: string | undefined): number {
    const strategyDoc = parseStrategy(strategyRaw || '');
    const phases = strategyDoc.phases || [];
    const priorities = strategyDoc.priorities || [];
    const phaseDone = phases.filter((p) => p.status === 'done').length;
    const phaseTotal = phases.length;
    const priDone = priorities.filter((p) => p.done).length;
    const priTotal = priorities.length;
    const hasIntent = !!(strategyDoc.strategicIntent?.trim() || strategyDoc.vision?.trim());
    const narrativeRich = (strategyDoc.content || '').trim().length > 80;
    const intentW = hasIntent ? 1 : 0;
    const narW = narrativeRich ? 1 : 0;
    const phaseW = phaseTotal ? phaseDone / phaseTotal : 0;
    const priW = priTotal ? priDone / priTotal : 0;
    const raw = (intentW + narW + phaseW + priW) / 4;
    return Math.round(raw * 1000) / 10;
}
