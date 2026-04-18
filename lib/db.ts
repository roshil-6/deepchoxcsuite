/**
 * Venture persistence: PostgreSQL via `/api/ventures/*` + `x-deepchox-session`.
 * Dexo thread fallback when API down: localStorage (see convo fallback below).
 */

export * from './projectTypes';
export { DEXO_CONVERSATION_AGENT } from './projectTypes';

import type {
  Project,
  JournalEntry,
  ProjectEvent,
  ProjectFile,
  ConversationMessage,
  SystemLog,
} from './projectTypes';
import { DEXO_CONVERSATION_AGENT } from './projectTypes';
import { getDeviceSessionId } from './deviceSession';

function ventureApiErrorMessage(data: unknown): string {
  const d = data as { error?: string; hint?: string };
  const parts = [d.error, d.hint].filter((x): x is string => typeof x === 'string' && x.length > 0);
  return parts.join(' — ') || 'request_failed';
}

function apiHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-deepchox-session': getDeviceSessionId(),
  };
}

let migrateOnce: Promise<void> | null = null;
async function ensureDexieMigrated(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!migrateOnce) {
    migrateOnce = import('./migrateDexieOnce').then((m) => m.runDexieMigrationIfNeeded());
  }
  await migrateOnce;
}

// --- Dexo / desk conversation fallback (when Postgres dexo-convo API unavailable) ---
const CONVO_FB = 'deepchox-convo-fb-v1:';

function convoFallbackKey(projectId: number): string {
  return `${CONVO_FB}${projectId}`;
}

// --- Public API ---

export async function getAllProjects(): Promise<Project[]> {
  await ensureDexieMigrated();
  const res = await fetch('/api/ventures', { headers: apiHeaders(), cache: 'no-store' });
  const data = (await res.json()) as { ok?: boolean; projects?: Project[] };
  if (!res.ok || !data.ok || !Array.isArray(data.projects)) {
    console.warn('[db] getAllProjects failed', res.status);
    return [];
  }
  return data.projects;
}

export async function getProject(id: number): Promise<Project | undefined> {
  await ensureDexieMigrated();
  const res = await fetch(`/api/ventures/${id}`, { headers: apiHeaders(), cache: 'no-store' });
  const data = (await res.json()) as { ok?: boolean; project?: Project };
  if (!res.ok || !data.ok || !data.project) return undefined;
  return data.project;
}

export async function saveProject(project: Project): Promise<number> {
  await ensureDexieMigrated();
  const ts =
    typeof project.timestamp === 'number' && !Number.isNaN(project.timestamp)
      ? project.timestamp
      : Date.now();
  const payload = { ...project, timestamp: ts };

  if (project.id != null && Number.isFinite(project.id)) {
    const res = await fetch(`/api/ventures/${project.id}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify({ project: payload }),
    });
    const data = await res.json();
    const parsed = data as { ok?: boolean; project?: Project };
    if (!res.ok || !parsed.ok || !parsed.project?.id) {
      throw new Error(ventureApiErrorMessage(data));
    }
    return parsed.project.id;
  }

  const res = await fetch('/api/ventures', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ project: payload }),
  });
  const data = await res.json();
  const parsed = data as { ok?: boolean; project?: Project };
  if (!res.ok || !parsed.ok || !parsed.project?.id) {
    throw new Error(ventureApiErrorMessage(data));
  }
  return parsed.project.id;
}

export async function deleteProject(id: number): Promise<void> {
  await fetch(`/api/ventures/${id}`, { method: 'DELETE', headers: apiHeaders() });
  try {
    localStorage.removeItem(convoFallbackKey(id));
  } catch {
    /* noop */
  }
}

export async function updateProjectField(id: number, field: keyof Project, value: unknown): Promise<void> {
  const res = await fetch(`/api/ventures/${id}`, {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify({ field, value }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(ventureApiErrorMessage(data));
  }
}

export async function addJournalEntry(projectId: number, entry: JournalEntry): Promise<void> {
  const p = await getProject(projectId);
  if (!p) return;
  const journal = [entry, ...(p.journal || [])];
  await updateProjectField(projectId, 'journal', journal);
}

export async function addProjectEvent(projectId: number, event: ProjectEvent): Promise<void> {
  const p = await getProject(projectId);
  if (!p) return;
  const events = [...(p.events || []), event];
  await updateProjectField(projectId, 'events', events);
}

export async function addProjectFile(projectId: number, file: ProjectFile): Promise<void> {
  const p = await getProject(projectId);
  if (!p) return;
  const files = [...(p.files || []), file];
  await updateProjectField(projectId, 'files', files);
}

export async function addLog(_log: Omit<SystemLog, 'id'>): Promise<void> {
  /* Reserved for future server logs */
}

export async function getRecentLogs(_limit = 50): Promise<SystemLog[]> {
  return [];
}

export async function saveMessage(_msg: Omit<ConversationMessage, 'id'>): Promise<void> {
  /* Legacy — unused */
}

export async function getProjectHistory(_projectId: number): Promise<ConversationMessage[]> {
  return [];
}

export async function getDexoConvoMessagesForProject(projectId: number): Promise<ConversationMessage[]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(convoFallbackKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConversationMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function replaceDexoConvoMessages(
  projectId: number,
  messages: { id: number; role: 'user' | 'dexo'; text: string }[]
): Promise<void> {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const rows: ConversationMessage[] = messages.map((m, i) => ({
    projectId,
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text,
    agentRole: DEXO_CONVERSATION_AGENT,
    timestamp: now + i,
    dexoClientId: m.id,
  }));
  try {
    localStorage.setItem(convoFallbackKey(projectId), JSON.stringify(rows));
  } catch {
    /* noop */
  }
}

export async function clearDexoConvoMessagesForProject(projectId: number): Promise<void> {
  try {
    localStorage.removeItem(convoFallbackKey(projectId));
  } catch {
    /* noop */
  }
}

export async function secureWipeDatabase(): Promise<void> {
  await fetch('/api/ventures/wipe-session', { method: 'POST', headers: apiHeaders() });
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CONVO_FB)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}
