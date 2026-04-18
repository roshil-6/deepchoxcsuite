'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import {
    shouldRunAutoStaffSyncNow,
    AUTO_STAFF_SYNC_TICK_MS,
    AUTO_STAFF_SYNC_COOLDOWN_MS,
    AUTO_STAFF_SYNC_BACKOFF_AFTER_ERROR_MS,
} from '@/lib/autoStaffSyncPreferences';

/**
 * Background staff sync: runs while the tab is visible (and on focus / reopen) when
 * the last sync is stale and the venture has enough context.
 */
export function AgentStaffAutoSync() {
    const { activeProject, agentSyncRunning, runAgentStaffSync, addSystemLog } = useOffice();
    const lastAttemptRef = useRef(0);
    const lastErrorRef = useRef(0);

    const tick = useCallback(async () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
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
        const onFocus = () => void tick();
        const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) void tick();
        };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('focus', onFocus);
        window.addEventListener('pageshow', onPageShow as EventListener);
        void tick();

        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('pageshow', onPageShow as EventListener);
        };
    }, [tick]);

    return null;
}
