import type { Project } from '@/lib/projectTypes';
import { buildInitialStrategyJson } from '@/lib/defaultStrategyTimeline';

/** Blank venture record for chat-first onboarding. Strategy map/timeline stay empty until intent is clear. */
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
