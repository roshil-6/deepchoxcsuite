import { AGENT_DEFINITIONS } from './AgentDefinitions';
import { AnyAgentResponse, ExecutiveRole } from './types';
import { safeJsonParse } from '../utils';

// Mock LLM — used when /api/boardroom is unavailable or returns useMock
async function mockLLMCall(role: ExecutiveRole, context: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 450));

    const isExpensive =
        context.toLowerCase().includes('global') ||
        context.toLowerCase().includes('scale') ||
        context.toLowerCase().includes('hire');
    const isRisky = context.toLowerCase().includes('crypto') || context.toLowerCase().includes('pivot');

    if (role === 'CEO') {
        return JSON.stringify({
            role: 'CEO',
            decision: isRisky ? 'Pursue the pivot with a bounded experiment and kill criteria.' : 'Prioritize efficiency and core revenue before expansion.',
            reasoning: `Context suggests ${isExpensive ? 'scaling pressure' : 'steady execution'}; ${isRisky ? 'elevated strategic risk warrants staged bets' : 'risk is manageable with focus'}.`,
        });
    }
    if (role === 'CFO') {
        return JSON.stringify({
            role: 'CFO',
            numbers_summary: isExpensive
                ? 'CapEx and opex rise materially; runway shortens unless funding follows.'
                : 'Burn is contained; runway impact modest under current plan.',
            scenario_table: [
                { scenario: 'Base', metrics: { revenue: '$1.2M ARR', runway: '14 mo', margin: '22%' } },
                { scenario: 'Upside', metrics: { revenue: '$1.8M ARR', runway: '18 mo', margin: '28%' } },
                { scenario: 'Downside', metrics: { revenue: '$0.8M ARR', runway: '9 mo', margin: '15%' } },
            ],
            budget_feasibility: !isExpensive,
            capax_impact: isExpensive ? 500000 : 50000,
            opex_impact: isExpensive ? 25000 : 5000,
            cash_runway_impact: isExpensive ? -3 : -0.5,
            burn_rate_warning: isExpensive,
        });
    }
    if (role === 'CMO') {
        return JSON.stringify({
            role: 'CMO',
            gtm_plan: 'Land with founder-led sales and 2 pilot verticals; expand via partner channel in Q3.',
            messaging_framework: 'Pillar: trusted outcomes · Proof: customer stories + benchmarks · CTA: book a workflow review.',
        });
    }
    if (role === 'CTO') {
        return JSON.stringify({
            role: 'CTO',
            architecture_recommendation: isRisky
                ? 'Modular monolith now; extract hot paths to services after product–market fit is revalidated.'
                : 'Keep current stack; add observability and CI gates before scaling headcount.',
            tech_feasibility: true,
            complexity_score: isRisky ? 85 : 30,
            tech_debt_risk: isRisky ? 'high' : 'low',
        });
    }
    if (role === 'CSO') {
        return JSON.stringify({
            role: 'CSO',
            competitive_map: 'Incumbents: A (enterprise), B (SMB). Challengers: C (PLG). We sit between B and C on price with stronger services.',
            threat_level: isRisky ? 'high' : 'medium',
        });
    }
    return '{}';
}

async function invokeLiveAgent(role: ExecutiveRole, context: string): Promise<AnyAgentResponse | null> {
    try {
        const res = await fetch('/api/dexo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'boardroom',
                payload: { role, context },
            }),
        });
        const data = (await res.json()) as {
            ok?: boolean;
            response?: AnyAgentResponse;
            useMock?: boolean;
        };
        if (data.ok && data.response && typeof data.response === 'object') {
            return { ...data.response, timestamp: Date.now() };
        }
    } catch {
        /* fall through to mock */
    }
    return null;
}

export async function invokeAgent(role: ExecutiveRole, context: string): Promise<AnyAgentResponse | null> {
    const live = await invokeLiveAgent(role, context);
    if (live) return live;

    try {
        const rawResponse = await mockLLMCall(role, context);
        const parsed = safeJsonParse(rawResponse);
        if (parsed && typeof parsed === 'object') {
            return { ...parsed, timestamp: Date.now() } as AnyAgentResponse;
        }
        return null;
    } catch (e) {
        console.error(`Agent ${role} failed:`, e);
        return null;
    }
}
