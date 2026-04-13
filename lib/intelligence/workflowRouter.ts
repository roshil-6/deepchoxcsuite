import type { IntelligenceWorkflow } from '@/lib/intelligence/workflowMap';

export interface WorkflowRecommendation {
    workflowId: IntelligenceWorkflow['id'];
    reason: string;
}

function hasAny(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
}

export function recommendWorkflowForPrompt(prompt: string): WorkflowRecommendation {
    const text = prompt.toLowerCase();

    if (
        hasAny(text, [
            /\b(report|memo|brief|synthesis|summary|deck|write-up|writeup)\b/,
            /\bresearch\b/,
            /\bcompare\b/,
        ])
    ) {
        return {
            workflowId: 'research_report',
            reason: 'The user is asking for a synthesized research or reporting artifact.',
        };
    }

    if (
        hasAny(text, [
            /\bpinpoint\b/,
            /\broot cause\b/,
            /\bexactly why\b/,
            /\bbottleneck\b/,
            /\bdiagnose\b/,
            /\bwhat is blocking\b/,
            /\bone thing\b/,
        ])
    ) {
        return {
            workflowId: 'pinpoint_probe',
            reason: 'The user is asking for a narrow diagnosis or bottleneck-level answer.',
        };
    }

    if (
        hasAny(text, [
            /\bupdate\b/,
            /\bchange\b/,
            /\bedit\b/,
            /\badd\b/,
            /\bremove\b/,
            /\bplan\b/,
            /\bprioriti[sz]e\b/,
            /\broadmap\b/,
        ])
    ) {
        return {
            workflowId: 'personal_assistant',
            reason: 'The user is steering the venture record or asking for coordination help.',
        };
    }

    return {
        workflowId: 'desk_chat',
        reason: 'The request fits a focused, context-local answer unless promoted into a larger workflow.',
    };
}
