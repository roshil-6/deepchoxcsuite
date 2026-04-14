'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import {
    getAutoStaffSyncEnabled,
    shouldRunAutoStaffSyncNow,
    AUTO_STAFF_SYNC_TICK_MS,
    AUTO_STAFF_SYNC_COOLDOWN_MS,
    AUTO_STAFF_SYNC_BACKOFF_AFTER_ERROR_MS,
} from '@/lib/autoStaffSyncPreferences';

/**
 * Background staff sync: when enabled (Dashboard toggle), runs while the tab is visible
 * if the last sync is older than the stale threshold and the venture has enough context.
 */
export function AgentStaffAutoSync() {
    const { activeProject, agentSyncRunning, runAgentStaffSync, addSystemLog } = useOffice();
    const lastAttemptRef = useRef(0);
    const lastErrorRef = useRef(0);

    const tick = useCallback(async () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        if (!getAutoStaffSyncEnabled()) return;
        if (!activeProject?.id || agentSyncRunning) return;

        const now = Date.now();
        if (now - lastErrorRef.current < AUTO_STAFF_SYNC_BACKOFF_AFTER_ERROR_MS) return;
        if (now - lastAttemptRef.current < AUTO_STAFF_SYNC_COOLDOWN_MS) return;
        if (!shouldRunAutoStaffSyncNow(activeProject, now)) return;

        lastAttemptRef.current = now;
        const r = await runAgentStaffSync();
        if (!r.ok) {
            lastErrorRef.current = Date.now();
            addSystemLog(r.error || 'Auto staff sync skipped or failed.', 'agent-sync', 'warning');
        }
    }, [activeProject, agentSyncRunning, runAgentStaffSync, addSystemLog]);

    useEffect(() => {
        const id = window.setInterval(() => {
            void tick();
        }, AUTO_STAFF_SYNC_TICK_MS);

        const onVis = () => {
            if (document.visibilityState === 'visible') void tick();
        };
        document.addEventListener('visibilitychange', onVis);
        void tick();

        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [tick]);

    return null;
}
