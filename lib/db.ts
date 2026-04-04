import Dexie, { Table } from 'dexie';

// --- Interfaces ---

/** Latest multi-desk AI staff sync — summaries per role (does not replace manual CEO/PM JSON). */
export interface AgentStaffSnapshot {
  at: number;
  summary: string;
  desks: {
    ceo: string;
    pm: string;
    accountant: string;
    scout: string;
    cmo: string;
  };
}

/** Role-tagged “waiting for you” items after staff sync (bell + desk banners). */
export type StaffAttentionRole = 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo' | 'chief_of_staff';

export interface StaffAttentionItem {
  id: string;
  role: StaffAttentionRole;
  /** Short headline, e.g. “CFO — discuss runway” */
  title: string;
  message: string;
  createdAt: number;
  dismissed?: boolean;
}

export interface Project {
  id?: number;
  name: string;
  timestamp: number;

  agentStaffSnapshot?: AgentStaffSnapshot;

  /** In-app staff notifications (replaced each sync; user can dismiss). */
  staffAttentionItems?: StaffAttentionItem[];
  /** Short bullets from latest sync — “what to focus on today”. */
  staffFocusToday?: string[];
  /** Subset of staffFocusToday lines the founder marked done (exact string match); pruned when sync replaces focus list. */
  staffFocusCompletedLines?: string[];

  // Strategy (CEO)
  strategy: string; // JSON string

  // Product (PM)
  productPlan: string;

  // Finance (CFO)
  budget: string;

  // Intelligence (Scout)
  marketInsights: string;

  // Shared Narrative fields
  userNotes: string;
  teamDirectives: string;
  onboardingData: string;

  // Arrays
  journal: JournalEntry[];
  events: ProjectEvent[];
  files: ProjectFile[];
  orgStructure: any[];
  kanban: any[];
  diary: any[];
  /** Cross-desk documents (clients, meetings, notes) */
  deskDocuments?: DeskDocument[];

  /** JSON string: Living Office Engine continuity (see lib/office/officeMemory.ts). */
  officeEngineMemoryJson?: string;
}

export interface DeskDocument {
  id: string;
  title: string;
  category: 'client' | 'meeting' | 'internal' | 'other';
  body: string;
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  content: string;
  timestamp: number;
}

export interface ProjectEvent {
  id: string;
  title: string;
  date: number;
  type: 'milestone' | 'meeting' | 'launch' | 'deadline' | 'task';
}

export interface ProjectFile {
  id: string;
  name: string;
  content: string;
  type: string;
  timestamp: number;
}

export interface KanbanTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'next' | 'completed';
  timestamp: number;
}

export interface OrgNode {
  id: string;
  role: string;
  name: string;
  department: string;
  reportsTo: string;
  description?: string;
}

export interface SystemLog {
  id?: number;
  timestamp: number;
  agentRole: string;
  message: string;
  type: 'info' | 'alert' | 'success' | 'warning' | 'error';
  relatedProjectId?: number;
  source?: string; // Compatibility
}

export interface ConversationMessage {
  id?: number;
  projectId: number;
  role: string; // 'user' | 'assistant'
  content: string;
  agentRole: string; // 'CEO', 'CFO', etc.
  timestamp: number;
}

// --- Database Class ---

class DeepChoxDB extends Dexie {
  projects!: Table<Project>;
  systemLogs!: Table<SystemLog>;
  conversations!: Table<ConversationMessage>;

  constructor() {
    super('DeepChoxOrganicDB');
    this.version(1).stores({
      projects: '++id, name, timestamp',
      systemLogs: '++id, timestamp, agentRole, relatedProjectId',
      conversations: '++id, projectId, agentRole, timestamp'
    });
  }
}

export const db = new DeepChoxDB();

// --- Helper Functions ---

export async function saveProject(project: Project): Promise<number> {
  const id = await db.projects.put(project);
  return id as number;
}

export async function getAllProjects(): Promise<Project[]> {
  return await db.projects.orderBy('timestamp').reverse().toArray();
}

export async function deleteProject(id: number): Promise<void> {
  await db.projects.delete(id);
}

export async function getProject(id: number): Promise<Project | undefined> {
  return await db.projects.get(id);
}

export async function addLog(log: Omit<SystemLog, 'id'>) {
  return await db.systemLogs.add(log);
}

export async function getRecentLogs(limit = 50): Promise<SystemLog[]> {
  return await db.systemLogs.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function saveMessage(msg: Omit<ConversationMessage, 'id'>) {
  return await db.conversations.add(msg);
}

export async function getProjectHistory(projectId: number): Promise<ConversationMessage[]> {
  return await db.conversations.where('projectId').equals(projectId).sortBy('timestamp');
}

// --- Compatibility Functions (for OfficeContext) ---

export async function updateProjectField(id: number, field: keyof Project, value: any) {
  await db.projects.update(id, { [field]: value });
}

export async function addJournalEntry(projectId: number, entry: JournalEntry) {
  const project = await db.projects.get(projectId);
  if (project) {
    const updatedJournal = [entry, ...(project.journal || [])];
    await db.projects.update(projectId, { journal: updatedJournal });
  }
}

export async function addProjectEvent(projectId: number, event: ProjectEvent) {
  const project = await db.projects.get(projectId);
  if (project) {
    const updatedEvents = [...(project.events || []), event];
    await db.projects.update(projectId, { events: updatedEvents });
  }
}

export async function addProjectFile(projectId: number, file: ProjectFile) {
  const project = await db.projects.get(projectId);
  if (project) {
    const updatedFiles = [...(project.files || []), file];
    await db.projects.update(projectId, { files: updatedFiles });
  }
}

export async function secureWipeDatabase() {
  await db.delete();
  await db.open();
}
