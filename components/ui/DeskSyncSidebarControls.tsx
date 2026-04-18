'use client';

import React, { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { useHfRoleSync, type HfDeskRole } from '@/lib/useHfRoleSync';
import { ModelAttribution } from '@/components/ModelAttribution';

function hfRoleForRoom(room: string): HfDeskRole | null {
    const m: Record<string, HfDeskRole> = {
        ceo: 'ceo',
        pm: 'cto',
        accountant: 'cfo',
        scout: 'cso',
        cmo: 'cmo',
    };
    return m[room] ?? null;
}

const btnClass =
    'executive-toolbar-button flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium sm:text-[12px]';

/**
 * Sync now / Sync desk for operational desks — lives in the left rail (not over the workspace).
 */
export function DeskSyncSidebarControls({ room }: { room: string }) {
    const hfRole = useMemo(() => hfRoleForRoom(room), [room]);
    const { runAgentStaffSync, agentSyncRunning } = useOffice();
    const { syncing, syncResult, syncModel, setSyncResult, syncRole } = useHfRoleSync();

    if (!hfRole) return null;

    const staffBusy = agentSyncRunning;
    const deskBusy = syncing;

    return (
        <div className="mx-3 mb-3 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">AI sync</p>
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    disabled={staffBusy}
                    onClick={() => void runAgentStaffSync()}
                    title="Run full AI staff sync (all desks)"
                    className={btnClass}
                >
                    <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${staffBusy ? 'animate-spin' : ''}`} aria-hidden />
                    <span className="min-w-0 flex-1 text-left">{staffBusy ? 'Syncing…' : 'Sync now'}</span>
                </button>
                <button
                    type="button"
                    disabled={deskBusy}
                    onClick={() => {
                        setSyncResult(null);
                        void syncRole(hfRole);
                    }}
                    title="Sync this desk via Hugging Face role model"
                    className={btnClass}
                >
                    <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${deskBusy ? 'animate-spin' : ''}`} aria-hidden />
                    <span className="min-w-0 flex-1 text-left">{deskBusy ? 'Desk…' : 'Sync desk'}</span>
                </button>
            </div>
            {syncResult ? (
                <div className="executive-panel-strong mt-2 rounded-lg px-2.5 py-2">
                    <p className="max-h-32 overflow-y-auto text-[11px] leading-relaxed text-brand-muted">{syncResult}</p>
                    <ModelAttribution model={syncModel} />
                </div>
            ) : null}
        </div>
    );
}
