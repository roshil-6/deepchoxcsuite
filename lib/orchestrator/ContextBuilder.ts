import { Project } from '../db';
import { ExecutiveRole } from './types';

const MAX_FIELD = 6000;

function clip(s: string | undefined | null, max = MAX_FIELD): string {
    const t = (s || '').trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max)}… [truncated]`;
}

function targetAudienceFromOnboarding(project: Project): string {
    const raw = project.onboardingData;
    if (!raw || typeof raw !== 'string') return 'Unknown';
    try {
        const o = JSON.parse(raw) as { targetAudience?: unknown };
        return typeof o.targetAudience === 'string' && o.targetAudience.trim() ? o.targetAudience.trim() : 'Unknown';
    } catch {
        return 'Unknown';
    }
}

export class ContextBuilder {
    static build(role: ExecutiveRole, project: Project, query: string, previousConflicts?: string): string {
        const baseContext = `
            Project: ${project.name}
            Current Query: "${query}"
            ${previousConflicts ? `NOTE - PREVIOUS CONFLICT DETECTED: ${previousConflicts}. You must adjust your strategy to resolve this.` : ''}
        `.trim();

        switch (role) {
            case 'CEO':
                return `
                    ${baseContext}
                    Strategic Context: ${clip(project.strategy)}
                    Market Insights: ${clip(project.marketInsights)}
                    Team directives (recent): ${clip(project.teamDirectives, 2000)}
                    FOCUS: Long-term vision, growth, brand positioning — answer the directive with a clear decision.
                `.trim();
            case 'CFO':
                return `
                    ${baseContext}
                    Financial Context: ${clip(project.budget)}
                    FOCUS: Key numbers, scenario tables, cash flow, burn, ROI — tie to the directive.
                `.trim();
            case 'CMO':
                return `
                    ${baseContext}
                    Market Insights: ${clip(project.marketInsights)}
                    Target Audience: ${targetAudienceFromOnboarding(project)}
                    FOCUS: GTM plan, messaging framework, positioning for the directive.
                `.trim();
            case 'CTO': {
                const k = Array.isArray(project.kanban) ? project.kanban.slice(0, 24) : [];
                return `
                    ${baseContext}
                    Product Plan: ${clip(project.productPlan)}
                    Execution board (recent tasks): ${clip(JSON.stringify(k))}
                    FOCUS: Architecture, feasibility, delivery risk for the directive.
                `.trim();
            }
            case 'CSO':
                return `
                    ${baseContext}
                    Market Insights: ${clip(project.marketInsights)}
                    Strategy: ${clip(project.strategy)}
                    FOCUS: Competitive map, threat assessment, positioning vs peers for the directive.
                `.trim();
            default:
                return baseContext;
        }
    }
}
