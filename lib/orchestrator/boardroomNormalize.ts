import type {
    AnyAgentResponse,
    CEOResponse,
    CFOResponse,
    CMOResponse,
    CTOResponse,
    CSOResponse,
    ExecutiveRole,
} from './types';

/** Normalize LLM JSON into typed exec responses (shared by API route). */
export function normalizeExecutiveBoardResponse(role: ExecutiveRole, raw: unknown): AnyAgentResponse | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const ts = Date.now();

    switch (role) {
        case 'CEO': {
            const decision = typeof o.decision === 'string' ? o.decision : '';
            const reasoning = typeof o.reasoning === 'string' ? o.reasoning : '';
            if (!decision && !reasoning) return null;
            const r: CEOResponse = {
                role: 'CEO',
                decision: decision || 'See reasoning.',
                reasoning: reasoning || '—',
                timestamp: ts,
            };
            return r;
        }
        case 'CFO': {
            const rows = Array.isArray(o.scenario_table) ? o.scenario_table : [];
            const scenario_table = rows.slice(0, 8).map((row) => {
                const rw = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
                const scenario = typeof rw.scenario === 'string' ? rw.scenario : 'Scenario';
                const metrics =
                    rw.metrics && typeof rw.metrics === 'object' && rw.metrics !== null
                        ? (rw.metrics as Record<string, string | number>)
                        : {};
                return { scenario, metrics };
            });
            if (scenario_table.length === 0) {
                scenario_table.push(
                    { scenario: 'Base', metrics: { note: 'estimate' } },
                    { scenario: 'Upside', metrics: { note: 'estimate' } },
                    { scenario: 'Downside', metrics: { note: 'estimate' } }
                );
            }
            const r: CFOResponse = {
                role: 'CFO',
                numbers_summary: typeof o.numbers_summary === 'string' ? o.numbers_summary : 'Financial view from venture context.',
                scenario_table,
                budget_feasibility: Boolean(o.budget_feasibility),
                capax_impact: typeof o.capax_impact === 'number' ? o.capax_impact : 0,
                opex_impact: typeof o.opex_impact === 'number' ? o.opex_impact : 0,
                cash_runway_impact: typeof o.cash_runway_impact === 'number' ? o.cash_runway_impact : 0,
                burn_rate_warning: Boolean(o.burn_rate_warning),
                timestamp: ts,
            };
            return r;
        }
        case 'CMO': {
            const r: CMOResponse = {
                role: 'CMO',
                gtm_plan: typeof o.gtm_plan === 'string' ? o.gtm_plan : 'GTM to be refined from venture context.',
                messaging_framework:
                    typeof o.messaging_framework === 'string' ? o.messaging_framework : 'Messaging pillars TBD.',
                timestamp: ts,
            };
            return r;
        }
        case 'CTO': {
            const risk = o.tech_debt_risk;
            const tech_debt_risk =
                risk === 'low' || risk === 'medium' || risk === 'high' ? risk : 'medium';
            const r: CTOResponse = {
                role: 'CTO',
                architecture_recommendation:
                    typeof o.architecture_recommendation === 'string'
                        ? o.architecture_recommendation
                        : 'Technical approach from venture context.',
                tech_feasibility: o.tech_feasibility !== false,
                complexity_score:
                    typeof o.complexity_score === 'number'
                        ? Math.min(100, Math.max(0, o.complexity_score))
                        : 40,
                tech_debt_risk,
                timestamp: ts,
            };
            return r;
        }
        case 'CSO': {
            const tl = o.threat_level;
            const threat_level =
                tl === 'low' || tl === 'medium' || tl === 'high' || tl === 'critical' ? tl : 'medium';
            const r: CSOResponse = {
                role: 'CSO',
                competitive_map:
                    typeof o.competitive_map === 'string' ? o.competitive_map : 'Competitive landscape from context.',
                threat_level,
                timestamp: ts,
            };
            return r;
        }
        default:
            return null;
    }
}
