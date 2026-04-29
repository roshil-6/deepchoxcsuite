'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  Project,
  StaffAttentionItem,
  addJournalEntry,
  addProjectEvent,
  addProjectFile,
  getAllProjects,
  JournalEntry,
  ProjectEvent,
  ProjectFile,
  saveProject,
  secureWipeDatabase,
} from './db';
import { formatVentureOnboardingForPrompt } from '@/lib/ventureOnboarding';
import {
  projectToSyncDto,
  type AgentSyncPayload,
  type AiSyncTraceStep,
  normalizeStaffAttentionRole,
} from './agentStaffTypes';
import { Target, ClipboardList, Calculator, ScanSearch, LayoutDashboard, Bot, Gavel, Megaphone } from 'lucide-react';
import { RESEARCH_STAFF } from '@/lib/researchStaffLabels';
import { emptyVentureShell } from '@/lib/minimalVenture';
import { parseStrategy, serializeStrategy } from '@/lib/strategyDoc';
import { formatProductPlanForContext, formatStrategyForContext } from '@/lib/ventureReadableContext';
import {
  type ExecutiveThreadMessage,
  loadExecutiveThread,
  saveExecutiveThread,
} from '@/lib/executiveThread';
import type { DailyOfficeCycleResult } from '@/types/office';
import { runDailyOfficeCycle } from '@/lib/office/dailyOfficeEngine';
import {
  appendUnresolvedRisk,
  getOfficeMemory,
  serializeOfficeMemory,
  setLastFocus,
  updateOfficeMemory,
} from '@/lib/office/officeMemory';
import { formatDailyBriefThreadMessage } from '@/lib/office/languageLayer';
import type { DexoBootstrapPayload } from '@/lib/dexoBootstrap';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { buildDexoJarvisVentureContext } from '@/lib/dexoJarvisContext';

export type AgentRole = 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo' | 'dexo' | 'shark';

/** Any research desk — which block is in focus (feeds desk chat context). */
export type DeskSectionFocus = { room: string; sectionId: string; title: string; prompt: string };

export interface AgentPersona {
  /** Full line for tooltips, e.g. "strategy & direction research staff" */
  name: string;
  /** Sidebar primary label */
  title: string;
  /** One-line hint under the title */
  execOutput: string;
  role: AgentRole;
  style: string;
  /** What this desk is for (plain language) */
  description: string;
  icon: ReactNode;
}

export interface SystemState {
  alertLevel: 'stable' | 'elevated' | 'critical';
  networkStatus: 'secure' | 'analysing' | 'breach';
  encryptionLevel: 'standard' | 'quantum';
  isDeepWork: boolean;
  globalMood: 'optimistic' | 'neutral' | 'caution' | 'crisis';
  lastSync: number;
}

export interface OfficeContextType {
  // State
  activeRoom: AgentRole | 'dashboard' | 'calendar' | 'reports' | 'founders_office' | 'dexo' | 'forge' | 'wargame' | 'vc_gauntlet' | 'org_structure' | 'intelligence_diary' | 'personal_assistant' | 'suite_intelligence' | 'desks_hub';
  activeProject: Project | null;
  allProjects: Project[];
  systemState: SystemState;

  // Agent Personas
  agents: Record<AgentRole, AgentPersona>;
  pendingChat: { role: AgentRole; message: string } | null;
  setPendingChat: (val: { role: AgentRole; message: string } | null) => void;

  /** When set, Dexo shows setup context and opens a converse turn (consumed when Dexo reads it). */
  dexoBootstrap: DexoBootstrapPayload | null;
  setDexoBootstrap: (val: DexoBootstrapPayload | null) => void;

  /** Shared PA + Chief-of-staff messages for the active venture (localStorage per project). */
  executiveThread: ExecutiveThreadMessage[];
  appendExecutiveThread: (msg: ExecutiveThreadMessage) => void;
  setExecutiveThread: (messages: ExecutiveThreadMessage[]) => void;
  clearExecutiveThread: () => void;

  /** Active desk block in focus — cleared when switching rooms. */
  deskSectionFocus: DeskSectionFocus | null;
  setDeskSectionFocus: (v: DeskSectionFocus | null) => void;

  /** Intelligence Suite: which role accordion is open (`null` = page hub). Cleared on room switch. */
  suiteIntelOpenDesk: string | null;
  setSuiteIntelOpenDesk: (v: string | null) => void;

  // Actions
  switchRoom: (room: AgentRole | 'dashboard' | 'calendar' | 'reports' | 'founders_office' | 'dexo' | 'forge' | 'wargame' | 'vc_gauntlet' | 'org_structure' | 'intelligence_diary' | 'personal_assistant' | 'suite_intelligence' | 'desks_hub') => void;

  /** Multi-desk AI staff run: merges research into venture sections (requires GROQ on server). */
  agentSyncRunning: boolean;
  runAgentStaffSync: () => Promise<{ ok: boolean; error?: string }>;
  setActiveProject: (project: Project | null) => void;
  /** Merge fields into the active venture without changing room (use instead of setActiveProject when updating from Calendar, etc.). */
  patchActiveProject: (updates: Partial<Project>) => void;
  setAllProjects: (projects: Project[]) => void;
  createNewProject: () => void;
  toggleDeepWork: (status?: boolean) => void;
  setSystemAlert: (level: SystemState['alertLevel']) => void;

  // Broadcast
  broadcastDirective: (message: string) => void;

  // System Logs & Events
  systemLogs: SystemLog[];
  addSystemLog: (message: string, source: string, type?: SystemLog['type']) => void;

  // Project update methods
  updateStrategy: (strategy: string) => void;
  updateProductPlan: (plan: string) => void;
  updateBudget: (budget: string) => void;
  updateMarketInsights: (insights: string) => void;
  updateNotes: (notes: string) => void;
  updateDirectives: (directives: string) => void;
  updateProjectField: (field: string, value: any) => Promise<void>;
  /** Mark a staff-sync focus bullet done; optional note is appended to the venture journal for the AI stack. */
  markStaffFocusLineDone: (line: string, note?: string) => Promise<void>;
  /** Save full venture row and refresh lists without changing room (e.g. after Personal Assistant merges updates). */
  persistActiveProject: (project: Project) => Promise<void>;

  // New Methods
  addJournal: (content: string) => void;
  addEvent: (title: string, date: number, type: ProjectEvent['type']) => Promise<void>;
  addFile: (name: string, content: string, type: string) => void; // New
  prepopulateChat: (role: AgentRole, message: string) => void;
  resetSystem: () => Promise<void>;

  /** Staff “waiting for you” notifications (non-dismissed). */
  staffAttentionPending: StaffAttentionItem[];
  dismissStaffAttention: (id: string) => Promise<void>;
  syncToastMessage: string | null;
  /** Steps the server ran for the last successful staff sync (intel → Groq → parse). */
  lastAiSyncTrace: AiSyncTraceStep[] | null;
  dismissSyncToast: () => void;

  /** Dual-agent status from the last staff sync — which agents succeeded and how long it took. */
  lastSyncDualAgent: { gpt: boolean; claude: boolean; durationMs: number; at: string } | null;

  /** Living Office Engine — last daily cycle output for dashboards / context panel */
  livingOffice: DailyOfficeCycleResult | null;
  /** Recompute brief, tasks intel, notifications; persists office memory; may append one PA brief per local day */
  refreshLivingOffice: (projectOverride?: Project | null) => Promise<void>;
}

export interface SystemLog {
  id: string;
  timestamp: number;
  message: string;
  source: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

// Define Agent Personas with Lucide Icons
const AGENT_PERSONAS: Record<AgentRole, AgentPersona> = {
  ceo: {
    name: RESEARCH_STAFF.ceo.line,
    title: RESEARCH_STAFF.ceo.navTitle,
    execOutput: RESEARCH_STAFF.ceo.navHint,
    role: 'ceo',
    style: 'Strategic leadership',
    description: RESEARCH_STAFF.ceo.deskHelp,
    icon: <Target className="w-5 h-5" />,
  },
  accountant: {
    name: RESEARCH_STAFF.accountant.line,
    title: RESEARCH_STAFF.accountant.navTitle,
    execOutput: RESEARCH_STAFF.accountant.navHint,
    role: 'accountant',
    style: 'Capital & control',
    description: RESEARCH_STAFF.accountant.deskHelp,
    icon: <Calculator className="w-5 h-5" />,
  },
  pm: {
    name: RESEARCH_STAFF.pm.line,
    title: RESEARCH_STAFF.pm.navTitle,
    execOutput: RESEARCH_STAFF.pm.navHint,
    role: 'pm',
    style: 'Product & systems delivery',
    description: RESEARCH_STAFF.pm.deskHelp,
    icon: <ClipboardList className="w-5 h-5" />,
  },
  cmo: {
    name: RESEARCH_STAFF.cmo.line,
    title: RESEARCH_STAFF.cmo.navTitle,
    execOutput: RESEARCH_STAFF.cmo.navHint,
    role: 'cmo',
    style: 'Market motion',
    description: RESEARCH_STAFF.cmo.deskHelp,
    icon: <Megaphone className="w-5 h-5" />,
  },
  scout: {
    name: RESEARCH_STAFF.scout.line,
    title: RESEARCH_STAFF.scout.navTitle,
    execOutput: RESEARCH_STAFF.scout.navHint,
    role: 'scout',
    style: 'Evidence-led strategy',
    description: RESEARCH_STAFF.scout.deskHelp,
    icon: <ScanSearch className="w-5 h-5" />,
  },
  dexo: {
    name: RESEARCH_STAFF.dexo.line,
    title: RESEARCH_STAFF.dexo.navTitle,
    execOutput: RESEARCH_STAFF.dexo.navHint,
    role: 'dexo',
    style: 'Cross-desk intelligence',
    description: RESEARCH_STAFF.dexo.deskHelp,
    icon: <Bot className="w-5 h-5" />,
  },
  shark: {
    name: RESEARCH_STAFF.shark.line,
    title: RESEARCH_STAFF.shark.navTitle,
    execOutput: RESEARCH_STAFF.shark.navHint,
    role: 'shark',
    style: 'Adversarial review',
    description: RESEARCH_STAFF.shark.deskHelp,
    icon: <Gavel className="w-5 h-5" />,
  },
};

// Create the Context
const OfficeContext = createContext<OfficeContextType | undefined>(undefined);

// Context Provider Component
export function OfficeProvider({ children }: { children: ReactNode }) {
  const [activeRoom, setActiveRoom] = useState<
    AgentRole | 'dashboard' | 'calendar' | 'reports' | 'founders_office' | 'dexo' | 'forge' | 'wargame' | 'vc_gauntlet' | 'org_structure' | 'intelligence_diary' | 'personal_assistant' | 'suite_intelligence' | 'desks_hub'
  >('dexo');
  const [agentSyncRunning, setAgentSyncRunning] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [lastAiSyncTrace, setLastAiSyncTrace] = useState<AiSyncTraceStep[] | null>(null);
  const [lastSyncDualAgent, setLastSyncDualAgent] = useState<{ gpt: boolean; claude: boolean; durationMs: number; at: string } | null>(null);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [pendingChat, setPendingChat] = useState<{ role: AgentRole; message: string } | null>(null);
  const [dexoBootstrap, setDexoBootstrap] = useState<DexoBootstrapPayload | null>(null);
  const [deskSectionFocus, setDeskSectionFocus] = useState<DeskSectionFocus | null>(null);
  const [suiteIntelOpenDesk, setSuiteIntelOpenDesk] = useState<string | null>(null);
  const [executiveThread, setExecutiveThread] = useState<ExecutiveThreadMessage[]>([]);
  const [systemState, setSystemState] = useState<SystemState>({
    alertLevel: 'stable',
    networkStatus: 'secure',
    encryptionLevel: 'standard',
    isDeepWork: false,
    globalMood: 'neutral',
    lastSync: Date.now()
  });

  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [livingOffice, setLivingOffice] = useState<DailyOfficeCycleResult | null>(null);

  const staffAttentionPending = useMemo(
    () => (activeProject?.staffAttentionItems || []).filter((a) => !a.dismissed),
    [activeProject?.staffAttentionItems]
  );

  useEffect(() => {
    const id = activeProject?.id;
    if (!id) {
      setExecutiveThread([]);
      return;
    }
    const loaded = loadExecutiveThread(id);
    if (!activeProject || !isVentureFoundationSparse(activeProject)) {
      setExecutiveThread(loaded);
      return;
    }
    const hasUserReply = loaded.some((m) => m.role === 'user' && m.content.trim().length > 0);
    const cleaned = hasUserReply
      ? loaded
      : loaded.filter((m) => {
          if (m.role !== 'assistant' || m.channel !== 'pa') return true;
          if (
            m.content.startsWith("I'm Relay — your Personal Assistant for this venture.") ||
            m.content.startsWith("Welcome — I'm Relay, your Personal Assistant for this venture.")
          ) return false;
          if (m.content.includes('My one focus for you today:')) return false;
          if (m.id.startsWith('pa-welcome-') || m.id.startsWith('morning-brief-')) return false;
          return true;
        });
    setExecutiveThread(cleaned);
  }, [activeProject]);

  useEffect(() => {
    const id = activeProject?.id;
    if (!id) return;
    const t = window.setTimeout(() => saveExecutiveThread(id, executiveThread), 280);
    return () => window.clearTimeout(t);
  }, [executiveThread, activeProject?.id]);

  useEffect(() => {
    if (!activeProject?.id) return;
    const contextSnapshot = buildDexoJarvisVentureContext(activeProject);
    void fetch('/api/dexo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ventureRegistryUpsert',
        payload: {
          ventureId: activeProject.id,
          ventureName: activeProject.name,
          contextSnapshot,
          sparseContext: isVentureFoundationSparse(activeProject),
          isActive: true,
        },
      }),
    }).catch(() => {
      /* non-blocking registry refresh */
    });
  }, [activeProject]);

  const appendExecutiveThread = useCallback((msg: ExecutiveThreadMessage) => {
    setExecutiveThread((prev) => [...prev, msg]);
  }, []);

  const clearExecutiveThread = useCallback(() => {
    setExecutiveThread([]);
  }, []);

  const activeProjectRef = useRef<Project | null>(null);
  activeProjectRef.current = activeProject;
  const refreshLivingOfficeRef = useRef<((o?: Project | null) => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    if (!syncToastMessage) return;
    const t = window.setTimeout(() => {
      setSyncToastMessage(null);
      // Keep lastAiSyncTrace — Intelligence Suite shows the full process until the next sync.
    }, 9000);
    return () => window.clearTimeout(t);
  }, [syncToastMessage]);

  const dismissSyncToast = () => {
    setSyncToastMessage(null);
  };

  const dismissStaffAttention = async (id: string) => {
    if (!activeProject?.id) return;
    const list = (activeProject.staffAttentionItems || []).map((a) =>
      a.id === id ? { ...a, dismissed: true } : a
    );
    const next = { ...activeProject, staffAttentionItems: list };
    await saveProject(next);
    setActiveProjectState(next);
    const projects = await getAllProjects();
    setAllProjects(projects);
  };

  const addSystemLog = (message: string, source: string, type: SystemLog['type'] = 'info') => {
    const newLog: SystemLog = {
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
      timestamp: Date.now(),
      message,
      source,
      type
    };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  /**
   * Switch between different agent rooms or views.
   * Must stay referentially stable — `app/page.tsx` and other callers depend on it in effect deps;
   * a new function every render would re-fire those effects and force `switchRoom('dexo')` repeatedly.
   */
  const switchRoom = useCallback(
    (
      room:
        | AgentRole
        | 'dashboard'
        | 'calendar'
        | 'reports'
        | 'founders_office'
        | 'dexo'
        | 'forge'
        | 'wargame'
        | 'vc_gauntlet'
        | 'org_structure'
        | 'intelligence_diary'
        | 'personal_assistant'
        | 'suite_intelligence'
        | 'desks_hub'
    ) => {
      setDeskSectionFocus(null);
      setSuiteIntelOpenDesk(null);
      if (room !== 'dexo' && room !== 'personal_assistant') {
        setDexoBootstrap(null);
      }
      setActiveRoom(room);
    },
    []
  );

  const runAgentStaffSync = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!activeProject?.id) {
      addSystemLog('Select a venture before running staff sync.', 'agent-sync', 'warning');
      return { ok: false, error: 'No active venture' };
    }
    if (agentSyncRunning) return { ok: false, error: 'Sync already running' };

    setAgentSyncRunning(true);
    setLastAiSyncTrace(null);
    addSystemLog('AI staff sync started — researching across desks…', 'agent-sync', 'info');
    try {
      const dto = projectToSyncDto(activeProject);
      const res = await fetch('/api/dexo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'agentSync',
          payload: { project: dto },
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        const err = typeof data.error === 'string' ? data.error : 'Staff sync failed';
        addSystemLog(err, 'agent-sync', 'error');
        return { ok: false, error: err };
      }

      const result = data.result as AgentSyncPayload;
      const p = activeProject;
      const stamp = `\n\n--- AI staff sync ${new Date().toISOString()} ---\n\n`;
      let marketInsights = p.marketInsights || '';
      if (result.appendMarketInsights?.trim()) marketInsights += stamp + result.appendMarketInsights.trim();
      let budget = p.budget || '';
      if (result.appendBudget?.trim()) budget += stamp + result.appendBudget.trim();
      let teamDirectives = p.teamDirectives || '';
      if (result.appendTeamDirectives?.trim()) teamDirectives += stamp + result.appendTeamDirectives.trim();
      let userNotes = p.userNotes || '';
      if (result.appendUserNotes?.trim()) userNotes += stamp + result.appendUserNotes.trim();

      const kanban = [...(p.kanban || [])];
      for (const k of result.kanbanAdds || []) {
        if (!k?.title?.trim()) continue;
        const st = k.status === 'in_progress' || k.status === 'next' || k.status === 'completed' ? k.status : 'todo';
        kanban.push({
          id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          title: k.title.trim(),
          status: st,
          timestamp: Date.now(),
        });
      }

      const events = [...(p.events || [])];
      const day = 86400000;
      const allowed: ProjectEvent['type'][] = ['milestone', 'meeting', 'launch', 'deadline', 'task'];
      for (const e of result.eventAdds || []) {
        if (!e?.title?.trim()) continue;
        const typ = allowed.includes(e.type as ProjectEvent['type']) ? (e.type as ProjectEvent['type']) : 'task';
        events.push({
          id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          title: e.title.trim(),
          type: typ,
          date: Date.now() + Math.max(0, Number(e.daysFromNow) || 0) * day,
        });
      }

      const syncAt = Date.now();
      const staffAttentionItems: StaffAttentionItem[] = (result.attentionItems || []).map((a, i) => ({
        id: `att-${syncAt}-${i}`,
        role: normalizeStaffAttentionRole(a.role),
        title: a.title,
        message: a.message,
        createdAt: syncAt,
        dismissed: false,
      }));

      /** Keep founder strategy narrative separate from sync output; sync lives in snapshots, not the thesis field. */
      const mergedStrategy = p.strategy || '';

      const focusNext = (result.focusToday || []).slice(0, 10);
      const prevDone = p.staffFocusCompletedLines || [];
      const staffFocusCompletedLines = prevDone.filter((line) => focusNext.includes(line));

      const next: Project = {
        ...p,
        strategy: mergedStrategy,
        marketInsights,
        budget,
        teamDirectives,
        userNotes,
        kanban,
        events,
        agentStaffSnapshot: {
          at: syncAt,
          summary: result.summary,
          desks: result.desks,
        },
        staffAttentionItems,
        staffFocusToday: focusNext,
        staffFocusCompletedLines,
        timestamp: syncAt,
      };

      await saveProject(next);
      setActiveProjectState(next);
      const projects = await getAllProjects();
      setAllProjects(projects);
      setSystemState((prev) => ({ ...prev, lastSync: syncAt }));
      setSyncToastMessage(result.summary.slice(0, 260));
      if (data.dual_agent && typeof data.dual_agent === 'object') {
        setLastSyncDualAgent({
          gpt: Boolean(data.dual_agent.gpt),
          claude: Boolean(data.dual_agent.claude),
          durationMs: Number(data.dual_agent.durationMs ?? 0),
          at: new Date().toISOString(),
        });
      }

      const rawTrace = data.trace;
      if (Array.isArray(rawTrace)) {
        setLastAiSyncTrace(
          rawTrace
            .filter((s: unknown) => s && typeof s === 'object' && 'label' in (s as object))
            .map((s: { id?: string; label?: string; detail?: string }, i: number) => ({
              id: String(s.id ?? `step-${i}`),
              label: String(s.label ?? 'Step'),
              detail: s.detail != null ? String(s.detail) : undefined,
            }))
        );
      } else {
        setLastAiSyncTrace(null);
      }
      const addedBoard = (result.kanbanAdds || []).filter((k) => k?.title?.trim()).length;
      if (addedBoard > 0) {
        addSystemLog(`CTO execution board updated — +${addedBoard} task(s). Open the CTO desk → Execution board.`, 'agent-sync', 'info');
      }
      addSystemLog('AI staff sync complete — check notifications and each desk for updates.', 'agent-sync', 'success');
      activeProjectRef.current = next;
      await refreshLivingOfficeRef.current?.(next);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Staff sync failed';
      addSystemLog(msg, 'agent-sync', 'error');
      return { ok: false, error: msg };
    } finally {
      setAgentSyncRunning(false);
    }
  };

  /**
   * Broadcast a directive to all agents (simulated by updating team directives)
   */
  const broadcastDirective = (message: string) => {
    if (activeProject) {
      updateDirectives(message);
      // In a real app, this might trigger notifications or async tasks for each agent
    }
  };

  /**
   * Pre-populate chat for team interaction
   */
  const prepopulateChat = (role: AgentRole, message: string) => {
    setPendingChat({ role, message });
    setActiveRoom(role);
  };

  /**
   * Set the active project (when user selects a project)
   */
  const setActiveProject = (project: Project | null) => {
    setActiveProjectState(project);
    // Navigation is always handled explicitly by the caller via switchRoom.
    // Do NOT auto-redirect here — it causes Executive Overview to kick users out.
  };

  const patchActiveProject = (updates: Partial<Project>) => {
    setActiveProjectState((prev) => (prev ? { ...prev, ...updates } : null));
  };

  /**
   * Update the list of all projects (called after fetching from DB)
   */
  const handleSetAllProjects = useCallback((projects: Project[]) => {
    setAllProjects(projects);
  }, []);

  /**
   * Create a new blank project (timeline + flow prefilled via `emptyVentureShell`).
   * Persists to IndexedDB so the venture list and PA APIs see a real `id`.
   */
  const createNewProject = () => {
    void (async () => {
      const shell = emptyVentureShell(`Project ${new Date().toLocaleDateString()}`);
      const ts = Date.now();
      const id = await saveProject({ ...shell, timestamp: ts } as Project);
      const saved: Project = { ...shell, id, timestamp: ts };
      setActiveProjectState(saved);
      activeProjectRef.current = saved;
      const projects = await getAllProjects();
      setAllProjects(projects);
      setActiveRoom('dexo');
    })();
  };

  /**
   * Update strategy field (CEO contributions)
   */
  const updateStrategy = (strategy: string) => {
    updateProjectField('strategy', strategy);
  };

  /**
   * Update productPlan field (PM contributions)
   */
  const updateProductPlan = (plan: string) => {
    updateProjectField('productPlan', plan);
  };

  /**
   * Update budget field (Accountant contributions)
   */
  const updateBudget = (budget: string) => {
    updateProjectField('budget', budget);
  };

  /**
   * Update marketInsights field (Scout contributions)
   */
  const updateMarketInsights = (insights: string) => {
    updateProjectField('marketInsights', insights);
  };

  /**
   * Update user notes (Executive Journal)
   */
  const updateNotes = (userNotes: string) => {
    updateProjectField('userNotes', userNotes);
  };

  /**
   * Update team directives
   */
  const updateDirectives = (teamDirectives: string) => {
    updateProjectField('teamDirectives', teamDirectives);
  };

  /**
   * Generic project field update with DB persistence
   */
  const updateProjectField = async (field: string, value: any) => {
    if (activeProject && activeProject.id) {
      const updatedProject = { ...activeProject, [field]: value };
      setActiveProjectState(updatedProject);

      // Update DB
      const { updateProjectField: dbUpdate } = await import('./db');
      await dbUpdate(activeProject.id, field as any, value);

      // Refresh list
      const { getAllProjects } = await import('./db');
      const projects = await getAllProjects();
      setAllProjects(projects);
    }
  };

  const updateProjectFieldRef = useRef(updateProjectField);
  updateProjectFieldRef.current = updateProjectField;

  useEffect(() => {
    const p = activeProject;
    if (!p?.id || !isVentureFoundationSparse(p)) return;
    const doc = parseStrategy(p.strategy || '');
    const marker = '### Staff sync — CEO desk';
    const idx = doc.content.indexOf(marker);
    if (idx < 0) return;
    const cleanedContent = doc.content.slice(0, idx).trim();
    const cleanedStrategy = serializeStrategy({ ...doc, content: cleanedContent });
    if (cleanedStrategy === p.strategy) return;
    patchActiveProject({ strategy: cleanedStrategy });
    void updateProjectFieldRef.current('strategy', cleanedStrategy);
  }, [activeProject?.id, activeProject?.strategy]);

  const refreshLivingOffice = useCallback(async (projectOverride?: Project | null) => {
    const p = projectOverride ?? activeProjectRef.current;
    if (!p?.id) {
      setLivingOffice(null);
      return;
    }
    const list = await getAllProjects();
    const freshP = list.find((x) => String(x.id) === String(p.id)) ?? p;
    const result = await runDailyOfficeCycle(String(p.id), list, freshP);
    setLivingOffice(result);

    if (result.brief.greeting === 'No venture selected.' || isVentureFoundationSparse(freshP) || !result.brief.greeting.trim()) {
      return;
    }

    const memoryBefore = getOfficeMemory(freshP);
    const today = new Date().toDateString();
    const todayIso = new Date().toISOString().slice(0, 10);
    const briefId = `morning-brief-${p.id}-${todayIso}`;
    const threadSnapshot = loadExecutiveThread(String(p.id));
    const alreadyInThread =
      threadSnapshot.some((m) => m.id === briefId) ||
      threadSnapshot.some(
        (m) =>
          m.role === 'assistant' &&
          m.channel === 'pa' &&
          new Date(m.ts).toDateString() === today &&
          (m.id.startsWith(`morning-brief-${p.id}-`) ||
            /\bSuggested focus:\s*/i.test(m.content) ||
            m.content.includes('My one focus for you today:'))
      );
    const shouldBrief = memoryBefore.lastMorningBriefDay !== today && !alreadyInThread;

    let nextMem = setLastFocus(memoryBefore, result.brief.suggestedFocus);
    for (const a of result.brief.criticalAlerts) {
      nextMem = appendUnresolvedRisk(nextMem, a);
    }
    if (alreadyInThread && memoryBefore.lastMorningBriefDay !== today) {
      nextMem = updateOfficeMemory(nextMem, { lastMorningBriefDay: today });
    }
    if (shouldBrief) {
      nextMem = updateOfficeMemory(nextMem, { lastMorningBriefDay: today });
      const body = formatDailyBriefThreadMessage(result.brief);
      const msg: ExecutiveThreadMessage = {
        id: briefId,
        role: 'assistant',
        content: body,
        ts: Date.now(),
        channel: 'pa',
      };
      setExecutiveThread((prev) => {
        if (prev.some((m) => m.id === briefId)) return prev;
        const next = [...prev, msg];
        saveExecutiveThread(String(p.id), next);
        return next;
      });
    }
    const json = serializeOfficeMemory(nextMem);
    if (json !== (freshP.officeEngineMemoryJson || '')) {
      await updateProjectFieldRef.current('officeEngineMemoryJson', json);
    }
  }, []);

  useEffect(() => {
    void refreshLivingOffice();
  }, [activeProject?.id, refreshLivingOffice]);

  refreshLivingOfficeRef.current = refreshLivingOffice;

  /**
   * Add a journal entry
   */
  const addJournal = async (content: string) => {
    if (activeProject && activeProject.id) {
      const entry: JournalEntry = {
        id: Date.now().toString(),
        content,
        timestamp: Date.now()
      };

      // Optimistic update
      const updatedProject = {
        ...activeProject,
        journal: [entry, ...(activeProject.journal || [])]
      };
      setActiveProjectState(updatedProject);

      // DB Update
      await addJournalEntry(activeProject.id, entry);
    }
  };

  const markStaffFocusLineDone = async (line: string, note?: string) => {
    const p = activeProjectRef.current;
    if (!p?.id) return;
    const trimmed = line.trim();
    if (!trimmed) return;
    const prevDone = p.staffFocusCompletedLines || [];
    if (prevDone.includes(trimmed)) return;

    const staffFocusCompletedLines = [...prevDone, trimmed];
    const entry: JournalEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: note?.trim()
        ? `[Focus ✓] ${trimmed}\nUpdate: ${note.trim()}`
        : `[Focus ✓] ${trimmed}`,
      timestamp: Date.now(),
    };
    const updated: Project = {
      ...p,
      staffFocusCompletedLines,
      journal: [entry, ...(p.journal || [])],
    };
    await saveProject(updated);
    setActiveProjectState(updated);
    activeProjectRef.current = updated;
    const projects = await getAllProjects();
    setAllProjects(projects);
    addSystemLog('Focus item marked done — saved to venture journal.', 'focus', 'success');
    await refreshLivingOfficeRef.current?.(updated);
  };

  const persistActiveProject = async (project: Project) => {
    await saveProject(project);
    setActiveProjectState(project);
    activeProjectRef.current = project;
    const projects = await getAllProjects();
    setAllProjects(projects);
    await refreshLivingOfficeRef.current?.(project);
  };

  /**
   * Add a calendar event
   */
  const addEvent = async (title: string, date: number, type: ProjectEvent['type']) => {
    if (!activeProject) return;

    const event: ProjectEvent = {
      id: Date.now().toString(),
      title,
      date,
      type,
    };

    if (activeProject.id) {
      const updatedProject = {
        ...activeProject,
        events: [...(activeProject.events || []), event],
      };
      setActiveProjectState(updatedProject);

      await addProjectEvent(activeProject.id, event);
      const projects = await getAllProjects();
      setAllProjects(projects);
    } else {
      setActiveProjectState({
        ...activeProject,
        events: [...(activeProject.events || []), event],
      });
    }
  };

  /**
   * Add a file to project context
   */
  const addFile = async (name: string, content: string, type: string) => {
    if (activeProject && activeProject.id) {
      const file: ProjectFile = {
        id: Date.now().toString(),
        name,
        content,
        type,
        timestamp: Date.now()
      };

      // Optimistic Update
      const updatedProject = {
        ...activeProject,
        files: [...(activeProject.files || []), file]
      };
      setActiveProjectState(updatedProject);

      // DB Update
      await addProjectFile(activeProject.id, file);
    }
  };

  /**
   * Clear all system data
   */
  const resetSystem = async () => {
    await secureWipeDatabase();
    setAllProjects([]);
    setActiveProjectState(null);
    setExecutiveThread([]);
    setDeskSectionFocus(null);
    setSuiteIntelOpenDesk(null);
    setLivingOffice(null);
    setDexoBootstrap(null);
    setActiveRoom('dexo');
    setSystemState(prev => ({ ...prev, alertLevel: 'stable', isDeepWork: false }));
  };

  const toggleDeepWork = (status?: boolean) => {
    setSystemState(prev => ({
      ...prev,
      isDeepWork: status !== undefined ? status : !prev.isDeepWork,
      networkStatus: (status !== undefined ? status : !prev.isDeepWork) ? 'secure' : 'secure'
    }));
  };

  const setSystemAlert = (level: SystemState['alertLevel']) => {
    setSystemState(prev => ({ ...prev, alertLevel: level }));
  };

  const value: OfficeContextType = {
    activeRoom,
    activeProject,
    allProjects,
    pendingChat,
    setPendingChat,
    dexoBootstrap,
    setDexoBootstrap,
    executiveThread,
    appendExecutiveThread,
    setExecutiveThread,
    clearExecutiveThread,
    deskSectionFocus,
    setDeskSectionFocus,
    suiteIntelOpenDesk,
    setSuiteIntelOpenDesk,
    agents: AGENT_PERSONAS,
    switchRoom,
    setActiveProject,
    patchActiveProject,
    setAllProjects: handleSetAllProjects,
    createNewProject,
    broadcastDirective,
    updateStrategy,
    updateProductPlan,
    updateBudget,
    updateMarketInsights,
    updateNotes,
    updateDirectives,
    updateProjectField,
    markStaffFocusLineDone,
    persistActiveProject,
    addJournal,
    addEvent,
    addFile, // New
    prepopulateChat,
    resetSystem,
    systemState,
    toggleDeepWork,
    setSystemAlert,
    systemLogs,
    addSystemLog,
    agentSyncRunning,
    runAgentStaffSync,
    staffAttentionPending,
    dismissStaffAttention,
    syncToastMessage,
    lastAiSyncTrace,
    lastSyncDualAgent,
    dismissSyncToast,
    livingOffice,
    refreshLivingOffice,
  };

  return <OfficeContext.Provider value={value}>{children}</OfficeContext.Provider>;
}

/**
 * Huddle Logic: Generates a system prompt that is aware of other agents' work.
 * This is the "Connected Logic" feature.
 */
export function getHuddlePrompt(role: AgentRole, project?: Project | null): string {
  if (!project) return getAgentSystemPrompt(role, null);

  const safeParse = (json: string) => {
    try { return json ? JSON.parse(json) : {}; } catch { return {}; }
  };

  const finance = safeParse(project.budget); // Accountant
  const market = safeParse(project.marketInsights); // Scout

  const ceoLine = formatStrategyForContext(project.strategy);
  const pmLine = formatProductPlanForContext(project.productPlan);

  // "The Spine" - Shared Context
  const baseContext = `
    You are an AI teammate inside Deepchox (by northROSC LABS) — you act as one specialist role on the founder's team (not a generic chatbot).
    Current Project: "${project.name}"
    
    TEAM CONTEXT (What others are doing — plain language, not raw JSON):
    - CEO (strategy narrative + priorities / phases summary): ${ceoLine}
    - CTO / PM (product intent, roadmap, recent actions): ${pmLine}
    - CFO (numbers / scenarios): ${finance.burnRate ? `Burn Rate: ${finance.burnRate}` : "Pending analysis"}
    - CSO intel: ${market.signals ? "Market signals detected." : "Scanning market..."}
    
    INTER-AGENT AWARENESS:
    - If another agent has contributed, ACKNOWLEDGE their work in your response.
    - Use "We" and "Our" instead of "I".
    - Connect your domain to theirs (e.g., "Based on the PM's feature list, the budget looks tight...").
    `;

  const specificPrompts = getAgentSystemPrompt(role, project);

  return `${baseContext}\n\n${specificPrompts}`;
}

/**
 * Hook to use the Office Context
 */
export function useOffice(): OfficeContextType {
  const context = useContext(OfficeContext);
  if (context === undefined) {
    throw new Error('useOffice must be used within an OfficeProvider');
  }
  return context;
}

/**
 * Get the system instruction for the active agent
 * High Interaction & Analysis Logic implemented here.
 */
export function getAgentSystemPrompt(role: AgentRole, project?: Project | null): string {
  const onboardingBlock = formatVentureOnboardingForPrompt(project ?? null);

  const commonDirectives = `
    CORE RULE: DO NOT ASSUME. YOU ARE AN ANALYST, NOT A CREATIVE WRITER.
    - If the user provides a file or specific data, use it strictly.
    - If VERIFIED VENTURE ONBOARDING is present below, treat it as already-captured facts — do not ask the user to re-state goals, audience, problem, or timeline from scratch; only ask for details that are genuinely missing or ambiguous.
    - If information is still missing after using onboarding + context, ask focused clarifying questions.
    - Your goal is ACCURACY and STRATEGIC DEPTH.
    - Quote specific parts of the user's input/files to show you analyzed it.
    - Venture "Context" blocks are plain-language summaries of strategy and product data. Answer in normal sentences and bullets — do not dump JSON or schema-style blobs to the user unless they explicitly ask for the raw file.

    ${onboardingBlock}

    ${project?.userNotes ? `FOUNDER'S JOURNAL CONTEXT:
    The founder has recorded these personal observations:
    "${project.userNotes}"` : ''}

    ${project?.teamDirectives ? `ACTIVE TEAM DIRECTIVES:
    The following high-level directives are currently in effect for the whole team:
    "${project.teamDirectives}"` : ''}

    Always align your analysis with the active directives above.
  `;

  const prompts: Record<AgentRole, string> = {
    ceo: `You are the CEO desk — decision and reasoning. ${commonDirectives}
    
    ROLE: Visionary, but evidence-based. Deliver a clear decision and why it holds.
    TASK: Analyze the user's business context.
    - If they upload a business plan, critique it using SWOT or Lean Canvas.
    - Identify gaps in their logic.
    - Ask about their unfair advantage, distribution channels, or revenue model if not clear.
    
    FORMAT: Bold Headers, Bullet Points, Strategic Summaries.`,

    pm: `You are the CTO desk — architecture and delivery. ${commonDirectives}
    
    ROLE: Systems thinking and product execution. You **own the venture execution board** (kanban): what ships next, build order, and technical follow-through. When staff sync or the Personal Assistant adds tasks, those land on **your** board — speak in terms of concrete work items when you recommend priorities.
    TASK: Recommend what to build, in what order, and how it fits the stack.
    - If user gives a feature idea, ask for edge cases, user roles, and success metrics.
    - Call out trade-offs, dependencies, and technical debt implications.
    - Suggest MVP scopes based on the data provided.
    - When listing next steps, mirror how they would appear as execution-board cards (short, actionable titles).
    
    FORMAT: Checkboxes [ ], User Stories, Technical constraints, architecture notes.`,

    accountant: `You are the CFO desk — numbers and scenario tables. ${commonDirectives}
    
    ROLE: Financial accuracy and risk assessment.
    TASK: Analyze numbers and projections; compare scenarios where useful.
    - If user gives rough costs, ask for breakdowns (OpEx, CapEx).
    - Point out missing costs (marketing, server, taxes).
    - Calculate runway or break-even if data permits.
    
    FORMAT: Markdown Tables for everything. Bold totals.`,

    scout: `You are the CSO (Chief Strategy Officer) desk — competitive map and threat level. ${commonDirectives}
    
    ROLE: Market Intelligence and Competitive Analysis.
    TASK: Analyze the provided competitor data or market segment.
    - If user uploads a competitor list, categorize them (Direct vs Indirect).
    - Don't invent competitors; ask the user for their target region or specific niche.
    - Find the "White Space" in the market based on the input.
    - Summarize threat level to our position (low → critical).
    
    FORMAT: Trend Analysis, Blockquotes for key insights, Risk Flags.`,

    cmo: `You are the CMO (Chief Marketing Officer). ${commonDirectives}
    
    ROLE: Go-to-market and messaging.
    TASK: Shape how the venture reaches and persuades the market.
    - Propose or refine GTM motion (segments, channels, sequencing).
    - Offer a messaging framework: pillars, proof points, and primary CTA.
    - Align narrative with product reality and budget constraints.
    
    FORMAT: Clear headings, short bullets, optional message house (headline / sub / proof).`,


    dexo: `You are Dexo, the Central Intelligence Brain of the Deepchox Suite (by northROSC LABS).
    ROLE: You are the OMNISCIENT ORCHESTRATOR. You are not just an assistant; you are the strategic core.
    
    CORE DIRECTIVES:
    1. ANALYZE EVERYTHING: You have read-access to the CEO's Strategy, PM's Roadmap, CFO's Budget, and Scout's Intel. Identify contradictions.
    2. COMMAND THE SUITE: You have the authority to issue directives to other agents. If the Strategy is vague, tell the CEO to refine it.
    3. TRUTHFUL & INTELLIGENT: Provide 100% accurate, high-level insights. Do not hallucinate data. If you don't know, suggest a research path.
    4. USER COMFORT: Adapt to the user's vision. If they want a relaxed tone, be relaxed. If they want military precision, be precise.
    
    CAPABILITIES:
    - You can simulate deep research.
    - You can generate JSON commands to update the project state directly (e.g., updating the Strategy field).
    
    FORMAT:
    - Use "I have analyzed..." or "My intelligence suggests..."
    - Structure your answers with clear headings.
    - If you are updating a project field, strictly follow the JSON command format provided in the system instructions.`,

    shark: `You are The Shark (VC).
    ROLE: A skeptical, high-stakes Venture Capitalist.
    TASK: Grill the user on their business plan.
    - Be aggressive but not abusive.
    - Focus on: Customer Acquisition Cost (CAC), Lifetime Value (LTV), Moat, Scalability, and Exit Strategy.
    - If the user gives a vague answer, drill down. "That sounds like fluff. What are the numbers?"
    - Rate their answers. "Weak." "Better." "Fundable."`
  };

  return prompts[role];
}

/**
 * Dedicated Personal Assistant — holistic insight + duty routing (not a single officer desk).
 */
export function getPersonalAssistantSystemPrompt(project?: Project | null): string {
  const noVenture = !project?.id;
  const pending = (project?.staffAttentionItems || []).filter((a) => !a.dismissed);
  const attentionBlock =
    pending.length > 0
      ? `\nPENDING STAFF NOTIFICATIONS (colleagues waiting for you):\n${pending
          .map((a) => `- [${a.role.toUpperCase()}] ${a.title}: ${a.message}`)
          .join('\n')}\n`
      : '';
  const focusBlock =
    project?.staffFocusToday?.length
      ? `\nFOCUS TODAY (from latest staff sync):\n${project.staffFocusToday.map((b) => `- ${b}`).join('\n')}\n`
      : '';
  const staffHint = project?.agentStaffSnapshot?.summary
    ? `\nLAST STAFF SYNC (from the multi-desk agent run):\n${project.agentStaffSnapshot.summary}\n`
    : '';
  return `You are the user's dedicated Personal Assistant in Deepchox (by northROSC LABS) — you represent their AI-powered team for founders in one place: steer the venture and see what matters across roles.

You are not a single desk teammate; you coordinate like a chief of staff. The product can run **Staff sync** so all AI teammates refresh briefs from the same venture snapshot and merge updates (intel, finance notes, directives, kanban, calendar). Reference that latest sync summary when present.

DISCOVERY / QUESTIONS:
- Do not pepper the user with questions. At most one question per reply when something is truly missing; prefer inferring from context and prior messages.
- When the user answers once, treat that answer as covering related follow-ups — avoid asking overlapping questions in the next turns.

ROLE:
- Journal lines starting with **[Focus ✓]** are founder check-ins from marking staff-sync focus items done — treat them as ground truth on what shipped or moved.
- Answer questions such as: “What are today’s most important things for my attention?” / “What should we do today as a growing startup?” — infer urgency from calendar, phases, priorities, directives, kanban load, journal notes, staff sync summary, **focus today** bullets, and **pending notifications**. Rank items and say why now.
- Take natural-language duties. Respond with clear next steps, risks, and which function (CEO strategy, CTO product, CFO finance, CMO GTM, CSO market) should own follow-up.
- Synthesize across strategy, product plan, budget, market intel, events, journal, and team directives. Do not invent metrics—say what’s missing.
- Tone: professional, concise, calm. Prefer short paragraphs and bullets.
${attentionBlock}${focusBlock}${staffHint}
${noVenture ? 'No venture is loaded. Briefly ask the user to select a venture from Executive Overview before deep analysis.' : ''}

FORMAT:
- Directives: acknowledge → restate → 2–5 actions (optionally tag by desk).
- Status questions: health summary, top risks, top 3 priorities for today.
- Always ground answers in the venture context block provided below when data exists.`;
}
