'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Trash2, CheckCircle2, Layers } from 'lucide-react';
import { KanbanTask } from '@/lib/db';
import { parseStrategy, serializeStrategy } from '@/lib/strategyDoc';
import { TimelinePhaseSetter } from '@/components/workspaces/TimelinePhaseSetter';
import { EmptyStateGuide, GuideHint } from '@/components/ui/ContextualGuide';

type CalendarSection = 'schedule' | 'phases';

const KANBAN_STATUSES: KanbanTask['status'][] = ['todo', 'in_progress', 'next', 'completed'];

function normalizeKanbanTask(t: KanbanTask): KanbanTask {
    let status = t.status;
    if ((t as { status?: string }).status === 'done') status = 'completed';
    if (!status || !KANBAN_STATUSES.includes(status)) status = 'todo';
    return { ...t, status };
}

function normalizeKanbanList(raw: unknown): KanbanTask[] {
    const list = Array.isArray(raw) ? raw : [];
    return list
        .filter((x): x is KanbanTask => Boolean(x && typeof x === 'object' && (x as KanbanTask).id && (x as KanbanTask).title))
        .map((t) => normalizeKanbanTask(t));
}

export function CalendarView() {
    const { allProjects, activeProject, addEvent, updateProjectField, patchActiveProject, updateStrategy } = useOffice();
    const [section, setSection] = useState<CalendarSection>('schedule');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDateForEvent, setSelectedDateForEvent] = useState<Date | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventType, setNewEventType] = useState<'milestone' | 'meeting' | 'deadline' | 'task'>('meeting');
    const [inlineNotice, setInlineNotice] = useState<string | null>(null);

    const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);

    const strategyDoc = useMemo(() => parseStrategy(activeProject?.strategy || ''), [activeProject?.strategy]);
    const strategyPhases = strategyDoc.phases || [];

    const persistStrategyPhases = useCallback(
        (nextPhases: typeof strategyPhases) => {
            if (!activeProject) return;
            const doc = parseStrategy(activeProject.strategy || '');
            doc.phases = nextPhases;
            updateStrategy(serializeStrategy(doc));
        },
        [activeProject, updateStrategy]
    );

    /** Calendar is venture-specific â€” only show events for the active venture. */
    const allEvents = useMemo(() => {
        if (!activeProject) return [];
        return (activeProject.events || []).map((e) => ({
            ...e,
            projectName: activeProject.name,
        }));
    }, [activeProject]);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const calendarNow = new Date();
    const isViewingTodayMonth =
        currentDate.getFullYear() === calendarNow.getFullYear() &&
        currentDate.getMonth() === calendarNow.getMonth();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const padding = Array.from({ length: firstDay }, (_, i) => i);

    const handleOpenModal = (day: number) => {
        if (!activeProject) {
            setInlineNotice('Select or create a venture first to add events and tasks.');
            return;
        }
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDateForEvent(date);
        setNewEventTitle('');
        setNewEventType('meeting');
        setIsModalOpen(true);
    };

    const handleSaveEvent = async () => {
        if (!selectedDateForEvent || !newEventTitle.trim()) return;
        await addEvent(newEventTitle.trim(), selectedDateForEvent.getTime(), newEventType);
        setIsModalOpen(false);
    };

    const syncKanbanFromProject = useCallback(() => {
        if (!activeProject) {
            setKanbanTasks([]);
            return;
        }
        setKanbanTasks(normalizeKanbanList(activeProject.kanban));
    }, [activeProject]);

    useEffect(() => {
        syncKanbanFromProject();
    }, [syncKanbanFromProject]);

    useEffect(() => {
        setInlineNotice(null);
    }, [activeProject?.id, section]);

    const saveKanban = (tasks: KanbanTask[]) => {
        const normalized = tasks.map(normalizeKanbanTask);
        setKanbanTasks(normalized);
        if (activeProject?.id) {
            void updateProjectField('kanban', normalized);
        } else if (activeProject) {
            patchActiveProject({ kanban: normalized });
        }
    };

    const addTask = (status: KanbanTask['status']) => {
        if (!activeProject) {
            setInlineNotice('Select or create a venture first to add tasks.');
            return;
        }
        const title = prompt('New task title:');
        if (!title?.trim()) return;

        const newTask: KanbanTask = {
            id: Date.now().toString(),
            title: title.trim(),
            status,
            timestamp: Date.now(),
        };
        saveKanban([...kanbanTasks, newTask]);
    };

    const moveTask = (task: KanbanTask, direction: 'next' | 'prev') => {
        const order = KANBAN_STATUSES;
        const currentIndex = order.indexOf(normalizeKanbanTask(task).status);
        if (currentIndex < 0) return;
        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (nextIndex >= 0 && nextIndex < order.length) {
            const updatedTask = { ...task, status: order[nextIndex] };
            saveKanban(kanbanTasks.map((t) => (t.id === task.id ? updatedTask : t)));
        }
    };

    const markTaskDone = (task: KanbanTask) => {
        if (normalizeKanbanTask(task).status === 'completed') return;
        saveKanban(kanbanTasks.map((t) => (t.id === task.id ? { ...t, status: 'completed' as const } : t)));
    };

    const deleteTask = (id: string) => {
        if (!confirm('Delete task?')) return;
        saveKanban(kanbanTasks.filter((t) => t.id !== id));
    };

    /** Outline-led column accents (aligned with suite theme â€” no heavy tinted fills). */
    const columns = [
        { id: 'todo' as const, title: 'To do', bar: 'border-t-brand-border' },
        { id: 'in_progress' as const, title: 'In progress', bar: 'border-t-brand-teal/70' },
        { id: 'next' as const, title: 'Next', bar: 'border-t-amber-500/45' },
        { id: 'completed' as const, title: 'Done', bar: 'border-t-emerald-500/45' },
    ];

    return (
        <div className="relative flex w-full min-w-0 flex-col gap-4 bg-brand-bg px-3 py-3 sm:px-5 sm:py-4">
            {/* Top bar */}
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                    <h1 className="flex items-center gap-2 text-lg font-semibold text-brand-text sm:text-xl">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-brand-panel">
                            <CalendarIcon className="h-5 w-5 text-brand-teal" aria-hidden />
                        </span>
                        Timeline
                    </h1>
                    <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-brand-muted">
                        {section === 'schedule'
                            ? 'Month view and venture task board. Switch to Strategy phases to edit roadmap horizons and dates.'
                            : 'Strategy phases tie to your venture strategy â€” same data as under Research strategy and direction. Calendar events stay under Schedule.'}
                    </p>
                    {activeProject && !activeProject.id && section === 'schedule' && (
                        <p className="mt-1 max-w-xl text-[12px] text-amber-400/90">
                            Save this venture from the sidebar (new project) so events and tasks persist after you reload.
                        </p>
                    )}
                    <div
                        className="mt-3 flex w-full max-w-md flex-wrap gap-1 rounded-lg border border-brand-border bg-brand-panel/80 p-1"
                        role="tablist"
                        aria-label="Calendar sections"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={section === 'schedule'}
                            onClick={() => setSection('schedule')}
                            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:flex-none ${
                                section === 'schedule'
                                    ? 'bg-brand-input text-brand-text'
                                    : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'
                            }`}
                        >
                            <CalendarIcon className="h-3.5 w-3.5 opacity-80" aria-hidden />
                            Schedule
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={section === 'phases'}
                            onClick={() => setSection('phases')}
                            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:flex-none ${
                                section === 'phases'
                                    ? 'bg-brand-input text-brand-text'
                                    : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'
                            }`}
                        >
                            <Layers className="h-3.5 w-3.5 opacity-80" aria-hidden />
                            Strategy phases
                        </button>
                    </div>
                    {inlineNotice ? (
                        <GuideHint
                            id="calendar-inline-notice"
                            when
                            variant="warning"
                            message={inlineNotice}
                            dismissible={false}
                            className="mt-3"
                        />
                    ) : null}
                </div>
                {section === 'schedule' ? (
                    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-brand-border bg-brand-panel px-1 py-1">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="rounded-md p-2 text-brand-muted transition-colors hover:bg-brand-input hover:text-brand-text"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="min-w-[10rem] text-center text-sm font-semibold text-brand-text">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="rounded-md p-2 text-brand-muted transition-colors hover:bg-brand-input hover:text-brand-text"
                            aria-label="Next month"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                ) : null}
            </div>

            {section === 'phases' ? (
                !activeProject ? (
                    <EmptyStateGuide
                        title="Select a venture to edit phases"
                        description="Roadmap horizons and phase dates are stored on the active venture strategy."
                        icon={<Layers className="h-5 w-5" aria-hidden />}
                        className="shrink-0 py-10"
                    />
                ) : (
                    <TimelinePhaseSetter
                        variant="page"
                        embedded
                        projectName={activeProject.name}
                        phases={strategyPhases}
                        onPhasesChange={persistStrategyPhases}
                    />
                )
            ) : null}

            {/* Month grid â€” own scroll region; does not share height with Kanban */}
            {section === 'schedule' ? (
            <section className="shrink-0 flex flex-col rounded-xl border border-brand-border bg-brand-panel/70">
                <div className="border-b border-brand-border px-3 py-2 sm:px-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted">Month</p>
                </div>
                <div className="min-h-[240px] p-3 sm:p-4">
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div
                                key={day}
                                className="pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-brand-muted sm:text-xs"
                            >
                                {day}
                            </div>
                        ))}
                        {padding.map((i) => (
                            <div key={`pad-${i}`} className="min-h-[4.5rem] sm:min-h-[5rem]" />
                        ))}
                        {days.map((day) => {
                            const dayEvents = allEvents.filter((e) => {
                                const eDate = new Date(e.date);
                                return (
                                    eDate.getDate() === day &&
                                    eDate.getMonth() === currentDate.getMonth() &&
                                    eDate.getFullYear() === currentDate.getFullYear()
                                );
                            });

                            const isToday = isViewingTodayMonth && day === calendarNow.getDate();

                            return (
                                <div
                                    key={day}
                                    aria-current={isToday ? 'date' : undefined}
                                    className={`group relative flex min-h-[4.5rem] flex-col rounded-lg border p-1.5 transition-colors sm:min-h-[5rem] sm:p-2 ${
                                        isToday
                                            ? 'border-brand-teal/55 bg-brand-teal/[0.12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] hover:border-brand-teal/70 hover:bg-brand-teal/[0.16]'
                                            : 'border-brand-border bg-brand-bg/80 hover:border-brand-teal/40 hover:bg-brand-input/30'
                                    }`}
                                >
                                    <span
                                        className={`text-[11px] font-semibold sm:text-xs ${
                                            isToday ? 'text-brand-teal' : 'text-brand-muted'
                                        }`}
                                        title={isToday ? 'Today' : undefined}
                                    >
                                        {day}
                                    </span>
                                    {isToday ? (
                                        <span className="sr-only">Today</span>
                                    ) : null}
                                    <div className="mt-0.5 flex-1 space-y-1">
                                        {dayEvents.map((evt, idx) => (
                                            <div
                                                key={idx}
                                                className={`truncate rounded border px-1.5 py-1 text-[10px] font-medium leading-tight sm:text-[11px] ${
                                                    evt.type === 'milestone'
                                                        ? 'border-amber-500/35 bg-amber-500/10 text-amber-100'
                                                        : evt.type === 'deadline'
                                                          ? 'border-red-500/35 bg-red-500/10 text-red-100'
                                                          : evt.type === 'task'
                                                            ? 'border-brand-teal/35 bg-brand-teal/10 text-brand-text'
                                                            : 'border-brand-border bg-brand-panel text-brand-text'
                                                }`}
                                                title={`${evt.title} (${evt.projectName})`}
                                            >
                                                {evt.title}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenModal(day)}
                                        className="absolute bottom-1 right-1 rounded-md border border-brand-border bg-brand-card p-1 text-brand-text opacity-0 shadow-sm transition-all hover:bg-brand-input group-hover:opacity-100"
                                        title="Add event"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
            ) : null}

            {/* Task board â€” fills remaining height; never overlays the calendar */}
            {section === 'schedule' ? (
            <section className="flex shrink-0 flex-col gap-2 pb-4">
                <div className="flex shrink-0 items-baseline justify-between gap-2">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Task board</h2>
                    <span className="text-[10px] text-brand-muted">Venture kanban Â· {activeProject?.name ?? 'No venture'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
                    {columns.map((col) => (
                        <div
                            key={col.id}
                            className={`flex min-h-[12rem] flex-col rounded-lg border border-brand-border bg-brand-bg ${col.bar} border-t-2`}
                        >
                            <div className="flex shrink-0 items-center justify-between border-b border-brand-border bg-brand-panel/50 px-2 py-2 sm:px-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text">{col.title}</span>
                                <button
                                    type="button"
                                    onClick={() => addTask(col.id)}
                                    className="rounded-md p-1 text-brand-muted transition-colors hover:bg-brand-input hover:text-brand-text"
                                    title="Add task"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <div className="flex flex-col space-y-2 p-2 sm:p-3">
                                {kanbanTasks
                                    .filter((t) => t.status === col.id)
                                    .map((task) => (
                                        <div
                                            key={task.id}
                                            className="group relative min-h-[4.25rem] rounded-lg border border-brand-border bg-brand-panel p-3 transition-colors hover:border-brand-teal/35"
                                        >
                                            <p className="text-xs font-medium leading-snug text-brand-text sm:text-[13px]">{task.title}</p>
                                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => markTaskDone(task)}
                                                    disabled={normalizeKanbanTask(task).status === 'completed'}
                                                    title="Mark done"
                                                    className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-950/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90 hover:bg-emerald-950/35 disabled:pointer-events-none disabled:opacity-40"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                                                    Done
                                                </button>
                                                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteTask(task.id)}
                                                        className="rounded p-1 text-red-400/90 hover:bg-brand-input hover:text-red-300"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <div className="flex gap-0.5">
                                                        {col.id !== 'todo' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => moveTask(task, 'prev')}
                                                                className="rounded p-1 hover:bg-brand-input"
                                                                aria-label="Move back"
                                                            >
                                                                <ChevronLeft className="h-3.5 w-3.5 text-brand-muted" />
                                                            </button>
                                                        )}
                                                        {col.id !== 'completed' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => moveTask(task, 'next')}
                                                                className="rounded p-1 hover:bg-brand-input"
                                                                aria-label="Move forward"
                                                            >
                                                                <ChevronRight className="h-3.5 w-3.5 text-brand-muted" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            ) : null}

            {isModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-panel p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-brand-text">Add event</h3>
                        <p className="mt-1 text-sm text-brand-muted">
                            {selectedDateForEvent?.toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>

                        <div className="mt-6 space-y-4">
                            <div>
                                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={newEventTitle}
                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                    placeholder="e.g. Sprint review"
                                    className="w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted/60 focus:border-brand-teal/50 focus:outline-none focus:ring-1 focus:ring-brand-teal/30"
                                    autoFocus
                                />
                                <p className="mt-1.5 text-[11px] text-brand-muted">
                                    Type a title above â€” Save stays disabled until the field is not empty.
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                                    Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['meeting', 'milestone', 'deadline', 'task'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewEventType(type)}
                                            className={`rounded-lg border px-2 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                                                newEventType === type
                                                    ? 'border-brand-teal bg-brand-teal/20 text-brand-text'
                                                    : 'border-brand-border bg-brand-bg text-brand-muted hover:bg-brand-input'
                                            }`}
                                        >
                                            {type.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 border-t border-brand-border pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 rounded-lg border border-brand-border bg-brand-bg py-2.5 text-sm font-medium text-brand-muted transition-colors hover:bg-brand-input hover:text-brand-text"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveEvent}
                                    disabled={!newEventTitle.trim()}
                                    className="flex-1 rounded-lg border border-brand-teal/50 bg-brand-teal/15 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-teal/25 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

