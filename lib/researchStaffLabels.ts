/**
 * User-facing copy: each desk is an AI role acting as a team member (no “research” or “C-suite” framing).
 * Internal `AgentRole` keys are unchanged.
 */
export type ResearchStaffRole =
    | 'ceo'
    | 'accountant'
    | 'pm'
    | 'cmo'
    | 'scout'
    | 'chief_of_staff'
    | 'dexo'
    | 'shark';

export type ResearchStaffEntry = {
    /** Lowercase fragment after venture name */
    line: string;
    /** Sidebar / chat primary label */
    navTitle: string;
    /** Secondary line */
    navHint: string;
    /** Desk helper paragraph */
    deskHelp: string;
};

export const RESEARCH_STAFF: Record<ResearchStaffRole, ResearchStaffEntry> = {
    ceo: {
        line: 'strategy & direction',
        navTitle: 'Strategy & direction',
        navHint: 'AI teammate — narrative, phases, priorities',
        deskHelp:
            'Your AI teammate acts as strategy lead — sharpen what you are building toward and how you explain it, in one venture record.',
    },
    accountant: {
        line: 'finance & runway',
        navTitle: 'Finance & runway',
        navHint: 'AI teammate — funding, scenarios, trade-offs',
        deskHelp:
            'Your AI teammate acts as finance lead — runway, capital, and trade-offs in one calm view.',
    },
    pm: {
        line: 'product & delivery',
        navTitle: 'Product & delivery',
        navHint: 'AI teammate — roadmap, execution board, shipping',
        deskHelp:
            'Your AI teammate acts as product & delivery lead — backlog through done, tied to the same venture.',
    },
    cmo: {
        line: 'growth & narrative',
        navTitle: 'Growth & narrative',
        navHint: 'AI teammate — GTM, messaging, pitch',
        deskHelp:
            'Your AI teammate acts as growth lead — turn venture truth into a story you can rehearse or export.',
    },
    scout: {
        line: 'market & landscape',
        navTitle: 'Market & landscape',
        navHint: 'AI teammate — signals, competitors, positioning',
        deskHelp:
            'Your AI teammate acts as market lead — use public signals as inputs; verify and record what you believe.',
    },
    chief_of_staff: {
        line: 'coordination',
        navTitle: 'Team coordination',
        navHint: 'AI teammate — routing and handoffs',
        deskHelp:
            'Your AI teammate coordinates across desks so threads and context stay with your venture.',
    },
    dexo: {
        line: 'cross-desk intelligence',
        navTitle: 'Cross-desk intelligence',
        navHint: 'AI teammate — reads the whole venture',
        deskHelp:
            'Your AI teammate spans every desk when a question does not fit a single lane.',
    },
    shark: {
        line: 'investor diligence',
        navTitle: 'Investor diligence',
        navHint: 'AI teammate — VC-style stress test',
        deskHelp:
            'Your AI teammate stress-tests assumptions before real investor conversations — adversarial and venture-scoped.',
    },
};

function capitalizeSentence(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Main desk headline: `{venture} · …` or sentence-cased line when no venture. */
export function deskHeadline(ventureName: string | null | undefined, role: ResearchStaffRole): string {
    const { line } = RESEARCH_STAFF[role];
    const v = ventureName?.trim();
    const displayLine = capitalizeSentence(line);
    if (v) return `${v} · ${displayLine}`;
    return displayLine;
}

export function deskHelpText(role: ResearchStaffRole): string {
    return RESEARCH_STAFF[role].deskHelp;
}

/** Tooltip / aria */
export function staffTooltipLine(role: ResearchStaffRole): string {
    const { navTitle, navHint } = RESEARCH_STAFF[role];
    return `${navTitle}. ${navHint}.`;
}

/**
 * Left rail / compact nav: drops the clause after ` and ` (e.g. “X and Y” → “X”).
 * Titles use `&` so labels stay intact unless they contain “ and ”.
 */
export function sidebarPrimaryLabel(full: string): string {
    const i = full.indexOf(' and ');
    return i === -1 ? full : full.slice(0, i);
}
