'use client';

import React from 'react';
import { Target, TrendingUp, CalendarClock, AlertTriangle } from 'lucide-react';
import type { GoalProgress } from '@/types/office';

function riskBadge(risk: GoalProgress['risk']): string {
    switch (risk) {
        case 'Low':
            return 'bg-emerald-950/35 text-emerald-200';
        case 'High':
            return 'bg-rose-950/35 text-rose-100';
        default:
            return 'bg-amber-950/30 text-amber-100';
    }
}

export function GoalAdvanceCard({
    progress,
    suggestedFocus,
    className = '',
}: {
    progress: GoalProgress;
    suggestedFocus?: string;
    className?: string;
}) {
    const pct = Math.min(100, Math.max(0, progress.percentage));

    return (
        <div
            className={`dash-msg bg-gradient-to-br from-zinc-800/55 to-zinc-900/40 ${className}`}
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-200">
                        <Target className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold tracking-tight text-zinc-100">Goal advancement</h2>
                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-500">
                            Blended progress across strategy phases and your execution board — updates when you open this overview or
                            refresh the office.
                        </p>
                    </div>
                </div>
                <span
                    className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${riskBadge(progress.risk)}`}
                >
                    Risk · {progress.risk}
                </span>
            </div>

            <div className="mt-6">
                <div className="flex items-end justify-between gap-2">
                    <span className="text-4xl font-semibold tabular-nums tracking-tight text-zinc-50 sm:text-5xl">{pct}%</span>
                    <span className="mb-1 text-xs text-zinc-500">toward current horizon</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800/80">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-600/90 to-cyan-500/85 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2 rounded-xl bg-white/[0.05] px-3 py-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                    <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Horizon (est.)</dt>
                        <dd className="mt-0.5 text-sm font-medium text-zinc-200">
                            ~{progress.projectedDaysRemaining} day{progress.projectedDaysRemaining === 1 ? '' : 's'} to next milestone
                            window
                        </dd>
                    </div>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-white/[0.05] px-3 py-3">
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                    <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Delivery pace</dt>
                        <dd className="mt-0.5 text-sm font-medium text-zinc-200">
                            Score {Math.round(progress.paceScore * 100)}% — recent completions vs open work
                        </dd>
                    </div>
                </div>
            </dl>

            {suggestedFocus?.trim() ? (
                <div className="mt-5 flex items-start gap-2 rounded-xl bg-teal-950/25 px-3 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-teal-400/80" aria-hidden />
                    <p className="text-sm text-teal-50/95">
                        <span className="font-medium text-teal-200/95">Office suggests: </span>
                        {suggestedFocus.trim()}
                    </p>
                </div>
            ) : null}
        </div>
    );
}
