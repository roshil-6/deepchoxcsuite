import type { JarvisKanbanAdd, JarvisProposedUpdates } from '@/app/api/jarvis/route';
import type { KanbanTask, Project } from '@/lib/db';
import { parseProductPlan, serializeProductPlan } from '@/lib/productPlanDoc';
import { DEXO_PATCHABLE_PROJECT_KEYS, patchFieldLabels, sanitizeDexoPatch, type DexoPatchContract } from '@/lib/dexoPatchSchema';

const PM_STAMP = 'Deepchox';

function mergeProductPlanField(current: string, proposed: string): string {
    const trimmed = proposed.trim();
    if (!trimmed) return current;

    const doc = parseProductPlan(current || '');

    if (trimmed.startsWith('{')) {
        try {
            const j = JSON.parse(trimmed) as Record<string, unknown>;
            const next = { ...doc };
            if (typeof j.intent === 'string' && j.intent.trim()) {
                const add = j.intent.trim();
                next.intent = doc.intent?.trim() ? `${doc.intent.trim()}\n\n${add}` : add;
            }
            if (typeof j.roadmapText === 'string' && j.roadmapText.trim()) {
                const add = j.roadmapText.trim();
                next.roadmapText = doc.roadmapText?.trim() ? `${doc.roadmapText.trim()}\n\n${add}` : add;
            }
            return serializeProductPlan(next);
        } catch {
            /* fall through — treat as prose */
        }
    }

    const stamp = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const block = `\n\n— ${PM_STAMP} · ${stamp}\n${trimmed}`;
    return serializeProductPlan({
        ...doc,
        roadmapText: (doc.roadmapText || '').trimEnd() + block,
    });
}

const K_STATUSES: KanbanTask['status'][] = ['todo', 'in_progress', 'next', 'completed'];

function mergeKanbanTasks(existing: unknown, adds: JarvisKanbanAdd[]): KanbanTask[] {
    const list: KanbanTask[] = Array.isArray(existing)
        ? (existing as KanbanTask[]).filter((t) => t && t.id && t.title)
        : [];
    const seen = new Set(list.map((t) => t.title.trim().toLowerCase()));
    let idBase = Date.now();
    for (const row of adds) {
        const title = (row.title || '').trim();
        if (!title) continue;
        const key = title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const st = row.status && K_STATUSES.includes(row.status) ? row.status : 'todo';
        list.unshift({
            id: String(++idBase),
            title,
            status: st,
            timestamp: Date.now(),
        });
    }
    return list;
}

export type DexoProductDeliveryPatch = Partial<Pick<Project, 'productPlan' | 'kanban'>>;

/**
 * Turn Jarvis proposed updates into venture fields for Product & delivery.
 * Safe to call with partial / legacy reports (missing kanbanAdds).
 */
export function dexoProductDeliveryPatchFromJarvis(
    project: Project,
    proposed: JarvisProposedUpdates
): DexoProductDeliveryPatch {
    const patch: DexoProductDeliveryPatch = {};

    if (proposed.productPlan?.trim()) {
        patch.productPlan = mergeProductPlanField(project.productPlan || '', proposed.productPlan);
    }

    const adds = proposed.kanbanAdds;
    if (Array.isArray(adds) && adds.length > 0) {
        const next = mergeKanbanTasks(project.kanban, adds);
        const prevLen = Array.isArray(project.kanban) ? project.kanban.length : 0;
        if (next.length !== prevLen) {
            patch.kanban = next;
        }
    }

    return patch;
}

export function jarvisProposedHasProductDelivery(proposed: JarvisProposedUpdates): boolean {
    if (proposed.productPlan?.trim()) return true;
    const adds = proposed.kanbanAdds;
    return Array.isArray(adds) && adds.some((x) => x && String(x.title || '').trim().length > 0);
}

function mergeAppendedDexoBlock(current: string, proposed: string): string | undefined {
    const t = proposed.trim();
    if (!t) return undefined;
    const stamp = `\n\n--- ${PM_STAMP} · ${new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} ---\n`;
    return (current ?? '') + stamp + t;
}

export type DexoFullVenturePatch = DexoPatchContract;

/** All venture fields Deepchox may auto-apply after a converse turn (same merge style as manual Jarvis apply). */
export function dexoFullVenturePatchFromJarvis(project: Project, proposed: JarvisProposedUpdates): DexoPatchContract {
    const patch: DexoPatchContract = { ...dexoProductDeliveryPatchFromJarvis(project, proposed) };

    const s = mergeAppendedDexoBlock(project.strategy || '', proposed.strategy || '');
    if (s !== undefined) patch.strategy = s;

    const m = mergeAppendedDexoBlock(project.marketInsights || '', proposed.marketInsights || '');
    if (m !== undefined) patch.marketInsights = m;

    const b = mergeAppendedDexoBlock(project.budget || '', proposed.budget || '');
    if (b !== undefined) patch.budget = b;

    const d = mergeAppendedDexoBlock(project.teamDirectives || '', proposed.teamDirectives || '');
    if (d !== undefined) patch.teamDirectives = d;

    const raw = proposed as unknown as Record<string, unknown>;
    const extras: Record<string, unknown> = {};
    for (const k of DEXO_PATCHABLE_PROJECT_KEYS) {
        if (raw[k] !== undefined && raw[k] !== null && patch[k as keyof DexoPatchContract] === undefined) {
            extras[k] = raw[k];
        }
    }
    if (Object.keys(extras).length > 0) {
        const sani = sanitizeDexoPatch(extras);
        if (sani.ok) Object.assign(patch, sani.patch);
    }

    return patch;
}

/** Human-readable lines for voiceResponse hints when auto-save runs. */
export function dexoAutoSaveHintLines(patch: DexoPatchContract): string[] {
    return patchFieldLabels(patch);
}
