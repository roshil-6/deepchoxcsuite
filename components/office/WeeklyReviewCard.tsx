'use client';

import React from 'react';
import { CalendarRange, TrendingUp, AlertCircle, Compass } from 'lucide-react';
import type { WeeklyOfficeReview } from '@/types/office';

export function WeeklyReviewCard({
    review,
    className = '',
}: {
    review: WeeklyOfficeReview | null;
    className?: string;
}) {
    if (!review) return null;

    const churnColor =
        review.churnRisk === 'High' ? 'text-rose-300' : review.churnRisk === 'Low' ? 'text-emerald-300' : 'text-amber-200';

    return (
        <div
            className={`dash-msg bg-zinc-800/45 ${className}`}
        >
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                <CalendarRange className="h-3.5 w-3.5" aria-hidden />
                Weekly office review
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-white/[0.04] px-3 py-3">
                    <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        <TrendingUp className="h-3 w-3" aria-hidden />
                        Tasks completed (7d)
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">{review.completedTasks}</dd>
                </div>
                <div className="rounded-xl bg-white/[0.04] px-3 py-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Intel momentum</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
                        {review.growthChange > 0 ? '+' : ''}
                        {review.growthChange}
                    </dd>
                    <p className="mt-0.5 text-[10px] text-zinc-500">Heuristic from market notes depth</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] px-3 py-3 sm:col-span-2">
                    <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        <AlertCircle className="h-3 w-3" aria-hidden />
                        Churn / retention signal
                    </dt>
                    <dd className={`mt-1 text-sm font-medium ${churnColor}`}>{review.churnRisk}</dd>
                </div>
                <div className="rounded-xl bg-teal-950/20 px-3 py-3 sm:col-span-2">
                    <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-teal-200/70">
                        <Compass className="h-3 w-3" aria-hidden />
                        Next week focus
                    </dt>
                    <dd className="mt-1 text-sm text-teal-50/95">{review.nextWeekFocus}</dd>
                </div>
            </dl>
        </div>
    );
}
