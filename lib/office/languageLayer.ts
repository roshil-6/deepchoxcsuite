import type { MorningBrief } from '@/types/office';
import type { Project } from '@/lib/db';
import type { KanbanTask } from '@/lib/db';
import type { GoalProgress } from '@/types/office';
import type { StrategyDoc } from '@/lib/strategyDoc';

function hourGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function pickPriorities(strategy: StrategyDoc, tasks: KanbanTask[], max: number): string[] {
    const out: string[] = [];
    const pri = (strategy.priorities || []).filter((p) => !p.done).map((p) => p.title.trim()).filter(Boolean);
    out.push(...pri.slice(0, 3));
    const wip = tasks.filter((t) => t.status === 'in_progress' || t.status === 'next').map((t) => t.title.trim());
    for (const w of wip) {
        if (out.length >= max) break;
        if (!out.includes(w)) out.push(w);
    }
    const todo = tasks.filter((t) => t.status === 'todo').map((t) => t.title.trim());
    for (const w of todo) {
        if (out.length >= max) break;
        if (!out.includes(w)) out.push(w);
    }
    if (out.length === 0 && strategy.strategicIntent?.trim()) {
        out.push(`Clarify and execute on: ${strategy.strategicIntent.trim().slice(0, 120)}`);
    }
    return out.slice(0, max);
}

function criticalFromAlerts(
    progress: GoalProgress,
    budgetSnippet: string,
    staffSummary: string | undefined,
    venture: Project
): string[] {
    const alerts: string[] = [];
    if (progress.risk === 'High') {
        alerts.push('Execution pace is behind plan — protect one flagship milestone this week.');
    }
    const b = budgetSnippet.toLowerCase();
    if (/\b(runway|months?)\b/.test(b)) {
        const m = b.match(/(\d+)\s*(month|mo)/);
        if (m && Number(m[1]) < 6) {
            alerts.push(`Runway signal in finance notes is below six months — align CFO and CEO on cash plan.`);
        }
    }
    if (staffSummary && /risk|critical|blocker|urgent/i.test(staffSummary)) {
        alerts.push('Latest staff sync flagged elevated risk — review desk notifications.');
    }
    const syncAt = venture.agentStaffSnapshot?.at;
    if (syncAt) {
        const days = (Date.now() - syncAt) / 86400000;
        if (days > 5) {
            alerts.push(
                'Staff sync is over five days old — run Sync AI staff so every desk brief reflects your latest venture state.'
            );
        }
    } else if (venture.name?.trim()) {
        alerts.push('No staff sync yet — run Sync AI staff once to populate cross-desk research and today’s focus list.');
    }
    return alerts.slice(0, 5);
}

/**
 * Natural, chief-of-staff tone — uses live venture data only.
 */
export function generateMorningBrief(
    venture: Project,
    tasks: KanbanTask[],
    progress: GoalProgress,
    strategy: StrategyDoc
): MorningBrief {
    const name = venture.name?.trim() || 'your venture';
    const greeting = `${hourGreeting()} — ${name} is on the desk.`;
    let priorities = pickPriorities(strategy, tasks, 5);
    const doneFocus = new Set((venture.staffFocusCompletedLines || []).map((s) => s.trim()));
    const openFocus = (venture.staffFocusToday || []).map((s) => s.trim()).filter((s) => s && !doneFocus.has(s));
    for (const f of openFocus.slice(0, 2)) {
        if (!priorities.includes(f)) priorities = [f, ...priorities].slice(0, 5);
    }
    const budget = venture.budget || '';
    const budgetSnippet = budget.length > 1200 ? budget.slice(0, 1200) : budget;
    const criticalAlerts = criticalFromAlerts(progress, budgetSnippet, venture.agentStaffSnapshot?.summary, venture);
    const phase = (strategy.phases || []).find((p) => p.status === 'in_progress');
    const suggestedFocus =
        phase?.title?.trim() ||
        priorities[0] ||
        'Sharpen strategic intent and one measurable milestone for the week.';

    return {
        greeting,
        priorities,
        criticalAlerts,
        suggestedFocus,
    };
}
