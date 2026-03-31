'use client';

import React from 'react';
import { useAnalysisData } from '@/lib/useAnalysisData';
import {
    LayoutGrid,
    MoreVertical,
    Plus,
    Clock,
    CheckCircle2,
    User,
    Tag,
    Target,
    Filter
} from 'lucide-react';

export function KanbanBoard() {
    const { analysis } = useAnalysisData();
    const product = analysis?.productPlan;

    const columns = [
        { id: 'todo', title: 'Prioritized Backlog', icon: <Target className="w-4 h-4 text-zinc-500" /> },
        { id: 'progress', title: 'Active Sprints', icon: <Clock className="w-4 h-4 text-indigo-400" /> },
        { id: 'done', title: 'Operational Targets', icon: <CheckCircle2 className="w-4 h-4 text-violet-400" /> }
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
        <div className="h-full font-sans overflow-hidden p-6 flex flex-col">
            <div className="max-w-[1600px] w-full mx-auto h-full flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500"></div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sprint Command</span>
                        </div>
                        <h2 className="text-3xl font-extrabold text-white tracking-tight">Product Roadmap</h2>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-zinc-900/40 border border-zinc-800 rounded-xl flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
                            <Filter className="w-3.5 h-3.5" />
                            Filter
                        </button>
                        <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/30">
                            <Plus className="w-4 h-4" />
                            New Item
                        </button>
                    </div>
                </div>

                {/* Objective Card */}
                <div className="shrink-0 mb-8 bg-black/40 backdrop-blur-md border border-zinc-800 rounded-[1.5rem] p-6 flex items-center justify-between shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-24 bg-indigo-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
                    <div className="relative z-10 w-full">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4 text-indigo-400" /> Primary Objective
                        </div>
                        <p className="text-lg text-zinc-200 leading-relaxed font-medium max-w-4xl">
                            {product?.coreValueProp || "Awaiting product definition. Initialize project parameters to generate the operational backlog."}
                        </p>
                    </div>
                </div>

                {/* Kanban Columns */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                    <div className="flex h-full gap-6 min-w-full">
                        {columns.map(col => (
                            <div key={col.id} className="flex-1 min-w-[350px] bg-zinc-900/20 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] flex flex-col h-full relative group/col hover:bg-zinc-900/30 transition-colors">
                                <div className="p-6 shrink-0 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-black/50 border border-white/5 text-zinc-400 group-hover/col:text-white transition-colors">
                                            {col.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{col.title}</h3>
                                            <span className="text-[10px] text-zinc-500 font-bold">{allTasks.filter((t: any) => t.status === col.id).length} Items</span>
                                        </div>
                                    </div>
                                    <button className="text-zinc-600 hover:text-white transition-colors">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                                    {allTasks.filter((t: any) => t.status === col.id).map((task: any) => (
                                        <div key={task.id} className="group/card bg-black/40 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 rounded-[1.25rem] transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-xl hover:-translate-y-1 relative overflow-hidden">
                                            <div className="flex items-start justify-between mb-3">
                                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${task.priority === 'High' ? 'bg-rose-950/30 text-rose-400 border-rose-500/20' :
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
                                                    <span className="text-[9px] font-bold uppercase tracking-widest">Sprint-01</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {allTasks.filter((t: any) => t.status === col.id).length === 0 && (
                                        <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 rounded-2xl">
                                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">No active items</p>
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
