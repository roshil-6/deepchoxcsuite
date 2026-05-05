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
    /** Narrow CEO sidebar â€” tighter chrome, full-width list */
    variant?: 'page' | 'rail';
    /** Use app-shell surfaces (Timeline room) â€” no inner dark canvas or duplicate â€œTimelineâ€ chrome */
    embedded?: boolean;
    /** Planning room: parent already titles the section â€” compact toolbar only, no duplicate venture headline */
    planningStripOnly?: boolean;
};

function formatRange(start: string, end: string) {
    if (!start?.trim() && !end?.trim()) return '';
    if (start && end) return `${start} â†’ ${end}`;
    return start || end || '';
}

export function TimelinePhaseSetter({
    projectName,
    phases,
    onPhasesChange,
    variant = 'page',
    embedded: embeddedProp = false,
    planningStripOnly: planningStripOnlyProp = false,
}: Props) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const rail = variant === 'rail';
    const embedded = Boolean(embeddedProp) && !rail;
    const planningStrip = embedded && Boolean(planningStripOnlyProp);

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
        if (rail) {
            if (s === 'done') {
                return (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">Done</span>
                );
            }
            if (s === 'in_progress') {
                return (
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                        <Clock className="h-3 w-3 opacity-70" aria-hidden />
                        Active
                    </span>
                );
            }
            return <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">Planned</span>;
        }
        if (embedded) {
            const base =
                'inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-panel/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide';
            if (s === 'done') {
                return <span className={`${base} text-brand-text`}>Done</span>;
            }
            if (s === 'in_progress') {
                return (
                    <span className={`${base} text-brand-text`}>
                        <Clock className="h-3 w-3 opacity-80" aria-hidden />
                        In progress
                    </span>
                );
            }
            return <span className={`${base} text-brand-muted`}>Planned</span>;
        }
        if (s === 'done') {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
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
        if (rail) {
            if (s === 'in_progress') return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-400" />;
            if (s === 'done') return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-500" />;
            return <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-zinc-600 bg-zinc-800" />;
        }
        if (embedded) {
            if (s === 'in_progress') {
                return <span className={`h-3 w-3 shrink-0 rounded-full ${ceo.accentBg} ring-4 ring-black/20`} />;
            }
            if (s === 'done') {
                return <span className="h-3 w-3 shrink-0 rounded-full bg-brand-muted ring-4 ring-white/[0.06]" />;
            }
            return <span className="h-3 w-3 shrink-0 rounded-full border-2 border-brand-border bg-brand-bg" />;
        }
        if (s === 'in_progress') return <span className={`h-3 w-3 shrink-0 rounded-full ${ceo.accentBg} ring-4 ring-orange-500/20`} />;
        if (s === 'done') return <span className="h-3 w-3 shrink-0 rounded-full bg-white/08 ring-4 ring-white/10" />;
        return <span className="h-3 w-3 shrink-0 rounded-full border-2 border-zinc-500 bg-zinc-800" />;
    };

    return (
        <div
            className={`flex flex-col ${rail || embedded ? 'bg-transparent' : 'h-full min-h-0 bg-[#141416]'}`}
        >
            {/* Header */}
            <div
                className={`shrink-0 ${rail ? 'border-b border-zinc-800/80 px-3 py-2.5' : planningStrip ? 'border-0 px-4 py-3 sm:px-5' : embedded ? 'border-b border-[var(--border)] py-2.5' : 'border-b border-zinc-800/80 px-4 py-4 sm:px-6'}`}
            >
                <div
                    className={`flex flex-col ${rail ? 'gap-2' : planningStrip ? 'gap-3' : embedded ? 'gap-2.5 lg:flex-row lg:items-center lg:justify-between' : 'gap-4 lg:flex-row lg:items-start lg:justify-between'}`}
                >
                    {planningStrip ? <span className="sr-only">Phase horizons for {projectName}</span> : null}
                    <div className={`min-w-0 ${planningStrip ? 'hidden' : ''}`}>
                        {embedded ? (
                            <p className="text-[11px] text-[var(--text-secondary)]">
                                Horizons for{' '}
                                <span className="font-medium text-[var(--text-primary)]">{projectName}</span>
                            </p>
                        ) : (
                            <>
                                <p
                                    className={`font-medium text-zinc-500 ${rail ? 'text-[10px] tracking-wide' : 'text-[10px] font-semibold uppercase tracking-[0.25em]'}`}
                                >
                                    {rail ? 'Timeline & phases' : 'Timeline'}
                                </p>
                                <p className={`truncate text-zinc-400 ${rail ? 'mt-0.5 text-xs' : 'mt-1 text-sm'}`}>{projectName}</p>
                            </>
                        )}
                    </div>
                    <div
                        className={`flex flex-col items-stretch ${rail ? 'gap-2' : planningStrip ? 'gap-3 sm:flex-row sm:flex-wrap sm:items-center' : 'gap-3 sm:flex-row sm:items-center'}`}
                    >
                        <div className={`flex flex-col gap-1 ${rail ? 'min-w-0' : 'min-w-[140px]'}`}>
                            <div
                                className={`h-1.5 w-full overflow-hidden rounded-full ${embedded ? 'bg-brand-input' : 'bg-zinc-800'}`}
                            >
                                <div
                                    className={`h-full rounded-full transition-all ${rail ? 'bg-zinc-500' : ceo.accentBg}`}
                                    style={{ width: `${stats.progressPct}%` }}
                                />
                            </div>
                            <span className={`text-[10px] ${embedded ? 'text-brand-muted' : 'text-zinc-500'}`}>
                                {stats.progressPct}% complete
                            </span>
                        </div>
                        {!rail ? (
                            <span
                                className={
                                    embedded
                                        ? 'rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-center text-[10px] font-semibold text-white/55'
                                        : 'rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-center text-[11px] font-medium text-zinc-400'
                                }
                            >
                                {stats.active} active
                            </span>
                        ) : null}
                        <button
                            type="button"
                            onClick={addPhase}
                            className={`inline-flex shrink-0 items-center justify-center rounded-md text-xs font-medium ${rail ? 'gap-1.5 bg-zinc-700 px-3 py-1.5 text-zinc-100 hover:bg-zinc-600' : embedded ? `gap-2 border border-white/10 px-3 py-2 font-semibold uppercase tracking-wide ${ceo.accentBg} ${ceo.accentBgHover} text-brand-bg hover:text-brand-bg` : `gap-2 border border-white/15 px-4 py-2 font-bold uppercase tracking-wide shadow-md shadow-black/25 ${ceo.accentBg} ${ceo.accentBgHover} text-brand-bg hover:text-brand-bg`}`}
                        >
                            <Plus className={rail ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
                            Add phase
                        </button>
                    </div>
                </div>

                {embedded && !planningStrip ? (
                    <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                        <span className="tabular-nums text-[var(--text-primary)]">{stats.total}</span> total Â·{' '}
                        <span className="tabular-nums text-[var(--text-primary)]">{stats.done}</span> done Â·{' '}
                        <span className="tabular-nums text-white/55">{stats.active}</span> active Â·{' '}
                        <span className="tabular-nums text-[var(--text-primary)]">{stats.planned}</span> planned
                    </p>
                ) : !embedded ? (
                    <div
                        className={
                            rail
                                ? 'mt-2 grid grid-cols-2 gap-1.5'
                                : 'mt-4 flex flex-wrap gap-2'
                        }
                    >
                        <span
                            className={`rounded border border-zinc-700/60 bg-zinc-900/50 px-2 py-0.5 text-[10px] font-normal text-zinc-500 ${rail ? '' : 'rounded-full px-3 py-1 font-semibold uppercase tracking-wide'}`}
                        >
                            {stats.total} total
                        </span>
                        <span
                            className={`rounded border border-zinc-700/60 bg-zinc-900/50 px-2 py-0.5 text-[10px] font-normal text-zinc-500 ${rail ? '' : 'rounded-full border-white/10 bg-white/[0.05] px-3 py-1 font-semibold uppercase tracking-wide text-white/55'}`}
                        >
                            {stats.done} done
                        </span>
                        <span
                            className={`rounded border border-zinc-700/60 bg-zinc-900/50 px-2 py-0.5 text-[10px] font-normal text-zinc-500 ${rail ? '' : 'rounded-full border-orange-500/30 bg-orange-950/25 px-3 py-1 font-semibold uppercase tracking-wide text-orange-300/90'}`}
                        >
                            {stats.active} active
                        </span>
                        <span
                            className={`rounded border border-zinc-700/60 bg-zinc-900/50 px-2 py-0.5 text-[10px] font-normal text-zinc-500 ${rail ? '' : 'rounded-full px-3 py-1 font-semibold uppercase tracking-wide'}`}
                        >
                            {stats.planned} planned
                        </span>
                    </div>
                ) : null}
            </div>

            {/* Timeline â€” embedded: no inner scroll; parent workspace scrolls as one column */}
            <div
                className={`flex flex-col ${rail ? 'px-2 py-2 sm:px-3' : planningStrip ? 'px-4 pb-8 pt-1 sm:px-5' : embedded ? 'pb-8 pt-2' : 'px-4 py-6 sm:px-8'}`}
            >
                <div className={rail || embedded ? 'w-full max-w-none' : 'mx-auto w-full max-w-3xl'}>
                    {phases.length === 0 ? (
                        <p
                            className={`rounded-lg border border-dashed px-4 py-12 text-center text-sm ${embedded ? 'border-brand-border text-brand-muted' : 'border-zinc-700 text-zinc-500'}`}
                        >
                            No phases yet. Use{' '}
                            <span className={embedded ? 'font-medium text-brand-text' : ceo.accent}>Add phase</span> to break your plan
                            into horizons.
                        </p>
                    ) : (
                        <ul className="relative space-y-0 pl-0">
                            {phases.map((p, index) => {
                                const range = formatRange(p.start, p.end);
                                const last = index === phases.length - 1;
                                return (
                                    <li
                                        key={p.id}
                                        className={`relative flex ${rail ? 'gap-2 pb-6 last:pb-1' : 'gap-0 pb-8 last:pb-2'}`}
                                    >
                                        {/* Spine */}
                                        <div
                                            className={`relative flex shrink-0 flex-col items-center ${rail ? 'w-7' : 'w-10 sm:w-12'}`}
                                        >
                                            {!last ? (
                                                <div
                                                    className={`absolute left-1/2 top-4 z-0 w-px -translate-x-1/2 ${embedded ? 'bg-brand-border' : ceo.spine}`}
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
                                                    className={`rounded p-0.5 disabled:opacity-30 ${embedded ? 'text-brand-muted hover:text-brand-text' : 'text-zinc-600 hover:text-zinc-300'}`}
                                                    disabled={index === 0}
                                                >
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                </button>
                                                <GripVertical
                                                    className={`h-4 w-4 ${embedded ? 'text-brand-muted' : 'text-zinc-600'}`}
                                                    aria-hidden
                                                />
                                                <button
                                                    type="button"
                                                    title="Move phase down"
                                                    onClick={() => move(index, 1)}
                                                    className={`rounded p-0.5 disabled:opacity-30 ${embedded ? 'text-brand-muted hover:text-brand-text' : 'text-zinc-600 hover:text-zinc-300'}`}
                                                    disabled={index === phases.length - 1}
                                                >
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Card */}
                                        <div
                                            className={`min-w-0 flex-1 overflow-hidden ${rail ? 'rounded-md border border-white/[0.06] bg-zinc-900/20 p-3 shadow-sm' : embedded ? 'rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/95 p-4' : `${ceo.card} p-4 shadow-sm`}`}
                                        >
                                            <div
                                                className={
                                                    rail
                                                        ? 'flex flex-col gap-3'
                                                        : 'flex flex-wrap items-start justify-between gap-2'
                                                }
                                            >
                                                <div className={`min-w-0 space-y-1 ${rail ? 'w-full' : 'flex-1'}`}>
                                                    <input
                                                        value={p.title}
                                                        onChange={(e) => updatePhase(p.id, { title: e.target.value })}
                                                        placeholder="Untitled phase â€” add a title"
                                                        className={`w-full border-0 bg-transparent text-base font-medium focus:outline-none focus:ring-0 ${embedded ? 'text-brand-text placeholder:text-brand-muted/60' : 'text-zinc-100 placeholder:text-zinc-600'}`}
                                                    />
                                                    <p className={`text-xs ${embedded ? 'text-brand-muted' : 'text-zinc-500'}`}>
                                                        {range || 'Add timeframeâ€¦'}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        <input
                                                            type="date"
                                                            value={p.start}
                                                            onChange={(e) => updatePhase(p.id, { start: e.target.value })}
                                                            className={`rounded border px-2 py-1 text-xs ${embedded ? 'border-brand-border bg-brand-bg text-brand-text' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
                                                        />
                                                        <span className={`self-center ${embedded ? 'text-brand-muted' : 'text-zinc-600'}`}>
                                                            â†’
                                                        </span>
                                                        <input
                                                            type="date"
                                                            value={p.end}
                                                            onChange={(e) => updatePhase(p.id, { end: e.target.value })}
                                                            className={`rounded border px-2 py-1 text-xs ${embedded ? 'border-brand-border bg-brand-bg text-brand-text' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
                                                        />
                                                    </div>
                                                </div>
                                                <div
                                                    className={
                                                        rail
                                                            ? 'flex w-full min-w-0 flex-col gap-2 border-t border-white/[0.06] pt-2'
                                                            : 'flex shrink-0 flex-col items-end gap-2'
                                                    }
                                                >
                                                    {badge(p.status)}
                                                    <div
                                                        className={
                                                            rail
                                                                ? 'flex w-full min-w-0 flex-wrap items-center gap-1'
                                                                : 'flex flex-wrap items-center gap-1'
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => setStatus(p.id, 'done')}
                                                            disabled={p.status === 'done'}
                                                            title="Mark this phase complete"
                                                            className={
                                                                rail
                                                                    ? 'inline-flex items-center gap-1 rounded-md border border-zinc-600 bg-zinc-800/80 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:bg-zinc-700/80 disabled:pointer-events-none disabled:opacity-35'
                                                                    : embedded
                                                                      ? 'inline-flex items-center gap-1 rounded-lg border border-brand-border bg-brand-panel px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-text hover:bg-brand-input disabled:pointer-events-none disabled:opacity-35'
                                                                      : 'inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/55 hover:bg-white/[0.05] disabled:pointer-events-none disabled:opacity-35'
                                                            }
                                                        >
                                                            <CheckCircle2
                                                                className={`h-3.5 w-3.5 ${embedded ? 'text-brand-muted' : ''}`}
                                                                aria-hidden
                                                            />
                                                            Done
                                                        </button>
                                                        <select
                                                            value={p.status || 'planned'}
                                                            onChange={(e) => setStatus(p.id, e.target.value as PhaseStatus)}
                                                            className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${rail ? 'normal-case' : 'uppercase'} ${embedded ? 'border-brand-border bg-brand-bg text-brand-muted' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}
                                                            aria-label={`Status for ${p.title || 'phase'}`}
                                                        >
                                                            <option value="planned">Planned</option>
                                                            <option value="in_progress">In progress</option>
                                                            <option value="done">Done</option>
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(p.id)}
                                                            className={`rounded p-1 ${embedded ? 'text-brand-muted hover:bg-brand-input hover:text-brand-text' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
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
                                                            className={`rounded p-1 ${embedded ? 'text-brand-muted hover:text-rose-400' : 'text-zinc-600 hover:text-rose-400'}`}
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
                                                    placeholder="Describe what happens in this phase â€” milestones, deliverablesâ€¦"
                                                    rows={5}
                                                    className={`mt-3 w-full resize-y rounded-lg border p-3 text-sm leading-relaxed focus:outline-none ${rail ? 'border-zinc-700/80 bg-zinc-950/50 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/25' : embedded ? 'border-brand-border/80 bg-brand-bg text-brand-text placeholder:text-brand-muted/70 focus:border-brand-teal/35 focus:ring-1 focus:ring-brand-teal/15' : 'border-zinc-700/80 bg-[#0f0f10] text-zinc-200 placeholder:text-zinc-600 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/30'}`}
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
                            className={`mt-2 w-full rounded-xl border border-dashed py-3 text-sm font-medium transition ${embedded ? 'border-brand-border bg-brand-bg/40 text-brand-muted hover:border-brand-border hover:bg-brand-input hover:text-brand-text' : 'border-zinc-500/70 bg-zinc-900/40 text-zinc-300 hover:border-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'}`}
                        >
                            + Add next phase
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

