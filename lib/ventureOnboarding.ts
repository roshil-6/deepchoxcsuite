import type { Project } from '@/lib/db';

const ONBOARDING_KEYS = [
  'projectName',
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

/** Human-readable block for system prompts (rail chat, etc.). */
export function formatVentureOnboardingForPrompt(project: Project | null | undefined): string {
  if (!project?.onboardingData?.trim()) return '';
  const o = parseVentureOnboarding(project.onboardingData);
  if (!o) return '';
  const lines = Object.entries(o).map(([k, v]) => `- ${LABELS[k] ?? k}: ${v}`);
  return `
VERIFIED VENTURE ONBOARDING (already captured — treat as ground truth; do not ask the user to re-enter these basics unless a field is empty or they ask to change it):
${lines.join('\n')}
`;
}
