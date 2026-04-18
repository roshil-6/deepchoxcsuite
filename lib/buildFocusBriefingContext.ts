import type { StaffAttentionItem } from '@/lib/db';
import type { DailyOfficeCycleResult } from '@/types/office';

const MAX_LEN = 12_000;

/** Compact venture snapshot for /api/focus-briefing — grounded, no invention. */
export function buildFocusBriefingContext(params: {
    ventureName: string;
    livingOffice: DailyOfficeCycleResult | null;
    staffFocusLines: string[];
    staffAttentionPending: StaffAttentionItem[];
    aiSummaryExcerpt: string | null;
    strategicExcerpt: string | null;
}): string {
    const lines: string[] = [`Venture: ${params.ventureName.trim() || 'Untitled'}`];

    if (params.strategicExcerpt?.trim()) {
        lines.push('Strategy excerpt (saved):', params.strategicExcerpt.trim());
    }
    if (params.aiSummaryExcerpt?.trim()) {
        lines.push('Last AI staff sync summary:', params.aiSummaryExcerpt.trim());
    }

    const focus = params.staffFocusLines.map((s) => s.trim()).filter(Boolean);
    if (focus.length) {
        lines.push('Staff “focus today” lines:', ...focus.map((l) => `- ${l}`));
    }

    const att = params.staffAttentionPending.filter((a) => !a.dismissed);
    if (att.length) {
        lines.push('Needs attention (staff notifications):');
        for (const a of att.slice(0, 8)) {
            lines.push(`- [${a.role}] ${a.title}: ${a.message}`);
        }
    }

    const lo = params.livingOffice;
    if (lo && lo.brief.greeting !== 'No venture selected.') {
        lines.push('Living office — daily brief greeting:', lo.brief.greeting);
        if (lo.brief.suggestedFocus?.trim()) {
            lines.push('Suggested focus:', lo.brief.suggestedFocus.trim());
        }
        if (lo.brief.priorities.length) {
            lines.push('Brief priorities:', ...lo.brief.priorities.map((p) => `- ${p}`));
        }
        if (lo.brief.criticalAlerts.length) {
            lines.push('Critical alerts:', ...lo.brief.criticalAlerts.map((p) => `- ${p}`));
        }
        lines.push(
            `Progress: ${lo.progress.percentage}% · risk ${lo.progress.risk} · ~${lo.progress.projectedDaysRemaining} days horizon · pace ${Math.round(lo.progress.paceScore * 100)}%`
        );
        if (lo.weeklyReview?.nextWeekFocus?.trim()) {
            lines.push('Next week focus (weekly review):', lo.weeklyReview.nextWeekFocus.trim());
        }
        if (lo.taskFindings.length) {
            lines.push('Task findings (sample):');
            for (const f of lo.taskFindings.slice(0, 5)) {
                lines.push(`- [${f.severity}] ${f.title}: ${f.detail}`);
            }
        }
    }

    const text = lines.join('\n');
    return text.length > MAX_LEN ? `${text.slice(0, MAX_LEN)}\n\n[truncated]` : text;
}
