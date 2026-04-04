import type { WeeklyOfficeReview } from '@/types/office';
import type { Project } from '@/lib/db';
import type { KanbanTask } from '@/lib/db';

const WEEK = 7 * 86400000;

function countCompletedThisWeek(tasks: KanbanTask[], now: number): number {
    const start = now - WEEK;
    return tasks.filter((t) => t.status === 'completed' && t.timestamp >= start).length;
}

function growthHeuristic(market: string, prevLen: number): number {
    const m = market.trim();
    if (!m) return 0;
    const delta = m.length - prevLen;
    return Math.max(-30, Math.min(30, Math.round(delta / 25)));
}

function churnFromText(budget: string, market: string): WeeklyOfficeReview['churnRisk'] {
    const t = `${budget}\n${market}`.toLowerCase();
    if (/\b(churn|contraction|downgrade|logo loss|customer loss)\b/.test(t)) return 'High';
    if (/\b(retention|renewal|expansion)\b/.test(t) && !/\b(churn)\b/.test(t)) return 'Low';
    return 'Medium';
}

/**
 * Weekly snapshot from venture tasks + narrative fields (no fabricated metrics).
 */
export function generateWeeklyOfficeReview(
    project: Project,
    tasks: KanbanTask[],
    memoryLastWeekNoteLen: number
): WeeklyOfficeReview {
    const now = Date.now();
    const completedTasks = countCompletedThisWeek(tasks, now);
    const growthChange = growthHeuristic(project.marketInsights || '', memoryLastWeekNoteLen);
    const churnRisk = churnFromText(project.budget || '', project.marketInsights || '');

    const openWip = tasks.filter((t) => t.status === 'in_progress').length;
    const nextWeekFocus =
        openWip > 4
            ? 'Finish in-flight work before new commitments'
            : churnRisk === 'High'
              ? 'Retention and customer success'
              : 'Ship the next milestone and validate with users';

    return {
        completedTasks,
        growthChange,
        churnRisk,
        nextWeekFocus,
    };
}
