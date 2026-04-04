/**
 * Living Office Engine — shared types (venture-agnostic).
 * Persisted slice lives on Project.officeEngineMemoryJson (Dexie).
 */

export interface OfficeMemory {
    lastFocus: string;
    unfinishedConversations: string[];
    unresolvedRisks: string[];
    lastBoardDecision: string;
    lastUpdated: string;
    /** ISO date (local) when we last injected a morning brief into the assistant thread */
    lastMorningBriefDay?: string;
    /** Rolling weekly stats snapshot (written by review engine) */
    lastWeeklyReviewAt?: string;
}

export interface MorningBrief {
    greeting: string;
    priorities: string[];
    criticalAlerts: string[];
    suggestedFocus: string;
}

export interface GoalProgress {
    percentage: number;
    projectedDaysRemaining: number;
    risk: 'Low' | 'Medium' | 'High';
    /** 0–1 implied velocity from recent task throughput */
    paceScore: number;
}

/** Ambient office surface notification (desk label is human-readable). */
export interface OfficeNotification {
    desk: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    timestamp: string;
}

export interface WeeklyOfficeReview {
    completedTasks: number;
    growthChange: number;
    churnRisk: 'Low' | 'Medium' | 'High';
    nextWeekFocus: string;
}

export type OfficeActionIntent =
    | 'deadline'
    | 'milestone'
    | 'risk'
    | 'task_blocker'
    | 'pricing_issue'
    | 'board_review';

export interface RoutedOfficeAction {
    intent: OfficeActionIntent;
    targetDesks: string[];
    summary: string;
    proposedSteps: string[];
}

export interface TaskIntelligenceFinding {
    kind: 'overdue' | 'dependency_block' | 'reprioritize' | 'reschedule';
    severity: 'info' | 'warning' | 'critical';
    taskId: string;
    title: string;
    detail: string;
}

export interface TaskRescheduleSuggestion {
    taskId: string;
    proposedTimestamp: number;
    reason: string;
}

export interface DailyOfficeCycleResult {
    brief: MorningBrief;
    progress: GoalProgress;
    notifications: OfficeNotification[];
    suggestedActions: RoutedOfficeAction[];
    taskFindings: TaskIntelligenceFinding[];
    rescheduleSuggestions: TaskRescheduleSuggestion[];
    weeklyReview: WeeklyOfficeReview;
}
