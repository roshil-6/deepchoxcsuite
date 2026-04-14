/** localStorage: auto staff sync when venture data is stale (tab visible). */

const ENABLED_KEY = 'deepchox-auto-staff-sync-enabled';

/** Minimum age of last successful staff sync before auto-run (ms). */
export const AUTO_STAFF_SYNC_STALE_MS = 3 * 60 * 60 * 1000; // 3 hours

/** How often to check (ms). */
export const AUTO_STAFF_SYNC_TICK_MS = 90 * 1000;

/** Cooldown after an auto attempt so visibility + interval don’t double-fire (ms). */
export const AUTO_STAFF_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

/** After a failed auto sync, wait before trying again (ms). */
export const AUTO_STAFF_SYNC_BACKOFF_AFTER_ERROR_MS = 30 * 60 * 1000;

export function getAutoStaffSyncEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        const v = localStorage.getItem(ENABLED_KEY);
        if (v === '0' || v === 'false') return false;
        return true;
    } catch {
        return true;
    }
}

export function setAutoStaffSyncEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
    } catch {
        /* noop */
    }
}

/** Venture has enough context that an automatic first sync is reasonable. */
export function ventureReadyForAutoStaffSync(project: { strategy?: string; agentCoordinationBrief?: string; agentStaffSnapshot?: { at?: number } | null }): boolean {
    const strat = (project.strategy || '').trim().length;
    const brief = (project.agentCoordinationBrief || '').trim().length > 0;
    const hadSync = !!project.agentStaffSnapshot?.at;
    if (hadSync) return true;
    return strat > 50 || brief;
}

export function shouldRunAutoStaffSyncNow(
    project: { agentStaffSnapshot?: { at?: number } | null },
    now: number,
): boolean {
    if (!ventureReadyForAutoStaffSync(project)) return false;
    const last = project.agentStaffSnapshot?.at ?? 0;
    if (!last) return true;
    return now - last >= AUTO_STAFF_SYNC_STALE_MS;
}
