/**
 * Canonical executive output contracts: each C-suite role has a fixed deliverable shape
 * (decision memos, finance scenarios, architecture, GTM/messaging, competitive intel).
 */
export const EXEC_OUTPUT_ROLES = [
    {
        id: 'CEO' as const,
        shortTitle: 'CEO',
        title: 'Chief Executive Officer',
        execOutput: 'Decision + reasoning',
        description: 'Clear call with rationale — what we commit to and why.',
    },
    {
        id: 'CFO' as const,
        shortTitle: 'CFO',
        title: 'Chief Financial Officer',
        execOutput: 'Numbers + scenario table',
        description: 'Key figures and comparable scenarios (base / upside / downside).',
    },
    {
        id: 'CTO' as const,
        shortTitle: 'CTO',
        title: 'Chief Technology Officer',
        execOutput: 'Architecture recommendation',
        description: 'Systems view, trade-offs, and what to build or change first.',
    },
    {
        id: 'CMO' as const,
        shortTitle: 'CMO',
        title: 'Chief Marketing Officer',
        execOutput: 'GTM plan or messaging framework',
        description: 'How we reach and persuade the market — narrative and motion.',
    },
    {
        id: 'CSO' as const,
        shortTitle: 'CSO',
        title: 'Chief Strategy Officer',
        execOutput: 'Competitive map + threat level',
        description: 'Landscape of players and assessed risk to our position.',
    },
] as const;

export type ExecOutputRoleId = (typeof EXEC_OUTPUT_ROLES)[number]['id'];
