import type { Project } from '@/lib/db';
import { parseStrategy } from '@/lib/strategyDoc';

/** True when the venture has no meaningful onboarding or strategy yet — show PA welcome + discovery. */
export function isVentureUnsettled(p: Project): boolean {
    const raw = p.onboardingData?.trim();
    if (raw && raw !== '{}' && raw !== '') {
        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const has = Object.values(parsed).some((v) => typeof v === 'string' && v.trim());
            if (has) return false;
        } catch {
            /* ignore */
        }
    }
    const s = (p.strategy || '').trim();
    if (!s) return true;
    const doc = parseStrategy(s);
    if (doc.strategicIntent?.trim() || doc.vision?.trim() || doc.content?.trim()) return false;
    if (doc.priorities && doc.priorities.length > 0) return false;
    /** Timeline phases / flow can be auto-seeded — they do not alone mean onboarding is complete. */
    return true;
}

export const PA_WELCOME_MESSAGE =
    "I'm the assistant for this workspace. Describe what you're building (idea, stage, audience). We'll shape your venture record from this thread.";
