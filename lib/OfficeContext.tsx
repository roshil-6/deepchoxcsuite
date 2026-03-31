'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
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
import {
  projectToSyncDto,
  type AgentSyncPayload,
  type AiSyncTraceStep,
  normalizeStaffAttentionRole,
} from './agentStaffTypes';
import { Target, ClipboardList, Calculator, ScanSearch, LayoutDashboard, Bot, Gavel, Megaphone } from 'lucide-react';
import { EXEC_OUTPUT_ROLES } from '@/lib/execOutputFormats';

const EO = Object.fromEntries(EXEC_OUTPUT_ROLES.map((r) => [r.id, r])) as Record<
  (typeof EXEC_OUTPUT_ROLES)[number]['id'],
  (typeof EXEC_OUTPUT_ROLES)[number]
>;

export type AgentRole = 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo' | 'chief_of_staff' | 'dexo' | 'shark';

export interface AgentPersona {
  /** Full officer title, e.g. Chief Executive Officer */
  name: string;
  /** Sidebar primary label — use role acronym (CEO, CFO, …) */
  title: string;
  /** One-line deliverable, e.g. Decision + reasoning */
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
  activeRoom: AgentRole | 'dashboard' | 'calendar' | 'reports' | 'boardroom' | 'founders_office' | 'dexo' | 'forge' | 'wargame' | 'vc_gauntlet' | 'org_structure' | 'intelligence_diary' | 'personal_assistant' | 'enquiries' | 'suite_intelligence';
  activeProject: Project | null;
  allProjects: Project[];
  systemState: SystemState;

  // Agent Personas
  agents: Record<AgentRole, AgentPersona>;
  pendingChat: { role: AgentRole; message: string } | null;
  setPendingChat: (val: { role: AgentRole; message: string } | null) => void;

  // Actions
  switchRoom: (room: AgentRole | 'dashboard' | 'calendar' | 'reports' | 'boardroom' | 'founders_office' | 'dexo' | 'forge' | 'wargame' | 'vc_gauntlet' | 'org_structure' | 'intelligence_diary' | 'personal_assistant' | 'enquiries' | 'suite_intelligence') => void;

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
    name: EO.CEO.title,
    title: EO.CEO.shortTitle,
    execOutput: EO.CEO.execOutput,
    role: 'ceo',
    style: 'Strategic leadership',
    description: EO.CEO.description,
    icon: <Target className="w-5 h-5" />,
  },
  accountant: {
    name: EO.CFO.title,
    title: EO.CFO.shortTitle,
    execOutput: EO.CFO.execOutput,
    role: 'accountant',
    style: 'Capital & control',
    description: EO.CFO.description,
    icon: <Calculator className="w-5 h-5" />,
  },
  pm: {
    name: EO.CTO.title,
    title: EO.CTO.shortTitle,
    execOutput: EO.CTO.execOutput,
    role: 'pm',
    style: 'Product & systems delivery',
    description: EO.CTO.description,
    icon: <ClipboardList className="w-5 h-5" />,
  },
  cmo: {
    name: EO.CMO.title,
    title: EO.CMO.shortTitle,
    execOutput: EO.CMO.execOutput,
    role: 'cmo',
    style: 'Market motion',
    description: EO.CMO.description,
    icon: <Megaphone className="w-5 h-5" />,
  },
  scout: {
    name: EO.CSO.title,
    title: EO.CSO.shortTitle,
    execOutput: EO.CSO.execOutput,
    role: 'scout',
    style: 'Evidence-led strategy',
    description: EO.CSO.description,
    icon: <ScanSearch className="w-5 h-5" />,
  },
  chief_of_staff: {
    name: 'Chief of Staff',
    title: 'Staff',
    execOutput: 'Orchestration & routing',
    role: 'chief_of_staff',
    style: 'Coordination',
    description:
      'Routes requests to the right desk and keeps directives visible. Use when one decision spans multiple functions.',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  dexo: {
    name: 'Dexo Core',
    title: 'Dexo',
    execOutput: 'Cross-suite intelligence',
    role: 'dexo',
    style: 'Omniscient core',
    description:
      'Reads across venture data and helps you act when the question does not belong to a single officer desk.',
    icon: <Bot className="w-5 h-5" />,
  },
  shark: {
    name: 'Investor diligence',
    title: 'VC gauntlet',
    execOutput: 'Capital stress-test',
    role: 'shark',
    style: 'Adversarial review',
    description:
      'Rehearses external capital scrutiny—challenge assumptions before real investor conversations.',
    icon: <Gavel className="w-5 h-5" />,
  },
};

// Create the Context
const OfficeContext = createContext<OfficeContextType | undefined>(undefined);

// Context Provider Component
export function OfficeProvider({ children }: { children: ReactNode }) {
  const [activeRoom, setActiveRoom] = useState<
    AgentRole | 'dashboard' | 'calendar' | 'reports' | 'boardroom' | 'founders_office' | 'dexo' | 'forge' | 'wargame' | 'vc_gauntlet' | 'org_structure' | 'intelligence_diary' | 'personal_assistant' | 'enquiries' | 'suite_intelligence'
  >('dashboard');
  const [agentSyncRunning, setAgentSyncRunning] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [lastAiSyncTrace, setLastAiSyncTrace] = useState<AiSyncTraceStep[] | null>(null);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [pendingChat, setPendingChat] = useState<{ role: AgentRole; message: string } | null>(null);
  const [systemState, setSystemState] = useState<SystemState>({
    alertLevel: 'stable',
    networkStatus: 'secure',
    encryptionLevel: 'standard',
    isDeepWork: false,
    globalMood: 'neutral',
    lastSync: Date.now()
  });

  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

  const staffAttentionPending = useMemo(
    () => (activeProject?.staffAttentionItems || []).filter((a) => !a.dismissed),
    [activeProject?.staffAttentionItems]
  );

  useEffect(() => {
    if (!syncToastMessage) return;
    const t = window.setTimeout(() => {
      setSyncToastMessage(null);
      setLastAiSyncTrace(null);
    }, 9000);
    return () => window.clearTimeout(t);
  }, [syncToastMessage]);

  const dismissSyncToast = () => {
    setSyncToastMessage(null);
    setLastAiSyncTrace(null);
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
   * Switch between different agent rooms or views
   */
  const switchRoom = (
    room: AgentRole | 'dashboard' | 'calendar' | 'reports' | 'boardroom' | 'founders_office' | 'dexo' | 'forge' | 'wargame' | 'vc_gauntlet' | 'org_structure' | 'intelligence_diary' | 'personal_assistant' | 'enquiries' | 'suite_intelligence'
  ) => {
    setActiveRoom(room);
  };

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
      const res = await fetch('/api/agent-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: dto }),
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

      const next: Project = {
        ...p,
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
        staffFocusToday: (result.focusToday || []).slice(0, 10),
        timestamp: syncAt,
      };

      await saveProject(next);
      setActiveProjectState(next);
      const projects = await getAllProjects();
      setAllProjects(projects);
      setSystemState((prev) => ({ ...prev, lastSync: syncAt }));
      setSyncToastMessage(result.summary.slice(0, 260));
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
      addSystemLog('AI staff sync complete — check notifications and each desk for updates.', 'agent-sync', 'success');
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
    // If we select a project, default to CEO room if we were in dashboard
    if (project && (activeRoom === 'dashboard' || activeRoom === 'calendar')) {
      setActiveRoom('ceo');
    }
  };

  const patchActiveProject = (updates: Partial<Project>) => {
    setActiveProjectState((prev) => (prev ? { ...prev, ...updates } : null));
  };

  /**
   * Update the list of all projects (called after fetching from DB)
   */
  const handleSetAllProjects = (projects: Project[]) => {
    setAllProjects(projects);
  };

  /**
   * Create a new blank project
   */
  const createNewProject = () => {
    const newProject: Project = {
      name: `Project ${new Date().toLocaleDateString()}`,
      onboardingData: '',
      strategy: '',
      productPlan: '',
      budget: '',
      marketInsights: '',
      userNotes: '',
      teamDirectives: '',
      journal: [],
      events: [],
      files: [], // Init empty files
      orgStructure: [],
      kanban: [],
      diary: [],
      deskDocuments: [],
      timestamp: Date.now(),
    };
    setActiveProjectState(newProject);
    setActiveRoom('ceo');
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
    setActiveRoom('dashboard');
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
    dismissSyncToast,
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

  const strategy = safeParse(project.strategy); // CEO
  const product = safeParse(project.productPlan); // PM
  const finance = safeParse(project.budget); // Accountant
  const market = safeParse(project.marketInsights); // Scout

  // "The Spine" - Shared Context
  const baseContext = `
    You are a member of the DEEPCHOX C-Suite.
    Current Project: "${project.name}"
    
    TEAM CONTEXT (What others are doing):
    - CEO (decision + reasoning): ${strategy.vision || "Pending"}
    - CTO roadmap: ${product.features ? "Drafting features..." : "Pending"}
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
  const commonDirectives = `
    CORE RULE: DO NOT ASSUME. YOU ARE AN ANALYST, NOT A CREATIVE WRITER.
    - If the user provides a file or specific data, use it strictly.
    - If information is missing, ASK clarifying questions before generating a plan.
    - Your goal is ACCURACY and STRATEGIC DEPTH.
    - Quote specific parts of the user's input/files to show you analyzed it.

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
    
    ROLE: Systems thinking and product execution.
    TASK: Recommend what to build, in what order, and how it fits the stack.
    - If user gives a feature idea, ask for edge cases, user roles, and success metrics.
    - Call out trade-offs, dependencies, and technical debt implications.
    - Suggest MVP scopes based on the data provided.
    
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

    chief_of_staff: `You are the Chief of Staff.
    CORE RULE: You are the ORCHESTRATOR. You do NOT do the deep work yourself.
    
    TASK: analyze the user's request and delegate it to the right department (CEO, CTO, CFO, CMO, CSO).
    - If the user asks for "strategy" -> Delegation: CEO
    - If the user asks for "product / tech / architecture" -> Delegation: CTO (pm desk)
    - If the user asks for "costs" -> Delegation: CFO (accountant desk)
    - If the user asks for "GTM / marketing / narrative" -> Delegation: CMO
    - If the user asks for "competitors" -> Delegation: CSO (scout desk)
    
    OUTPUT FORMAT:
    1. Acknowledge the request professionally.
    2. Explicitly state which agent you are assigning this to.
    3. Summarize the directive you are logging for the team.
    
    Example: "I understand. This requires a strategic pivot. I am assigning this to the CEO desk to draft a new plan."`,

    dexo: `You are Dexo, the Central Intelligence Brain of the DeepChox Suite.
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
  return `You are the user's dedicated Personal Assistant in DeepChox — you speak for their whole AI staff: one place to steer the startup and see what matters across roles.

You are not a single officer; you coordinate like a chief of staff. The product can also run a **Sync** that lets AI staff research and merge updates into venture sections (market intel, finance notes, directives, kanban, calendar). You may reference that latest sync summary when present.

ROLE:
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
