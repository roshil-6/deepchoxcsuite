import type { OfficeNotification } from '@/types/office';
import type { Project } from '@/lib/db';
import type { TaskIntelligenceFinding } from '@/types/office';
import type { MorningBrief } from '@/types/office';

function isoNow(): string {
    return new Date().toISOString();
}

/**
 * Derives ambient notifications from live venture signals + task intelligence.
 */
export function buildAmbientNotifications(
    project: Project,
    brief: MorningBrief,
    taskFindings: TaskIntelligenceFinding[]
): OfficeNotification[] {
    const list: OfficeNotification[] = [];

    for (const line of project.staffFocusToday || []) {
        const t = line.trim();
        if (t)
            list.push({
                desk: 'Chief of Staff',
                message: t,
                severity: 'info',
                timestamp: isoNow(),
            });
    }

    for (const a of brief.criticalAlerts) {
        list.push({
            desk: 'CEO',
            message: a,
            severity: 'warning',
            timestamp: isoNow(),
        });
    }

    for (const f of taskFindings) {
        if (f.severity === 'critical') {
            list.push({
                desk: 'CTO',
                message: `${f.title}: ${f.detail}`,
                severity: 'critical',
                timestamp: isoNow(),
            });
        } else if (f.severity === 'warning' && f.kind !== 'reprioritize') {
            list.push({
                desk: 'PM',
                message: `${f.title}: ${f.detail}`,
                severity: 'warning',
                timestamp: isoNow(),
            });
        }
    }

    const snap = project.agentStaffSnapshot?.summary?.trim();
    if (snap && list.length < 6) {
        list.push({
            desk: 'Office',
            message: snap.length > 200 ? `${snap.slice(0, 200)}…` : snap,
            severity: 'info',
            timestamp: isoNow(),
        });
    }

    return list.slice(0, 12);
}
