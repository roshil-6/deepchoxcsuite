import type {
  Project,
  ProjectEvent,
  StaffAttentionItem,
  DeskDocument,
  AgentStaffSnapshot,
  JournalEntry,
  ProjectFile,
  OrgNode,
  KanbanTask,
} from '@/lib/db';

/**
 * Every venture (`Project`) field Deepchox may propose except `id` and `timestamp`
 * (identity / sort key — not AI-editable).
 */
export type DexoPatchContract = Partial<
  Omit<Project, 'id' | 'timestamp'>
>;

/** Keys compared when building a venture diff for proposals (excludes id / timestamp). */
export const DEXO_PATCHABLE_PROJECT_KEYS = [
  'name',
  'agentStaffSnapshot',
  'staffAttentionItems',
  'staffFocusToday',
  'staffFocusCompletedLines',
  'strategy',
  'productPlan',
  'budget',
  'marketInsights',
  'userNotes',
  'teamDirectives',
  'onboardingData',
  'journal',
  'events',
  'files',
  'orgStructure',
  'kanban',
  'diary',
  'deskDocuments',
  'officeEngineMemoryJson',
  'agentCoordinationBrief',
  'roomPreferences',
] as const satisfies ReadonlyArray<keyof DexoPatchContract>;

const MAX_TEXT = 40_000;
const MAX_ITEMS = 300;
const MAX_NAME_LEN = 240;
const MAX_OFFICE_MEMORY = 120_000;

const KAN_STATUSES: KanbanTask['status'][] = ['todo', 'in_progress', 'next', 'completed'];

function asString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, MAX_TEXT) : undefined;
}

function asArray<T>(v: unknown): T[] | undefined {
  return Array.isArray(v) ? (v as T[]).slice(0, MAX_ITEMS) : undefined;
}

function normalizeEvents(v: unknown): ProjectEvent[] | undefined {
  const list = asArray<Record<string, unknown>>(v);
  if (!list) return undefined;
  const out: ProjectEvent[] = [];
  for (const row of list) {
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const date = Number(row.date);
    const type = row.type;
    const id = typeof row.id === 'string' ? row.id : `evt-${Date.now()}-${out.length}`;
    if (!title || !Number.isFinite(date)) continue;
    if (type !== 'milestone' && type !== 'meeting' && type !== 'launch' && type !== 'deadline' && type !== 'task') continue;
    out.push({ id, title: title.slice(0, 240), date, type });
  }
  return out.length ? out : undefined;
}

function normalizeStaffAttention(v: unknown): StaffAttentionItem[] | undefined {
  const list = asArray<Record<string, unknown>>(v);
  if (!list) return undefined;
  const out: StaffAttentionItem[] = [];
  for (const row of list) {
    const id = typeof row.id === 'string' ? row.id : `att-${Date.now()}-${out.length}`;
    const role = typeof row.role === 'string' ? row.role : 'ceo';
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const message = typeof row.message === 'string' ? row.message.trim() : '';
    const createdAt = Number(row.createdAt);
    const dismissed = !!row.dismissed;
    if (!title || !message || !Number.isFinite(createdAt)) continue;
    out.push({
      id,
      role: role as StaffAttentionItem['role'],
      title: title.slice(0, 180),
      message: message.slice(0, 1000),
      createdAt,
      dismissed,
    });
  }
  return out.length ? out : undefined;
}

function normalizeDeskDocs(v: unknown): DeskDocument[] | undefined {
  const list = asArray<Record<string, unknown>>(v);
  if (!list) return undefined;
  const out: DeskDocument[] = [];
  for (const row of list) {
    const id = typeof row.id === 'string' ? row.id : `doc-${Date.now()}-${out.length}`;
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const category = row.category;
    const body = typeof row.body === 'string' ? row.body : '';
    const createdAt = Number(row.createdAt);
    if (!title || !body || !Number.isFinite(createdAt)) continue;
    if (category !== 'client' && category !== 'meeting' && category !== 'internal' && category !== 'other') continue;
    out.push({ id, title: title.slice(0, 220), category, body: body.slice(0, MAX_TEXT), createdAt });
  }
  return out.length ? out : undefined;
}

function normalizeAgentStaffSnapshot(v: unknown): AgentStaffSnapshot | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const at = Number(o.at);
  const summary = typeof o.summary === 'string' ? o.summary.trim().slice(0, MAX_TEXT) : '';
  const desksRaw = o.desks;
  if (!Number.isFinite(at) || !summary || !desksRaw || typeof desksRaw !== 'object' || Array.isArray(desksRaw)) return undefined;
  const d = desksRaw as Record<string, unknown>;
  const desk = (k: string) => (typeof d[k] === 'string' ? (d[k] as string).slice(0, MAX_TEXT) : '');
  const desks = {
    ceo: desk('ceo'),
    pm: desk('pm'),
    accountant: desk('accountant'),
    scout: desk('scout'),
    cmo: desk('cmo'),
  };
  return { at, summary, desks };
}

function normalizeStaffFocusCompletedLines(v: unknown): string[] | undefined {
  const list = asArray<unknown>(v)?.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 64);
  if (!list || list.length === 0) return undefined;
  return list.map((s) => s.slice(0, 500));
}

function normalizeJournal(v: unknown): JournalEntry[] | undefined {
  const list = asArray<Record<string, unknown>>(v);
  if (!list) return undefined;
  const out: JournalEntry[] = [];
  for (const row of list) {
    const id = typeof row.id === 'string' ? row.id : `jr-${Date.now()}-${out.length}`;
    const content = typeof row.content === 'string' ? row.content.trim() : '';
    const timestamp = Number(row.timestamp);
    if (!content || !Number.isFinite(timestamp)) continue;
    out.push({ id, content: content.slice(0, MAX_TEXT), timestamp });
  }
  return out.length ? out : undefined;
}

function normalizeProjectFiles(v: unknown): ProjectFile[] | undefined {
  const list = asArray<Record<string, unknown>>(v);
  if (!list) return undefined;
  const out: ProjectFile[] = [];
  for (const row of list) {
    const id = typeof row.id === 'string' ? row.id : `file-${Date.now()}-${out.length}`;
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const content = typeof row.content === 'string' ? row.content : '';
    const type = typeof row.type === 'string' ? row.type.slice(0, 64) : 'text/plain';
    const timestamp = Number(row.timestamp);
    if (!name || !Number.isFinite(timestamp)) continue;
    out.push({
      id,
      name: name.slice(0, 220),
      content: content.slice(0, MAX_TEXT),
      type,
      timestamp,
    });
  }
  return out.length ? out : undefined;
}

function normalizeOrgStructure(v: unknown): OrgNode[] | undefined {
  const list = asArray<Record<string, unknown>>(v);
  if (!list) return undefined;
  const out: OrgNode[] = [];
  for (const row of list) {
    const id = typeof row.id === 'string' ? row.id : `org-${Date.now()}-${out.length}`;
    const role = typeof row.role === 'string' ? row.role.trim() : '';
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const department = typeof row.department === 'string' ? row.department.trim() : '';
    const reportsTo = typeof row.reportsTo === 'string' ? row.reportsTo.trim() : '';
    if (!role || !name) continue;
    const description =
      typeof row.description === 'string' ? row.description.trim().slice(0, 2000) : undefined;
    out.push({
      id,
      role: role.slice(0, 120),
      name: name.slice(0, 120),
      department: department.slice(0, 120),
      reportsTo: reportsTo.slice(0, 120),
      ...(description ? { description } : {}),
    });
  }
  return out.length ? out : undefined;
}

function normalizeDiary(v: unknown): unknown[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const slice = v.slice(0, MAX_ITEMS);
  const out: unknown[] = [];
  for (const item of slice) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) out.push(item);
  }
  return out.length ? out : undefined;
}

function normalizeKanban(v: unknown): KanbanTask[] | undefined {
  const list = asArray<Record<string, unknown>>(v);
  if (!list) return undefined;
  const out: KanbanTask[] = [];
  for (const row of list) {
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!title) continue;
    const id = typeof row.id === 'string' ? row.id : `kb-${Date.now()}-${out.length}`;
    const rawSt = row.status;
    const status = KAN_STATUSES.includes(rawSt as KanbanTask['status']) ? (rawSt as KanbanTask['status']) : 'todo';
    const timestamp = Number(row.timestamp);
    out.push({
      id,
      title: title.slice(0, 400),
      status,
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    });
  }
  return out.length ? out : undefined;
}

function normalizeRoomPreferences(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  let n = 0;
  for (const [k, val] of Object.entries(o)) {
    if (n >= 80) break;
    const key = k.slice(0, 64);
    if (typeof val === 'string') out[key] = val.slice(0, 4000);
    else if (typeof val === 'number' && Number.isFinite(val)) out[key] = val;
    else if (typeof val === 'boolean') out[key] = val;
    else if (val === null) out[key] = null;
    n += 1;
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeOfficeMemoryJson(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, MAX_OFFICE_MEMORY);
}

export function sanitizeDexoPatch(raw: unknown): { ok: true; patch: DexoPatchContract } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Patch must be an object' };
  const r = raw as Record<string, unknown>;
  const patch: DexoPatchContract = {};

  if (typeof r.name === 'string') {
    const n = r.name.trim().slice(0, MAX_NAME_LEN);
    if (n) patch.name = n;
  }

  const strategy = asString(r.strategy);
  if (strategy !== undefined) patch.strategy = strategy;
  const productPlan = asString(r.productPlan);
  if (productPlan !== undefined) patch.productPlan = productPlan;
  const marketInsights = asString(r.marketInsights);
  if (marketInsights !== undefined) patch.marketInsights = marketInsights;
  const budget = asString(r.budget);
  if (budget !== undefined) patch.budget = budget;
  const teamDirectives = asString(r.teamDirectives);
  if (teamDirectives !== undefined) patch.teamDirectives = teamDirectives;
  const userNotes = asString(r.userNotes);
  if (userNotes !== undefined) patch.userNotes = userNotes;
  const onboardingData = asString(r.onboardingData);
  if (onboardingData !== undefined) patch.onboardingData = onboardingData;
  const agentCoordinationBrief = asString(r.agentCoordinationBrief);
  if (agentCoordinationBrief !== undefined) patch.agentCoordinationBrief = agentCoordinationBrief;

  const mem = normalizeOfficeMemoryJson(r.officeEngineMemoryJson);
  if (mem !== undefined) patch.officeEngineMemoryJson = mem;

  const agentStaffSnapshot = normalizeAgentStaffSnapshot(r.agentStaffSnapshot);
  if (agentStaffSnapshot !== undefined) patch.agentStaffSnapshot = agentStaffSnapshot;

  const staffFocusCompletedLines = normalizeStaffFocusCompletedLines(r.staffFocusCompletedLines);
  if (staffFocusCompletedLines !== undefined) patch.staffFocusCompletedLines = staffFocusCompletedLines;

  const kanban = normalizeKanban(r.kanban);
  if (kanban !== undefined) patch.kanban = kanban;

  const events = normalizeEvents(r.events);
  if (events !== undefined) patch.events = events;

  const staffFocusToday = asArray<unknown>(r.staffFocusToday)?.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 24);
  if (staffFocusToday !== undefined && staffFocusToday.length > 0) patch.staffFocusToday = staffFocusToday;

  const staffAttentionItems = normalizeStaffAttention(r.staffAttentionItems);
  if (staffAttentionItems !== undefined) patch.staffAttentionItems = staffAttentionItems;

  const deskDocuments = normalizeDeskDocs(r.deskDocuments);
  if (deskDocuments !== undefined) patch.deskDocuments = deskDocuments;

  const journal = normalizeJournal(r.journal);
  if (journal !== undefined) patch.journal = journal;

  const files = normalizeProjectFiles(r.files);
  if (files !== undefined) patch.files = files;

  const orgStructure = normalizeOrgStructure(r.orgStructure);
  if (orgStructure !== undefined) patch.orgStructure = orgStructure;

  const diary = normalizeDiary(r.diary);
  if (diary !== undefined) patch.diary = diary;

  const roomPreferences = normalizeRoomPreferences(r.roomPreferences);
  if (roomPreferences !== undefined) patch.roomPreferences = roomPreferences;

  if (Object.keys(patch).length === 0) return { ok: false, error: 'Patch is empty or unsupported' };
  return { ok: true, patch };
}

/** Fields considered low-risk for hybrid auto-apply (no strategy/product/budget/kanban/org/files/journal). */
const HYBRID_AUTO_APPLY_KEYS = new Set<string>([
  'staffFocusToday',
  'staffAttentionItems',
  'userNotes',
  'roomPreferences',
  'events',
  'staffFocusCompletedLines',
  'name',
]);

const HYBRID_MAX_USER_NOTES = 8000;
const HYBRID_MAX_EVENTS = 14;
const HYBRID_MAX_NAME = 96;

/**
 * Hybrid mode auto-applies only when every touched key is in the safe set and size caps pass.
 */
export function isHybridAutoApplyPatch(patch: DexoPatchContract): boolean {
  const keys = Object.keys(patch).filter((k) => {
    const v = patch[k as keyof DexoPatchContract];
    return v !== undefined && v !== null;
  });
  if (keys.length === 0) return false;
  for (const k of keys) {
    if (!HYBRID_AUTO_APPLY_KEYS.has(k)) return false;
  }
  const notes = patch.userNotes;
  if (typeof notes === 'string' && notes.length > HYBRID_MAX_USER_NOTES) return false;
  if (patch.events && patch.events.length > HYBRID_MAX_EVENTS) return false;
  if (patch.name && typeof patch.name === 'string' && patch.name.length > HYBRID_MAX_NAME) return false;
  return true;
}

export function patchFieldLabels(patch: DexoPatchContract): string[] {
  return Object.keys(patch)
    .map((k) => {
      switch (k) {
        case 'name':
          return 'Venture name';
        case 'strategy':
          return 'Strategy';
        case 'productPlan':
          return 'Product plan';
        case 'marketInsights':
          return 'Market insights';
        case 'budget':
          return 'Budget';
        case 'teamDirectives':
          return 'Team directives';
        case 'kanban':
          return 'Execution board';
        case 'userNotes':
          return 'Founder notes';
        case 'onboardingData':
          return 'Onboarding';
        case 'events':
          return 'Calendar events';
        case 'staffFocusToday':
          return 'Staff focus';
        case 'staffFocusCompletedLines':
          return 'Staff focus (done)';
        case 'staffAttentionItems':
          return 'Staff attention';
        case 'deskDocuments':
          return 'Desk documents';
        case 'roomPreferences':
          return 'Room preferences';
        case 'journal':
          return 'Journal';
        case 'files':
          return 'Files';
        case 'orgStructure':
          return 'Org structure';
        case 'diary':
          return 'Diary';
        case 'officeEngineMemoryJson':
          return 'Office memory';
        case 'agentCoordinationBrief':
          return 'Agent coordination';
        case 'agentStaffSnapshot':
          return 'Staff snapshot';
        default:
          return k;
      }
    })
    .filter(Boolean);
}
