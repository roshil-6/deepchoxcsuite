import type { Project } from '@/lib/db';
import type { ResearchStaffRole } from '@/lib/researchStaffLabels';

/** Minimum meaningful content length for a desk-owned field (founder input). */
export const MIN_VENTURE_FIELD_CHARS = 48;

export type VentureFieldKey =
    | 'strategy'
    | 'budget'
    | 'productPlan'
    | 'marketInsights'
    | 'teamDirectives';

export type KnowledgeGap = {
    id: string;
    role: ResearchStaffRole;
    field: VentureFieldKey;
    /** Short headline for UI */
    title: string;
    /** What Deepchox asks the founder */
    prompt: string;
};

const DESK_ORDER: ResearchStaffRole[] = ['ceo', 'accountant', 'pm', 'scout', 'cmo'];

function hasStrategyDepth(project: Project): boolean {
    const s = project.strategy?.trim() || '';
    return s.length >= MIN_VENTURE_FIELD_CHARS;
}

function hasBudgetDepth(project: Project): boolean {
    const s = project.budget?.trim() || '';
    return s.length >= MIN_VENTURE_FIELD_CHARS;
}

function hasProductDepth(project: Project): boolean {
    const s = project.productPlan?.trim() || '';
    return s.length >= MIN_VENTURE_FIELD_CHARS;
}

function hasMarketDepth(project: Project): boolean {
    const s = project.marketInsights?.trim() || '';
    return s.length >= MIN_VENTURE_FIELD_CHARS;
}

function hasGrowthDepth(project: Project): boolean {
    const sync = project.agentStaffSnapshot?.desks.cmo?.trim() || '';
    if (sync.length >= MIN_VENTURE_FIELD_CHARS) return true;
    const td = project.teamDirectives?.trim() || '';
    if (td.length >= MIN_VENTURE_FIELD_CHARS) return true;
    const notes = project.userNotes?.trim() || '';
    return notes.length >= MIN_VENTURE_FIELD_CHARS * 2;
}

export function computeKnowledgeGaps(project: Project | null | undefined): KnowledgeGap[] {
    if (!project) return [];
    const gaps: KnowledgeGap[] = [];

    if (!hasStrategyDepth(project)) {
        gaps.push({
            id: 'ceo-strategy',
            role: 'ceo',
            field: 'strategy',
            title: 'Strategy & direction',
            prompt:
                'What is the clearest version of your mission, current phase, and top priorities? Add enough detail that every desk can align (even a rough paragraph helps).',
        });
    }
    if (!hasBudgetDepth(project)) {
        gaps.push({
            id: 'accountant-budget',
            role: 'accountant',
            field: 'budget',
            title: 'Finance & runway',
            prompt:
                'Roughly how much runway you have, monthly burn, and any capital plans or constraints? Numbers can be rough — we need enough to model risk.',
        });
    }
    if (!hasProductDepth(project)) {
        gaps.push({
            id: 'pm-product',
            role: 'pm',
            field: 'productPlan',
            title: 'Product & delivery',
            prompt:
                'What are you shipping next, who it is for, and how you track delivery (roadmap cadence, milestones)?',
        });
    }
    if (!hasMarketDepth(project)) {
        gaps.push({
            id: 'scout-market',
            role: 'scout',
            field: 'marketInsights',
            title: 'Market & landscape',
            prompt:
                'Who competes for the same buyer, what trends matter, and what signals you watch? A short bullet list is fine.',
        });
    }
    if (!hasGrowthDepth(project)) {
        gaps.push({
            id: 'cmo-growth',
            role: 'cmo',
            field: 'teamDirectives',
            title: 'Growth & narrative',
            prompt:
                'How do you position the venture, which channels matter for GTM, and what story you want investors or customers to hear?',
        });
    }

    return gaps.sort((a, b) => DESK_ORDER.indexOf(a.role) - DESK_ORDER.indexOf(b.role));
}

export function signatureForGaps(gaps: KnowledgeGap[]): string {
    return gaps.map((g) => g.id).join('|');
}

export type PortfolioDeskStat = {
    role: ResearchStaffRole;
    documented: number;
    total: number;
    /** 0–1 */
    coverage: number;
    /** Best snapshot line for this desk across ventures, if any */
    snapshotSnippet: string | null;
};

function pickLongestSnapshot(projects: Project[], role: keyof NonNullable<Project['agentStaffSnapshot']>['desks']): string | null {
    let best = '';
    for (const p of projects) {
        const t = p.agentStaffSnapshot?.desks?.[role]?.trim();
        if (t && t.length > best.length) best = t;
    }
    if (!best) return null;
    return best.length > 120 ? `${best.slice(0, 117)}…` : best;
}

function userContentForRole(project: Project, role: ResearchStaffRole): boolean {
    switch (role) {
        case 'ceo':
            return hasStrategyDepth(project);
        case 'accountant':
            return hasBudgetDepth(project);
        case 'pm':
            return hasProductDepth(project);
        case 'scout':
            return hasMarketDepth(project);
        case 'cmo':
            return hasGrowthDepth(project);
        default:
            return false;
    }
}

export function aggregatePortfolioDeskStats(projects: Project[]): Record<ResearchStaffRole, PortfolioDeskStat> {
    const roles: ResearchStaffRole[] = ['ceo', 'accountant', 'pm', 'scout', 'cmo'];
    const total = projects.length;
    const out = {} as Record<ResearchStaffRole, PortfolioDeskStat>;

    for (const role of roles) {
        const snapKey =
            role === 'ceo'
                ? 'ceo'
                : role === 'accountant'
                  ? 'accountant'
                  : role === 'pm'
                    ? 'pm'
                    : role === 'scout'
                      ? 'scout'
                      : 'cmo';
        const snapshotSnippet = pickLongestSnapshot(projects, snapKey);
        let documented = 0;
        for (const p of projects) {
            if (userContentForRole(p, role)) documented++;
        }
        const coverage = total === 0 ? 0 : documented / total;
        out[role] = {
            role,
            documented,
            total,
            coverage,
            snapshotSnippet,
        };
    }
    return out;
}

/** First venture that still needs this desk’s field (for deep-link from portfolio). */
export function firstProjectNeedingRole(projects: Project[], role: ResearchStaffRole): Project | null {
    for (const p of projects) {
        const gaps = computeKnowledgeGaps(p);
        if (gaps.some((g) => g.role === role)) return p;
    }
    return projects[0] ?? null;
}
