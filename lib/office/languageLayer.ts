import type { MorningBrief } from '@/types/office';
import type { Project } from '@/lib/db';
import type { KanbanTask } from '@/lib/db';
import type { GoalProgress } from '@/types/office';
import type { StrategyDoc } from '@/lib/strategyDoc';

/** Stable pick for the day so copy does not flicker on re-render. */
function dayStableIndex(seed: string, modulo: number): number {
    const day = new Date().toDateString();
    let h = 0;
    const s = `${day}::${seed}`;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h) % modulo;
}

type OpenerCtx = { name: string; phaseTitle?: string };

const COFOUNDER_OPENERS: Array<(ctx: OpenerCtx) => string> = [
    ({ name }) =>
        `I've been sitting with ${name} — I'll be direct: one clear move today beats five half-finished ones.`,
    ({ name, phaseTitle }) =>
        phaseTitle
            ? `${name} is in “${phaseTitle}” right now. I'd protect momentum there before we chase new shiny objects.`
            : `Let's anchor ${name} on one phase and one measurable proof point — I'll mirror that back as we go.`,
    ({ name }) =>
        `Partner read on ${name}: I'm treating you like a co-founder, not a dashboard — here's what I'd push.`,
    ({ name }) =>
        `Quick alignment on ${name} — I care about signal, not theater. Here's the thread I'm holding.`,
    ({ name }) =>
        `${name}: if we only ship one meaningful conversation with reality today, make it this next block.`,
];

/**
 * Single PA / executive-thread message body: one voice, no repeated “Good morning” blocks.
 */
export function formatDailyBriefThreadMessage(brief: MorningBrief): string {
    const lines: string[] = [];

    lines.push(brief.greeting);
    lines.push('');
    lines.push(`My one focus for you today: ${brief.suggestedFocus.trim()}`);

    const focusLower = brief.suggestedFocus.trim().toLowerCase();
    const extraPri = brief.priorities
        .map((p) => p.trim())
        .filter((p) => p && p.toLowerCase() !== focusLower);

    if (extraPri.length > 0) {
        lines.push('');
        lines.push("Still on our plate:");
        for (const p of extraPri) lines.push(`• ${p}`);
    }

    if (brief.criticalAlerts.length > 0) {
        lines.push('');
        lines.push('Heads up:');
        for (const a of brief.criticalAlerts.slice(0, 4)) lines.push(`• ${a}`);
    }

    return lines.join('\n');
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
    const phase = (strategy.phases || []).find((p) => p.status === 'in_progress');
    const phaseTitle = phase?.title?.trim();
    const openerIdx = dayStableIndex(`${name}::${phaseTitle ?? ''}`, COFOUNDER_OPENERS.length);
    const greeting = COFOUNDER_OPENERS[openerIdx]({ name, phaseTitle });
    let priorities = pickPriorities(strategy, tasks, 5);
    const doneFocus = new Set((venture.staffFocusCompletedLines || []).map((s) => s.trim()));
    const openFocus = (venture.staffFocusToday || []).map((s) => s.trim()).filter((s) => s && !doneFocus.has(s));
    for (const f of openFocus.slice(0, 2)) {
        if (!priorities.includes(f)) priorities = [f, ...priorities].slice(0, 5);
    }
    const budget = venture.budget || '';
    const budgetSnippet = budget.length > 1200 ? budget.slice(0, 1200) : budget;
    const criticalAlerts = criticalFromAlerts(progress, budgetSnippet, venture.agentStaffSnapshot?.summary, venture);
    const suggestedFocus =
        phaseTitle ||
        priorities[0] ||
        'Sharpen strategic intent and one measurable milestone for the week.';

    return {
        greeting,
        priorities,
        criticalAlerts,
        suggestedFocus,
    };
}
