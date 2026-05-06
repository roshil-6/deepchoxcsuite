export type ResearchLaneId = 'market' | 'product' | 'fundraising' | 'ops' | 'narrative';
export type ResearchCadence = 'daily' | 'weekdays' | 'manual';

export type ResearchWorkflowPrefs = {
  interestNotes: string;
  lanesEnabled: Record<ResearchLaneId, boolean>;
  autoBriefing: boolean;
  cadence: ResearchCadence;
};

const PREFIX = 'deepchox-research-workflow-v1';

export const DEFAULT_RESEARCH_WORKFLOW: ResearchWorkflowPrefs = {
  interestNotes: '',
  lanesEnabled: {
    market: true,
    product: true,
    fundraising: true,
    ops: true,
    narrative: true,
  },
  autoBriefing: true,
  cadence: 'daily',
};

function storageKey(ventureId: number) {
  return `${PREFIX}:${ventureId}`;
}

export function loadResearchWorkflowPrefs(ventureId: number): ResearchWorkflowPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_RESEARCH_WORKFLOW, lanesEnabled: { ...DEFAULT_RESEARCH_WORKFLOW.lanesEnabled } };
  try {
    const raw = localStorage.getItem(storageKey(ventureId));
    if (!raw) {
      return { ...DEFAULT_RESEARCH_WORKFLOW, lanesEnabled: { ...DEFAULT_RESEARCH_WORKFLOW.lanesEnabled } };
    }
    const o = JSON.parse(raw) as Partial<ResearchWorkflowPrefs>;
    return {
      interestNotes: typeof o.interestNotes === 'string' ? o.interestNotes : '',
      lanesEnabled: {
        market: o.lanesEnabled?.market !== false,
        product: o.lanesEnabled?.product !== false,
        fundraising: o.lanesEnabled?.fundraising !== false,
        ops: o.lanesEnabled?.ops !== false,
        narrative: o.lanesEnabled?.narrative !== false,
      },
      autoBriefing: o.autoBriefing !== false,
      cadence:
        o.cadence === 'weekdays' || o.cadence === 'manual' || o.cadence === 'daily'
          ? o.cadence
          : 'daily',
    };
  } catch {
    return { ...DEFAULT_RESEARCH_WORKFLOW, lanesEnabled: { ...DEFAULT_RESEARCH_WORKFLOW.lanesEnabled } };
  }
}

export function saveResearchWorkflowPrefs(ventureId: number, prefs: ResearchWorkflowPrefs) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(ventureId), JSON.stringify(prefs));
  } catch {
    /* noop */
  }
}

/** When false, skip auto daily pulse (weekend + weekdays cadence, or manual). */
export function shouldAutoRunBriefingNow(prefs: ResearchWorkflowPrefs): boolean {
  if (!prefs.autoBriefing) return false;
  if (prefs.cadence === 'manual') return false;
  if (prefs.cadence === 'weekdays') {
    const d = new Date().getUTCDay();
    if (d === 0 || d === 6) return false;
  }
  return true;
}

export function appendBriefingPreferencesToContext(baseContext: string, prefs: ResearchWorkflowPrefs): string {
  const bits: string[] = [];
  const notes = prefs.interestNotes.trim();
  if (notes) bits.push(`Founder priorities & interests:\n${notes}`);
  const lanes = (Object.entries(prefs.lanesEnabled) as [ResearchLaneId, boolean][])
    .filter(([, on]) => on)
    .map(([id]) => id);
  if (lanes.length) bits.push(`Weight the brief toward these lanes: ${lanes.join(', ')}.`);
  bits.push(`Automation: ${prefs.cadence}; auto briefing ${prefs.autoBriefing ? 'on' : 'off'}.`);
  if (!bits.length) return baseContext;
  return `${baseContext}\n\n--- Briefing preferences ---\n${bits.join('\n')}`;
}
