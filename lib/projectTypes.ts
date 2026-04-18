/** Shared venture / desk types (Postgres-backed workspace). */

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

export type StaffAttentionRole = 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo' | 'chief_of_staff';

export interface StaffAttentionItem {
  id: string;
  role: StaffAttentionRole;
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
  staffAttentionItems?: StaffAttentionItem[];
  staffFocusToday?: string[];
  staffFocusCompletedLines?: string[];

  strategy: string;
  productPlan: string;
  budget: string;
  marketInsights: string;

  userNotes: string;
  teamDirectives: string;
  onboardingData: string;

  journal: JournalEntry[];
  events: ProjectEvent[];
  files: ProjectFile[];
  orgStructure: any[];
  kanban: any[];
  diary: any[];
  deskDocuments?: DeskDocument[];

  officeEngineMemoryJson?: string;
  agentCoordinationBrief?: string;
  roomPreferences?: Record<string, unknown>;
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
  source?: string;
}

export interface ConversationMessage {
  id?: number;
  projectId: number;
  role: string;
  content: string;
  agentRole: string;
  timestamp: number;
  dexoClientId?: number;
}

export const DEXO_CONVERSATION_AGENT = 'DEXO';
