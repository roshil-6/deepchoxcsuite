'use client';

import React from 'react';
import type { PhaseStatus, StrategyPhase } from '@/lib/strategyDoc';
import { Clock } from 'lucide-react';

function formatRange(start: string, end: string) {
    if (!start?.trim() && !end?.trim()) return '';
    if (start && end) return `${start} → ${end}`;
    return start || end || '';
}

function StatusPill({ status }: { status?: PhaseStatus }) {
    const s = status || 'planned';
    if (s === 'done') {
        return (
            <span className="rounded-full border border-violet-500/35 bg-violet-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200/90">
                Done
            </span>
        );
    }
    if (s === 'in_progress') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-950/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-200/95">
                <Clock className="h-3 w-3 opacity-80" aria-hidden />
                In progress
            </span>
        );
    }
    return (
        <span className="rounded-full border border-zinc-600 bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Planned
        </span>
    );
}

export function TimelinePhaseReadOnly({
    phases,
    emptyHint = 'No phases yet.',
}: {
    phases: StrategyPhase[];
    emptyHint?: string;
}) {
    if (!phases.length) {
        return <p className="text-xs leading-relaxed text-zinc-600">{emptyHint}</p>;
    }

    return (
        <ul className="space-y-0">
            {phases.map((p, index) => {
                const range = formatRange(p.start, p.end);
                const last = index === phases.length - 1;
                const st = p.status || 'planned';
                const dotClass =
                    st === 'in_progress'
                        ? 'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-400 ring-2 ring-orange-500/25'
                        : st === 'done'
                          ? 'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500 ring-2 ring-violet-500/20'
                          : 'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-zinc-500 bg-zinc-800';
                return (
                    <li key={p.id} className="relative flex gap-3 pb-4 last:pb-0">
                        <div className="relative flex w-7 shrink-0 flex-col items-center">
                            {!last ? (
                                <div
                                    className="absolute left-1/2 top-3 z-0 w-px -translate-x-1/2 bg-zinc-700/90"
                                    style={{ height: 'calc(100% + 0.25rem)' }}
                                    aria-hidden
                                />
                            ) : null}
                            <span className={`relative z-10 ${dotClass}`} />
                        </div>
                        <div className="min-w-0 flex-1 rounded-lg border border-white/[0.06] bg-zinc-950/40 px-3 py-2.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-zinc-100">{p.title?.trim() || 'Untitled phase'}</p>
                                    <p className="mt-0.5 text-[11px] text-zinc-500">{range || 'No dates set'}</p>
                                </div>
                                <StatusPill status={p.status} />
                            </div>
                            {p.notes?.trim() ? (
                                <p className="mt-2 border-t border-white/[0.05] pt-2 text-xs leading-relaxed text-zinc-400 whitespace-pre-wrap">
                                    {p.notes.trim()}
                                </p>
                            ) : null}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
