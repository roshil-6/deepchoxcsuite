import type { KanbanTask } from '@/lib/db';
import type { StrategyPhase } from '@/lib/strategyDoc';
import type { FlowEdge, FlowNode } from '@/lib/strategyDoc';
import type { TaskIntelligenceFinding, TaskRescheduleSuggestion } from '@/types/office';

const DAY = 86400000;

function daysSince(ts: number): number {
    return (Date.now() - ts) / DAY;
}

function norm(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function taskMatchesNode(title: string, node: FlowNode): boolean {
    const t = norm(title);
    const l = norm(node.label || '');
    if (!l) return false;
    return t.includes(l) || l.includes(t);
}

/**
 * Tasks not completed whose age exceeds thresholds (by last update timestamp).
 */
export function detectOverdueTasks(tasks: KanbanTask[]): TaskIntelligenceFinding[] {
    const out: TaskIntelligenceFinding[] = [];
    for (const t of tasks) {
        if (t.status === 'completed') continue;
        const d = daysSince(t.timestamp);
        if (d > 5) {
            out.push({
                kind: 'overdue',
                severity: 'critical',
                taskId: t.id,
                title: t.title,
                detail: `No movement for ${Math.floor(d)} days — escalate or de-scope.`,
            });
        } else if (d > 2) {
            out.push({
                kind: 'overdue',
                severity: 'warning',
                taskId: t.id,
                title: t.title,
                detail: `Stalled ${Math.floor(d)} days — confirm owner and next step.`,
            });
        }
    }
    return out;
}

/**
 * Uses strategy flow: downstream node tasks are blocked if upstream "incomplete" work exists.
 */
export function detectTaskDependencies(
    tasks: KanbanTask[],
    nodes: FlowNode[] | undefined,
    edges: FlowEdge[] | undefined
): TaskIntelligenceFinding[] {
    const out: TaskIntelligenceFinding[] = [];
    if (!nodes?.length || !edges?.length) return out;

    const incomplete = tasks.filter((t) => t.status !== 'completed');
    for (const e of edges) {
        const fromNode = nodes.find((n) => n.id === e.from);
        const toNode = nodes.find((n) => n.id === e.to);
        if (!fromNode || !toNode) continue;

        const upstreamTasks = incomplete.filter((t) => taskMatchesNode(t.title, fromNode));
        const downstreamTasks = incomplete.filter((t) => taskMatchesNode(t.title, toNode));
        if (upstreamTasks.length === 0 || downstreamTasks.length === 0) continue;

        for (const dt of downstreamTasks) {
            out.push({
                kind: 'dependency_block',
                severity: 'warning',
                taskId: dt.id,
                title: dt.title,
                detail: `Depends on flow step “${fromNode.label}” — complete or unlink before forcing this forward.`,
            });
        }
    }
    return out;
}

/**
 * Surfaces high-signal reprioritization when phases slip or WIP is high.
 */
export function suggestReprioritization(
    tasks: KanbanTask[],
    milestones: StrategyPhase[]
): TaskIntelligenceFinding[] {
    const out: TaskIntelligenceFinding[] = [];
    const wip = tasks.filter((t) => t.status === 'in_progress').length;
    if (wip > 5) {
        out.push({
            kind: 'reprioritize',
            severity: 'info',
            taskId: '',
            title: 'WIP load',
            detail: `${wip} items in progress — consider finishing two before starting new work.`,
        });
    }
    const overduePhases = milestones.filter((m) => m.status === 'in_progress' && phaseEndElapsed(m));
    if (overduePhases.length > 0) {
        out.push({
            kind: 'reprioritize',
            severity: 'warning',
            taskId: '',
            title: 'Phase horizon',
            detail: `Active phase “${overduePhases[0].title}” passed its end date — rebaseline dates or scope.`,
        });
    }
    return out;
}

function phaseEndElapsed(m: StrategyPhase): boolean {
    const end = m.end ? Date.parse(m.end) : NaN;
    if (Number.isNaN(end)) return false;
    return Date.now() > end;
}

/**
 * Shifts dependent tasks’ timestamps toward a milestone anchor (proposal only — caller persists).
 */
export function autoReschedule(tasks: KanbanTask[], milestoneDate: number): TaskRescheduleSuggestion[] {
    const anchor = milestoneDate - DAY;
    const suggestions: TaskRescheduleSuggestion[] = [];
    const incomplete = tasks.filter((t) => t.status !== 'completed');
    for (const t of incomplete) {
        if (t.timestamp >= anchor) continue;
        suggestions.push({
            taskId: t.id,
            proposedTimestamp: anchor,
            reason: 'Align execution timestamps with upcoming milestone window.',
        });
    }
    return suggestions;
}
