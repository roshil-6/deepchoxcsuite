'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import type { KanbanTask, DeskDocument } from '@/lib/db';
import {
    parseProductPlan,
    serializeProductPlan,
    getCeoFlowForPlanning,
    type ProductPlanDoc,
    type RecentAction,
} from '@/lib/productPlanDoc';
import { parseStrategy, serializeStrategy, type StrategyPhase } from '@/lib/strategyDoc';
import { StrategyFlowCanvas } from '@/components/workspaces/StrategyFlowCanvas';
import { ProductWarRoom } from '@/components/workspaces/ProductWarRoom';
import { TimelinePhaseSetter } from '@/components/workspaces/TimelinePhaseSetter';
import {
    Plus,
    Trash2,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    BookOpen,
    Loader2,
    Save,
    History,
    Map,
    FolderOpen,
    Flame,
    CheckCircle2,
} from 'lucide-react';
import { DeskShell, DeskEmpty } from '@/components/workspaces/DeskShell';
import { deskHeadline, deskHelpText } from '@/lib/researchStaffLabels';
import { DeskMsgUser, DeskMsgAssistant, DeskFocusToolbar } from '@/components/workspaces/DeskBlockFocusUI';
import { EmptyStateGuide, GuideHint } from '@/components/ui/ContextualGuide';

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

/** User-facing line in the focus bubble; `prompt` is injected for the API (ground-truth, no invention). */
const PM_FOCUS: Record<MainTool, { title: string; question: string; prompt: string }> = {
    board: {
        title: 'Execution board',
        question: 'What’s on the board across backlog → done?',
        prompt:
            'PM desk · execution board. Use only this venture’s persisted `kanban` array (tasks: id, title, status ∈ todo | in_progress | next | completed, timestamp). Do not invent cards or statuses. If empty, say it is empty. Summarize workload by column and name concrete next moves from listed titles only.',
    },
    roadmap: {
        title: 'Roadmap brief',
        question: 'What does the saved roadmap narrative say?',
        prompt:
            'PM desk · roadmap brief. Ground truth: `productPlan` serialized doc — fields `roadmapText` (string) and `intent` (string). If missing or whitespace-only, say nothing is saved. Do not infer roadmap from CEO strategy unless the user asks to compare; then label strategy as `strategy` field and roadmap as `productPlan.roadmapText` separately.',
    },
    war: {
        title: 'War room',
        question: 'What’s on the war room whiteboard?',
        prompt:
            'PM desk · war room. Ground truth: `productPlan.warRoom` (sticky notes / sketch metadata stored in the product plan JSON). Describe only stickies and content that exist in that structure. If warRoom is empty or absent, say so. Do not fabricate workshop output.',
    },
    recent: {
        title: 'Recent actions',
        question: 'What recent actions are logged?',
        prompt:
            'PM desk · recent actions. Ground truth: `productPlan.recentActions` — list of { id, category, title, detail, ts }. Newest-first in UI is typical; use the stored entries only. If the list is empty, state that. Do not invent ships, decisions, or meetings.',
    },
    planning: {
        title: 'Planning room',
        question: 'How does the strategy map line up with dated phases?',
        prompt:
            'PM desk · planning room. Two read-only inputs: (1) CEO strategy flow from `strategy` via parseStrategy → flow nodes/edges shown here; (2) phase timeline from the same strategy doc (`phases`). Describe alignment or gaps using only those structures. If flow or phases are empty, say which is missing. Do not invent milestones.',
    },
    docs: {
        title: 'Desk documents',
        question: 'Which documents are on file for this venture?',
        prompt:
            'PM desk · desk documents. Ground truth: top-level `deskDocuments` array on the venture — { id, title, category, body, createdAt }. Summarize titles/categories/dates from stored rows only. If empty, say no documents saved. Do not invent clients or meetings.',
    },
};

export function ProductKanban() {
    const { activeProject, updateProjectField, updateProductPlan, updateStrategy, setDeskSectionFocus } = useOffice();
    const [deskFocus, setDeskFocus] = useState<MainTool | null>(null);
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

    useEffect(() => {
        setDeskFocus(null);
        setDeskSectionFocus(null);
    }, [activeProject?.id, setDeskSectionFocus]);

    /** Sync focus in the same tick as layout (hub slot must not win over inner mount in OperationalDesk). */
    const openPmSection = (id: MainTool) => {
        const m = PM_FOCUS[id];
        setDeskSectionFocus({ room: 'pm', sectionId: id, title: m.title, prompt: m.prompt });
        setDeskFocus(id);
    };

    const goHub = () => {
        setDeskSectionFocus(null);
        setDeskFocus(null);
    };

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
    const strategyPhases = useMemo(
        () => parseStrategy(activeProject?.strategy || '').phases || [],
        [activeProject?.strategy]
    );

    const persistStrategyPhases = useCallback(
        (nextPhases: StrategyPhase[]) => {
            if (!activeProject) return;
            const base = parseStrategy(activeProject.strategy || '');
            updateStrategy(serializeStrategy({ ...base, phases: nextPhases }));
        },
        [activeProject, updateStrategy]
    );

    if (!activeProject) {
        return (
            <DeskEmpty>
                <EmptyStateGuide
                    title="Open a venture to run the product desk"
                    description="Execution board, roadmap, war room, and desk documents all use the active venture."
                    icon={<LayoutGrid className="h-5 w-5" aria-hidden />}
                />
            </DeskEmpty>
        );
    }

    const intent = pd.intent?.trim() || 'Pin product intent: what you ship next and for whom.';

    const nav: { id: MainTool; label: string; sub: string }[] = [
        { id: 'board', label: 'Execution board', sub: 'Kanban' },
        { id: 'roadmap', label: 'Roadmap brief', sub: 'Narrative' },
        { id: 'war', label: 'War room', sub: 'Persistent whiteboard' },
        { id: 'recent', label: 'Recent actions', sub: 'Structured log' },
        { id: 'planning', label: 'Planning room', sub: 'Map + phases in one view' },
        { id: 'docs', label: 'Desk documents', sub: 'Clients & meetings' },
    ];

    const focusMeta = deskFocus ? PM_FOCUS[deskFocus] : null;

    const renderPmBody = (t: MainTool): React.ReactNode => {
        switch (t) {
            case 'board':
                return (
                    <div className="flex min-h-[320px] flex-col">
                        <p className="mb-2 text-[11px] text-brand-muted">Add work below — four columns: backlog → done.</p>
                        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-brand-border/50 pb-3">
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                                placeholder="New backlog item…"
                                className="min-w-[180px] flex-1 rounded-md border border-brand-border bg-brand-input px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted"
                            />
                            <button
                                type="button"
                                onClick={addTask}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-brand-border bg-brand-card px-3 py-2 text-xs font-semibold text-brand-text hover:bg-brand-input"
                            >
                                <Plus className="h-4 w-4" aria-hidden />
                                Add
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {COLUMNS.map((col) => (
                                <div key={col.id} className="flex min-h-[180px] flex-col rounded-md border border-brand-border/70 bg-brand-panel/30">
                                    <div className="border-b border-brand-border/50 px-2.5 py-1.5">
                                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{col.label}</h3>
                                    </div>
                                    <div className="flex flex-col gap-1.5 p-2">
                                        {tasks
                                            .filter((task) => task.status === col.id)
                                            .map((task) => (
                                                <div key={task.id} className="rounded-md border border-brand-border/80 bg-brand-input/80 p-2.5">
                                                    <p className="text-[13px] font-medium text-brand-text">{task.title}</p>
                                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
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
                                                                className="rounded border border-brand-border/80 p-1 text-brand-muted hover:bg-brand-input"
                                                            >
                                                                <ChevronLeft className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => move(task, 'next')}
                                                                title="Move to next column"
                                                                className="rounded border border-brand-border/80 p-1 text-brand-muted hover:bg-brand-input"
                                                            >
                                                                <ChevronRight className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => remove(task.id)}
                                                            title="Delete task"
                                                            className="rounded p-1 text-brand-muted hover:text-rose-400"
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
                );
            case 'roadmap':
                return (
                    <textarea
                        value={pd.roadmapText || ''}
                        onChange={(e) => setPd({ ...pd, roadmapText: e.target.value })}
                        placeholder="Themes, bets, outcomes, and how you measure success…"
                        rows={18}
                        className="w-full rounded-lg border border-brand-border bg-brand-input p-4 text-[15px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                    />
                );
            case 'war':
                return (
                    <ProductWarRoom
                        stickies={pd.warRoom?.stickies || []}
                        onChange={(stickies) => persistProduct({ ...pd, warRoom: { stickies } })}
                    />
                );
            case 'recent':
                return (
                    <div className="space-y-4">
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
                    </div>
                );
            case 'planning':
                return (
                    <div className="relative overflow-hidden rounded-2xl border border-violet-500/22 bg-[var(--bg-card)] shadow-[0_0_40px_-12px_rgba(139,92,246,0.22)]">
                        <div
                            className="pointer-events-none absolute -top-16 left-1/2 h-40 w-[min(100%,28rem)] -translate-x-1/2 rounded-full bg-violet-500/18 blur-3xl"
                            aria-hidden
                        />
                        <div className="relative border-b border-[var(--border)] px-4 py-3 sm:px-5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300/85">Planning room</p>
                            <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-[var(--text-secondary)]">
                                Scroll in <span className="font-medium text-[var(--text-primary)]">one column</span>: the CEO strategy map
                                (read-only here), then the phase horizons you edit. Keep dates honest against what the map says you are
                                building.
                            </p>
                        </div>
                        <div className="relative bg-[var(--bg-elevated)]/20">
                            <section className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300/80">
                                    Strategy map · mirror from CEO desk
                                </p>
                                <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                                    {ceoFlow.nodes.length > 0
                                        ? `${ceoFlow.nodes.length} steps · ${ceoFlow.edges.length} links · edit the map on Strategy → Visualise your plan`
                                        : 'Nothing mirrored yet — map the plan on the strategy desk first.'}
                                </p>
                                {ceoFlow.nodes.length === 0 ? (
                                    <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)]/60 px-4 py-10 text-center text-[13px] leading-relaxed text-[var(--text-secondary)]">
                                        No flow to mirror yet. When it exists on the strategy desk, it shows up here automatically.
                                    </p>
                                ) : (
                                    <div className="mt-3 min-h-[240px] sm:min-h-[300px]">
                                        <StrategyFlowCanvas
                                            key={activeProject.strategy ?? ''}
                                            readOnly
                                            nodes={ceoFlow.nodes}
                                            edges={ceoFlow.edges}
                                            onChange={() => {}}
                                        />
                                    </div>
                                )}
                            </section>
                            <div
                                className="h-px bg-gradient-to-r from-transparent via-violet-400/25 to-transparent"
                                aria-hidden
                            />
                            <section className="min-h-0 overflow-hidden">
                                <div className="border-b border-[var(--border)] px-4 py-2.5 sm:px-5">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300/80">
                                        Phase horizons · editable on this venture
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                                        {strategyPhases.length} phase{strategyPhases.length === 1 ? '' : 's'} saved · align dates with the
                                        map above
                                    </p>
                                </div>
                                <TimelinePhaseSetter
                                    embedded
                                    planningStripOnly
                                    projectName={activeProject.name}
                                    phases={strategyPhases}
                                    onPhasesChange={persistStrategyPhases}
                                />
                            </section>
                        </div>
                    </div>
                );
            case 'docs':
                return (
                    <div className="space-y-4">
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
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex w-full min-w-0 flex-1 flex-col bg-brand-bg">
            <div className="flex min-w-0 flex-1 flex-col">
                <DeskShell
                    className="w-full min-w-0 flex-1"
                    bodyFlush={Boolean(deskFocus)}
                    bodyClassName={deskFocus ? 'px-4 pb-28 pt-0 sm:px-5 sm:pb-32' : 'pb-8'}
                    title={deskHeadline(activeProject.name, 'pm')}
                    description={deskFocus ? undefined : deskHelpText('pm')}
                >
                    {deskFocus && focusMeta ? (
                        <>
                            <DeskFocusToolbar
                                onBack={goHub}
                                title={focusMeta.title}
                                onSave={() => persistProduct(pd)}
                                saving={saving}
                            />
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto py-3">
                                    <DeskMsgUser>
                                        <p className="text-[13px] font-semibold text-zinc-50">{focusMeta.title}</p>
                                        <p className="mt-1 text-[12px] leading-relaxed text-zinc-300">{focusMeta.question}</p>
                                    </DeskMsgUser>
                                    <DeskMsgAssistant>{renderPmBody(deskFocus)}</DeskMsgAssistant>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-[var(--bg-card)] px-4 py-3 shadow-[0_0_32px_-10px_rgba(139,92,246,0.2)] sm:px-5 sm:py-4">
                                <div
                                    className="pointer-events-none absolute -right-8 -top-12 h-28 w-40 rounded-full bg-violet-500/12 blur-2xl"
                                    aria-hidden
                                />
                                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300/90">
                                            Product &amp; delivery · pinned intent
                                        </p>
                                        <p className="mt-1 text-[11px] leading-snug text-[var(--text-secondary)]">
                                            One strip for what you ship next — not a second page. Blocks below open focused threads; this stays visible.
                                        </p>
                                        <textarea
                                            value={pd.intent ?? ''}
                                            onChange={(e) => setPd({ ...pd, intent: e.target.value })}
                                            onBlur={(e) => persistProduct({ ...pd, intent: e.target.value })}
                                            placeholder={intent}
                                            rows={2}
                                            className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-[13px] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-violet)]/25"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => persistProduct(pd)}
                                        className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-violet-500/35 hover:bg-violet-500/[0.08] sm:w-auto"
                                    >
                                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                        Save product desk
                                    </button>
                                </div>
                            </div>
                            <GuideHint
                                id="pm-hub-guide"
                                when
                                variant="info"
                                message="Open a product block to work in a focused thread. The desk chat below will stay pinned to that context until you go back."
                                dismissible={false}
                            />
                            <div className="flex justify-start">
                                <div className="max-w-[min(100%,26rem)] rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--bg-elevated)]/80 px-3.5 py-2.5 text-left">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">How this desk works</p>
                                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-primary)]">
                                        Pick a topic — each opens like a thread. Chat at the bottom follows that block until you go back.
                                    </p>
                                </div>
                            </div>
                            {nav.map((item, i) => (
                                <div key={item.id} className="flex justify-start">
                                    <button
                                        type="button"
                                        onClick={() => openPmSection(item.id)}
                                        className="group max-w-[min(100%,30rem)] animate-in fade-in slide-in-from-bottom-1 executive-card-interactive rounded-2xl rounded-bl-md px-3.5 py-3 text-left fill-mode-both duration-300"
                                        style={{ animationDelay: `${i * 55}ms` }}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400 group-hover:text-zinc-200">
                                                {productToolIcon(item.id)}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[13px] font-semibold text-zinc-100">{item.label}</span>
                                                <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{item.sub}</span>
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </DeskShell>
            </div>
        </div>
    );
}
