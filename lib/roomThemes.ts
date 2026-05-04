import type { AgentRole } from '@/lib/OfficeContext';
import { RESEARCH_STAFF } from '@/lib/researchStaffLabels';

/** Surfaces where the left chat rail is visible (see app/page.tsx). */
export type ChatVisibleRoom =
  | 'dashboard'
  | 'reports'
  | 'calendar'
  | 'intelligence_diary'
  | 'org_structure'
  | string;

export interface ChatRailTheme {
  agentRole: AgentRole;
  roleLabel: string;
  subtitle: string;
  emptyPrompt: string;
  headerClass: string;
  railClass: string;
  userBubbleClass: string;
  accentDot: string;
  placeholder: string;
}

/** Flat dark-grey chat rail — room copy varies, chrome stays calm */
const DEFAULT_CHAT: ChatRailTheme = {
  agentRole: 'dexo',
  roleLabel: RESEARCH_STAFF.dexo.navTitle,
  subtitle: 'Side thread for this room.',
  emptyPrompt: 'Ask something about this venture or desk.',
  headerClass: 'border-b border-[var(--border)] bg-[var(--bg-secondary)]/95 backdrop-blur-md',
  railClass: 'border-r border-[var(--border)] bg-[var(--bg-secondary)]/92 backdrop-blur-md',
  userBubbleClass: 'border border-[rgba(116,86,255,0.22)] bg-[var(--accent-soft)] text-brand-text shadow-[0_1px_2px_rgba(0,0,0,0.25)]',
  accentDot: 'bg-[var(--accent)]',
  placeholder: 'Message…',
};

export function getChatRailTheme(activeRoom: string): ChatRailTheme {
  const map: Record<string, Partial<ChatRailTheme> & { agentRole: AgentRole }> = {
    dashboard: {
      agentRole: 'dexo',
      roleLabel: RESEARCH_STAFF.dexo.navTitle,
      subtitle: 'Overview.',
      emptyPrompt: 'Ask about this venture, priorities, or next steps.',
      placeholder: 'Message…',
    },
    reports: {
      agentRole: 'dexo',
      roleLabel: RESEARCH_STAFF.dexo.navTitle,
      subtitle: 'Intelligence vault.',
      emptyPrompt: 'Summarize what you need from reports, notes, or exports.',
      placeholder: 'Query the vault…',
    },
    calendar: {
      agentRole: 'dexo',
      roleLabel: RESEARCH_STAFF.dexo.navTitle,
      subtitle: 'Aligned with your timeline.',
      emptyPrompt: 'Plan moves, deadlines, or stakeholder touchpoints.',
      placeholder: 'Schedule or adjust…',
    },
    intelligence_diary: {
      agentRole: 'ceo',
      roleLabel: RESEARCH_STAFF.ceo.navTitle,
      subtitle: 'Neural Diary · side thread',
      emptyPrompt:
        'Use this thread to pressure-test a diary entry, ask for a sharper angle, or turn a vague worry into a plan.',
      placeholder: 'Speak freely…',
    },
    cmo: {
      agentRole: 'cmo',
      roleLabel: RESEARCH_STAFF.cmo.navTitle,
      subtitle: 'Pitch forge — narrative and slides.',
      emptyPrompt: 'Sharpen narrative, ideal customer, or slide story before you ship it.',
      placeholder: 'Shape the message…',
    },
    org_structure: {
      agentRole: 'dexo',
      roleLabel: RESEARCH_STAFF.dexo.navTitle,
      subtitle: 'Org and roles in view.',
      emptyPrompt: 'Describe hiring, reporting, or structural changes.',
      placeholder: 'Shape the org…',
    },
    accountant: {
      agentRole: 'accountant',
      roleLabel: RESEARCH_STAFF.accountant.navTitle,
      subtitle: 'Ledger, runway, and scenarios.',
      emptyPrompt: 'Ask about burn, runway, the ledger, or what to stress-test before the board.',
      placeholder: 'Ask about your numbers or assumptions…',
    },
    ceo: {
      agentRole: 'ceo',
      roleLabel: RESEARCH_STAFF.ceo.navTitle,
      subtitle: 'Narrative, phases, and decisions.',
      emptyPrompt: 'Pressure-test strategy, sequencing, or how to frame the next move.',
      placeholder: 'Ask about strategy…',
    },
    pm: {
      agentRole: 'pm',
      roleLabel: RESEARCH_STAFF.pm.navTitle,
      subtitle: 'Delivery, scope, and roadmap.',
      emptyPrompt: 'Unblock delivery, refine scope, or align milestones with strategy.',
      placeholder: 'Ask about product and delivery…',
    },
    scout: {
      agentRole: 'scout',
      roleLabel: RESEARCH_STAFF.scout.navTitle,
      subtitle: 'Signals and evidence.',
      emptyPrompt: 'Synthesize market moves, competitors, or what to validate next.',
      placeholder: 'Ask about market and intel…',
    },
    forge: {
      agentRole: 'cmo',
      roleLabel: RESEARCH_STAFF.cmo.navTitle,
      subtitle: 'Pitch forge — narrative and slides.',
      emptyPrompt: 'Sharpen story, ideal customer, or deck flow before you ship.',
      placeholder: 'Shape narrative or deck…',
    },
    wargame: {
      agentRole: 'dexo',
      roleLabel: RESEARCH_STAFF.dexo.navTitle,
      subtitle: 'Wargame — stress-test assumptions.',
      emptyPrompt: 'Explore scenarios, second-order effects, or who wins if plans shift.',
      placeholder: 'Frame a wargame question…',
    },
    dexo: {
      agentRole: 'dexo',
      roleLabel: RESEARCH_STAFF.dexo.navTitle,
      subtitle: 'Suite-wide questions.',
      emptyPrompt: 'Ask across desks when the question does not fit a single area.',
      placeholder: 'Ask across desks…',
    },
    founders_office: {
      agentRole: 'dexo',
      roleLabel: RESEARCH_STAFF.dexo.navTitle,
      subtitle: 'Founders office — alignment and priorities.',
      emptyPrompt: 'Align founders on focus, tradeoffs, or what to decide next.',
      placeholder: 'Steer the founders conversation…',
    },
    personal_assistant: {
      agentRole: 'dexo',
      roleLabel: RESEARCH_STAFF.dexo.navTitle,
      subtitle: 'Assistant — tasks and follow-ups.',
      emptyPrompt: 'Capture actions, briefings, or what to prep for.',
      placeholder: 'Ask your assistant…',
    },
    suite_intelligence: {
      agentRole: 'dexo',
      roleLabel: RESEARCH_STAFF.dexo.navTitle,
      subtitle: 'How the workspace fits together.',
      emptyPrompt: 'Ask how a desk, sync, or report fits into the bigger picture.',
      placeholder: 'Ask how this works…',
    },
    vc_gauntlet: {
      agentRole: 'shark',
      roleLabel: RESEARCH_STAFF.shark.navTitle,
      subtitle: 'Investor-style rehearsal.',
      emptyPrompt: 'Stress-test pitch, metrics, and investor objections.',
      placeholder: 'Rehearse investor questions…',
    },
  };

  const row = map[activeRoom];
  if (!row) return DEFAULT_CHAT;
  return { ...DEFAULT_CHAT, ...row };
}

export function getChatAgentRoleForRoom(activeRoom: string): AgentRole {
  const t = getChatRailTheme(activeRoom);
  return t.agentRole;
}

export interface WorkspaceShellTheme {
  wash: string;
  gridColor: string;
  gridOpacity: string;
  chrome: string;
  immersive: boolean;
}

const SHELL_DEFAULT: WorkspaceShellTheme = {
  wash: 'from-[#1e1e1e] to-[#1e1e1e]',
  gridColor: 'rgba(255,255,255,0.05)',
  gridOpacity: '0.02',
  /** No inner “card” frame — avoids a second panel overlaying each room */
  chrome: '',
  immersive: false,
};

export function getWorkspaceShellTheme(activeRoom: string): WorkspaceShellTheme {
  /** Dexo: near-black, no shell grid — particle wave canvas owns the bg */
  if (activeRoom === 'dexo') {
    return {
      wash: 'from-[#1e1e1e] to-[#212121]',
      gridColor: 'transparent',
      gridOpacity: '0',
      chrome: '',
      immersive: true,
    };
  }

  /** Long-form guide: calmer canvas, almost no grid so sections feel editorial */
  if (activeRoom === 'suite_intelligence') {
    return {
      wash: 'from-[#1e1e1e] to-[#242424]',
      gridColor: 'rgba(255,255,255,0.04)',
      gridOpacity: '0.01',
      chrome: '',
      immersive: false,
    };
  }

  const immersiveRooms = new Set([
    'dexo',
    'forge',
    'wargame',
    'founders_office',
    'ceo',
    'pm',
    'accountant',
    'scout',
    'cmo',
    'personal_assistant',
    'dexo_daily',
  ]);

  const p: Partial<WorkspaceShellTheme> = immersiveRooms.has(activeRoom)
    ? { immersive: true, chrome: '' }
    : {};

  return {
    ...SHELL_DEFAULT,
    ...p,
    immersive: p.immersive ?? SHELL_DEFAULT.immersive,
    /** Dexo: single flat surface — hide shell grid so it doesn’t clash with the left rail / chat split */
    ...(activeRoom === 'dexo' ? { gridOpacity: '0' } : {}),
  };
}
