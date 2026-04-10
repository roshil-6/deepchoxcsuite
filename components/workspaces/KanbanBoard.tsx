'use client';

import React from 'react';
import { useAnalysisData } from '@/lib/useAnalysisData';
import { MoreVertical, Plus, Clock, CheckCircle2, Tag, Target, Filter } from 'lucide-react';

export function KanbanBoard() {
    const { analysis } = useAnalysisData();
    const product = analysis?.productPlan;

    const columns = [
        { id: 'todo',     title: 'Backlog',      icon: <Target       className="h-3.5 w-3.5 text-[var(--muted)]" /> },
        { id: 'progress', title: 'In progress',  icon: <Clock        className="h-3.5 w-3.5 text-indigo-400" /> },
        { id: 'done',     title: 'Done',          icon: <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" /> },
    ];

    const allTasks = product?.roadmap?.flatMap((phase: any) =>
        phase.goals?.map((goal: string, idx: number) => ({
            id: `${phase.phase}-${idx}`,
            title: goal,
            priority: idx % 3 === 0 ? 'High' : idx % 3 === 1 ? 'Med' : 'Low',
            status: idx % 3 === 2 ? 'done' : idx % 3 === 1 ? 'progress' : 'todo',
        }))
    ) || [];

    return (
        <div className="flex h-full flex-col overflow-hidden p-4 sm:p-5">
            <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col">

                {/* ── Header ── */}
                <div className="mb-4 flex shrink-0 items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">Product</p>
                        <h2 className="mt-0.5 text-base font-semibold tracking-tight text-[var(--text)]">Roadmap</h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:border-white/[0.12] hover:text-[var(--text)]"
                        >
                            <Filter className="h-3.5 w-3.5" /> Filter
                        </button>
                        <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                    </div>
                </div>

                {/* ── Focus bar ── */}
                <div className="mb-4 shrink-0 rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] px-4 py-3 sm:px-5">
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        <Target className="h-3.5 w-3.5 text-indigo-400" aria-hidden /> Focus
                    </p>
                    <p className="text-sm leading-relaxed text-[var(--text)]/80">
                        {product?.coreValueProp || 'No product summary yet — add one in the product plan.'}
                    </p>
                </div>

                {/* ── Kanban columns ── */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                    <div className="flex h-full gap-4 min-w-full">
                        {columns.map(col => {
                            const tasks = allTasks.filter((t: any) => t.status === col.id);
                            return (
                                <div
                                    key={col.id}
                                    className="flex h-full min-w-[300px] flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)]"
                                >
                                    {/* Column header */}
                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.05] px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/[0.06] bg-[var(--color-brand-bg)]">
                                                {col.icon}
                                            </div>
                                            <div className="leading-tight">
                                                <h3 className="text-xs font-semibold text-[var(--text)]">{col.title}</h3>
                                                <span className="text-[10px] leading-none text-[var(--muted)]">{tasks.length} cards</span>
                                            </div>
                                        </div>
                                        <button type="button" className="text-[var(--muted)] transition-colors hover:text-[var(--text)]" aria-label="Column options">
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Cards */}
                                    <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
                                        {tasks.map((task: any) => (
                                            <div
                                                key={task.id}
                                                className="group cursor-grab rounded-lg border border-white/[0.07] bg-[var(--color-brand-bg)] p-4 transition-colors hover:border-white/[0.14] active:cursor-grabbing"
                                            >
                                                <div className="mb-2 flex items-center gap-2">
                                                    <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                                                        task.priority === 'High' ? 'border-rose-500/20 bg-rose-950/30 text-rose-400'
                                                        : task.priority === 'Med'  ? 'border-amber-500/20 bg-amber-950/30 text-amber-400'
                                                        : 'border-white/[0.07] bg-white/[0.03] text-[var(--muted)]'
                                                    }`}>
                                                        {task.priority}
                                                    </span>
                                                </div>

                                                <p className="mb-3 text-sm leading-relaxed text-[var(--text)]/80 transition-colors group-hover:text-[var(--text)]">
                                                    {task.title}
                                                </p>

                                                <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
                                                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-900/50 text-[8px] font-bold text-indigo-200">
                                                        PM
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[var(--muted)]">
                                                        <Tag className="h-3 w-3" />
                                                        <span className="text-[10px]">Sprint 1</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {tasks.length === 0 && (
                                            <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.06]">
                                                <p className="text-[10px] font-medium text-[var(--muted)]">Empty</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
