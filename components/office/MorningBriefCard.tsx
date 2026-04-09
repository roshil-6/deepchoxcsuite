'use client';

import React from 'react';
import { SunMedium, AlertTriangle, Target } from 'lucide-react';
import type { MorningBrief } from '@/types/office';

export function MorningBriefCard({
    brief,
    detailOnly = false,
    className = '',
}: {
    brief: MorningBrief | null;
    detailOnly?: boolean;
    className?: string;
}) {
    if (!brief) return null;
    const hasBody =
        brief.priorities.length > 0 || brief.criticalAlerts.length > 0 || brief.suggestedFocus.trim().length > 0;
    if (!hasBody && !brief.greeting) return null;

    return (
        <div className={detailOnly ? `rounded-xl bg-black/20 p-3 ring-1 ring-white/[0.06] ${className}` : `dash-msg bg-zinc-800/45 ${className}`}>
            {!detailOnly ? (
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-200/90">
                        <SunMedium className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">Morning brief</p>
                        <p className="mt-1 text-sm font-medium leading-snug text-zinc-100">{brief.greeting}</p>
                    </div>
                </div>
            ) : brief.greeting ? (
                <p className="mb-3 text-sm font-medium leading-snug text-zinc-200">{brief.greeting}</p>
            ) : null}

            {brief.priorities.length > 0 ? (
                <ul className={`space-y-2 ${detailOnly ? 'mt-0' : 'mt-4 border-t border-white/[0.06] pt-4'}`}>
                    {brief.priorities.map((p, i) => (
                        <li key={`${i}-${p.slice(0, 24)}`} className="flex gap-2 text-sm text-zinc-300">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-500" aria-hidden />
                            <span className="leading-relaxed">{p}</span>
                        </li>
                    ))}
                </ul>
            ) : null}

            {brief.criticalAlerts.length > 0 ? (
                <div className="mt-4 space-y-2 rounded-xl border border-rose-500/20 bg-rose-950/20 px-3 py-2.5">
                    {brief.criticalAlerts.map((a, i) => (
                        <div key={`${i}-${a.slice(0, 20)}`} className="flex gap-2 text-xs leading-relaxed text-rose-100/90">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400/90" aria-hidden />
                            <span>{a}</span>
                        </div>
                    ))}
                </div>
            ) : null}

            {brief.suggestedFocus.trim() ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <Target className="mt-0.5 h-4 w-4 shrink-0 text-teal-400/90" aria-hidden />
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Suggested focus</p>
                        <p className="mt-0.5 text-sm text-zinc-200">{brief.suggestedFocus}</p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
