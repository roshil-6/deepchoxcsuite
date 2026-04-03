import { ExecutiveLoopState, ExecutiveRole, type CFOResponse } from './types';
import { ContextBuilder } from './ContextBuilder';
import { invokeAgent } from './AgentFunction';
import { ConflictEngine } from './ConflictEngine';
import { Project } from '../db';
import { deskRoutingFromCfo } from '@/lib/impact/orchestratorBridge';

export class ExecutiveLoop {
    private project: Project;
    private state: ExecutiveLoopState;

    constructor(project: Project, initialQuery: string) {
        this.project = project;
        this.state = {
            query: initialQuery,
            iteration: 0,
            responses: { CEO: null, CFO: null, CMO: null, CTO: null, CSO: null },
            conflicts: [],
            finalized: false,
            recommendedDeskRoute: undefined,
        };
    }

    async runStep(): Promise<ExecutiveLoopState> {
        // Guard against infinite loops
        if (this.state.iteration > 3) {
            this.state.finalized = true;
            this.state.finalOutput = "Maximum iterations reached. Consensus could not be fully achieved.";
            return this.state;
        }

        this.state.iteration++;
        const roles: ExecutiveRole[] = ['CEO', 'CFO', 'CMO', 'CTO', 'CSO'];
        const previousConflict = this.state.conflicts.length > 0 ? this.state.conflicts[this.state.conflicts.length - 1].reason : undefined;

        // Parallel Execution
        const promises = roles.map(async (role) => {
            const context = ContextBuilder.build(role, this.project, this.state.query, previousConflict);
            return { role, response: await invokeAgent(role, context) };
        });

        const results = await Promise.all(promises);

        // Update State
        results.forEach(r => {
            if (r.response) {
                this.state.responses[r.role] = r.response;
            }
        });

        const cfo = this.state.responses['CFO'] as CFOResponse | undefined;
        this.state.recommendedDeskRoute = cfo ? deskRoutingFromCfo(cfo) : undefined;

        // Conflict Detection
        const conflict = ConflictEngine.analyze(this.state.responses);

        if (conflict.hasConflict) {
            this.state.conflicts.push(conflict);
            // In a real system, we'd modify the query here based on the suggestion
            // For now, we flag it and let the next iteration (or UI) handle it
            // We stop if it's a hard block that hasn't changed
        } else {
            this.state.finalized = true;
            this.state.finalOutput = "Consensus Achieved. All executive departments are aligned.";
        }

        return { ...this.state };
    }

    getState() {
        return this.state;
    }
}
