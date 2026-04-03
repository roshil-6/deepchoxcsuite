'use client';

import React, { useEffect, useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { RefreshCw, X } from 'lucide-react';

const TWENTY_H = 20 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export function DailySyncBanner() {
  const { activeProject, runAgentStaffSync, agentSyncRunning } = useOffice();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!activeProject?.id) {
      setVisible(false);
      return;
    }
    const last = activeProject.agentStaffSnapshot?.at ?? 0;
    const stale = !last || Date.now() - last > TWENTY_H;
    const snoozeKey = `daily-staff-snooze-${activeProject.id}`;
    const snoozeAt = typeof window !== 'undefined' ? localStorage.getItem(snoozeKey) : null;
    const snoozed = snoozeAt && Date.now() - parseInt(snoozeAt, 10) < ONE_DAY;
    setVisible(stale && !snoozed);
  }, [activeProject?.id, activeProject?.agentStaffSnapshot?.at]);

  if (!visible || !activeProject?.id) return null;

  const snooze = () => {
    localStorage.setItem(`daily-staff-snooze-${activeProject.id}`, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="pointer-events-auto flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 sm:px-5">
      <p className="min-w-0 text-[12px] leading-snug text-brand-text/95">
        <span className="font-medium text-[var(--text)]">Daily staff check-in:</span>{' '}
        run sync for fresh analysis and “focus today” — your desks will queue notifications for you.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            const r = await runAgentStaffSync();
            if (r.ok) setVisible(false);
          }}
          disabled={agentSyncRunning}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-input px-3 py-1.5 text-[11px] font-medium text-brand-text hover:bg-brand-card disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${agentSyncRunning ? 'animate-spin' : ''}`} aria-hidden />
          Sync now
        </button>
        <button type="button" onClick={snooze} className="rounded p-1.5 text-brand-muted hover:bg-white/5 hover:text-brand-text" title="Remind tomorrow" aria-label="Snooze until tomorrow">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
