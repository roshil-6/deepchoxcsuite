'use client';

import React from 'react';
import { useAnalysisData } from '@/lib/useAnalysisData';
import {
    MoreVertical,
    Plus,
    Clock,
    CheckCircle2,
    Tag,
    Target,
    Filter
} from 'lucide-react';

export function KanbanBoard() {
    const { analysis } = useAnalysisData();
    const product = analysis?.productPlan;

    const columns = [
        { id: 'todo', title: 'Backlog', icon: <Target className="w-4 h-4 text-zinc-500" /> },
        { id: 'progress', title: 'In progress', icon: <Clock className="w-4 h-4 text-indigo-400" /> },
        { id: 'done', title: 'Done', icon: <CheckCircle2 className="w-4 h-4 text-violet-400" /> }
    ];

    // Mock task distribution based on the product plan goals
    const allTasks = product?.roadmap?.flatMap((phase: any) =>
        phase.goals?.map((goal: string, idx: number) => ({
            id: `${phase.phase}-${idx}`,
            title: goal,
            priority: idx % 3 === 0 ? 'High' : idx % 3 === 1 ? 'Med' : 'Low',
            status: idx % 3 === 2 ? 'done' : idx % 3 === 1 ? 'progress' : 'todo',
            assignee: 'Agent PM'
        }))
    ) || [];

    return (
        <div className="flex h-full flex-col overflow-hidden p-4 font-sans sm:p-5">
            <div className="max-w-[1600px] w-full mx-auto h-full flex flex-col">

                {/* Header */}
                <div className="mb-5 flex shrink-0 items-end justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Product</p>
                        <h2 className="mt-0.5 text-lg font-semibold leading-tight tracking-tight text-zinc-100">Roadmap</h2>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white">
                            <Filter className="w-3.5 h-3.5" />
                            Filter
                        </button>
                        <button type="button" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-indigo-900/30 transition-all hover:bg-indigo-500">
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>
                </div>

                {/* Objective Card */}
                <div className="group relative mb-5 flex shrink-0 items-start justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 shadow-lg backdrop-blur-md sm:px-5 sm:py-4">
                    <div className="pointer-events-none absolute -right-12 -top-12 rounded-full bg-indigo-500/5 p-24 blur-3xl transition-colors group-hover:bg-indigo-500/10"></div>
                    <div className="relative z-10 w-full min-w-0">
                        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            <Target className="h-3.5 w-3.5 shrink-0 text-indigo-400" aria-hidden /> Focus
                        </div>
                        <p className="max-w-4xl text-sm font-medium leading-relaxed text-zinc-300">
                            {product?.coreValueProp || 'No product summary yet — add one in the product plan.'}
                        </p>
                    </div>
                </div>

                {/* Kanban Columns */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                    <div className="flex h-full gap-6 min-w-full">
                        {columns.map(col => (
                            <div key={col.id} className="flex-1 min-w-[350px] bg-zinc-900/20 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] flex flex-col h-full relative group/col hover:bg-zinc-900/30 transition-colors">
                                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-4 py-2.5">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/5 bg-black/50 text-zinc-400 transition-colors group-hover/col:text-white">
                                            {col.icon}
                                        </div>
                                        <div className="min-w-0 leading-tight">
                                            <h3 className="text-xs font-semibold text-zinc-200">{col.title}</h3>
                                            <span className="text-[10px] leading-none text-zinc-500">
                                                {allTasks.filter((t: any) => t.status === col.id).length} cards
                                            </span>
                                        </div>
                                    </div>
                                    <button type="button" className="shrink-0 text-zinc-600 transition-colors hover:text-white" aria-label="Column options">
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                                    {allTasks.filter((t: any) => t.status === col.id).map((task: any) => (
                                        <div key={task.id} className="group/card bg-black/40 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 rounded-[1.25rem] transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-xl hover:-translate-y-1 relative overflow-hidden">
                                            <div className="flex items-start justify-between mb-3">
                                                <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${task.priority === 'High' ? 'bg-rose-950/30 text-rose-400 border-rose-500/20' :
                                                    task.priority === 'Med' ? 'bg-amber-950/30 text-amber-400 border-amber-500/20' :
                                                        'bg-zinc-800/50 text-zinc-400 border-zinc-700'
                                                    }`}>
                                                    {task.priority}
                                                </span>
                                            </div>

                                            <p className="text-sm text-zinc-300 font-medium leading-relaxed mb-4 group-hover/card:text-white transition-colors">
                                                {task.title}
                                            </p>

                                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                <div className="flex -space-x-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-900 border border-indigo-500/30 flex items-center justify-center text-[9px] font-bold text-indigo-200">PM</div>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-zinc-600 group-hover/card:text-zinc-500">
                                                    <Tag className="w-3 h-3" />
                                                    <span className="text-[10px] font-medium text-zinc-500">Sprint 1</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {allTasks.filter((t: any) => t.status === col.id).length === 0 && (
                                        <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 rounded-2xl">
                                            <p className="text-[11px] text-zinc-600">Empty</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
