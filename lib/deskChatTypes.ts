/** Shared desk chat types and config — safe to import from both client and server. */

export type DeskId = 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo';

/** Suggested opening questions shown in the empty state for each desk. */
export const DESK_QUICK_STARTS: Record<DeskId, string[]> = {
    ceo: [
        "What's our strategic priority for the next 90 days?",
        "Help me sharpen our mission statement",
        "What phases should we be running?",
        "Where are we losing directional clarity?",
    ],
    pm: [
        "What should we build next?",
        "Show me the execution board priorities",
        "What's blocking delivery right now?",
        "Help me write a sprint plan",
    ],
    accountant: [
        "How's our runway looking?",
        "Help me model a burn scenario",
        "When should we start fundraising?",
        "How should we allocate this month's budget?",
    ],
    scout: [
        "Who are our main competitors?",
        "What market signals should I watch?",
        "Where are the gaps in our positioning?",
        "What does the customer landscape look like?",
    ],
    cmo: [
        "Help me sharpen our pitch narrative",
        "What's our go-to-market strategy?",
        "How should we position against competitors?",
        "What acquisition channels should we prioritize?",
    ],
};
