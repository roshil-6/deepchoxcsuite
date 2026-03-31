import type { Project, ProjectEvent, KanbanTask } from '@/lib/db';
import { parseStrategy, serializeStrategy } from '@/lib/strategyDoc';
import { ensureSingleActivePhase } from '@/lib/strategyDoc';
import type { Priority, StrategyPhase } from '@/lib/strategyDoc';

/** Structured edits returned by POST /api/personal-assistant — merged into Dexie Project. */
export type PersonalAssistantUpdates = {
  appendUserNotes?: string;
  appendTeamDirectives?: string;
  appendMarketInsights?: string;
  appendBudget?: string;
  appendProductPlan?: string;
  strategy?: {
    /** When non-empty, replaces the priorities list (max 40). */
    mergePriorities?: Priority[];
    /** When non-empty, replaces phases after validation (max 24). */
    mergePhases?: StrategyPhase[];
    setStrategicIntent?: string;
    setVision?: string;
    appendContent?: string;
  };
  kanbanAdds?: { title: string; status: KanbanTask['status'] }[];
  eventAdds?: { title: string; type: ProjectEvent['type']; daysFromNow: number }[];
};

export function mergeProjectWithPAUpdates(project: Project, updates: PersonalAssistantUpdates): Project {
  const stamp = `\n\n--- Personal Assistant ${new Date().toISOString()} ---\n\n`;
  let next: Project = { ...project };

  if (updates.appendUserNotes?.trim()) {
    next.userNotes = (next.userNotes || '') + stamp + updates.appendUserNotes.trim();
  }
  if (updates.appendTeamDirectives?.trim()) {
    next.teamDirectives = (next.teamDirectives || '') + stamp + updates.appendTeamDirectives.trim();
  }
  if (updates.appendMarketInsights?.trim()) {
    next.marketInsights = (next.marketInsights || '') + stamp + updates.appendMarketInsights.trim();
  }
  if (updates.appendBudget?.trim()) {
    next.budget = (next.budget || '') + stamp + updates.appendBudget.trim();
  }
  if (updates.appendProductPlan?.trim()) {
    next.productPlan = (next.productPlan || '') + stamp + updates.appendProductPlan.trim();
  }

  if (updates.strategy && Object.keys(updates.strategy).length > 0) {
    const doc = parseStrategy(next.strategy || '');
    const s = updates.strategy;
    if (s.mergePriorities && s.mergePriorities.length > 0) {
      doc.priorities = s.mergePriorities.slice(0, 40).map((p) => ({
        id: String(p.id || `pa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        title: String(p.title || '').slice(0, 500),
        done: Boolean(p.done),
      }));
    }
    if (s.mergePhases && s.mergePhases.length > 0) {
      const raw = s.mergePhases.slice(0, 24).map((ph) => ({
        id: String(ph.id || `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        title: String(ph.title || '').slice(0, 500),
        start: String(ph.start || ''),
        end: String(ph.end || ''),
        notes: String(ph.notes || '').slice(0, 2000),
        status: (['planned', 'in_progress', 'done'].includes(String(ph.status))
          ? ph.status
          : 'planned') as StrategyPhase['status'],
      }));
      doc.phases = ensureSingleActivePhase(raw);
    }
    if (s.setStrategicIntent?.trim()) doc.strategicIntent = s.setStrategicIntent.trim().slice(0, 8000);
    if (s.setVision?.trim()) doc.vision = s.setVision.trim().slice(0, 8000);
    if (s.appendContent?.trim()) {
      doc.content = (doc.content || '') + (doc.content ? '\n\n' : '') + s.appendContent.trim();
    }
    next.strategy = serializeStrategy(doc);
  }

  if (updates.kanbanAdds?.length) {
    const kanban = [...(next.kanban || [])] as KanbanTask[];
    for (const k of updates.kanbanAdds) {
      if (!k?.title?.trim()) continue;
      const st = ['todo', 'in_progress', 'next', 'completed'].includes(k.status) ? k.status : 'todo';
      kanban.push({
        id: `pa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: k.title.trim().slice(0, 500),
        status: st as KanbanTask['status'],
        timestamp: Date.now(),
      });
    }
    next.kanban = kanban;
  }

  if (updates.eventAdds?.length) {
    const events = [...(next.events || [])];
    const day = 86400000;
    const allowed: ProjectEvent['type'][] = ['milestone', 'meeting', 'launch', 'deadline', 'task'];
    for (const e of updates.eventAdds) {
      if (!e?.title?.trim()) continue;
      const typ = allowed.includes(e.type as ProjectEvent['type']) ? e.type : 'task';
      events.push({
        id: `pa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: e.title.trim().slice(0, 500),
        type: typ as ProjectEvent['type'],
        date: Date.now() + Math.max(0, Number(e.daysFromNow) || 0) * day,
      });
    }
    next.events = events;
  }

  next.timestamp = Date.now();
  return next;
}

/** Parse model JSON `updates` object safely (API route + tests). */
export function parsePersonalAssistantUpdatesFromModel(raw: unknown): PersonalAssistantUpdates {
  if (!raw || typeof raw !== 'object') return {};
  const u = raw as Record<string, unknown>;
  const out: PersonalAssistantUpdates = {};
  const g = (k: string) => (typeof u[k] === 'string' ? u[k] : '') as string;
  if (g('appendUserNotes').trim()) out.appendUserNotes = g('appendUserNotes').trim();
  if (g('appendTeamDirectives').trim()) out.appendTeamDirectives = g('appendTeamDirectives').trim();
  if (g('appendMarketInsights').trim()) out.appendMarketInsights = g('appendMarketInsights').trim();
  if (g('appendBudget').trim()) out.appendBudget = g('appendBudget').trim();
  if (g('appendProductPlan').trim()) out.appendProductPlan = g('appendProductPlan').trim();

  const strat = u.strategy;
  if (strat && typeof strat === 'object') {
    const s = strat as Record<string, unknown>;
    out.strategy = {};
    if (Array.isArray(s.mergePriorities) && s.mergePriorities.length) {
      out.strategy.mergePriorities = s.mergePriorities as Priority[];
    }
    if (Array.isArray(s.mergePhases) && s.mergePhases.length) {
      out.strategy.mergePhases = s.mergePhases as StrategyPhase[];
    }
    if (typeof s.setStrategicIntent === 'string' && s.setStrategicIntent.trim()) {
      out.strategy.setStrategicIntent = s.setStrategicIntent.trim();
    }
    if (typeof s.setVision === 'string' && s.setVision.trim()) {
      out.strategy.setVision = s.setVision.trim();
    }
    if (typeof s.appendContent === 'string' && s.appendContent.trim()) {
      out.strategy.appendContent = s.appendContent.trim();
    }
    if (Object.keys(out.strategy).length === 0) delete out.strategy;
  }

  if (Array.isArray(u.kanbanAdds) && u.kanbanAdds.length) {
    out.kanbanAdds = u.kanbanAdds as PersonalAssistantUpdates['kanbanAdds'];
  }
  if (Array.isArray(u.eventAdds) && u.eventAdds.length) {
    out.eventAdds = u.eventAdds as PersonalAssistantUpdates['eventAdds'];
  }

  return out;
}

/** Trimmed venture snapshot for POST /api/personal-assistant (Groq context limits). */
export function projectPayloadForPA(p: Project): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    strategy: (p.strategy || '').slice(0, 20000),
    productPlan: (p.productPlan || '').slice(0, 12000),
    budget: (p.budget || '').slice(0, 8000),
    marketInsights: (p.marketInsights || '').slice(0, 8000),
    userNotes: (p.userNotes || '').slice(0, 6000),
    teamDirectives: (p.teamDirectives || '').slice(0, 6000),
    events: (p.events || []).slice(-30),
    kanban: (p.kanban || []).slice(-40),
    journal: (p.journal || []).slice(0, 5).map((j) => ({ ...j, content: j.content.slice(0, 500) })),
    files: (p.files || []).slice(0, 8).map((f) => ({ ...f, content: (f.content || '').slice(0, 4000) })),
    staffFocusToday: p.staffFocusToday,
    agentStaffSnapshot: p.agentStaffSnapshot
      ? { at: p.agentStaffSnapshot.at, summary: p.agentStaffSnapshot.summary.slice(0, 2000) }
      : undefined,
  };
}

export function summarizeAppliedUpdates(u: PersonalAssistantUpdates): string {
  const parts: string[] = [];
  if (u.strategy?.mergePriorities?.length) parts.push('priorities');
  if (u.strategy?.mergePhases?.length) parts.push('phases / progression');
  if (u.strategy?.setStrategicIntent || u.strategy?.setVision || u.strategy?.appendContent) parts.push('strategy narrative');
  if (u.appendProductPlan) parts.push('product plan');
  if (u.appendBudget) parts.push('budget');
  if (u.appendMarketInsights) parts.push('market intel');
  if (u.appendTeamDirectives) parts.push('directives');
  if (u.appendUserNotes) parts.push('notes');
  if (u.kanbanAdds?.length) parts.push('kanban');
  if (u.eventAdds?.length) parts.push('calendar');
  if (parts.length === 0) return '';
  return `\n\n_Applied updates: ${parts.join(', ')}._`;
}
