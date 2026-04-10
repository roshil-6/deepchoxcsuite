/**
 * AI staff voice — each desk speaks as a team member who OWNS an area.
 * The copy is first-person, active, and specific. Every label answers
 * "what am I doing for the founder RIGHT NOW?"
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
    /** Secondary line — what the role handles (compact) */
    navHint: string;
    /** Desk welcome — the AI role speaking to the founder in first person */
    deskHelp: string;
    /** One-line pitch of what the desk delivers — used in tiles/grids */
    valueStatement: string;
};

export const RESEARCH_STAFF: Record<ResearchStaffRole, ResearchStaffEntry> = {
    ceo: {
        line: 'strategy & direction',
        navTitle: 'Strategy & direction',
        navHint: 'Narrative, phases, priorities, intent',
        deskHelp:
            'I own your strategic narrative. I keep the mission, vision, phases, and priorities in one place so every other desk pulls from a single source of truth. When direction drifts, I flag it.',
        valueStatement: 'Keeps your venture story sharp and every desk aligned to one plan.',
    },
    accountant: {
        line: 'finance & runway',
        navTitle: 'Finance & runway',
        navHint: 'Runway, capital, burn, funding readiness',
        deskHelp:
            'I track your runway and model burn scenarios. When capital decisions need attention — raise timing, allocation trade-offs, or red-flag spending — I surface them before they become problems.',
        valueStatement: 'Models your burn, flags capital risk, and keeps runway visible.',
    },
    pm: {
        line: 'product & delivery',
        navTitle: 'Product & delivery',
        navHint: 'Roadmap, execution board, shipping cadence',
        deskHelp:
            'I manage what gets built and shipped. The execution board, backlog, and delivery cadence live here. When priorities from strategy change, I translate them into concrete tasks.',
        valueStatement: 'Turns strategy into tasks on the execution board and tracks delivery.',
    },
    cmo: {
        line: 'growth & narrative',
        navTitle: 'Growth & narrative',
        navHint: 'GTM, messaging, positioning, pitch',
        deskHelp:
            'I shape how the world sees your venture. Positioning, go-to-market channels, and your pitch narrative all live here. I pull from strategy to keep messaging truthful and current.',
        valueStatement: 'Crafts your pitch and GTM story from venture truth, not guesses.',
    },
    scout: {
        line: 'market & landscape',
        navTitle: 'Market & landscape',
        navHint: 'Competitors, trends, signals, positioning',
        deskHelp:
            'I scan the landscape so you do not get surprised. Competitor moves, market signals, and positioning gaps — I pull from public sources and flag what matters for your specific venture.',
        valueStatement: 'Watches competitors and market signals so you move with context.',
    },
    chief_of_staff: {
        line: 'coordination',
        navTitle: 'Team coordination',
        navHint: 'Cross-desk routing and handoffs',
        deskHelp:
            'I make sure threads do not get lost between desks. When a strategy shift affects product, or when finance data changes the GTM timeline, I route the context to the right place.',
        valueStatement: 'Routes context between desks so nothing falls through the cracks.',
    },
    dexo: {
        line: 'cross-desk intelligence',
        navTitle: 'Cross-desk intelligence',
        navHint: 'Full-venture analysis, pattern recognition',
        deskHelp:
            'I read across every desk simultaneously. When a question spans strategy, product, and finance at once, I synthesize the full picture instead of sending you desk to desk.',
        valueStatement: 'Synthesizes the full venture picture when questions span multiple areas.',
    },
    shark: {
        line: 'investor diligence',
        navTitle: 'Investor diligence',
        navHint: 'VC-style stress test, gap analysis',
        deskHelp:
            'I stress-test your venture the way an investor would. Gaps in the model, weak assumptions, missing proof points — better to find them here than in a real pitch.',
        valueStatement: 'Finds the gaps in your story before investors do.',
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
 * Left rail / compact nav: drops the clause after ` and ` (e.g. "X and Y" → "X").
 * Titles use `&` so labels stay intact unless they contain " and ".
 */
export function sidebarPrimaryLabel(full: string): string {
    const i = full.indexOf(' and ');
    return i === -1 ? full : full.slice(0, i);
}
