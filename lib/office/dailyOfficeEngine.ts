import type { Project } from '@/lib/db';
import type { KanbanTask } from '@/lib/db';
import type { DailyOfficeCycleResult, RoutedOfficeAction } from '@/types/office';
import { parseStrategy } from '@/lib/strategyDoc';
import { calculateGoalProgress } from '@/lib/goals/goalProgressEngine';
import {
    detectOverdueTasks,
    detectTaskDependencies,
    suggestReprioritization,
    autoReschedule,
} from '@/lib/tasks/taskIntelligence';
import { generateMorningBrief } from '@/lib/office/languageLayer';
import { buildAmbientNotifications } from '@/lib/office/notificationEngine';
import { generateWeeklyOfficeReview } from '@/lib/office/reviewEngine';
import { routeOfficeAction } from '@/lib/office/actionRouter';
import { getOfficeMemory } from '@/lib/office/officeMemory';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';

function asTasks(project: Project): KanbanTask[] {
    const raw = project.kanban;
    if (!Array.isArray(raw)) return [];
    return raw.filter((t): t is KanbanTask => t && typeof t.id === 'string' && typeof t.title === 'string');
}

function nearestEventDeadline(project: Project): number {
    const ev = project.events || [];
    let best: number | null = null;
    const now = Date.now();
    for (const e of ev) {
        if (e.type !== 'deadline' && e.type !== 'milestone') continue;
        if (e.date < now) continue;
        if (best == null || e.date < best) best = e.date;
    }
    return best ?? now + 14 * 86400000;
}

/**
 * Central orchestrator — safe to call on app open, dashboard load, and after major venture edits.
 * `ventureId` matches Dexie `Project.id` (stringified for API symmetry).
 * `projectHint` — when the active venture object is already in memory (e.g. just saved), use it if
 * the ID matches so we never treat a valid venture as “missing” when `allProjects` is briefly stale.
 */
export async function runDailyOfficeCycle(
    ventureId: string,
    allProjects: Project[],
    projectHint?: Project | null
): Promise<DailyOfficeCycleResult> {
    const hintOk =
        projectHint &&
        projectHint.id !== undefined &&
        String(projectHint.id) === String(ventureId);
    const project = hintOk
        ? projectHint
        : allProjects.find((p) => p.id !== undefined && String(p.id) === String(ventureId)) ?? null;

    if (!project) {
        const emptyBrief = {
            greeting: 'No venture selected.',
            priorities: [],
            criticalAlerts: [],
            suggestedFocus: 'Select or create a venture to start the office.',
        };
        return {
            brief: emptyBrief,
            progress: { percentage: 0, projectedDaysRemaining: 0, risk: 'Medium', paceScore: 0 },
            notifications: [],
            suggestedActions: [],
            taskFindings: [],
            rescheduleSuggestions: [],
            weeklyReview: {
                completedTasks: 0,
                growthChange: 0,
                churnRisk: 'Low',
                nextWeekFocus: 'Pick a venture',
            },
        };
    }

    const strategy = parseStrategy(project.strategy || '');
    const tasks = asTasks(project);
    const phases = strategy.phases || [];
    if (isVentureFoundationSparse(project)) {
        return {
            brief: {
                greeting: '',
                priorities: [],
                criticalAlerts: [],
                suggestedFocus: 'Tell Dexo what you are building before the office starts scoring progress.',
            },
            progress: { percentage: 0, projectedDaysRemaining: 0, risk: 'Medium', paceScore: 0 },
            notifications: [],
            suggestedActions: [],
            taskFindings: [],
            rescheduleSuggestions: [],
            weeklyReview: {
                completedTasks: 0,
                growthChange: 0,
                churnRisk: 'Low',
                nextWeekFocus: 'Describe the venture first',
            },
        };
    }
    const progress = calculateGoalProgress(tasks, phases);
    const brief = generateMorningBrief(project, tasks, progress, strategy);

    const taskFindings = [
        ...detectOverdueTasks(tasks),
        ...detectTaskDependencies(tasks, strategy.flow?.nodes, strategy.flow?.edges),
        ...suggestReprioritization(tasks, phases),
    ];

    const milestoneAnchor = nearestEventDeadline(project);
    const rescheduleSuggestions = autoReschedule(tasks, milestoneAnchor);

    const memory = getOfficeMemory(project);
    const weeklyReview = generateWeeklyOfficeReview(project, tasks, (project.userNotes || '').length);

    const notifications = buildAmbientNotifications(project, brief, taskFindings);

    const suggestedActions: RoutedOfficeAction[] = [];
    if (brief.criticalAlerts.length > 0) {
        suggestedActions.push(routeOfficeAction('risk', { message: brief.criticalAlerts[0] }));
    }
    const criticalTask = taskFindings.find((f) => f.severity === 'critical');
    if (criticalTask) {
        suggestedActions.push(
            routeOfficeAction('task_blocker', { title: criticalTask.title, message: criticalTask.detail })
        );
    }
    if (phases.some((p) => p.status === 'in_progress')) {
        suggestedActions.push(routeOfficeAction('milestone', { summary: brief.suggestedFocus }));
    }
    suggestedActions.push(routeOfficeAction('board_review', { summary: memory.lastBoardDecision || 'Weekly governance' }));

    return {
        brief,
        progress,
        notifications,
        suggestedActions,
        taskFindings,
        rescheduleSuggestions,
        weeklyReview,
    };
}
