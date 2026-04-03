export type ExecutiveRole = 'CEO' | 'CFO' | 'CMO' | 'CTO' | 'CSO';

export interface AgentResponse {
    role: ExecutiveRole;
    timestamp: number;
}

/** Exec output: decision + reasoning */
export interface CEOResponse extends AgentResponse {
    role: 'CEO';
    decision: string;
    reasoning: string;
}

export interface CFOScenarioRow {
    scenario: string;
    /** Numeric or short text cells — e.g. revenue, margin, runway */
    metrics: Record<string, string | number>;
}

/** Exec output: numbers + scenario table */
export interface CFOResponse extends AgentResponse {
    role: 'CFO';
    numbers_summary: string;
    scenario_table: CFOScenarioRow[];
    budget_feasibility: boolean;
    capax_impact: number;
    opex_impact: number;
    cash_runway_impact: number;
    burn_rate_warning: boolean;
}

/** Exec output: GTM plan or messaging framework */
export interface CMOResponse extends AgentResponse {
    role: 'CMO';
    gtm_plan: string;
    messaging_framework: string;
}

/** Exec output: architecture recommendation */
export interface CTOResponse extends AgentResponse {
    role: 'CTO';
    architecture_recommendation: string;
    tech_feasibility: boolean;
    complexity_score: number; // 0-100
    tech_debt_risk: 'low' | 'medium' | 'high';
}

/** Exec output: competitive map + threat level */
export interface CSOResponse extends AgentResponse {
    role: 'CSO';
    competitive_map: string;
    threat_level: 'low' | 'medium' | 'high' | 'critical';
}

export type AnyAgentResponse = CEOResponse | CFOResponse | CMOResponse | CTOResponse | CSOResponse;

export interface ConflictReport {
    hasConflict: boolean;
    blockingAgent?: ExecutiveRole;
    reason?: string;
    suggestion?: string;
}

export interface ExecutiveLoopState {
    query: string;
    iteration: number;
    responses: Record<ExecutiveRole, AnyAgentResponse | null>;
    conflicts: ConflictReport[];
    finalized: boolean;
    finalOutput?: string;
    /** Unified impact layer: desk routing from CFO signal (optional). */
    recommendedDeskRoute?: string[];
}
