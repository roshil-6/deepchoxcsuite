/** Unified venture thread: Personal Assistant (HF) + Chief of staff desk (Groq). Persisted per project in localStorage. */

export type ExecutiveThreadChannel = 'pa' | 'cos';

export type ExecutiveThreadMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    ts: number;
    model?: string;
    channel: ExecutiveThreadChannel;
    followUpOptions?: string[];
};

const PREFIX = 'deepchox-exec-thread-v1';

function normalizeEntry(x: unknown): ExecutiveThreadMessage | null {
    if (!x || typeof x !== 'object') return null;
    const o = x as Record<string, unknown>;
    if (
        typeof o.id !== 'string' ||
        (o.role !== 'user' && o.role !== 'assistant') ||
        typeof o.content !== 'string' ||
        typeof o.ts !== 'number'
    ) {
        return null;
    }
    const channel: ExecutiveThreadChannel = o.channel === 'cos' ? 'cos' : 'pa';
    const followUpOptions = Array.isArray(o.followUpOptions)
        ? o.followUpOptions.filter((s): s is string => typeof s === 'string')
        : undefined;
    return {
        id: o.id,
        role: o.role,
        content: o.content,
        ts: o.ts,
        model: typeof o.model === 'string' ? o.model : undefined,
        channel,
        followUpOptions: followUpOptions?.length ? followUpOptions : undefined,
    };
}

function threadStorageKey(projectId: string | number): string {
    return `${PREFIX}:${String(projectId)}`;
}

export function loadExecutiveThread(projectId: string | number): ExecutiveThreadMessage[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(threadStorageKey(projectId));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        const normalized = parsed.map(normalizeEntry).filter((m): m is ExecutiveThreadMessage => m !== null);
        const seen = new Set<string>();
        return normalized.map((m) => {
            let id = m.id;
            if (seen.has(id)) {
                id = `${m.id}-${Math.random().toString(36).slice(2, 9)}`;
            }
            seen.add(id);
            return id === m.id ? m : { ...m, id };
        });
    } catch {
        return [];
    }
}

export function saveExecutiveThread(projectId: string | number, messages: ExecutiveThreadMessage[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(threadStorageKey(projectId), JSON.stringify(messages));
    } catch {
        /* quota / private mode */
    }
}
