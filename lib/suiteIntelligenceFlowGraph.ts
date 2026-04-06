/**
 * Canonical map of how AI staff roles connect to suite workspaces and persisted venture fields.
 * Used by Suite Intelligence neural / flowchart view.
 */

export type IntelligenceNavRoom =
    | 'ceo'
    | 'pm'
    | 'accountant'
    | 'scout'
    | 'cmo'
    | 'dashboard'
    | 'reports'
    | 'calendar'
    | 'personal_assistant'
    | 'intelligence_diary'
    | 'suite_intelligence';

export type SuiteSurfaceLink = {
    /** Short label for the box */
    label: string;
    /** Where to navigate in the app */
    room: IntelligenceNavRoom;
    /** What this surface shows / stores */
    detail: string;
};

export type SuiteRoleFlowColumn = {
    id: 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo';
    /** Primary desk room */
    deskRoom: IntelligenceNavRoom;
    /** Full officer + desk name */
    fullTitle: string;
    /** API / model output key */
    agentSyncDeskKey: 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo';
    /** What the combined staff model produces for this lane */
    aiDelivers: string;
    /** IndexedDB / merge targets (human-readable) */
    dataBindings: string[];
    /** Suite areas that consume or display this lane */
    surfaces: SuiteSurfaceLink[];
};

export const SUITE_INTELLIGENCE_API_NODE = {
    id: 'agent-sync-api',
    title: 'POST /api/agent-sync',
    subtitle: 'One structured “all hands” call — snapshot + headlines → five desk briefs + merges',
    detailLines: [
        'Each sync sends the full venture JSON and intel headlines; the model returns one object with CEO, CTO, CFO, CSO, and CMO strings in the same pass so priorities stay consistent.',
        'Reads: strategy, productPlan, budget, marketInsights, kanban, events, teamDirectives, userNotes, ventureOnboarding.',
        'Writes: desks.* (last brief per role), summary, appendMarketInsights, appendBudget, kanbanAdds, eventAdds, staffFocusToday, attentionItems, and related merges into the record.',
    ],
} as const;

export const SUITE_INTELLIGENCE_VENTURE_NODE = {
    id: 'venture-record',
    title: 'Venture record (local)',
    subtitle: 'Single source of truth — every desk and AI surface reads the same project row',
    detailLines: [
        'Persists per venture: strategy, productPlan, budget, marketInsights, kanban, events, office memory, agentStaffSnapshot (last brief per role), staff focus, notifications context.',
        'When you work with AI in a desk, chat rail, or PA, saves and merges update these fields; the next staff sync re-loads that snapshot and regenerates all five desk strings together.',
    ],
} as const;

/** Ordered columns: how each officer lane maps through the suite after a staff run. */
export const SUITE_ROLE_FLOW_COLUMNS: SuiteRoleFlowColumn[] = [
    {
        id: 'ceo',
        deskRoom: 'ceo',
        fullTitle: 'Chief Executive Officer — CEO workspace',
        agentSyncDeskKey: 'ceo',
        aiDelivers:
            'Strategic narrative, decision framing, risk posture; desk string merged into agentStaffSnapshot.desks.ceo and can append to strategy content.',
        dataBindings: [
            'Project.strategy (JSON: intent, narrative, phases, priorities, flow, team)',
            'agentStaffSnapshot.desks.ceo + snapshot.summary',
            'teamDirectives (append on sync)',
        ],
        surfaces: [
            {
                label: 'CEO desk',
                room: 'ceo',
                detail: 'StrategyNotebook — intent, thesis, timeline phases, executive priorities, flow canvas, schedule.',
            },
            {
                label: 'Executive overview',
                room: 'dashboard',
                detail: 'Dashboard — goal advancement, morning brief, staff snapshot, surfaces hub.',
            },
            {
                label: 'Suite intelligence',
                room: 'suite_intelligence',
                detail: 'Staff sync map, venture wiring, and coordination view for the same snapshot.',
            },
        ],
    },
    {
        id: 'pm',
        deskRoom: 'pm',
        fullTitle: 'Chief Technology Officer — Product & execution desk',
        agentSyncDeskKey: 'pm',
        aiDelivers:
            'Delivery plan, technical scope, sequencing; desk brief in snapshot; kanbanAdds land on the execution board.',
        dataBindings: [
            'Project.productPlan (CTO narrative + roadmap structures)',
            'Project.kanban (tasks from staff sync + manual moves)',
            'agentStaffSnapshot.desks.pm',
        ],
        surfaces: [
            {
                label: 'CTO / PM desk',
                room: 'pm',
                detail: 'ProductKanban — execution board, roadmap brief, war room, planning mirror, desk docs.',
            },
            {
                label: 'Calendar',
                room: 'calendar',
                detail: 'Timeline + venture kanban columns (same task list).',
            },
            {
                label: 'Executive overview',
                room: 'dashboard',
                detail: 'Operational desks shortcut → opens expanded CTO context.',
            },
        ],
    },
    {
        id: 'accountant',
        deskRoom: 'accountant',
        fullTitle: 'Chief Financial Officer — Finance desk',
        agentSyncDeskKey: 'accountant',
        aiDelivers: 'Runway, burn, scenario notes; appendBudget merges into Project.budget with sync stamp.',
        dataBindings: ['Project.budget', 'agentStaffSnapshot.desks.accountant', 'appendBudget blocks from API'],
        surfaces: [
            {
                label: 'CFO desk',
                room: 'accountant',
                detail: 'FinancialLedger — ledger view, notes, and venture finance context.',
            },
            {
                label: 'Knowledge base',
                room: 'reports',
                detail: 'Saved finance artifacts & exports linked to this venture.',
            },
            {
                label: 'Research relay assistant',
                room: 'personal_assistant',
                detail: 'Chat-first updates and venture field merges with your confirmation.',
            },
        ],
    },
    {
        id: 'scout',
        deskRoom: 'scout',
        fullTitle: 'Chief Strategy Officer — Market & intel desk',
        agentSyncDeskKey: 'scout',
        aiDelivers: 'Landscape, competitors, headlines synthesis; appendMarketInsights merges into marketInsights.',
        dataBindings: ['Project.marketInsights', 'agentStaffSnapshot.desks.scout', 'Intel API headlines in sync prompt'],
        surfaces: [
            {
                label: 'Market / Scout desk',
                room: 'scout',
                detail: 'ScoutTerminal — intel threads tied to venture strategy.',
            },
            {
                label: 'Neural diary',
                room: 'intelligence_diary',
                detail: 'IntelligenceDiary — qualitative threads linked to venture context.',
            },
            {
                label: 'Executive overview',
                room: 'dashboard',
                detail: 'Signal & activity charts consume system logs from sync.',
            },
        ],
    },
    {
        id: 'cmo',
        deskRoom: 'cmo',
        fullTitle: 'Chief Marketing Officer — GTM desk',
        agentSyncDeskKey: 'cmo',
        aiDelivers: 'Positioning, channel motion, narrative hooks; desk brief in snapshot; pairs with market intel.',
        dataBindings: ['agentStaffSnapshot.desks.cmo', 'Venture onboarding targetAudience (CMO context in sync)'],
        surfaces: [
            {
                label: 'GTM / CMO desk',
                room: 'cmo',
                detail: 'PitchDeckForge — decks and narrative assets for this venture.',
            },
            {
                label: 'Knowledge base',
                room: 'reports',
                detail: 'Stored GTM artifacts and exports.',
            },
            {
                label: 'Personal Assistant',
                room: 'personal_assistant',
                detail: 'Chat-first updates that can patch strategy & venture fields.',
            },
        ],
    },
];
