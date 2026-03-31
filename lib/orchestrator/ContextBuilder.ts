import { Project } from '../db';
import { ExecutiveRole } from './types';

export class ContextBuilder {
    static build(role: ExecutiveRole, project: Project, query: string, previousConflicts?: string): string {
        const baseContext = `
            Project: ${project.name}
            Current Query: "${query}"
            ${previousConflicts ? `NOTE - PREVIOUS CONFLICT DETECTED: ${previousConflicts}. You must adjust your strategy to resolve this.` : ''}
        `;

        switch (role) {
            case 'CEO':
                return `
                    ${baseContext}
                    Strategic Context: ${project.strategy || 'None defined'}
                    Market Insights: ${project.marketInsights || 'None defined'}
                    FOCUS: Long-term vision, growth, brand positioning.
                `;
            case 'CFO':
                return `
                    ${baseContext}
                    Financial Context: ${project.budget || 'None defined'}
                    FOCUS: Key numbers, scenario tables, cash flow, burn, ROI.
                `;
            case 'CMO':
                return `
                    ${baseContext}
                    Market Insights: ${project.marketInsights || 'None defined'}
                    Target Audience: ${project.onboardingData ? JSON.parse(project.onboardingData).targetAudience : 'Unknown'}
                    FOCUS: GTM plan, messaging framework, positioning.
                `;
            case 'CTO':
                return `
                    ${baseContext}
                    Product Plan: ${project.productPlan || 'None defined'}
                    FOCUS: Architecture recommendation, feasibility, tech debt.
                `;
            case 'CSO':
                return `
                    ${baseContext}
                    Market Insights: ${project.marketInsights || 'None defined'}
                    Strategy: ${project.strategy || 'None defined'}
                    FOCUS: Competitive map, threat assessment, strategic positioning vs peers.
                `;
            default:
                return baseContext;
        }
    }
}
