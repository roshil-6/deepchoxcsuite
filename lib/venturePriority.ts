/**
 * Venture Priority / Focus Mode
 * Controls how Deepchox, Jarvis analysis, and daily research frame every response.
 * Stored in project.roomPreferences.dexoPriority (+ dexoPriorityCustom for custom mode).
 */

export type VenturePriorityId =
  | 'vision'
  | 'market_research'
  | 'execution'
  | 'planning'
  | 'all'
  | 'custom';

export interface VenturePriorityDef {
  id: VenturePriorityId;
  label: string;
  icon: string;
  tagline: string;
  description: string;
  /** Desk ids that get extra weight in the overview card sort */
  deskFocus: string[];
  /** Injected into the AI context as a CURRENT_FOCUS directive */
  aiInstruction: string;
}

export const VENTURE_PRIORITIES: VenturePriorityDef[] = [
  {
    id: 'vision',
    label: 'Vision & Identity',
    icon: '◉',
    tagline: 'Define who you are and why you exist',
    description: 'Brand mission, values, narrative, positioning, differentiation',
    deskFocus: ['ceo', 'cmo'],
    aiInstruction: `[CURRENT_FOCUS: Vision & Brand Identity]
This founder needs to crystallise their brand story before anything else.
- PRIORITISE: mission, values, brand narrative, market positioning, differentiation angle, target mindset
- Every question should dig into WHY this venture exists and WHO it truly serves at a human level
- Surface identity gaps before jumping to strategy or tactics
- Frame all insights as brand/positioning opportunities, not operational tasks
- Only surface execution detail when it directly expresses the vision
- Avoid kanban-style action items unless core vision is already crystal-clear`,
  },
  {
    id: 'market_research',
    label: 'Market Research',
    icon: '◎',
    tagline: 'Understand the landscape before you move',
    description: 'Competitive mapping, market size, customer segments, trends, pricing',
    deskFocus: ['scout', 'cmo'],
    aiInstruction: `[CURRENT_FOCUS: Market Research & Competitive Intelligence]
This founder needs market intelligence above everything else right now.
- PRIORITISE: competitor mapping, TAM/SAM/SOM, customer personas, pricing landscape, trend signals, underserved niches
- Ground every external claim in available web sources; flag explicitly when research is missing
- Ask probing questions about target customer behaviour, willingness to pay, and switching costs
- Highlight positioning white space and category opportunities
- Defer internal planning topics unless they directly follow a market-driven insight
- Treat the Scout desk as the primary lens; CMO as secondary`,
  },
  {
    id: 'execution',
    label: 'Execution Mode',
    icon: '▸',
    tagline: 'Ship things. Clear blockers. Move fast.',
    description: 'Task prioritisation, blockers, team coordination, shipping velocity',
    deskFocus: ['pm', 'ceo'],
    aiInstruction: `[CURRENT_FOCUS: Execution & Operations]
This founder is in build mode — they need to ship, not strategise further.
- PRIORITISE: immediate next steps, blocker removal, task sequencing, team alignment, delivery milestones
- Lead every response with the single most actionable next move
- Ask "What is stopping you from shipping this today?" and work to remove that specific blocker
- Kanban tasks and short-horizon planning (today / this week) take priority over long-range roadmaps
- Avoid high-level strategic detours unless they directly resolve an execution bottleneck
- Treat the PM desk as the primary lens; CEO as accountability check`,
  },
  {
    id: 'planning',
    label: 'Strategic Planning',
    icon: '◆',
    tagline: 'Map the path from here to scale',
    description: 'Roadmap, milestones, resource sequencing, growth strategy, funding',
    deskFocus: ['ceo', 'pm', 'accountant'],
    aiInstruction: `[CURRENT_FOCUS: Strategic Planning & Roadmap]
This founder needs to think in timelines, sequences, and resource constraints — not day-to-day ops.
- PRIORITISE: milestone mapping, dependency sequencing, resource constraints, growth levers, funding needs, horizon planning
- Frame every insight as a sequencing decision: what must happen before what, and why
- Surface strategic risks and decision forks before they become blockers
- Ask about constraints (time, budget, team capacity) that shape what is actually achievable
- Tie financial health directly to milestone timing and resource allocation
- Defer tactical execution detail unless it directly impacts a strategic sequencing choice`,
  },
  {
    id: 'all',
    label: 'Full Stack',
    icon: '∞',
    tagline: 'Everything, equally. No area deprioritised.',
    description: 'Vision, market, execution, and strategy — balanced across all desks',
    deskFocus: ['ceo', 'pm', 'accountant', 'scout', 'cmo'],
    aiInstruction: `[CURRENT_FOCUS: Full Stack — All Dimensions]
Give equal weight to vision, market intelligence, execution, and strategic planning.
No single desk or area is deprioritised. Surface gaps wherever they appear.
Balance short-term actions with long-term strategy in every response.`,
  },
  {
    id: 'custom',
    label: 'Custom Focus',
    icon: '+',
    tagline: 'Tell Deepchox exactly what to work on',
    description: 'Define your own AI focus — as specific or broad as you need',
    deskFocus: [],
    aiInstruction: '', // filled at runtime from roomPreferences.dexoPriorityCustom
  },
];

export function getPriorityById(id: string | undefined): VenturePriorityDef | undefined {
  return VENTURE_PRIORITIES.find((p) => p.id === id);
}

/**
 * Returns the AI instruction block to inject into the venture context.
 * For custom mode, uses the user's typed instruction.
 */
export function buildPriorityInstruction(
  priorityId: string | undefined,
  customText: string | undefined,
): string {
  if (!priorityId || priorityId === 'all') {
    // Full-stack: still inject the balanced directive
    const def = getPriorityById('all');
    return def ? def.aiInstruction : '';
  }

  if (priorityId === 'custom') {
    const trimmed = (customText ?? '').trim();
    if (!trimmed) return '';
    return `[CURRENT_FOCUS: Custom — User-defined]\n${trimmed}`;
  }

  const def = getPriorityById(priorityId);
  return def ? def.aiInstruction : '';
}

/** Read priority from project.roomPreferences (safe, no throws). */
export function readVenturePriority(project: { roomPreferences?: Record<string, unknown> } | null | undefined): {
  priorityId: string | undefined;
  customText: string | undefined;
} {
  const prefs = project?.roomPreferences ?? {};
  return {
    priorityId: typeof prefs.dexoPriority === 'string' ? prefs.dexoPriority : undefined,
    customText: typeof prefs.dexoPriorityCustom === 'string' ? prefs.dexoPriorityCustom : undefined,
  };
}
