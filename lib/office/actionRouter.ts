import type { OfficeActionIntent, RoutedOfficeAction } from '@/types/office';
import { assignDeskOwnership, inferIssueClassFromText } from '@/lib/office/delegationEngine';

function stepsFor(intent: OfficeActionIntent): string[] {
    switch (intent) {
        case 'deadline':
            return ['Add or confirm a calendar deadline', 'Notify accountable desk owners', 'Link to execution board item'];
        case 'milestone':
            return ['Update strategy phase dates', 'Reflect milestone in CEO narrative', 'Ping PM for delivery alignment'];
        case 'risk':
            return ['Log risk in office memory', 'Route to CFO/CEO for mitigation', 'Schedule review in calendar'];
        case 'task_blocker':
            return ['Identify blocking dependency', 'Move blocker to in-progress or escalate', 'Update team directives'];
        case 'pricing_issue':
            return ['Model price change in budget', 'Align CMO on positioning', 'CEO decision on guardrails'];
        case 'board_review':
            return ['Summarize week in journal', 'Attach key metrics snapshot', 'Prepare board ask / decisions needed'];
        default:
            return [];
    }
}

/**
 * Maps high-level intents to desk routing — returns structured plans (execution stays with caller).
 */
export function routeOfficeAction(
    intent: OfficeActionIntent,
    payload: Record<string, unknown>
): RoutedOfficeAction {
    const text =
        typeof payload.message === 'string'
            ? payload.message
            : typeof payload.title === 'string'
              ? payload.title
              : typeof payload.summary === 'string'
                ? payload.summary
                : '';

    let targetDesks: string[] = [];
    if (intent === 'pricing_issue') {
        targetDesks = assignDeskOwnership('pricing');
    } else if (intent === 'task_blocker') {
        targetDesks = assignDeskOwnership(inferIssueClassFromText(text || 'technical'));
    } else if (intent === 'deadline' || intent === 'milestone') {
        targetDesks = ['CEO', 'PM', 'Chief of Staff'];
    } else if (intent === 'risk') {
        targetDesks = assignDeskOwnership(inferIssueClassFromText(text || 'finance'));
    } else if (intent === 'board_review') {
        targetDesks = ['CEO', 'CFO', 'Chief of Staff'];
    } else {
        targetDesks = assignDeskOwnership('generic');
    }

    const summary =
        text.trim() ||
        ({
            deadline: 'Calendar deadline routing',
            milestone: 'Milestone alignment routing',
            risk: 'Risk escalation routing',
            task_blocker: 'Task blocker routing',
            pricing_issue: 'Pricing change routing',
            board_review: 'Board preparation routing',
        }[intent] ||
            'Office routing');

    return {
        intent,
        targetDesks,
        summary,
        proposedSteps: stepsFor(intent),
    };
}
