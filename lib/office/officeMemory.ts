import type { OfficeMemory } from '@/types/office';
import type { Project } from '@/lib/db';

const DEFAULT_MEMORY = (): OfficeMemory => ({
    lastFocus: '',
    unfinishedConversations: [],
    unresolvedRisks: [],
    lastBoardDecision: '',
    lastUpdated: new Date().toISOString(),
});

export function parseOfficeMemoryJson(raw: string | undefined | null): OfficeMemory {
    if (!raw || typeof raw !== 'string') return DEFAULT_MEMORY();
    try {
        const o = JSON.parse(raw) as Partial<OfficeMemory>;
        return {
            lastFocus: typeof o.lastFocus === 'string' ? o.lastFocus : '',
            unfinishedConversations: Array.isArray(o.unfinishedConversations)
                ? o.unfinishedConversations.filter((x): x is string => typeof x === 'string')
                : [],
            unresolvedRisks: Array.isArray(o.unresolvedRisks)
                ? o.unresolvedRisks.filter((x): x is string => typeof x === 'string')
                : [],
            lastBoardDecision: typeof o.lastBoardDecision === 'string' ? o.lastBoardDecision : '',
            lastUpdated: typeof o.lastUpdated === 'string' ? o.lastUpdated : new Date().toISOString(),
            lastMorningBriefDay: typeof o.lastMorningBriefDay === 'string' ? o.lastMorningBriefDay : undefined,
            lastWeeklyReviewAt: typeof o.lastWeeklyReviewAt === 'string' ? o.lastWeeklyReviewAt : undefined,
        };
    } catch {
        return DEFAULT_MEMORY();
    }
}

export function serializeOfficeMemory(m: OfficeMemory): string {
    return JSON.stringify({ ...m, lastUpdated: new Date().toISOString() });
}

/** Read memory from a venture record (Dexie / Project). */
export function getOfficeMemory(project: Project | null | undefined): OfficeMemory {
    return parseOfficeMemoryJson(project?.officeEngineMemoryJson);
}

/** Merge updates into existing memory (immutable). */
export function updateOfficeMemory(prev: OfficeMemory, patch: Partial<OfficeMemory>): OfficeMemory {
    return {
        ...prev,
        ...patch,
        lastUpdated: new Date().toISOString(),
    };
}

export function appendUnresolvedRisk(memory: OfficeMemory, risk: string): OfficeMemory {
    const t = risk.trim();
    if (!t) return memory;
    const next = [...memory.unresolvedRisks.filter((x) => x !== t), t].slice(-12);
    return { ...memory, unresolvedRisks: next, lastUpdated: new Date().toISOString() };
}

export function setLastFocus(memory: OfficeMemory, focus: string): OfficeMemory {
    return {
        ...memory,
        lastFocus: focus.trim(),
        lastUpdated: new Date().toISOString(),
    };
}

export function setLastBoardDecision(memory: OfficeMemory, decision: string): OfficeMemory {
    return {
        ...memory,
        lastBoardDecision: decision.trim(),
        lastUpdated: new Date().toISOString(),
    };
}
