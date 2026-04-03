import { parseStrategy } from '@/lib/strategyDoc';

/** Same heuristic as Dashboard execution score (0–100). */
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
