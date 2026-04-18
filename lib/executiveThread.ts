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

const BRIEF_MARKER = '\n\nMy one focus for you today:';

/** Legacy + current daily brief posts (assistant, PA channel). */
function isDailyBriefMessage(m: ExecutiveThreadMessage): boolean {
    if (m.role !== 'assistant' || m.channel !== 'pa') return false;
    if (m.id.startsWith('morning-brief-')) return true;
    if (m.content.includes(BRIEF_MARKER)) return true;
    if (/\bSuggested focus:\s*/i.test(m.content) && /is on the desk\./i.test(m.content)) return true;
    return false;
}

/** Collapse duplicate daily briefs from the same calendar day (Strict Mode / race / retries). */
function dedupeDailyBriefMessages(messages: ExecutiveThreadMessage[]): ExecutiveThreadMessage[] {
    const dayKey = (ts: number) => new Date(ts).toDateString();
    const bestByDay = new Map<string, ExecutiveThreadMessage>();
    const rest: ExecutiveThreadMessage[] = [];
    for (const m of messages) {
        if (isDailyBriefMessage(m)) {
            const day = dayKey(m.ts);
            const prev = bestByDay.get(day);
            if (!prev || m.ts >= prev.ts) bestByDay.set(day, m);
        } else {
            rest.push(m);
        }
    }
    const merged = [...rest, ...bestByDay.values()];
    return merged.sort((a, b) => a.ts - b.ts);
}

export function loadExecutiveThread(projectId: string | number): ExecutiveThreadMessage[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(threadStorageKey(projectId));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        const normalized = parsed.map(normalizeEntry).filter((m): m is ExecutiveThreadMessage => m !== null);
        const deduped = dedupeDailyBriefMessages(normalized);
        if (deduped.length !== normalized.length) {
            try {
                localStorage.setItem(threadStorageKey(projectId), JSON.stringify(deduped));
            } catch {
                /* quota */
            }
        }
        const seen = new Set<string>();
        return deduped.map((m) => {
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
