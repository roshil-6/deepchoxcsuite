import type { Project } from '@/lib/db';
import { parseStrategy } from '@/lib/strategyDoc';

const ONBOARDING_KEYS = [
  'projectName',
  'strategicIntent',
  'industry',
  'problemStatement',
  'targetAudience',
  'primaryGoal',
  'timeline',
  'resources',
  'valueProposition',
  'challenges',
] as const;

const LABELS: Record<string, string> = {
  projectName: 'Venture name',
  strategicIntent: 'Strategic intent',
  industry: 'Industry',
  problemStatement: 'Problem / conflict',
  targetAudience: 'Target audience',
  primaryGoal: 'Primary goal',
  timeline: 'Timeline',
  resources: 'Resources / constraints',
  valueProposition: 'Value proposition',
  challenges: 'Challenges / risks',
};

/** Parsed onboarding fields from `Project.onboardingData` JSON (wizard + any matching keys). */
export function parseVentureOnboarding(raw: string | undefined | null): Record<string, string> | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of ONBOARDING_KEYS) {
      const v = o[k];
      if (typeof v === 'string' && v.trim()) {
        out[k] = v.trim().slice(0, 12000);
      }
    }
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Wizard JSON (`onboardingData`) plus fallbacks from the rest of the venture record
 * so AI never sees an empty `ventureOnboarding` when strategy/product/market/name exist.
 */
export function mergeVentureOnboardingFromProject(p: Project): Record<string, string> {
  const o: Record<string, string> = { ...(parseVentureOnboarding(p.onboardingData) ?? {}) };
  const doc = parseStrategy(p.strategy || '');
  const strategic = doc.strategicIntent?.trim();
  const vision = doc.vision?.trim();
  const content = doc.content?.trim();

  const set = (key: (typeof ONBOARDING_KEYS)[number], value: string) => {
    if (o[key]?.trim()) return;
    const t = value.trim();
    if (!t) return;
    o[key] = t.slice(0, 12000);
  };

  set('projectName', p.name || '');

  if (!o.strategicIntent?.trim() && strategic) {
    o.strategicIntent = strategic.slice(0, 12000);
  }

  if (!o.primaryGoal?.trim()) {
    if (vision) o.primaryGoal = vision.slice(0, 12000);
    else if (content) o.primaryGoal = content.slice(0, 2000);
    else if (strategic && !o.strategicIntent?.trim()) o.primaryGoal = strategic.slice(0, 12000);
  }

  if (!o.problemStatement?.trim()) {
    if (strategic && vision && vision !== strategic) set('problemStatement', vision);
    else if (vision && o.primaryGoal && vision !== o.primaryGoal) set('problemStatement', vision);
    else if (content) set('problemStatement', content.slice(0, 4000));
  }

  if (!o.timeline?.trim() && doc.phases?.length) {
    set(
      'timeline',
      doc.phases
        .slice(0, 16)
        .map((ph) => `${ph.title}${ph.start ? ` (${ph.start}–${ph.end})` : ''}`)
        .join(' · '),
    );
  }

  set('targetAudience', (p.marketInsights || '').trim());
  set('valueProposition', (p.productPlan || '').trim());
  set('resources', (p.budget || '').trim());
  set('challenges', (p.teamDirectives || '').trim());

  return o;
}

/** Human-readable block for system prompts (rail chat, etc.). */
export function formatVentureOnboardingForPrompt(project: Project | null | undefined): string {
  if (!project) return '';
  const o = mergeVentureOnboardingFromProject(project);
  const lines = Object.entries(o).filter(([, v]) => v.trim()).map(([k, v]) => `- ${LABELS[k] ?? k}: ${v}`);
  if (!lines.length) return '';
  return `
VERIFIED VENTURE CONTEXT (wizard answers when present, otherwise filled from venture name, strategy doc, product plan, budget, market intel, and directives — treat as ground truth; do not ask the user to re-enter what is already listed; only ask for genuinely missing or ambiguous items):
${lines.join('\n')}
`;
}
