'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAnalysisData } from '@/lib/useAnalysisData';
import { MoreVertical, Plus, Clock, CheckCircle2, Tag, Target, Filter, ArrowRight } from 'lucide-react';

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
                                        {tasks.map((task: any, index: number) => (
                                            <TaskCard key={task.id} task={task} index={index} />
                                        ))}

                                        {tasks.length === 0 && (
                                            <EmptyColumn />
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

// Interactive Task Card Component
function TaskCard({ task, index }: { task: any; index: number }) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const priorityStyles = {
        High: { border: 'border-rose-500/20', bg: 'bg-rose-950/30', text: 'text-rose-400', glow: 'rgba(244,63,94,0.3)' },
        Med: { border: 'border-amber-500/20', bg: 'bg-amber-950/30', text: 'text-amber-400', glow: 'rgba(245,158,11,0.3)' },
        Low: { border: 'border-white/[0.07]', bg: 'bg-white/[0.03]', text: 'text-[var(--muted)]', glow: 'rgba(255,255,255,0.1)' },
    };
    const style = priorityStyles[task.priority as keyof typeof priorityStyles] || priorityStyles.Low;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`group relative cursor-grab rounded-lg border ${style.border} ${style.bg} p-4 active:cursor-grabbing`}
            style={{
                background: isHovered
                    ? `linear-gradient(180deg, rgba(255,255,255,0.05), ${style.glow.replace('0.3', '0.05')})`
                    : 'var(--color-brand-bg)',
                borderColor: isHovered ? style.glow.replace('0.3', '0.3') : undefined,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            whileHover={{ y: -2, boxShadow: `0 8px 24px -8px ${style.glow}` }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Priority Badge */}
            <div className="mb-2 flex items-center gap-2">
                <motion.span
                    className={`rounded border px-2 py-0.5 text-[10px] font-medium ${style.border} ${style.bg} ${style.text}`}
                    animate={{ scale: isHovered ? 1.05 : 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {task.priority}
                </motion.span>

                {/* Hover Actions */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                    className="ml-auto flex items-center gap-1"
                >
                    <button
                        type="button"
                        className="rounded p-1 text-[var(--muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text)]"
                        title="Edit task"
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                </motion.div>
            </div>

            {/* Task Title */}
            <p className="mb-3 text-sm leading-relaxed text-[var(--text)]/80 transition-colors group-hover:text-[var(--text)]">
                {task.title}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-900/50 text-[8px] font-bold text-indigo-200">
                    PM
                </div>

                <div className="flex items-center gap-2">
                    {/* Expand hint on hover */}
                    <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: isHovered ? 0.6 : 0, width: isHovered ? 'auto' : 0 }}
                        className="overflow-hidden text-[9px] text-[var(--muted)]"
                    >
                        View details
                    </motion.span>

                    <motion.div
                        animate={{ x: isHovered ? 3 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-[var(--muted)]"
                    >
                        <ArrowRight className="h-3 w-3" />
                    </motion.div>

                    <div className="flex items-center gap-1 text-[var(--muted)]">
                        <Tag className="h-3 w-3" />
                        <span className="text-[10px]">Sprint 1</span>
                    </div>
                </div>
            </div>

            {/* Hover glow effect */}
            <motion.div
                className="absolute inset-0 rounded-lg pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                style={{
                    background: `radial-gradient(circle at 50% 0%, ${style.glow.replace('0.3', '0.15')}, transparent 70%)`,
                }}
            />
        </motion.div>
    );
}

// Empty State with Interactive Element
function EmptyColumn() {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.06]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            animate={{
                borderColor: isHovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                backgroundColor: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
            }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                animate={{ scale: isHovered ? 1.1 : 1, y: isHovered ? -2 : 0 }}
                transition={{ duration: 0.2 }}
            >
                <Plus className="h-5 w-5 text-[var(--muted)]" />
            </motion.div>
            <p className="mt-2 text-[10px] font-medium text-[var(--muted)]">
                {isHovered ? 'Click to add task' : 'Empty column'}
            </p>
        </motion.div>
    );
}
