'use client';

import React from 'react';
import { Target, TrendingUp, CalendarClock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { PA_BUDDY_NAME } from '@/lib/paBuddy';
import type { GoalProgress } from '@/types/office';

function riskBadge(risk: GoalProgress['risk']): string {
    switch (risk) {
        case 'Low':
            return 'bg-zinc-700/45 text-zinc-200';
        case 'High':
            return 'bg-rose-950/35 text-rose-100';
        default:
            return 'bg-amber-950/30 text-amber-100';
    }
}

export function GoalAdvanceCard({
    progress,
    suggestedFocus,
    detailOnly = false,
    className = '',
}: {
    progress: GoalProgress;
    suggestedFocus?: string;
    /** When true, omit title row (used inside an expandable office brief panel). */
    detailOnly?: boolean;
    className?: string;
}) {
    const { switchRoom } = useOffice();
    const pct = Math.min(100, Math.max(0, progress.percentage));

    return (
        <div
            className={`${detailOnly ? 'rounded-xl bg-black/20 p-3 ring-1 ring-white/[0.06]' : 'dash-msg !p-3.5 sm:!p-4 bg-gradient-to-br from-zinc-800/55 to-zinc-900/40'} ${className}`}
        >
            {!detailOnly ? (
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-zinc-400">
                            <Target className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold tracking-tight text-zinc-100">Goal advancement</h2>
                            <p className="mt-0.5 max-w-md text-[11px] leading-snug text-zinc-500">
                                Scored from phases, priorities, and kanban.
                            </p>
                        </div>
                    </div>
                    <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${riskBadge(progress.risk)}`}
                    >
                        Risk · {progress.risk}
                    </span>
                </div>
            ) : (
                <p className="mb-3 text-[11px] leading-snug text-zinc-500">
                    Scored from phases, priorities, and kanban.
                </p>
            )}

            <div className={detailOnly ? '' : 'mt-3'}>
                <div className="flex items-end justify-between gap-2">
                    <span className="text-3xl font-semibold tabular-nums tracking-tight text-zinc-50">{pct}%</span>
                    <span className="mb-0.5 text-[10px] text-zinc-500">toward current horizon</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800/80">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-zinc-500/90 to-zinc-400/80 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-start gap-2 rounded-lg bg-white/[0.05] px-2.5 py-2">
                    <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                    <div>
                        <dt className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">Horizon (est.)</dt>
                        <dd className="mt-0.5 text-[11px] font-medium leading-snug text-zinc-200">
                            ~{progress.projectedDaysRemaining} day{progress.projectedDaysRemaining === 1 ? '' : 's'} to next
                            milestone window
                        </dd>
                    </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-white/[0.05] px-2.5 py-2">
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                    <div>
                        <dt className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">Delivery pace</dt>
                        <dd className="mt-0.5 text-[11px] font-medium leading-snug text-zinc-200">
                            {Math.round(progress.paceScore * 100)}% — completions vs open work
                        </dd>
                    </div>
                </div>
            </dl>

            {suggestedFocus?.trim() ? (
                <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-white/[0.05] px-2.5 py-2 ring-1 ring-white/[0.06]">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                    <p className="text-[11px] leading-snug text-zinc-200/95">
                        <span className="font-medium text-zinc-300">Suggest: </span>
                        {suggestedFocus.trim()}
                    </p>
                </div>
            ) : null}

            <div className="mt-3 border-t border-white/[0.06] pt-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Update via</p>
                <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-zinc-400">
                    <li><span className="font-medium text-zinc-300">Timeline</span><span className="text-zinc-600"> · </span>phases &amp; dates</li>
                    <li><span className="font-medium text-zinc-300">CEO</span><span className="text-zinc-600"> · </span>priorities &amp; notes</li>
                    <li><span className="font-medium text-zinc-300">CTO</span><span className="text-zinc-600"> · </span>close completed tasks</li>
                    <li><span className="font-medium text-zinc-300">{PA_BUDDY_NAME}</span><span className="text-zinc-600"> · </span>ask to update in chat</li>
                </ul>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => switchRoom('calendar')}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-600/80 bg-zinc-800/80 px-2 py-1.5 text-[10px] font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                    >
                        Timeline
                        <ArrowRight className="h-3 w-3 opacity-70" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={() => switchRoom('ceo')}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-600/80 bg-zinc-800/80 px-2 py-1.5 text-[10px] font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                    >
                        CEO
                        <ArrowRight className="h-3 w-3 opacity-70" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={() => switchRoom('pm')}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-600/80 bg-zinc-800/80 px-2 py-1.5 text-[10px] font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                    >
                        CTO
                        <ArrowRight className="h-3 w-3 opacity-70" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={() => switchRoom('personal_assistant')}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-600/80 bg-zinc-800/80 px-2 py-1.5 text-[10px] font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                    >
                        {PA_BUDDY_NAME}
                        <ArrowRight className="h-3 w-3 opacity-70" aria-hidden />
                    </button>
                </div>
            </div>
        </div>
    );
}
