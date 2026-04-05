'use client';

import React, { useMemo } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { useOffice, type AgentRole } from '@/lib/OfficeContext';
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

/** Top-right overlay: does not shrink the desk body (no full-width sync strip). */
function DeskSyncCorner({ room }: { room: string }) {
    const hfRole = useMemo(() => hfRoleForRoom(room), [room]);
    const { runAgentStaffSync, agentSyncRunning } = useOffice();
    const { syncing, syncResult, syncModel, setSyncResult, syncRole } = useHfRoleSync();

    if (!hfRole) return null;

    const staffBusy = agentSyncRunning;
    const deskBusy = syncing;

    /** CTO desk: ProductKanban aside is `w-[min(100%,280px)]` — pin sync left of that rail so it does not sit on the intent field. */
    const cornerRightClass =
        room === 'pm'
            ? 'right-2 top-2 sm:right-[calc(14rem+0.75rem)] sm:top-3'
            : 'right-2 top-2 sm:right-3 sm:top-3';

    return (
        <div className={`pointer-events-none absolute z-30 ${cornerRightClass}`}>
            <div className="pointer-events-auto flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1 rounded-lg border border-white/[0.1] bg-brand-panel/95 px-1 py-1 shadow-lg shadow-black/20 backdrop-blur-md sm:gap-1.5 sm:rounded-xl sm:px-1.5">
                    <button
                        type="button"
                        disabled={staffBusy}
                        onClick={() => void runAgentStaffSync()}
                        title="Run full AI staff sync (all desks)"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium text-brand-text transition hover:bg-white/[0.06] disabled:opacity-45 sm:text-[11px]"
                    >
                        <RefreshCw className={`h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 ${staffBusy ? 'animate-spin' : ''}`} aria-hidden />
                        <span className="max-w-[5.5rem] truncate sm:max-w-none">{staffBusy ? 'Syncing…' : 'Sync now'}</span>
                    </button>
                    <span className="h-4 w-px shrink-0 bg-white/[0.08]" aria-hidden />
                    <button
                        type="button"
                        disabled={deskBusy}
                        onClick={() => {
                            setSyncResult(null);
                            void syncRole(hfRole);
                        }}
                        title="Sync this desk via Hugging Face role model"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium text-brand-text transition hover:bg-white/[0.06] disabled:opacity-45 sm:text-[11px]"
                    >
                        <RefreshCw className={`h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 ${deskBusy ? 'animate-spin' : ''}`} aria-hidden />
                        <span className="max-w-[5.5rem] truncate sm:max-w-none">{deskBusy ? 'Desk…' : 'Sync desk'}</span>
                    </button>
                </div>
                {syncResult ? (
                    <div className="w-[min(calc(100vw-1.5rem),18rem)] rounded-lg border border-white/[0.1] bg-brand-panel/98 px-2.5 py-2 shadow-lg backdrop-blur-md sm:w-72">
                        <p className="max-h-32 overflow-y-auto text-[11px] leading-relaxed text-brand-muted">{syncResult}</p>
                        <ModelAttribution model={syncModel} />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

/** Desk workspace — chat is the app-level floating bar (see `page.tsx`), not an inline rail. */
export function OperationalDesk({ children }: { children: React.ReactNode }) {
    const { activeRoom, staffAttentionPending, dismissStaffAttention } = useOffice();

    const deskRole = activeRoom as AgentRole;
    const waiting = staffAttentionPending.filter((i) => i.role === deskRole);

    return (
        <div className="relative flex min-h-0 w-full flex-1 flex-col bg-[var(--color-brand-bg)]">
            <DeskSyncCorner room={activeRoom} />
            {waiting.length > 0 && (
                <div className="pointer-events-none absolute left-2 top-2 z-20 max-w-[min(calc(100vw-8rem),22rem)] sm:left-3 sm:top-3 sm:max-w-sm">
                    <div className="pointer-events-auto rounded-lg border border-brand-border bg-brand-panel/95 p-2.5 shadow-lg shadow-black/15 backdrop-blur-md sm:p-3">
                        <div className="flex items-start gap-2">
                            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                            <div className="min-w-0 flex-1 space-y-2">
                                {waiting.map((w) => (
                                    <div key={w.id} className="text-[11px] leading-snug text-zinc-200 sm:text-[12px]">
                                        <span className="font-medium text-brand-text">{w.title}</span>
                                        <span className="text-zinc-400"> — {w.message}</span>
                                        <button
                                            type="button"
                                            onClick={() => dismissStaffAttention(w.id)}
                                            className="ml-2 text-[10px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="min-h-0 w-full flex-1">{children}</div>
        </div>
    );
}
