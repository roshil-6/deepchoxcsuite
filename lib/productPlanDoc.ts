/** Product desk JSON — stored in Project.productPlan when value starts with "{" */

import type { FlowEdge, FlowNode } from '@/lib/strategyDoc';
import { parseStrategy } from '@/lib/strategyDoc';

export type RecentAction = {
    id: string;
    category: 'ship' | 'decision' | 'research' | 'sync' | 'other';
    title: string;
    detail: string;
    ts: number;
};

export type WarSticky = { id: string; x: number; y: number; text: string; color: string };

export type ProductPlanDoc = {
    intent?: string;
    roadmapText?: string;
    recentActions?: RecentAction[];
    warRoom?: { stickies: WarSticky[]; lastOpen?: number };
};

const DEFAULT_WAR = { stickies: [] as WarSticky[] };

export function parseProductPlan(raw: string): ProductPlanDoc {
    if (!raw?.trim()) return { roadmapText: '', warRoom: DEFAULT_WAR };
    if (raw.trim().startsWith('{')) {
        try {
            const j = JSON.parse(raw);
            return {
                intent: typeof j.intent === 'string' ? j.intent : '',
                roadmapText: typeof j.roadmapText === 'string' ? j.roadmapText : '',
                recentActions: Array.isArray(j.recentActions) ? j.recentActions : [],
                warRoom: j.warRoom && Array.isArray(j.warRoom.stickies)
                    ? { stickies: j.warRoom.stickies, lastOpen: j.warRoom.lastOpen }
                    : DEFAULT_WAR,
            };
        } catch {
            return { roadmapText: raw, warRoom: DEFAULT_WAR };
        }
    }
    return { roadmapText: raw, warRoom: DEFAULT_WAR };
}

export function serializeProductPlan(doc: ProductPlanDoc): string {
    return JSON.stringify({
        intent: doc.intent || '',
        roadmapText: doc.roadmapText || '',
        recentActions: doc.recentActions || [],
        warRoom: doc.warRoom || DEFAULT_WAR,
    });
}

/** Read-only: strategy flow for PM planning room */
export function getCeoFlowForPlanning(strategyRaw: string): { nodes: FlowNode[]; edges: FlowEdge[] } {
    const s = parseStrategy(strategyRaw || '');
    return s.flow || { nodes: [], edges: [] };
}
