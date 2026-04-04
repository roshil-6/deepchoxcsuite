'use client';

import React, { useMemo, useState } from 'react';
import type { PhaseStatus, StrategyPhase } from '@/lib/strategyDoc';
import { ensureSingleActivePhase } from '@/lib/strategyDoc';
import { ceo } from '@/lib/ceoTheme';
import { Plus, Clock, GripVertical, ChevronDown, ChevronUp, Trash2, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';

type Props = {
    projectName: string;
    phases: StrategyPhase[];
    onPhasesChange: (next: StrategyPhase[]) => void;
};

function formatRange(start: string, end: string) {
    if (!start?.trim() && !end?.trim()) return '';
    if (start && end) return `${start} → ${end}`;
    return start || end || '';
}

export function TimelinePhaseSetter({ projectName, phases, onPhasesChange }: Props) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const stats = useMemo(() => {
        const total = phases.length;
        const done = phases.filter((p) => p.status === 'done').length;
        const active = phases.filter((p) => p.status === 'in_progress').length;
        const planned = phases.filter((p) => p.status !== 'done' && p.status !== 'in_progress').length;
        const progressPct = total === 0 ? 0 : Math.round((done / total) * 100);
        return { total, done, active, planned, progressPct };
    }, [phases]);

    const setPhases = (next: StrategyPhase[]) => {
        onPhasesChange(ensureSingleActivePhase(next));
    };

    const updatePhase = (id: string, patch: Partial<StrategyPhase>) => {
        setPhases(phases.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    };

    const setStatus = (id: string, status: PhaseStatus) => {
        let next = phases.map((p) => {
            if (p.id !== id) return p;
            return { ...p, status };
        });
        if (status === 'in_progress') {
            next = next.map((p) => (p.id === id ? p : p.status === 'in_progress' ? { ...p, status: 'planned' as const } : p));
        }
        setPhases(next);
    };

    const addPhase = () => {
        const id = Date.now().toString();
        setPhases([
            ...phases,
            {
                id,
                title: '',
                start: '',
                end: '',
                notes: '',
                status: 'planned',
            },
        ]);
        setExpanded((e) => ({ ...e, [id]: true }));
    };

    const removePhase = (id: string) => {
        setPhases(phases.filter((p) => p.id !== id));
    };

    const move = (index: number, dir: -1 | 1) => {
        const j = index + dir;
        if (j < 0 || j >= phases.length) return;
        const next = [...phases];
        [next[index], next[j]] = [next[j], next[index]];
        setPhases(next);
    };

    const isExpanded = (id: string) => expanded[id] !== false;

    const toggleExpand = (id: string) => {
        setExpanded((e) => ({ ...e, [id]: !isExpanded(id) }));
    };

    const badge = (status: PhaseStatus | undefined) => {
        const s = status || 'planned';
        if (s === 'done') {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-950/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-400">
                    Done
                </span>
            );
        }
        if (s === 'in_progress') {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/50 bg-orange-950/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-300">
                    <Clock className="h-3 w-3" aria-hidden />
                    In progress
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-600 bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Planned
            </span>
        );
    };

    const nodeDot = (status: PhaseStatus | undefined) => {
        const s = status || 'planned';
        if (s === 'in_progress') return <span className={`h-3 w-3 shrink-0 rounded-full ${ceo.accentBg} ring-4 ring-orange-500/20`} />;
        if (s === 'done') return <span className="h-3 w-3 shrink-0 rounded-full bg-violet-500 ring-4 ring-violet-500/15" />;
        return <span className="h-3 w-3 shrink-0 rounded-full border-2 border-zinc-500 bg-zinc-800" />;
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-[#141416]">
            {/* Header */}
            <div className="shrink-0 border-b border-zinc-800 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Timeline</p>
                        <p className="mt-1 truncate text-sm text-zinc-400">{projectName}</p>
                    </div>
                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <div className="flex min-w-[140px] flex-col gap-1">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                                <div
                                    className={`h-full rounded-full transition-all ${ceo.accentBg}`}
                                    style={{ width: `${stats.progressPct}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-zinc-500">{stats.progressPct}% complete</span>
                        </div>
                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-center text-[11px] font-medium text-zinc-400">
                            {stats.active} active
                        </span>
                        <button
                            type="button"
                            onClick={addPhase}
                            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-orange-500/10 ${ceo.accentBg} ${ceo.accentBgHover}`}
                        >
                            <Plus className="h-4 w-4" aria-hidden />
                            Add phase
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        {stats.total} total
                    </span>
                    <span className="rounded-full border border-violet-500/30 bg-violet-950/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-400/90">
                        {stats.done} done
                    </span>
                    <span className="rounded-full border border-orange-500/30 bg-orange-950/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-300/90">
                        {stats.active} active
                    </span>
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        {stats.planned} planned
                    </span>
                </div>
            </div>

            {/* Timeline */}
            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8">
                <div className="mx-auto w-full max-w-3xl">
                    {phases.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-zinc-700 px-4 py-12 text-center text-sm text-zinc-500">
                            No phases yet. Use <span className={ceo.accent}>Add phase</span> to break your plan into horizons.
                        </p>
                    ) : (
                        <ul className="relative space-y-0 pl-0">
                            {phases.map((p, index) => {
                                const range = formatRange(p.start, p.end);
                                const last = index === phases.length - 1;
                                return (
                                    <li key={p.id} className="relative flex gap-0 pb-8 last:pb-2">
                                        {/* Spine */}
                                        <div className="relative flex w-10 shrink-0 flex-col items-center sm:w-12">
                                            {!last ? (
                                                <div
                                                    className={`absolute left-1/2 top-4 z-0 w-px -translate-x-1/2 ${ceo.spine}`}
                                                    style={{ height: 'calc(100% + 0.5rem)' }}
                                                    aria-hidden
                                                />
                                            ) : null}
                                            <div className="relative z-10 mt-1 flex flex-col items-center gap-1">
                                                {nodeDot(p.status)}
                                                <button
                                                    type="button"
                                                    title="Move phase up"
                                                    onClick={() => move(index, -1)}
                                                    className="rounded p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-30"
                                                    disabled={index === 0}
                                                >
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                </button>
                                                <GripVertical className="h-4 w-4 text-zinc-600" aria-hidden />
                                                <button
                                                    type="button"
                                                    title="Move phase down"
                                                    onClick={() => move(index, 1)}
                                                    className="rounded p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-30"
                                                    disabled={index === phases.length - 1}
                                                >
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Card */}
                                        <div className={`min-w-0 flex-1 ${ceo.card} p-4 shadow-sm`}>
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <input
                                                        value={p.title}
                                                        onChange={(e) => updatePhase(p.id, { title: e.target.value })}
                                                        placeholder="Untitled phase — add a title"
                                                        className="w-full border-0 bg-transparent text-base font-medium text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                                                    />
                                                    <p className="text-xs text-zinc-500">
                                                        {range || 'Add timeframe…'}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        <input
                                                            type="date"
                                                            value={p.start}
                                                            onChange={(e) => updatePhase(p.id, { start: e.target.value })}
                                                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                                                        />
                                                        <span className="self-center text-zinc-600">→</span>
                                                        <input
                                                            type="date"
                                                            value={p.end}
                                                            onChange={(e) => updatePhase(p.id, { end: e.target.value })}
                                                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-2">
                                                    {badge(p.status)}
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setStatus(p.id, 'done')}
                                                            disabled={p.status === 'done'}
                                                            title="Mark this phase complete"
                                                            className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-950/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-200/95 hover:bg-violet-950/55 disabled:pointer-events-none disabled:opacity-35"
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                                            Done
                                                        </button>
                                                        <select
                                                            value={p.status || 'planned'}
                                                            onChange={(e) => setStatus(p.id, e.target.value as PhaseStatus)}
                                                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-medium uppercase text-zinc-400"
                                                            aria-label={`Status for ${p.title || 'phase'}`}
                                                        >
                                                            <option value="planned">Planned</option>
                                                            <option value="in_progress">In progress</option>
                                                            <option value="done">Done</option>
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(p.id)}
                                                            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                                                            aria-expanded={isExpanded(p.id)}
                                                        >
                                                            {isExpanded(p.id) ? (
                                                                <ChevronUp className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removePhase(p.id)}
                                                            className="rounded p-1 text-zinc-600 hover:text-rose-400"
                                                            title="Remove phase"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {isExpanded(p.id) ? (
                                                <textarea
                                                    value={p.notes}
                                                    onChange={(e) => updatePhase(p.id, { notes: e.target.value })}
                                                    placeholder="Describe what happens in this phase — milestones, deliverables…"
                                                    rows={5}
                                                    className="mt-3 w-full resize-y rounded-lg border border-zinc-700/80 bg-[#0f0f10] p-3 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-orange-500/40 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                                                />
                                            ) : null}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {phases.length > 0 ? (
                        <button
                            type="button"
                            onClick={addPhase}
                            className="mt-2 w-full rounded-xl border border-dashed border-zinc-600 py-3 text-sm font-medium text-zinc-500 transition hover:border-orange-500/40 hover:text-orange-300/90"
                        >
                            + Add next phase
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
