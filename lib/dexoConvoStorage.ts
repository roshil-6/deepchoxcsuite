/**
 * Dexo chat persistence — PostgreSQL via `/api/dexo-convo` when `DATABASE_URL` is available,
 * with IndexedDB (Dexie) fallback so the app works offline or without Postgres.
 */

import {
  clearDexoConvoMessagesForProject,
  getDexoConvoMessagesForProject,
  replaceDexoConvoMessages,
} from '@/lib/db';

export type DexoConvoMessage = { role: 'user' | 'dexo'; text: string; id: number };

const PREFIX = 'deepchox-dexo-convo-v1';
const MAX_MESSAGES = 120;

function storageKey(projectId: string | number | null): string {
  return `${PREFIX}:${projectId == null ? 'no-venture' : String(projectId)}`;
}

function normalizeEntry(x: unknown): DexoConvoMessage | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if ((o.role !== 'user' && o.role !== 'dexo') || typeof o.text !== 'string') return null;
  const id = typeof o.id === 'number' && Number.isFinite(o.id) ? o.id : Date.now();
  return { role: o.role, text: o.text, id };
}

function loadLegacyLocalStorage(projectId: string | number | null): DexoConvoMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out = parsed.map(normalizeEntry).filter((m): m is DexoConvoMessage => m !== null);
    const seen = new Set<number>();
    return out.map((m) => {
      let id = m.id;
      while (seen.has(id)) id += 1;
      seen.add(id);
      return id === m.id ? m : { ...m, id };
    });
  } catch {
    return [];
  }
}

function clearLegacyLocalStorage(projectId: string | number | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(projectId));
  } catch {
    /* noop */
  }
}

function saveLegacyLocalStorage(projectId: string | number | null, messages: DexoConvoMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch {
    /* noop */
  }
}

function mapDexieRowsToMessages(
  rows: Awaited<ReturnType<typeof getDexoConvoMessagesForProject>>
): DexoConvoMessage[] {
  return rows.map((r) => {
    const clientId =
      typeof r.dexoClientId === 'number' && Number.isFinite(r.dexoClientId)
        ? r.dexoClientId
        : typeof r.id === 'number'
          ? r.id
          : r.timestamp;
    return {
      role: r.role === 'user' ? 'user' : 'dexo',
      text: r.content,
      id: clientId,
    };
  });
}

/** Load from Dexie + optional legacy localStorage migration (offline path). */
async function loadDexoConvoFromDexieOnly(
  id: number,
  projectIdRaw: string | number | null
): Promise<DexoConvoMessage[]> {
  let rows = await getDexoConvoMessagesForProject(id);
  if (rows.length === 0) {
    const legacy = loadLegacyLocalStorage(projectIdRaw);
    if (legacy.length > 0) {
      await replaceDexoConvoMessages(
        id,
        legacy.map((m) => ({ id: m.id, role: m.role, text: m.text }))
      );
      clearLegacyLocalStorage(projectIdRaw);
      rows = await getDexoConvoMessagesForProject(id);
    }
  }
  return mapDexieRowsToMessages(rows);
}

function normalizeApiMessages(raw: unknown[]): DexoConvoMessage[] {
  const out: DexoConvoMessage[] = [];
  let fallbackId = 0;
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    if (o.role !== 'user' && o.role !== 'dexo') continue;
    if (typeof o.text !== 'string') continue;
    const id =
      typeof o.id === 'number' && Number.isFinite(o.id) ? o.id : ++fallbackId;
    out.push({ role: o.role, text: o.text, id });
  }
  return out;
}

async function fetchDexoFromPostgres(ventureId: number): Promise<DexoConvoMessage[] | null> {
  try {
    const res = await fetch('/api/dexo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        action: 'dexoConvoGet',
        payload: { ventureId },
      }),
    });
    const data = (await res.json()) as { ok?: boolean; messages?: unknown[] };
    if (!res.ok || !data?.ok || !Array.isArray(data.messages)) return null;
    return normalizeApiMessages(data.messages);
  } catch {
    return null;
  }
}

async function pushDexoConvoToPostgres(ventureId: number, messages: DexoConvoMessage[]): Promise<boolean> {
  try {
    const res = await fetch('/api/dexo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'dexoConvoPost',
        payload: {
          ventureId,
          messages: messages.map((m) => ({ id: m.id, role: m.role, text: m.text })),
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteDexoFromPostgres(ventureId: number): Promise<void> {
  try {
    await fetch('/api/dexo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'dexoConvoDelete',
        payload: { ventureId },
      }),
    });
  } catch {
    /* noop */
  }
}

/**
 * Prefer Postgres; if empty, promote Dexie/legacy into Postgres; if API down, use Dexie only.
 */
export async function loadDexoConvo(projectId: string | number | null): Promise<DexoConvoMessage[]> {
  if (typeof window === 'undefined') return [];
  if (projectId == null) {
    return loadLegacyLocalStorage(null);
  }
  const id = Number(projectId);
  if (!Number.isFinite(id)) return [];

  const fromPg = await fetchDexoFromPostgres(id);
  if (fromPg !== null) {
    if (fromPg.length > 0) {
      void clearDexoConvoMessagesForProject(id).catch(() => {});
      clearLegacyLocalStorage(projectId);
      return fromPg;
    }
    const fromLocal = await loadDexoConvoFromDexieOnly(id, projectId);
    if (fromLocal.length > 0) {
      const pushed = await pushDexoConvoToPostgres(id, fromLocal);
      if (pushed) {
        void clearDexoConvoMessagesForProject(id).catch(() => {});
        clearLegacyLocalStorage(projectId);
      }
      return fromLocal;
    }
    return [];
  }

  return loadDexoConvoFromDexieOnly(id, projectId);
}

/** Save to Postgres when available; otherwise Dexie. Pre-venture thread uses localStorage only. */
export async function saveDexoConvo(projectId: string | number | null, messages: DexoConvoMessage[]): Promise<void> {
  if (projectId == null) {
    saveLegacyLocalStorage(null, messages);
    return;
  }
  const id = Number(projectId);
  if (!Number.isFinite(id)) return;
  const trimmed = messages.slice(-MAX_MESSAGES);
  const ok = await pushDexoConvoToPostgres(id, trimmed);
  if (ok) {
    void clearDexoConvoMessagesForProject(id).catch(() => {});
    clearLegacyLocalStorage(projectId);
    return;
  }
  await replaceDexoConvoMessages(
    id,
    trimmed.map((m) => ({ id: m.id, role: m.role, text: m.text }))
  );
}

/** Clear remote + local copies. */
export async function clearDexoConvo(projectId: string | number | null): Promise<void> {
  if (projectId == null) {
    clearLegacyLocalStorage(null);
    return;
  }
  const id = Number(projectId);
  if (Number.isFinite(id)) {
    await deleteDexoFromPostgres(id);
    await clearDexoConvoMessagesForProject(id);
  }
  clearLegacyLocalStorage(projectId);
}

export function nextConvoId(messages: DexoConvoMessage[]): number {
  return messages.reduce((max, m) => Math.max(max, m.id), 0);
}
