export type IntelligenceWorkflowStatus = 'live' | 'foundation';
export type IntelligenceProtocol =
    | 'single_context'
    | 'parallel_merge'
    | 'lead_challenger'
    | 'relay_critique';

export type IntelligenceWorkflowRoom =
    | 'suite_intelligence'
    | 'personal_assistant'
    | 'dashboard'
    | 'ceo'
    | 'pm'
    | 'accountant'
    | 'scout'
    | 'cmo'
    | 'reports';

export interface IntelligenceWorkflow {
    id: 'staff_sync' | 'boardroom' | 'personal_assistant' | 'desk_chat' | 'research_report' | 'pinpoint_probe';
    title: string;
    status: IntelligenceWorkflowStatus;
    protocol: IntelligenceProtocol;
    rooms: IntelligenceWorkflowRoom[];
    trigger: string;
    objective: string;
    gptRole: string;
    claudeRole: string;
    outputs: string[];
    whyItWins: string;
}

export const INTELLIGENCE_WORKFLOWS: IntelligenceWorkflow[] = [
    {
        id: 'staff_sync',
        title: 'Staff sync',
        status: 'live',
        protocol: 'parallel_merge',
        rooms: ['suite_intelligence', 'dashboard'],
        trigger: 'Founder presses Run staff sync.',
        objective: 'Refresh all five desk briefs from one venture snapshot and one headline bundle.',
        gptRole: 'Execution staff: tasks, events, desk actions, merge-safe structure.',
        claudeRole: 'Strategic analyst: risk, coherence, market signals, pressure-testing.',
        outputs: ['desk briefs', 'focus list', 'attention items', 'kanban adds', 'calendar adds'],
        whyItWins: 'One pass keeps every desk aligned to the same reality instead of creating five separate opinions.',
    },
    {
        id: 'boardroom',
        title: 'Boardroom decisions',
        status: 'live',
        protocol: 'lead_challenger',
        rooms: ['dashboard', 'ceo', 'accountant', 'cmo', 'pm', 'scout'],
        trigger: 'Founder asks for an executive call or role-specific recommendation.',
        objective: 'Produce one decisive answer with an explicit challenger view before normalization.',
        gptRole: 'Primary structured recommendation and schema-safe decision output.',
        claudeRole: 'Contrarian challenger that surfaces blind spots, downside risk, and fragile assumptions.',
        outputs: ['normalized executive memo', 'challenger insight', 'safer final recommendation'],
        whyItWins: 'You get one answer that already includes internal disagreement instead of false confidence.',
    },
    {
        id: 'personal_assistant',
        title: 'Personal assistant',
        status: 'live',
        protocol: 'single_context',
        rooms: ['personal_assistant'],
        trigger: 'Founder updates venture direction, asks for planning help, or wants the record changed.',
        objective: 'Protect venture memory, keep follow-ups minimal, and convert chat into safe structured updates.',
        gptRole: 'Current live route favors operational structure and update extraction.',
        claudeRole: 'Reserved as the strategic upgrade path for future relay-style planning prompts.',
        outputs: ['venture updates', 'follow-up options', 'coordination suggestions'],
        whyItWins: 'The assistant should be the source of truth editor first, not the noisiest analysis surface.',
    },
    {
        id: 'desk_chat',
        title: 'Desk chat',
        status: 'live',
        protocol: 'single_context',
        rooms: ['ceo', 'pm', 'accountant', 'scout', 'cmo'],
        trigger: 'Founder opens a desk and works inside one surface.',
        objective: 'Keep the conversation fast, room-specific, and grounded in that desk context.',
        gptRole: 'Strong default for structured execution and JSON-heavy surfaces.',
        claudeRole: 'High-value fallback or alternate probe for sharper analysis in the same desk.',
        outputs: ['room-local advice', 'surface-specific edits', 'faster exploration loops'],
        whyItWins: 'Not every interaction should pay the latency cost of dual-agent critique.',
    },
    {
        id: 'research_report',
        title: 'Research and report',
        status: 'foundation',
        protocol: 'relay_critique',
        rooms: ['scout', 'reports', 'suite_intelligence'],
        trigger: 'Founder asks for a polished report, synthesis, or decision memo across messy evidence.',
        objective: 'Separate discovery from synthesis so research is both nuanced and action-ready.',
        gptRole: 'Structures findings into report sections, tables, action implications, and publishable shape.',
        claudeRole: 'Leads analytical read of raw signals, contradictions, and hidden implications.',
        outputs: ['report draft', 'confirmed findings', 'contested terrain', 'action implications'],
        whyItWins: 'Research quality jumps when one model reads deeply and the other organizes the result for action.',
    },
    {
        id: 'pinpoint_probe',
        title: 'Pinpoint workflows',
        status: 'foundation',
        protocol: 'relay_critique',
        rooms: ['suite_intelligence', 'scout', 'accountant', 'pm'],
        trigger: 'Founder needs a precise answer on one bottleneck, one risk, or one leverage point.',
        objective: 'Zoom into a narrow question without rerunning the whole company.',
        gptRole: 'Frames the exact question, decision tree, thresholds, and recommended next move.',
        claudeRole: 'Searches for what is hidden, under-validated, or falsely assumed inside that narrow problem.',
        outputs: ['pinpoint answer', 'confidence level', 'conflict flags', 'next check to run'],
        whyItWins: 'The app becomes surgical, not just broad: fast where it should be fast, deep where it must be deep.',
    },
];
