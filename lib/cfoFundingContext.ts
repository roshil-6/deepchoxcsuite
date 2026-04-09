import type { Project } from '@/lib/db';
import { mergeVentureOnboardingFromProject } from '@/lib/ventureOnboarding';

const MAX = 6000;

function clip(s: string, max: number): string {
    const t = (s || '').trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1).trim()}…`;
}

/** Serializable bundle for `/api/cfo-funding-suggest` — venture fields the CFO model can use. */
export type CfoFundingPayload = {
    ventureName: string;
    strategy: string;
    productPlan: string;
    marketInsights: string;
    budget: string;
    userNotes: string;
    teamDirectives: string;
    /** Merged wizard + strategy/product/market fallbacks (structured intake). */
    onboardingMerged: string;
    staffSummary: string;
    desks: {
        ceo: string;
        pm: string;
        accountant: string;
        scout: string;
        cmo: string;
    };
    kanbanTitles: string[];
    focusToday: string[];
};

export function buildCfoFundingPayload(project: Project): CfoFundingPayload {
    const merged = mergeVentureOnboardingFromProject(project);
    const onboardingMerged = [
        merged.projectName && `Venture name: ${merged.projectName}`,
        merged.strategicIntent && `Strategic intent: ${merged.strategicIntent}`,
        merged.industry && `Industry: ${merged.industry}`,
        merged.problemStatement && `Problem: ${merged.problemStatement}`,
        merged.targetAudience && `Audience: ${merged.targetAudience}`,
        merged.primaryGoal && `Primary goal: ${merged.primaryGoal}`,
        merged.timeline && `Timeline: ${merged.timeline}`,
        merged.resources && `Resources / constraints: ${merged.resources}`,
        merged.valueProposition && `Value proposition: ${merged.valueProposition}`,
        merged.challenges && `Challenges: ${merged.challenges}`,
    ]
        .filter(Boolean)
        .join('\n');

    const snap = project.agentStaffSnapshot;
    const kanban = Array.isArray(project.kanban) ? project.kanban : [];
    const titles = kanban
        .map((t: { title?: string }) => (typeof t?.title === 'string' ? t.title.trim() : ''))
        .filter(Boolean)
        .slice(0, 12);

    return {
        ventureName: project.name?.trim() || 'Venture',
        strategy: clip(project.strategy || '', MAX),
        productPlan: clip(project.productPlan || '', MAX),
        marketInsights: clip(project.marketInsights || '', MAX),
        budget: clip(project.budget || '', MAX),
        userNotes: clip(project.userNotes || '', 2000),
        teamDirectives: clip(project.teamDirectives || '', 2000),
        onboardingMerged: clip(onboardingMerged, 8000),
        staffSummary: clip(snap?.summary || '', 2000),
        desks: {
            ceo: clip(snap?.desks?.ceo || '', 2500),
            pm: clip(snap?.desks?.pm || '', 2500),
            accountant: clip(snap?.desks?.accountant || '', 2500),
            scout: clip(snap?.desks?.scout || '', 2500),
            cmo: clip(snap?.desks?.cmo || '', 2500),
        },
        kanbanTitles: titles,
        focusToday: (project.staffFocusToday || []).slice(0, 8).map((x) => clip(String(x), 200)),
    };
}
