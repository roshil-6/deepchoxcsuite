import type { AgentRole } from '@/lib/OfficeContext';

/** Surfaces where the left chat rail is visible (see app/page.tsx). */
export type ChatVisibleRoom =
  | 'dashboard'
  | 'reports'
  | 'calendar'
  | 'boardroom'
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
  roleLabel: 'Chief of Staff',
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
      roleLabel: 'Chief of Staff',
      subtitle: 'Overview.',
      emptyPrompt: 'Ask about this venture, priorities, or next steps.',
      placeholder: 'Message…',
    },
    reports: {
      agentRole: 'chief_of_staff',
      roleLabel: 'your Chief of Staff',
      subtitle: 'Here at the intelligence vault.',
      emptyPrompt: 'Summarize what you need from reports, notes, or exports.',
      placeholder: 'Query the vault…',
    },
    calendar: {
      agentRole: 'chief_of_staff',
      roleLabel: 'your Chief of Staff',
      subtitle: 'Aligned with your timeline.',
      emptyPrompt: 'Plan moves, deadlines, or stakeholder touchpoints.',
      placeholder: 'Schedule or adjust…',
    },
    boardroom: {
      agentRole: 'chief_of_staff',
      roleLabel: 'your Chief of Staff',
      subtitle: 'Facilitating the boardroom view.',
      emptyPrompt: 'Frame the decision or tension you want to work through.',
      placeholder: 'Frame the session…',
    },
    intelligence_diary: {
      agentRole: 'ceo',
      roleLabel: 'your CEO',
      subtitle: 'Neural Diary · side thread',
      emptyPrompt:
        'Use this thread to pressure-test a diary entry, ask for a sharper angle, or turn a vague worry into a plan.',
      placeholder: 'Speak freely…',
    },
    cmo: {
      agentRole: 'cmo',
      roleLabel: 'your CMO',
      subtitle: 'GTM & messaging at the pitch forge.',
      emptyPrompt: 'Sharpen narrative, ICP, or slide story before you ship it.',
      placeholder: 'Shape the message…',
    },
    org_structure: {
      agentRole: 'chief_of_staff',
      roleLabel: 'your Chief of Staff',
      subtitle: 'Org and roles in view.',
      emptyPrompt: 'Describe hiring, reporting, or structural changes.',
      placeholder: 'Shape the org…',
    },
    accountant: {
      agentRole: 'accountant',
      roleLabel: 'your CFO',
      subtitle: 'Finance desk — ledger, runway, and scenarios.',
      emptyPrompt: 'Ask about burn, runway, the ledger, or what to stress-test before the board.',
      placeholder: 'Ask the CFO about your numbers or assumptions…',
    },
    ceo: {
      agentRole: 'ceo',
      roleLabel: 'your CEO',
      subtitle: 'Strategy desk — narrative, phases, and decisions.',
      emptyPrompt: 'Pressure-test strategy, sequencing, or how to frame the next move.',
      placeholder: 'Ask the CEO about strategy…',
    },
    pm: {
      agentRole: 'pm',
      roleLabel: 'your CTO / PM',
      subtitle: 'Product desk — delivery, scope, and roadmap.',
      emptyPrompt: 'Unblock delivery, refine scope, or align milestones with strategy.',
      placeholder: 'Ask about product and delivery…',
    },
    scout: {
      agentRole: 'scout',
      roleLabel: 'your CSO / Scout',
      subtitle: 'Intel desk — market signal and evidence.',
      emptyPrompt: 'Synthesize market moves, competitors, or what to validate next.',
      placeholder: 'Ask about market and intel…',
    },
    forge: {
      agentRole: 'cmo',
      roleLabel: 'your CMO',
      subtitle: 'Pitch forge — narrative and slides.',
      emptyPrompt: 'Sharpen story, ICP, or deck flow before you ship.',
      placeholder: 'Shape narrative or deck…',
    },
    wargame: {
      agentRole: 'chief_of_staff',
      roleLabel: 'your Chief of Staff',
      subtitle: 'Wargame — stress-test assumptions.',
      emptyPrompt: 'Explore scenarios, second-order effects, or who wins if plans shift.',
      placeholder: 'Frame a wargame question…',
    },
    dexo: {
      agentRole: 'dexo',
      roleLabel: 'Dexo Core',
      subtitle: 'Cross-suite intelligence.',
      emptyPrompt: 'Ask across desks when the question does not fit a single officer.',
      placeholder: 'Ask Dexo…',
    },
    founders_office: {
      agentRole: 'chief_of_staff',
      roleLabel: 'your Chief of Staff',
      subtitle: 'Founders office — alignment and priorities.',
      emptyPrompt: 'Align founders on focus, tradeoffs, or what to decide next.',
      placeholder: 'Steer the founders conversation…',
    },
    personal_assistant: {
      agentRole: 'chief_of_staff',
      roleLabel: 'your Chief of Staff',
      subtitle: 'Personal assistant — tasks and follow-ups.',
      emptyPrompt: 'Capture actions, briefings, or what to prep for.',
      placeholder: 'Ask your assistant…',
    },
    enquiries: {
      agentRole: 'chief_of_staff',
      roleLabel: 'your Chief of Staff',
      subtitle: 'Enquiries — inbound and responses.',
      emptyPrompt: 'Draft replies, triage inbound, or summarize threads.',
      placeholder: 'Handle enquiries…',
    },
    suite_intelligence: {
      agentRole: 'chief_of_staff',
      roleLabel: 'your Chief of Staff',
      subtitle: 'Suite intelligence — how the system works.',
      emptyPrompt: 'Ask how a desk, sync, or report fits into the bigger picture.',
      placeholder: 'Ask about the AI architecture…',
    },
    vc_gauntlet: {
      agentRole: 'shark',
      roleLabel: 'VC gauntlet',
      subtitle: 'Capital diligence rehearsal.',
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
    'enquiries',
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
