import type { GoalProgress } from '@/types/office';
import type { KanbanTask } from '@/lib/db';
import type { StrategyPhase } from '@/lib/strategyDoc';

const DAY = 86400000;

/**
 * Milestone proxy = strategic phases + open execution tasks.
 * progress = completedTasks / totalMilestoneTasks * 100 (0 if total 0).
 */
export function calculateGoalProgress(tasks: KanbanTask[], phases: StrategyPhase[]): GoalProgress {
    const openPhases = phases.filter((p) => p.status !== 'done').length;
    const donePhases = phases.filter((p) => p.status === 'done').length;
    const totalPhaseUnits = Math.max(1, phases.length || 1);
    const phaseCompletionRatio = phases.length ? donePhases / totalPhaseUnits : 0;

    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const openTasks = tasks.filter((t) => t.status !== 'completed');
    const totalMilestoneTasks = completedTasks + openTasks.length;
    const taskRatio = totalMilestoneTasks > 0 ? completedTasks / totalMilestoneTasks : 0;

    const blended = phases.length ? (phaseCompletionRatio * 0.45 + taskRatio * 0.55) : taskRatio;
    const percentage = Math.round(Math.min(100, Math.max(0, blended * 100)) * 10) / 10;

    const now = Date.now();
    const recentComplete = tasks.filter((t) => t.status === 'completed' && now - t.timestamp < 14 * DAY).length;
    const paceScore = totalMilestoneTasks > 0 ? Math.min(1, recentComplete / Math.max(1, openTasks.length + recentComplete)) : 0;

    const nearestDeadline = nearestPhaseEndMs(phases, now);
    const projectedDaysRemaining =
        nearestDeadline != null ? Math.max(0, Math.ceil((nearestDeadline - now) / DAY)) : openPhases > 0 ? 21 : 14;

    let risk: GoalProgress['risk'] = 'Medium';
    if (percentage >= 80) risk = 'Low';
    else if (percentage < 50) risk = 'High';

    return {
        percentage,
        projectedDaysRemaining,
        risk,
        paceScore: Math.round(paceScore * 100) / 100,
    };
}

function nearestPhaseEndMs(phases: StrategyPhase[], now: number): number | null {
    let best: number | null = null;
    for (const p of phases) {
        if (p.status === 'done') continue;
        const end = parsePhaseDate(p.end);
        if (end == null || end < now) continue;
        if (best == null || end < best) best = end;
    }
    return best;
}

function parsePhaseDate(s: string): number | null {
    if (!s || typeof s !== 'string') return null;
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
}
