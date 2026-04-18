'use client';

import { getDeviceSessionId } from '@/lib/deviceSession';

const FLAG = 'deepchox-venture-pg-migrated-v1';

async function exportDexieProjects(): Promise<import('@/lib/projectTypes').Project[] | null> {
  try {
    const Dexie = (await import('dexie')).default;
    const db = new Dexie('DeepChoxOrganicDB');
    db.version(1).stores({
      projects: '++id, name, timestamp',
      systemLogs: '++id, timestamp, agentRole, relatedProjectId',
      conversations: '++id, projectId, agentRole, timestamp',
    });
    const rows = await db.table('projects').toArray();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows as import('@/lib/projectTypes').Project[];
  } catch {
    return null;
  }
}

/** One-time: copy Dexie `projects` into Postgres, then drop IndexedDB. Safe to call repeatedly (no-op after flag). */
export async function runDexieMigrationIfNeeded(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(FLAG)) return;
    const session = getDeviceSessionId();
    if (!session) return;
    const rows = await exportDexieProjects();
    if (!rows?.length) {
      localStorage.setItem(FLAG, '1');
      return;
    }
    for (const row of rows) {
      await fetch('/api/ventures/import-legacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-deepchox-session': session,
        },
        body: JSON.stringify({ project: row }),
      });
    }
    localStorage.setItem(FLAG, '1');
    try {
      const Dexie = (await import('dexie')).default;
      const db = new Dexie('DeepChoxOrganicDB');
      await db.delete();
    } catch {
      /* noop */
    }
  } catch {
    /* ignore — app can still load empty */
  }
}
