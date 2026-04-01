import type { Project, ProjectEvent, StaffAttentionRole } from '@/lib/db';
import { parseVentureOnboarding } from '@/lib/ventureOnboarding';

const VALID: StaffAttentionRole[] = ['ceo', 'pm', 'accountant', 'scout', 'cmo', 'chief_of_staff'];

export function normalizeStaffAttentionRole(r: string): StaffAttentionRole {
  const x = (r || '').toLowerCase().trim();
  if (x === 'cfo' || x === 'finance') return 'accountant';
  if (x === 'cto' || x === 'product') return 'pm';
  if (x === 'cso' || x === 'market' || x === 'intel') return 'scout';
  if (x === 'marketing' || x === 'gtm') return 'cmo';
  if (VALID.includes(x as StaffAttentionRole)) return x as StaffAttentionRole;
  return 'chief_of_staff';
}

/** One step in the staff-sync pipeline (shown in “What ran”). */
export type AiSyncTraceStep = {
  id: string;
  label: string;
  detail?: string;
};

/** Parsed JSON from /api/agent-sync — each desk “researches” and proposes deltas. */
export interface AgentSyncPayload {
  summary: string;
  desks: {
    ceo: string;
    pm: string;
    accountant: string;
    scout: string;
    cmo: string;
  };
  appendMarketInsights?: string;
  appendBudget?: string;
  appendTeamDirectives?: string;
  appendUserNotes?: string;
  kanbanAdds?: { title: string; status: 'todo' | 'in_progress' | 'next' | 'completed' }[];
  eventAdds?: { title: string; type: ProjectEvent['type']; daysFromNow: number }[];
  /** Role-tagged “waiting for discussion” lines for the notification bell. */
  attentionItems?: { role: string; title: string; message: string }[];
  /** 3–7 bullets: what the founder should prioritize today after this sync. */
  focusToday?: string[];
}

export interface SyncProjectDTO {
  id: number;
  name: string;
  /** Wizard + goals — same source as Personal Assistant context. */
  ventureOnboarding?: Record<string, string>;
  strategy: string;
  productPlan: string;
  budget: string;
  marketInsights: string;
  userNotes: string;
  teamDirectives: string;
  events: { title: string; type: string; date: number }[];
  kanban: { title: string; status: string }[];
  journalPreview: { content: string; timestamp: number }[];
}

export function projectToSyncDto(p: Project): SyncProjectDTO {
  const journal = p.journal || [];
  const ventureOnboarding = parseVentureOnboarding(p.onboardingData);
  return {
    id: p.id!,
    name: p.name,
    ...(ventureOnboarding ? { ventureOnboarding } : {}),
    strategy: (p.strategy || '').slice(0, 12000),
    productPlan: (p.productPlan || '').slice(0, 12000),
    budget: (p.budget || '').slice(0, 8000),
    marketInsights: (p.marketInsights || '').slice(0, 8000),
    userNotes: (p.userNotes || '').slice(0, 6000),
    teamDirectives: (p.teamDirectives || '').slice(0, 6000),
    events: (p.events || []).slice(-20).map((e) => ({ title: e.title, type: e.type, date: e.date })),
    kanban: (p.kanban || []).slice(-40).map((t: { title?: string; status?: string }) => ({
      title: String(t.title || ''),
      status: String(t.status || ''),
    })),
    journalPreview: journal.slice(0, 5).map((j) => ({ content: j.content.slice(0, 500), timestamp: j.timestamp })),
  };
}
