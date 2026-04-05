'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import type { KanbanTask, DeskDocument } from '@/lib/db';
import {
    parseProductPlan,
    serializeProductPlan,
    getCeoFlowForPlanning,
    type ProductPlanDoc,
    type RecentAction,
} from '@/lib/productPlanDoc';
import { StrategyFlowCanvas } from '@/components/workspaces/StrategyFlowCanvas';
import { ProductWarRoom } from '@/components/workspaces/ProductWarRoom';
import {
    Plus,
    Trash2,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    BookOpen,
    Loader2,
    Save,
    Sparkles,
    History,
    Map,
    FolderOpen,
    Flame,
    CheckCircle2,
} from 'lucide-react';
import { DeskShell, DeskTabButton, DeskEmpty } from '@/components/workspaces/DeskShell';

const COLUMNS: { id: KanbanTask['status']; label: string }[] = [
    { id: 'todo', label: 'Backlog' },
    { id: 'in_progress', label: 'In progress' },
    { id: 'next', label: 'Next up' },
    { id: 'completed', label: 'Done' },
];

type MainTool = 'war' | 'recent' | 'planning' | 'docs' | 'board' | 'roadmap';

function productToolIcon(id: MainTool) {
    const c = 'h-4 w-4';
    switch (id) {
        case 'board':
            return <LayoutGrid className={c} aria-hidden />;
        case 'roadmap':
            return <BookOpen className={c} aria-hidden />;
        case 'war':
            return <Flame className={c} aria-hidden />;
        case 'recent':
            return <History className={c} aria-hidden />;
        case 'planning':
            return <Map className={c} aria-hidden />;
        case 'docs':
            return <FolderOpen className={c} aria-hidden />;
        default:
            return null;
    }
}

const ACTION_LABELS: Record<RecentAction['category'], string> = {
    ship: 'Ship / release',
    decision: 'Decision',
    research: 'Research',
    sync: 'Sync / meeting',
    other: 'Other',
};

export function ProductKanban() {
    const { activeProject, updateProjectField, updateProductPlan } = useOffice();
    const [tool, setTool] = useState<MainTool>('board');
    const [pd, setPd] = useState<ProductPlanDoc>({ roadmapText: '', warRoom: { stickies: [] } });
    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [newTitle, setNewTitle] = useState('');
    const [saving, setSaving] = useState(false);
    const [actionDraft, setActionDraft] = useState<{ category: RecentAction['category']; title: string; detail: string }>({
        category: 'ship',
        title: '',
        detail: '',
    });
    const [docDraft, setDocDraft] = useState({ title: '', category: 'meeting' as DeskDocument['category'], body: '' });

    const syncTasks = useCallback(() => {
        const raw = activeProject?.kanban;
        const list = Array.isArray(raw) ? (raw as KanbanTask[]) : [];
        setTasks(list.filter((t) => t && t.id && t.title));
    }, [activeProject]);

    useEffect(() => {
        syncTasks();
    }, [syncTasks]);

    useEffect(() => {
        if (activeProject?.productPlan !== undefined) {
            setPd(parseProductPlan(activeProject.productPlan || ''));
        }
    }, [activeProject?.productPlan]);

    const persistProduct = (next: ProductPlanDoc) => {
        setPd(next);
        setSaving(true);
        updateProductPlan(serializeProductPlan(next));
        setTimeout(() => setSaving(false), 450);
    };

    const persistTasks = async (next: KanbanTask[]) => {
        setTasks(next);
        if (activeProject?.id) await updateProjectField('kanban', next);
    };

    const addTask = () => {
        const title = newTitle.trim();
        if (!title) return;
        const t: KanbanTask = {
            id: Date.now().toString(),
            title,
            status: 'todo',
            timestamp: Date.now(),
        };
        persistTasks([t, ...tasks]);
        setNewTitle('');
    };

    const move = (task: KanbanTask, dir: 'prev' | 'next') => {
        const order = COLUMNS.map((c) => c.id);
        const i = order.indexOf(task.status);
        if (i < 0) return;
        const ni = dir === 'next' ? Math.min(i + 1, order.length - 1) : Math.max(i - 1, 0);
        if (ni === i) return;
        const nextStatus = order[ni];
        persistTasks(tasks.map((x) => (x.id === task.id ? { ...x, status: nextStatus } : x)));
    };

    const markTaskDone = (task: KanbanTask) => {
        if (task.status === 'completed') return;
        persistTasks(tasks.map((x) => (x.id === task.id ? { ...x, status: 'completed' as const } : x)));
    };

    const remove = (id: string) => {
        persistTasks(tasks.filter((t) => t.id !== id));
    };

    const addRecentAction = () => {
        if (!actionDraft.title.trim()) return;
        const next: RecentAction = {
            id: Date.now().toString(),
            category: actionDraft.category,
            title: actionDraft.title.trim(),
            detail: actionDraft.detail.trim(),
            ts: Date.now(),
        };
        persistProduct({ ...pd, recentActions: [next, ...(pd.recentActions || [])] });
        setActionDraft({ ...actionDraft, title: '', detail: '' });
    };

    const removeRecent = (id: string) => {
        persistProduct({ ...pd, recentActions: (pd.recentActions || []).filter((a) => a.id !== id) });
    };

    const addDeskDocument = () => {
        if (!docDraft.title.trim() || !activeProject?.id) return;
        const d: DeskDocument = {
            id: Date.now().toString(),
            title: docDraft.title.trim(),
            category: docDraft.category,
            body: docDraft.body.trim(),
            createdAt: Date.now(),
        };
        updateProjectField('deskDocuments', [...(activeProject.deskDocuments || []), d]);
        setDocDraft({ title: '', category: 'meeting', body: '' });
    };

    const removeDeskDoc = (id: string) => {
        if (!activeProject?.id) return;
        updateProjectField('deskDocuments', (activeProject.deskDocuments || []).filter((d) => d.id !== id));
    };

    const ceoFlow = activeProject ? getCeoFlowForPlanning(activeProject.strategy || '') : { nodes: [], edges: [] };

    if (!activeProject) {
        return <DeskEmpty>Select a venture to open the product desk.</DeskEmpty>;
    }

    const intent = pd.intent?.trim() || 'Pin product intent: what you ship next and for whom.';

    const nav: { id: MainTool; label: string; sub: string }[] = [
        { id: 'board', label: 'Execution board', sub: 'Kanban' },
        { id: 'roadmap', label: 'Roadmap brief', sub: 'Narrative' },
        { id: 'war', label: 'War room', sub: 'Persistent whiteboard' },
        { id: 'recent', label: 'Recent actions', sub: 'Structured log' },
        { id: 'planning', label: 'Planning room', sub: 'CEO flow mirror' },
        { id: 'docs', label: 'Desk documents', sub: 'Clients & meetings' },
    ];

    return (
        <div className="flex w-full min-w-0 flex-1 flex-col bg-brand-bg">
            <div className="flex min-w-0 flex-1 flex-col">
                <DeskShell
                    className="w-full min-w-0 flex-1"
                    bodyClassName="pb-8"
                    eyebrow="CTO · Architecture & execution"
                    title="Chief Technology Officer"
                    description="You own the execution board — backlog through done. Staff sync and the Personal Assistant add tasks here as the CTO plan updates. War room, roadmap brief, planning room, and desk docs live on the other tabs."
                    tabs={
                        <>
                            {nav.map((item) => (
                                <DeskTabButton
                                    key={item.id}
                                    active={tool === item.id}
                                    onClick={() => setTool(item.id)}
                                    icon={productToolIcon(item.id)}
                                >
                                    {item.label}
                                </DeskTabButton>
                            ))}
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                    {tool === 'board' && (
                        <div className="flex min-h-[420px] flex-col gap-4">
                            <div className="flex flex-wrap items-end gap-2">
                                <input
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                                    placeholder="New work item…"
                                    className="min-w-[200px] flex-1 rounded-lg border border-zinc-600 bg-brand-panel px-3 py-2 text-sm text-zinc-200"
                                />
                                <button
                                    type="button"
                                    onClick={addTask}
                                    className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-card px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-brand-input"
                                >
                                    <Plus className="h-4 w-4" aria-hidden />
                                    Add
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                                {COLUMNS.map((col) => (
                                    <div key={col.id} className="flex min-h-[200px] flex-col rounded-lg border border-white/[0.06] bg-brand-panel/40">
                                        <div className="border-b border-white/[0.06] px-3 py-2">
                                            <h3 className="text-xs font-normal text-zinc-400">{col.label}</h3>
                                        </div>
                                        <div className="flex flex-col space-y-2 p-2">
                                            {tasks
                                                .filter((t) => t.status === col.id)
                                                .map((task) => (
                                                    <div key={task.id} className="rounded-md border border-brand-border bg-brand-input p-3">
                                                        <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex flex-wrap items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => markTaskDone(task)}
                                                                    disabled={task.status === 'completed'}
                                                                    title="Mark done"
                                                                    className="inline-flex items-center gap-1 rounded border border-emerald-500/35 bg-emerald-950/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/95 hover:bg-emerald-950/40 disabled:pointer-events-none disabled:opacity-40"
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                                                    Done
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => move(task, 'prev')}
                                                                    title="Move to previous column"
                                                                    className="rounded border border-zinc-600 p-1 text-zinc-500 hover:bg-zinc-800"
                                                                >
                                                                    <ChevronLeft className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => move(task, 'next')}
                                                                    title="Move to next column"
                                                                    className="rounded border border-zinc-600 p-1 text-zinc-500 hover:bg-zinc-800"
                                                                >
                                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => remove(task.id)}
                                                                title="Delete task"
                                                                className="rounded p-1 text-zinc-600 hover:text-rose-400"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tool === 'roadmap' && (
                        <section className="mx-auto max-w-4xl space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-sm font-normal text-zinc-300">Roadmap brief</h2>
                                <button
                                    type="button"
                                    onClick={() => persistProduct(pd)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-card px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-brand-input"
                                >
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Save
                                </button>
                            </div>
                            <textarea
                                value={pd.roadmapText || ''}
                                onChange={(e) => setPd({ ...pd, roadmapText: e.target.value })}
                                placeholder="Themes, bets, outcomes, and how you measure success…"
                                rows={22}
                                className="w-full rounded-lg border border-brand-border bg-brand-input p-4 text-[15px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                            />
                        </section>
                    )}

                    {tool === 'war' && (
                        <section className="mx-auto max-w-5xl space-y-3">
                            <h2 className="text-sm font-normal text-zinc-300">War room</h2>
                            <p className="text-xs text-zinc-500">
                                Persistent sticky notes and sketches—nothing clears when you leave. Save updates the venture record.
                            </p>
                            <ProductWarRoom
                                stickies={pd.warRoom?.stickies || []}
                                onChange={(stickies) => persistProduct({ ...pd, warRoom: { stickies } })}
                            />
                        </section>
                    )}

                    {tool === 'recent' && (
                        <section className="mx-auto max-w-3xl space-y-4">
                            <h2 className="text-sm font-normal text-zinc-300">Recent actions</h2>
                            <p className="text-xs text-zinc-500">
                                Structured entries—not a freeform journal. Log what shipped, what was decided, and what you learned.
                            </p>
                            <div className="grid gap-2 rounded-lg border border-brand-border bg-brand-panel p-3 sm:grid-cols-2">
                                <select
                                    value={actionDraft.category}
                                    onChange={(e) =>
                                        setActionDraft({ ...actionDraft, category: e.target.value as RecentAction['category'] })
                                    }
                                    className="rounded border border-brand-border bg-brand-input px-2 py-2 text-sm text-zinc-200 sm:col-span-2"
                                >
                                    {(Object.keys(ACTION_LABELS) as RecentAction['category'][]).map((k) => (
                                        <option key={k} value={k}>
                                            {ACTION_LABELS[k]}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    placeholder="Title"
                                    value={actionDraft.title}
                                    onChange={(e) => setActionDraft({ ...actionDraft, title: e.target.value })}
                                    className="rounded border border-brand-border bg-brand-input px-2 py-2 text-sm sm:col-span-2"
                                />
                                <textarea
                                    placeholder="Details, links, or outcome"
                                    value={actionDraft.detail}
                                    onChange={(e) => setActionDraft({ ...actionDraft, detail: e.target.value })}
                                    className="min-h-[72px] rounded border border-brand-border bg-brand-input px-2 py-2 text-sm sm:col-span-2"
                                />
                                <button
                                    type="button"
                                    onClick={addRecentAction}
                                    className="rounded-lg border border-brand-border bg-brand-card py-2 text-sm font-medium text-zinc-100 sm:col-span-2"
                                >
                                    Log action
                                </button>
                            </div>
                            <ul className="space-y-2">
                                {(pd.recentActions || []).map((a) => (
                                    <li key={a.id} className="rounded-lg border border-brand-border bg-brand-panel p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                                    {ACTION_LABELS[a.category]}
                                                </span>
                                                <p className="font-medium text-zinc-200">{a.title}</p>
                                                {a.detail && <p className="mt-1 text-sm text-zinc-400">{a.detail}</p>}
                                                <p className="mt-1 text-[10px] text-zinc-600">{new Date(a.ts).toLocaleString()}</p>
                                            </div>
                                            <button type="button" onClick={() => removeRecent(a.id)} className="text-xs text-rose-400">
                                                Remove
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {tool === 'planning' && (
                        <section className="mx-auto max-w-5xl space-y-4">
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 sm:px-5">
                                <h2 className="text-sm font-medium text-zinc-200">Planning room · Strategy flow</h2>
                                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                                    Read-only mirror of CEO → Visualise your plan. Edits save with the venture strategy — this view refreshes when
                                    the flow changes.
                                </p>
                                {ceoFlow.nodes.length > 0 ? (
                                    <p className="mt-2 text-[11px] tabular-nums text-zinc-600">
                                        {ceoFlow.nodes.length} step{ceoFlow.nodes.length === 1 ? '' : 's'} · {ceoFlow.edges.length} link
                                        {ceoFlow.edges.length === 1 ? '' : 's'}
                                    </p>
                                ) : null}
                            </div>
                            {ceoFlow.nodes.length === 0 ? (
                                <p className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-10 text-center text-sm text-zinc-500">
                                    No flow yet. Build it under CEO → Visualise your plan.
                                </p>
                            ) : (
                                <StrategyFlowCanvas
                                    key={activeProject.strategy ?? ''}
                                    readOnly
                                    nodes={ceoFlow.nodes}
                                    edges={ceoFlow.edges}
                                    onChange={() => {}}
                                />
                            )}
                        </section>
                    )}

                    {tool === 'docs' && (
                        <section className="mx-auto max-w-3xl space-y-4">
                            <h2 className="text-sm font-semibold text-zinc-300">Desk documents</h2>
                            <p className="text-xs text-zinc-500">Client notes, meeting notes, and internal docs—saved on the venture.</p>
                            <div className="grid gap-2 rounded-lg border border-brand-border bg-brand-panel p-3">
                                <input
                                    placeholder="Title"
                                    value={docDraft.title}
                                    onChange={(e) => setDocDraft({ ...docDraft, title: e.target.value })}
                                    className="rounded border border-brand-border bg-brand-input px-2 py-2 text-sm"
                                />
                                <select
                                    value={docDraft.category}
                                    onChange={(e) => setDocDraft({ ...docDraft, category: e.target.value as DeskDocument['category'] })}
                                    className="rounded border border-brand-border bg-brand-input px-2 py-2 text-sm"
                                >
                                    <option value="client">Client</option>
                                    <option value="meeting">Meeting</option>
                                    <option value="internal">Internal</option>
                                    <option value="other">Other</option>
                                </select>
                                <textarea
                                    placeholder="Body"
                                    value={docDraft.body}
                                    onChange={(e) => setDocDraft({ ...docDraft, body: e.target.value })}
                                    className="min-h-[100px] rounded border border-brand-border bg-brand-input px-2 py-2 text-sm"
                                />
                                <button type="button" onClick={addDeskDocument} className="rounded-lg border border-brand-border bg-brand-card py-2 text-sm font-medium">
                                    Save document
                                </button>
                            </div>
                            <ul className="space-y-2">
                                {(activeProject.deskDocuments || []).map((d) => (
                                    <li key={d.id} className="rounded-lg border border-brand-border bg-brand-panel p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] uppercase tracking-wider text-zinc-500">{d.category}</span>
                                                <p className="font-medium text-zinc-200">{d.title}</p>
                                                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">{d.body}</p>
                                                <p className="mt-1 text-[10px] text-zinc-600">{new Date(d.createdAt).toLocaleString()}</p>
                                            </div>
                                            <button type="button" onClick={() => removeDeskDoc(d.id)} className="text-xs text-rose-400">
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    </div>
                </DeskShell>
            </div>

            <aside className="flex w-[min(100%,14rem)] shrink-0 flex-col border-l border-zinc-800 bg-zinc-900/30">
                {/** Headroom on narrow viewports: sync pill stays top-right until sm breakpoint. */}
                <div className="border-b border-zinc-800 p-4 pt-14 sm:pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Product intent · pinned</p>
                    <textarea
                        value={pd.intent ?? ''}
                        onChange={(e) => setPd({ ...pd, intent: e.target.value })}
                        onBlur={(e) => persistProduct({ ...pd, intent: e.target.value })}
                        placeholder={intent}
                        rows={3}
                        className="mt-2 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-xs leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
                    />
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600">
                        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                        Surfaces match the tabs above.
                    </p>
                </div>
                <div className="mt-auto border-t border-zinc-800 p-3">
                    <button
                        type="button"
                        onClick={() => persistProduct(pd)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-card py-2 text-xs font-semibold text-zinc-100 hover:bg-brand-input"
                    >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save product desk
                    </button>
                </div>
            </aside>
        </div>
    );
}
