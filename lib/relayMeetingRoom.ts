import type { Project } from '@/lib/db';

/** Rooms the Meeting Room can deep-link to (must match `switchRoom`). */
export type RelayMeetingGoTo =
    | 'dashboard'
    | 'ceo'
    | 'pm'
    | 'accountant'
    | 'scout'
    | 'cmo'
    | 'chief_of_staff'
    | 'boardroom'
    | 'calendar'
    | 'reports'
    | 'suite_intelligence'
    | 'intelligence_diary'
    | 'dexo'
    | 'personal_assistant';

export type RelayMeetingStep = {
    order: number;
    title: string;
    why: string;
    goTo: RelayMeetingGoTo;
    goToLabel: string;
};

export const RELAY_MEETING_GO_TO_SET = new Set<RelayMeetingGoTo>([
    'dashboard',
    'ceo',
    'pm',
    'accountant',
    'scout',
    'cmo',
    'chief_of_staff',
    'boardroom',
    'calendar',
    'reports',
    'suite_intelligence',
    'intelligence_diary',
    'dexo',
    'personal_assistant',
]);

export function normalizeRelayMeetingGoTo(raw: string | undefined): RelayMeetingGoTo {
    const s = (raw || '').trim().toLowerCase().replace(/\s+/g, '_');
    const aliases: Record<string, RelayMeetingGoTo> = {
        market: 'scout',
        gtm: 'cmo',
        cfo: 'accountant',
        cto: 'pm',
        timeline: 'calendar',
        knowledge: 'reports',
        kb: 'reports',
        suite: 'suite_intelligence',
        intelligence: 'suite_intelligence',
        diary: 'intelligence_diary',
        relay: 'personal_assistant',
        pa: 'personal_assistant',
    };
    const mapped = aliases[s] ?? (s as RelayMeetingGoTo);
    return RELAY_MEETING_GO_TO_SET.has(mapped) ? mapped : 'dashboard';
}

/** When Groq is unavailable — still useful, deterministic guidance. */
export function buildHeuristicMeetingPlan(project: Project): { intro: string; steps: RelayMeetingStep[] } {
    const steps: RelayMeetingStep[] = [];
    let order = 1;

    const strategy = (project.strategy || '').trim();
    const product = (project.productPlan || '').trim();
    const budget = (project.budget || '').trim();
    const market = (project.marketInsights || '').trim();
    const snap = project.agentStaffSnapshot;
    const kanban = Array.isArray(project.kanban) ? project.kanban : [];
    const events = Array.isArray(project.events) ? project.events : [];
    const focus = project.staffFocusToday || [];

    if (!snap?.at) {
        steps.push({
            order: order++,
            title: 'Run a full staff sync',
            why: 'One sync refreshes CEO, CTO, CFO, CSO, and CMO briefs from the same venture snapshot so everyone is aligned. Start from Suite intelligence or Dashboard.',
            goTo: 'suite_intelligence',
            goToLabel: 'Open Suite intelligence',
        });
    }

    if (!strategy) {
        steps.push({
            order: order++,
            title: 'Set strategy & priorities',
            why: 'The CEO desk holds your narrative, priorities, and phases. Without it, other desks lack a north star for trade-offs and spend.',
            goTo: 'ceo',
            goToLabel: 'Open CEO desk',
        });
    }

    if (!product) {
        steps.push({
            order: order++,
            title: 'Shape the product / delivery plan',
            why: 'The CTO desk links roadmap and execution board to what finance and GTM assume you will ship.',
            goTo: 'pm',
            goToLabel: 'Open CTO desk',
        });
    }

    if (!budget) {
        steps.push({
            order: order++,
            title: 'Add budget & runway notes',
            why: 'The CFO desk reads your budget field. Even rough burn and runway text unlock better staff sync and board-style questions.',
            goTo: 'accountant',
            goToLabel: 'Open CFO desk',
        });
    }

    if (!market) {
        steps.push({
            order: order++,
            title: 'Capture market intel',
            why: 'The Market desk feeds assumptions that CFO and CMO both use — competition, pricing context, and risk.',
            goTo: 'scout',
            goToLabel: 'Open Market desk',
        });
    }

    if (kanban.length === 0 && product) {
        steps.push({
            order: order++,
            title: 'Break work into the execution board',
            why: 'Tasks on the CTO board turn plans into trackable delivery — helpful before you scale spend or commitments.',
            goTo: 'pm',
            goToLabel: 'Open CTO desk',
        });
    }

    if (events.length === 0) {
        steps.push({
            order: order++,
            title: 'Put key dates on the timeline',
            why: 'The Timeline ties launches, reviews, and deadlines to the rest of the office so Relay and sync outputs stay dated.',
            goTo: 'calendar',
            goToLabel: 'Open Timeline',
        });
    }

    if (focus.length > 0) {
        steps.push({
            order: order++,
            title: 'Work through “focus today”',
            why: 'Your latest staff sync left prioritized bullets — the Dashboard and Suite intelligence surface them; check them off as you go.',
            goTo: 'dashboard',
            goToLabel: 'Open Dashboard',
        });
    }

    steps.push({
        order: order++,
        title: 'Use Relay chat for the next move',
        why: 'Ask Relay to update any desk, add kanban items, or refine strategy — you confirm before changes save to the venture.',
        goTo: 'personal_assistant',
        goToLabel: 'Stay in Relay',
    });

    const intro = `Here’s a practical order for “${project.name}” based on what’s filled in your venture right now. Tap a desk to jump there, or use Refresh plan for AI-generated steps when Groq is configured.`;

    return { intro, steps: steps.slice(0, 10) };
}
