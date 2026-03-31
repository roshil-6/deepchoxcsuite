/** CEO strategy JSON — stored in Project.strategy */

export type Priority = { id: string; title: string; done: boolean };

export type FlowNode = { id: string; x: number; y: number; label: string };
/** Optional anchor points are local px on each node box (0,0 = top-left of the node). */
export type FlowEdge = {
    from: string;
    to: string;
    fromX?: number;
    fromY?: number;
    toX?: number;
    toY?: number;
    /** Offset from chord midpoint (canvas px) — pulls the curve for a quadratic edge */
    bendMx?: number;
    bendMy?: number;
};

export type PhaseStatus = 'planned' | 'in_progress' | 'done';

export type StrategyPhase = {
    id: string;
    title: string;
    start: string;
    end: string;
    notes: string;
    /** Timeline lane state — defaults applied in parseStrategy for legacy data */
    status?: PhaseStatus;
};

/** Keep at most one phase in `in_progress`; others stay planned/done */
export function ensureSingleActivePhase(phases: StrategyPhase[]): StrategyPhase[] {
    const inProgress = phases.filter((p) => p.status === 'in_progress');
    if (inProgress.length <= 1) return phases;
    let keep = true;
    return phases.map((p) => {
        if (p.status !== 'in_progress') return p;
        if (keep) {
            keep = false;
            return p;
        }
        return { ...p, status: 'planned' as const };
    });
}

export type TeamMember = { id: string; name: string; role: string };
export type TeamMessage = { id: string; author: string; body: string; ts: number };

function normalizePhasesFromJson(raw: unknown): StrategyPhase[] {
    if (!Array.isArray(raw)) return [];
    const list: StrategyPhase[] = raw
        .filter((p: any) => p && typeof p.id === 'string')
        .map((p: any) => {
            const st = p.status;
            const status: PhaseStatus =
                st === 'done' || st === 'in_progress' || st === 'planned' ? st : 'planned';
            return {
                id: String(p.id),
                title: typeof p.title === 'string' ? p.title : '',
                start: typeof p.start === 'string' ? p.start : '',
                end: typeof p.end === 'string' ? p.end : '',
                notes: typeof p.notes === 'string' ? p.notes : '',
                status,
            };
        });
    return ensureSingleActivePhase(list);
}

export type StrategyDoc = {
    content: string;
    vision?: string;
    strategicIntent?: string;
    timestamp?: number;
    priorities?: Priority[];
    flow?: { nodes: FlowNode[]; edges: FlowEdge[] };
    phases?: StrategyPhase[];
    team?: { members: TeamMember[]; thread: TeamMessage[] };
};

export function parseStrategy(raw: string): StrategyDoc {
    if (!raw?.trim()) return { content: '', priorities: [] };
    try {
        const j = JSON.parse(raw);
        return {
            content: typeof j.content === 'string' ? j.content : '',
            vision: typeof j.vision === 'string' ? j.vision : '',
            strategicIntent: typeof j.strategicIntent === 'string' ? j.strategicIntent : '',
            timestamp: typeof j.timestamp === 'number' ? j.timestamp : undefined,
            priorities: Array.isArray(j.priorities)
                ? j.priorities.filter((p: any) => p && typeof p.title === 'string')
                : [],
            flow:
                j.flow && Array.isArray(j.flow.nodes)
                    ? {
                          nodes: j.flow.nodes,
                          edges: Array.isArray(j.flow.edges) ? j.flow.edges : [],
                      }
                    : { nodes: [], edges: [] },
            phases: normalizePhasesFromJson(j.phases),
            team: j.team && Array.isArray(j.team.members)
                ? {
                      members: j.team.members,
                      thread: Array.isArray(j.team.thread) ? j.team.thread : [],
                  }
                : { members: [], thread: [] },
        };
    } catch {
        return { content: raw, priorities: [], flow: { nodes: [], edges: [] }, phases: [], team: { members: [], thread: [] } };
    }
}

export function serializeStrategy(doc: StrategyDoc): string {
    return JSON.stringify({
        content: doc.content,
        vision: doc.vision?.trim() || doc.content.split('\n')[0]?.trim() || '',
        strategicIntent: doc.strategicIntent?.trim() || doc.vision?.trim() || '',
        timestamp: Date.now(),
        priorities: doc.priorities || [],
        flow: doc.flow || { nodes: [], edges: [] },
        phases: doc.phases || [],
        team: doc.team || { members: [], thread: [] },
    });
}
