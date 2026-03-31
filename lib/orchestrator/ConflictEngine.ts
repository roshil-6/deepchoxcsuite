import { AnyAgentResponse, CFOResponse, CSOResponse, CTOResponse, ConflictReport } from './types';

export class ConflictEngine {
    static analyze(responses: Record<string, AnyAgentResponse | null>): ConflictReport {
        const cfo = responses['CFO'] as CFOResponse | undefined;
        const cto = responses['CTO'] as CTOResponse | undefined;
        const cso = responses['CSO'] as CSOResponse | undefined;

        // 1. Financial Hard Block
        if (cfo && !cfo.budget_feasibility) {
            return {
                hasConflict: true,
                blockingAgent: 'CFO',
                reason: `Financial Hard Block: Burn rate warning active. CapEx impact ($${cfo.capax_impact}) exceeds current risk tolerance.`,
                suggestion: 'Reduce scope or secure additional funding before proceeding.',
            };
        }

        // 2. Strategic threat — critical competitive pressure
        if (cso && cso.threat_level === 'critical') {
            return {
                hasConflict: true,
                blockingAgent: 'CSO',
                reason: 'Strategic threat critical: competitive position is under severe pressure.',
                suggestion: 'Revisit differentiation and moat before major capital deployment.',
            };
        }

        // 3. Technical Debt Warning
        if (cto && cto.tech_debt_risk === 'high') {
            return {
                hasConflict: true,
                blockingAgent: 'CTO',
                reason: 'Technical Risk High: Proposed solution introduces unacceptable technical debt.',
                suggestion: 'Refactor architecture or choose a simpler MVP approach.',
            };
        }

        return { hasConflict: false };
    }
}
