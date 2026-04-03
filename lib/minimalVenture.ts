import type { Project } from '@/lib/db';
import { buildInitialStrategyJson } from '@/lib/defaultStrategyTimeline';

/** Blank venture record for chat-first onboarding (Personal Assistant fills context over time). */
export function emptyVentureShell(name?: string): Omit<Project, 'id' | 'timestamp'> {
    return {
        name: name?.trim() || `New venture ${new Date().toLocaleDateString()}`,
        onboardingData: '{}',
        strategy: buildInitialStrategyJson(),
        productPlan: '',
        budget: '',
        marketInsights: '',
        userNotes: '',
        teamDirectives: '',
        journal: [],
        events: [],
        files: [],
        orgStructure: [],
        kanban: [],
        diary: [],
        deskDocuments: [],
    };
}
