/**
 * User-facing copy: every primary label starts with "Research" (full words, no role abbreviations).
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
    /** Lowercase fragment after venture name — always begins with "research" */
    line: string;
    /** Sidebar / chat primary label — always begins with "Research" */
    navTitle: string;
    /** Secondary line — always begins with "Research" */
    navHint: string;
    /** Desk helper paragraph — always begins with "Research" */
    deskHelp: string;
};

export const RESEARCH_STAFF: Record<ResearchStaffRole, ResearchStaffEntry> = {
    ceo: {
        line: 'research strategy and direction',
        navTitle: 'Research strategy and direction',
        navHint: 'Research into narrative, phases, and priorities',
        deskHelp:
            'Research that helps you sharpen what you are building toward and how you explain it — narrative, phases, and decisions stay in one venture record.',
    },
    accountant: {
        line: 'research fund intelligence',
        navTitle: 'Research fund intelligence',
        navHint: 'Research into runway, funding, and scenarios',
        deskHelp:
            'Research that helps you see capital, runway, and trade-offs together — ledger, estimates, and topics in one calm view.',
    },
    pm: {
        line: 'research product and delivery',
        navTitle: 'Research product and delivery',
        navHint: 'Research into backlog, roadmap, and documents',
        deskHelp:
            'Research that helps you ship work from backlog through done, with roadmap and planning tied to the same venture.',
    },
    cmo: {
        line: 'research growth and narrative',
        navTitle: 'Research growth and narrative',
        navHint: 'Research into message, story, and pitch',
        deskHelp:
            'Research that helps you turn venture information into a story you can rehearse or export without extra ceremony.',
    },
    scout: {
        line: 'research market and landscape',
        navTitle: 'Research market and landscape',
        navHint: 'Research into public signals and your brief',
        deskHelp:
            'Research that helps you use public headlines as starting points — verify sources and record what you believe in the brief.',
    },
    chief_of_staff: {
        line: 'research coordination',
        navTitle: 'Research coordination',
        navHint: 'Research into routing threads and handoffs',
        deskHelp:
            'Research that helps you move work across areas without losing context — threads and routing stay with your venture.',
    },
    dexo: {
        line: 'research across desks',
        navTitle: 'Research across desks',
        navHint: 'Research questions that span the venture',
        deskHelp:
            'Research that helps when a question does not fit a single area — reading across your venture in one place.',
    },
    shark: {
        line: 'research capital diligence',
        navTitle: 'Research capital diligence',
        navHint: 'Research rehearsal for investor scrutiny',
        deskHelp:
            'Research that helps you stress-test assumptions before real investor conversations — adversarial and venture-scoped.',
    },
};

function capitalizeSentence(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Main desk headline: `{venture} · research …` or sentence-cased line when no venture. */
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
 * Left rail / compact nav: drops the clause after ` and ` (e.g. “Research strategy and direction” → “Research strategy”).
 * Strings without ` and ` stay unchanged.
 */
export function sidebarPrimaryLabel(full: string): string {
    const i = full.indexOf(' and ');
    return i === -1 ? full : full.slice(0, i);
}
