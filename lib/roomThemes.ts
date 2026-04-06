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
  agentRole: 'chief_of_staff',
  roleLabel: RESEARCH_STAFF.chief_of_staff.navTitle,
  subtitle: 'Side thread for this room.',
  emptyPrompt: 'Ask something about this venture or desk.',
  headerClass: 'border-b border-white/[0.07] bg-brand-panel/70 backdrop-blur-sm',
  railClass: 'border-r border-white/[0.07] bg-brand-panel/70',
  userBubbleClass: 'border border-white/[0.1] bg-brand-input/90 text-brand-text shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  accentDot: 'bg-brand-teal',
  placeholder: 'Message…',
};

export function getChatRailTheme(activeRoom: string): ChatRailTheme {
  const map: Record<string, Partial<ChatRailTheme> & { agentRole: AgentRole }> = {
    dashboard: {
      agentRole: 'chief_of_staff',
      roleLabel: RESEARCH_STAFF.chief_of_staff.navTitle,
      subtitle: 'Overview.',
      emptyPrompt: 'Ask about this venture, priorities, or next steps.',
      placeholder: 'Message…',
    },
    reports: {
      agentRole: 'chief_of_staff',
      roleLabel: RESEARCH_STAFF.chief_of_staff.navTitle,
      subtitle: 'Intelligence vault.',
      emptyPrompt: 'Summarize what you need from reports, notes, or exports.',
      placeholder: 'Query the vault…',
    },
    calendar: {
      agentRole: 'chief_of_staff',
      roleLabel: RESEARCH_STAFF.chief_of_staff.navTitle,
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
      agentRole: 'chief_of_staff',
      roleLabel: RESEARCH_STAFF.chief_of_staff.navTitle,
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
      agentRole: 'chief_of_staff',
      roleLabel: RESEARCH_STAFF.chief_of_staff.navTitle,
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
      agentRole: 'chief_of_staff',
      roleLabel: RESEARCH_STAFF.chief_of_staff.navTitle,
      subtitle: 'Founders office — alignment and priorities.',
      emptyPrompt: 'Align founders on focus, tradeoffs, or what to decide next.',
      placeholder: 'Steer the founders conversation…',
    },
    personal_assistant: {
      agentRole: 'chief_of_staff',
      roleLabel: RESEARCH_STAFF.chief_of_staff.navTitle,
      subtitle: 'Assistant — tasks and follow-ups.',
      emptyPrompt: 'Capture actions, briefings, or what to prep for.',
      placeholder: 'Ask your assistant…',
    },
    suite_intelligence: {
      agentRole: 'chief_of_staff',
      roleLabel: RESEARCH_STAFF.chief_of_staff.navTitle,
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
  wash: 'from-brand-bg to-brand-bg',
  gridColor: 'rgba(255,255,255,0.06)',
  gridOpacity: '0.035',
  /** No inner “card” frame — avoids a second panel overlaying each room */
  chrome: '',
  immersive: false,
};

export function getWorkspaceShellTheme(activeRoom: string): WorkspaceShellTheme {
  /** Long-form guide: calmer canvas, almost no grid so sections feel editorial */
  if (activeRoom === 'suite_intelligence') {
    return {
      wash: 'from-[#131314] to-[#121213]',
      gridColor: 'rgba(255,255,255,0.03)',
      gridOpacity: '0.012',
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
