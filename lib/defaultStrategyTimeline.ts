import type { FlowEdge, FlowNode, StrategyDoc, StrategyPhase } from '@/lib/strategyDoc';
import { ensureSingleActivePhase, serializeStrategy } from '@/lib/strategyDoc';

export type EnrichStrategyOpts = { addPlaceholderNarrative?: boolean };

const NODE_W = 220;
const NODE_H = 52;
const ANCHOR_Y = NODE_H / 2;
const GAP = 48;

function addMonths(d: Date, months: number): Date {
    const x = new Date(d);
    x.setMonth(x.getMonth() + months);
    return x;
}

function monthFloor(d: Date): Date {
    const x = new Date(d);
    x.setDate(1);
    x.setHours(0, 0, 0, 0);
    return x;
}

function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/**
 * Standard venture horizon: discovery → build → launch → scale (12-month window from reference date).
 */
export function getDefaultPhases(referenceDate: Date = new Date()): StrategyPhase[] {
    const start = monthFloor(referenceDate);
    const d1 = isoDate(start);
    const d2 = isoDate(addMonths(start, 3));
    const d3 = isoDate(addMonths(start, 6));
    const d4 = isoDate(addMonths(start, 9));
    const dEnd = isoDate(addMonths(start, 12));

    return ensureSingleActivePhase([
        {
            id: 'default-phase-discovery',
            title: 'Discovery & validation',
            start: d1,
            end: d2,
            notes: 'Problem, ICP, experiments, and learning milestones.',
            status: 'in_progress',
        },
        {
            id: 'default-phase-build',
            title: 'Build & MVP',
            start: d2,
            end: d3,
            notes: 'Ship a narrow MVP; instrument usage and feedback.',
            status: 'planned',
        },
        {
            id: 'default-phase-launch',
            title: 'Launch & iterate',
            start: d3,
            end: d4,
            notes: 'Go-to-market motion, pricing tests, retention loops.',
            status: 'planned',
        },
        {
            id: 'default-phase-scale',
            title: 'Scale & retention',
            start: d4,
            end: dEnd,
            notes: 'Repeatable acquisition, unit economics, team cadence.',
            status: 'planned',
        },
    ]);
}

/**
 * Linear strategy flow: idea → validate → build → launch → scale (positions match StrategyFlowCanvas node size).
 */
export function getDefaultFlowStructure(): { nodes: FlowNode[]; edges: FlowEdge[] } {
    const y = 140;
    const nodes: FlowNode[] = [
        { id: 'flow-idea', x: 40, y, label: 'Idea & problem' },
        { id: 'flow-validate', x: 40 + NODE_W + GAP, y, label: 'Validate' },
        { id: 'flow-build', x: 40 + 2 * (NODE_W + GAP), y, label: 'Build MVP' },
        { id: 'flow-launch', x: 40 + 3 * (NODE_W + GAP), y, label: 'Launch' },
        { id: 'flow-scale', x: 40 + 4 * (NODE_W + GAP), y, label: 'Scale' },
    ];

    const chain: [string, string][] = [
        ['flow-idea', 'flow-validate'],
        ['flow-validate', 'flow-build'],
        ['flow-build', 'flow-launch'],
        ['flow-launch', 'flow-scale'],
    ];

    const edges: FlowEdge[] = chain.map(([from, to]) => ({
        from,
        to,
        fromX: NODE_W,
        fromY: ANCHOR_Y,
        toX: 0,
        toY: ANCHOR_Y,
    }));

    return { nodes, edges };
}

/** True when phases or flow graph are missing — safe to auto-seed defaults. */
export function needsTimelineAndFlowBootstrap(doc: StrategyDoc): boolean {
    const noPhases = !doc.phases?.length;
    const noFlow = !doc.flow?.nodes?.length;
    return noPhases || noFlow;
}

/**
 * Fill missing timeline phases and/or flow graph without overwriting user content.
 */
export function enrichStrategyWithDefaults(doc: StrategyDoc, opts?: EnrichStrategyOpts): StrategyDoc {
    const next: StrategyDoc = {
        ...doc,
        content: typeof doc.content === 'string' ? doc.content : '',
        priorities: doc.priorities?.length ? doc.priorities : [],
        team: doc.team?.members ? doc.team : { members: [], thread: [] },
        flow: doc.flow?.nodes?.length ? doc.flow : { nodes: [], edges: [] },
        phases: doc.phases?.length ? doc.phases : [],
    };

    if (!next.phases?.length) {
        next.phases = getDefaultPhases();
    } else {
        next.phases = ensureSingleActivePhase(next.phases);
    }

    const flow = next.flow ?? { nodes: [] as FlowNode[], edges: [] as FlowEdge[] };
    if (!flow.nodes?.length) {
        next.flow = getDefaultFlowStructure();
    } else {
        next.flow = flow;
    }

    if (opts?.addPlaceholderNarrative && !next.content.trim()) {
        next.content =
            'Timeline and flow structure are prefilled below. Add your strategic narrative, intent, and proof points here.';
    }

    return next;
}

/** Serialized strategy for new ventures — phases + flow only; narrative stays empty for PA discovery. */
export function buildInitialStrategyJson(): string {
    return serializeStrategy({
        content: '',
        priorities: [],
        flow: { nodes: [], edges: [] },
        phases: [],
        team: { members: [], thread: [] },
    });
}

/** Legacy projects: same defaults plus optional narrative hint so the CEO desk is not blank. */
export function enrichLegacyStrategyDoc(doc: StrategyDoc): StrategyDoc {
    return enrichStrategyWithDefaults(doc, { addPlaceholderNarrative: true });
}
