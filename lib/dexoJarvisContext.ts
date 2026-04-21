import type { Project } from '@/lib/db';

/**
 * When no venture is saved yet — Dexo still converses to help shape ideas before “New venture”.
 * Sent as `context` for jarvis `converse` (not for full `analyze`).
 */
export const DEXO_PRE_VENTURE_CONTEXT = `No named venture workspace is saved in this browser session yet. The user may be a guest or signed in but still exploring.

Your job: help them clarify what they want to build, who it’s for, and what problem they care about. Be concise and practical. Suggest they click **New venture** in the sidebar when they want to save a named venture and unlock structured analysis.

Do not invent a company name or metrics they did not provide. voiceResponse should be 2–5 short sentences, warm and direct.`;

/** Venture snapshot sent with Dexo `/api/jarvis` requests (room + floating orb). */
export function buildDexoJarvisVentureContext(project: Project): string {
    const p: string[] = [`Venture: ${project.name}`];
    if (project.strategy) p.push(`Strategy:\n${project.strategy.slice(0, 3000)}`);
    if (project.productPlan) p.push(`Product:\n${project.productPlan.slice(0, 2000)}`);
    if (project.budget) p.push(`Finance:\n${project.budget.slice(0, 1500)}`);
    if (project.marketInsights) p.push(`Market:\n${project.marketInsights.slice(0, 1500)}`);
    if (project.teamDirectives) p.push(`Directives:\n${project.teamDirectives.slice(0, 800)}`);
    if (project.userNotes) p.push(`Notes:\n${project.userNotes.slice(0, 800)}`);
    const kb = project.kanban;
    if (Array.isArray(kb) && kb.length > 0) {
        const lines = kb
            .filter((t: { title?: string }) => t && typeof t.title === 'string')
            .slice(0, 40)
            .map((t: { status?: string; title: string }) => `- [${t.status ?? 'todo'}] ${t.title}`);
        if (lines.length) p.push(`Execution board (kanban):\n${lines.join('\n')}`);
    }
    if (project.agentStaffSnapshot?.summary) p.push(`Last sync:\n${project.agentStaffSnapshot.summary}`);
    return p.join('\n\n');
}
