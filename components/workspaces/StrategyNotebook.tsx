'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import {
    Save,
    Loader2,
    ListChecks,
    CalendarDays,
    FileText,
    Plus,
    Trash2,
    GitBranch,
    Users,
    MessageSquare,
    ArrowLeft,
} from 'lucide-react';
import type { ProjectEvent } from '@/lib/db';
import type { StrategyDoc } from '@/lib/strategyDoc';
import { parseStrategy, serializeStrategy } from '@/lib/strategyDoc';
import { enrichLegacyStrategyDoc, needsTimelineAndFlowBootstrap } from '@/lib/defaultStrategyTimeline';
import { ceo } from '@/lib/ceoTheme';
import { StrategyFlowCanvas } from '@/components/workspaces/StrategyFlowCanvas';
import { TimelinePhaseSetter } from '@/components/workspaces/TimelinePhaseSetter';
import { TimelinePhaseReadOnly } from '@/components/workspaces/TimelinePhaseReadOnly';
import { DeskRevealSection } from '@/components/workspaces/DeskRevealSection';
import { DeskEmpty } from '@/components/workspaces/DeskShell';
type ToolId = 'narrative' | 'flow' | 'phases' | 'team' | 'schedule' | 'priorities';

type DeskView = 'hub' | 'surface';

export function StrategyNotebook() {
    const { activeProject, updateStrategy, addEvent, updateProjectField } = useOffice();
    const [deskView, setDeskView] = useState<DeskView>('hub');
    const [tool, setTool] = useState<ToolId>('narrative');
    const [doc, setDoc] = useState<StrategyDoc>({ content: '', priorities: [] });
    const [isSaving, setIsSaving] = useState(false);
    const [newPriority, setNewPriority] = useState('');
    const [calTitle, setCalTitle] = useState('');
    const [calDate, setCalDate] = useState('');
    const [calType, setCalType] = useState<ProjectEvent['type']>('milestone');
    const [memberDraft, setMemberDraft] = useState({ name: '', role: '' });
    const [chatLine, setChatLine] = useState('');
    const timelineBootstrapRef = useRef<Set<number>>(new Set());
    /** Context exposes a new updateStrategy function each render — do not put it in useCallback deps or effects loop. */
    const updateStrategyRef = useRef(updateStrategy);
    updateStrategyRef.current = updateStrategy;

    const strategySyncKey = activeProject?.id ?? null;
    const strategyRaw = activeProject?.strategy ?? '';
    const activeProjectRef = useRef(activeProject);
    activeProjectRef.current = activeProject;

    const loadFromProject = useCallback(() => {
        const ap = activeProjectRef.current;
        if (!ap) return;
        const parsed = parseStrategy(ap.strategy || '');
        const id = ap.id;
        if (
            id != null &&
            needsTimelineAndFlowBootstrap(parsed) &&
            !timelineBootstrapRef.current.has(id)
        ) {
            timelineBootstrapRef.current.add(id);
            const enriched = enrichLegacyStrategyDoc(parsed);
            setDoc(enriched);
            setIsSaving(true);
            updateStrategyRef.current(serializeStrategy(enriched));
            setTimeout(() => setIsSaving(false), 450);
            return;
        }
        setDoc(parsed);
    }, [strategySyncKey, strategyRaw]);

    useEffect(() => {
        loadFromProject();
    }, [loadFromProject]);

    useEffect(() => {
        setDeskView('hub');
    }, [activeProject?.id]);

    const persist = (next: StrategyDoc) => {
        setDoc(next);
        setIsSaving(true);
        updateStrategy(serializeStrategy(next));
        setTimeout(() => setIsSaving(false), 450);
    };

    const intentPinned =
        doc.strategicIntent?.trim() ||
        doc.vision?.trim() ||
        doc.content?.split('\n')[0]?.trim() ||
        'Define your strategic intent in one or two lines.';

    const flow = doc.flow || { nodes: [], edges: [] };
    const flowStats = useMemo(() => {
        const nodes = flow.nodes ?? [];
        const edges = flow.edges ?? [];
        return { steps: nodes.length, links: edges.length };
    }, [flow.nodes, flow.edges]);
    const phases = doc.phases || [];
    const team = doc.team || { members: [], thread: [] };

    const openSurface = (id: ToolId) => {
        setTool(id);
        setDeskView('surface');
    };

    const goHub = () => setDeskView('hub');

    const togglePriority = (id: string) => {
        const priorities = (doc.priorities || []).map((p) => (p.id === id ? { ...p, done: !p.done } : p));
        persist({ ...doc, priorities });
    };

    const addPriority = () => {
        const t = newPriority.trim();
        if (!t) return;
        persist({
            ...doc,
            priorities: [...(doc.priorities || []), { id: Date.now().toString(), title: t, done: false }],
        });
        setNewPriority('');
    };

    const removePriority = (id: string) => {
        persist({ ...doc, priorities: (doc.priorities || []).filter((p) => p.id !== id) });
    };

    const addMember = () => {
        if (!memberDraft.name.trim()) return;
        persist({
            ...doc,
            team: {
                ...team,
                members: [
                    ...team.members,
                    { id: Date.now().toString(), name: memberDraft.name.trim(), role: memberDraft.role.trim() || 'Member' },
                ],
            },
        });
        setMemberDraft({ name: '', role: '' });
    };

    const sendTeamMsg = () => {
        const body = chatLine.trim();
        if (!body) return;
        persist({
            ...doc,
            team: {
                ...team,
                thread: [...team.thread, { id: Date.now().toString(), author: 'You', body, ts: Date.now() }],
            },
        });
        setChatLine('');
    };

    const addCalendarRow = () => {
        const title = calTitle.trim();
        if (!title || !calDate || !activeProject?.id) return;
        const d = new Date(calDate);
        if (Number.isNaN(d.getTime())) return;
        addEvent(title, d.getTime(), calType);
        setCalTitle('');
        setCalDate('');
    };

    const removeEvent = (id: string) => {
        if (!activeProject?.id) return;
        updateProjectField('events', (activeProject.events || []).filter((e) => e.id !== id));
    };

    const events = [...(activeProject?.events || [])].sort((a, b) => a.date - b.date);

    const openScheduleSurface = () => {
        setTool('schedule');
        setDeskView('surface');
    };

    if (!activeProject) {
        return <DeskEmpty>Select a venture to open the CEO desk.</DeskEmpty>;
    }

    const navItems: { id: ToolId; label: string; sub: string }[] = [
        { id: 'narrative', label: 'Strategy narrative', sub: 'Full thesis' },
        { id: 'flow', label: 'Visualise your plan', sub: 'Flow boxes & links' },
        { id: 'phases', label: 'Edit phase timeline', sub: 'Horizons, dates & notes' },
        { id: 'team', label: 'Team workspace', sub: 'Roles & thread' },
        { id: 'schedule', label: 'Schedule & critical work', sub: 'Dates & tasks' },
        { id: 'priorities', label: 'Executive priorities', sub: 'Checklist' },
    ];

    const planningSurfaceItems = navItems;

    const activeNav = navItems.find((n) => n.id === tool) ?? navItems[0];

    const modeIcon = (id: ToolId) => {
        const c = 'h-5 w-5 shrink-0';
        switch (id) {
            case 'flow':
                return <GitBranch className={c} aria-hidden />;
            case 'team':
                return <Users className={c} aria-hidden />;
            case 'schedule':
                return <CalendarDays className={c} aria-hidden />;
            case 'priorities':
                return <ListChecks className={c} aria-hidden />;
            case 'narrative':
                return <FileText className={c} aria-hidden />;
            case 'phases':
                return <MessageSquare className={c} aria-hidden />;
            default:
                return null;
        }
    };

    const surfaceToolbar = (
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.06] bg-brand-bg/85 px-4 py-2 backdrop-blur-md sm:gap-3 sm:px-6 sm:py-2.5">
            <button
                type="button"
                onClick={goHub}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.07]"
            >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Back
            </button>
            <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-normal text-zinc-100">{activeNav.label}</h2>
                <p className="truncate text-[11px] font-normal text-zinc-500">{activeNav.sub}</p>
            </div>
            <button
                type="button"
                onClick={() => persist(doc)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/[0.1] px-2.5 py-1.5 text-xs font-medium text-[#0a0a0a] ${ceo.accentBg} ${ceo.accentBgHover}`}
            >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
            </button>
        </header>
    );

    return (
        <>
            <div className="flex w-full min-w-0 flex-col bg-[var(--color-brand-bg)]">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-brand-bg)]">
            {deskView === 'hub' ? (
                <div className="flex w-full flex-col bg-[var(--color-brand-bg)]">
                    <div className="space-y-4 px-5 py-6 pb-28 sm:px-7 sm:py-7 sm:pb-32">
                            <p className="text-[11px] leading-relaxed text-zinc-500">
                                Tap a section to open it. Each block is separate so you can jump to intent, timeline, dates, or tasks quickly.
                            </p>

                            <DeskRevealSection
                                title="Strategic intent"
                                subtitle="One or two lines — what winning looks like for this venture."
                                defaultOpen
                                badge={
                                    doc.strategicIntent?.trim() ? (
                                        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                                            Saved
                                        </span>
                                    ) : null
                                }
                            >
                                <label className="sr-only" htmlFor="ceo-strategic-intent">
                                    Strategic intent
                                </label>
                                <textarea
                                    id="ceo-strategic-intent"
                                    value={doc.strategicIntent ?? ''}
                                    onChange={(e) => setDoc({ ...doc, strategicIntent: e.target.value })}
                                    onBlur={(e) => persist({ ...doc, strategicIntent: e.target.value })}
                                    placeholder={intentPinned}
                                    rows={3}
                                    className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-3 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
                                />
                            </DeskRevealSection>

                            <DeskRevealSection
                                title="Vision / north star"
                                subtitle="12–36 month picture. Saved when you leave the field."
                            >
                                <label className="sr-only" htmlFor="ceo-vision">
                                    Vision / north star
                                </label>
                                <textarea
                                    id="ceo-vision"
                                    value={doc.vision ?? ''}
                                    onChange={(e) => setDoc({ ...doc, vision: e.target.value })}
                                    onBlur={(e) => persist({ ...doc, vision: e.target.value })}
                                    placeholder="Longer-horizon picture — where this venture is headed in 12–36 months."
                                    rows={3}
                                    className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-3 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
                                />
                            </DeskRevealSection>

                            <DeskRevealSection
                                title="Phase timeline"
                                subtitle="Read-only here. Edit horizons under Open full editor, or Product → Planning."
                                badge={
                                    <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium tabular-nums text-zinc-400">
                                        {phases.length} phase{phases.length === 1 ? '' : 's'}
                                    </span>
                                }
                            >
                                <TimelinePhaseReadOnly
                                    phases={phases}
                                    emptyHint="No phases yet. Open “Edit phase timeline” below or use Product → Planning."
                                />
                                <button
                                    type="button"
                                    onClick={() => openSurface('phases')}
                                    className="mt-4 w-full rounded-lg border border-white/[0.08] bg-zinc-800/50 px-3 py-2.5 text-center text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800/80"
                                >
                                    Open full phase editor
                                </button>
                            </DeskRevealSection>

                            <DeskRevealSection
                                title="Key dates & milestones"
                                subtitle="Suite calendar entries for this venture. Add below or open the full schedule workspace."
                                badge={
                                    events.length > 0 ? (
                                        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium tabular-nums text-zinc-400">
                                            {events.length} dated
                                        </span>
                                    ) : null
                                }
                            >
                                <div className="grid gap-2 rounded-lg border border-white/[0.06] bg-zinc-950/30 p-3 sm:grid-cols-2">
                                    <input
                                        value={calTitle}
                                        onChange={(e) => setCalTitle(e.target.value)}
                                        placeholder="Title"
                                        className="rounded border border-zinc-700 bg-zinc-900/80 px-2 py-2 text-sm text-zinc-200 sm:col-span-2"
                                    />
                                    <input
                                        type="datetime-local"
                                        value={calDate}
                                        onChange={(e) => setCalDate(e.target.value)}
                                        className="rounded border border-zinc-700 bg-zinc-900/80 px-2 py-2 text-sm text-zinc-200"
                                    />
                                    <select
                                        value={calType}
                                        onChange={(e) => setCalType(e.target.value as ProjectEvent['type'])}
                                        className="rounded border border-zinc-700 bg-zinc-900/80 px-2 py-2 text-sm text-zinc-300"
                                    >
                                        <option value="milestone">Milestone</option>
                                        <option value="meeting">Meeting</option>
                                        <option value="deadline">Deadline</option>
                                        <option value="launch">Launch</option>
                                        <option value="task">Task</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={addCalendarRow}
                                        className="rounded-lg border border-zinc-600 bg-zinc-800 py-2 text-xs font-semibold text-zinc-100 sm:col-span-2"
                                    >
                                        Add to calendar
                                    </button>
                                </div>
                                {events.length === 0 ? (
                                    <p className="mt-3 text-xs text-zinc-600">No dated entries yet.</p>
                                ) : (
                                    <ul className="mt-3 space-y-2">
                                        {events.slice(0, 24).map((ev) => (
                                            <li
                                                key={ev.id}
                                                className="rounded-md border border-white/[0.06] bg-zinc-900/30 px-2.5 py-2"
                                            >
                                                <p className="text-xs text-zinc-200">{ev.title}</p>
                                                <p className="mt-0.5 text-[10px] text-zinc-500">
                                                    {new Date(ev.date).toLocaleString(undefined, { dateStyle: 'medium' })}
                                                    {ev.type ? ` · ${ev.type}` : ''}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <button
                                    type="button"
                                    onClick={openScheduleSurface}
                                    className="mt-4 w-full rounded-md border border-white/[0.06] bg-zinc-800/35 px-2 py-2 text-xs font-normal text-zinc-300 transition hover:bg-zinc-800/55"
                                >
                                    Open full schedule workspace
                                </button>
                            </DeskRevealSection>

                            <DeskRevealSection
                                title="Executive priorities"
                                subtitle="Checklist stored with strategy. Expand to add or tick items."
                                badge={
                                    (doc.priorities || []).length > 0 ? (
                                        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium tabular-nums text-zinc-400">
                                            {(doc.priorities || []).filter((p) => !p.done).length} open
                                        </span>
                                    ) : null
                                }
                            >
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        value={newPriority}
                                        onChange={(e) => setNewPriority(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPriority())}
                                        placeholder="Add a priority…"
                                        className="min-w-[12rem] flex-1 rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={addPriority}
                                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100"
                                    >
                                        <Plus className="h-3.5 w-3.5" aria-hidden />
                                        Add
                                    </button>
                                </div>
                                {(doc.priorities || []).length === 0 ? (
                                    <p className="mt-3 text-xs text-zinc-600">No priorities yet.</p>
                                ) : (
                                    <ul className="mt-3 space-y-2">
                                        {(doc.priorities || []).map((pr) => (
                                            <li
                                                key={pr.id}
                                                className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={pr.done}
                                                    onChange={() => togglePriority(pr.id)}
                                                    className="mt-1"
                                                    aria-label={pr.done ? `Mark not done: ${pr.title}` : `Mark done: ${pr.title}`}
                                                />
                                                <span className={`min-w-0 flex-1 text-sm ${pr.done ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                                                    {pr.title}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removePriority(pr.id)}
                                                    className="shrink-0 text-zinc-500 hover:text-rose-400"
                                                    aria-label={`Remove ${pr.title}`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <button
                                    type="button"
                                    onClick={() => openSurface('priorities')}
                                    className="mt-3 text-[10px] font-semibold text-zinc-500 hover:text-zinc-300"
                                >
                                    Open priorities in full-page view →
                                </button>
                            </DeskRevealSection>

                            <DeskRevealSection
                                title="More on this desk"
                                subtitle="Narrative, flow canvas, team, schedule — each opens in a focused view."
                            >
                                <ul className="grid gap-2.5 sm:gap-3">
                                    {planningSurfaceItems.map((item) => {
                                        const isFlow = item.id === 'flow';
                                        return (
                                            <li key={item.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => openSurface(item.id)}
                                                    className="group flex w-full items-start gap-3 rounded-lg border border-white/[0.06] bg-zinc-900/20 p-3.5 text-left transition hover:border-white/[0.1] hover:bg-zinc-900/35 sm:p-4"
                                                >
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400 transition group-hover:text-zinc-200 sm:h-10 sm:w-10 sm:rounded-xl">
                                                        {modeIcon(item.id)}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                                                        <span className="mt-0.5 block text-xs text-zinc-500">{item.sub}</span>
                                                        {isFlow ? (
                                                            <span className="mt-2 flex flex-wrap items-center gap-2">
                                                                <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-medium tabular-nums text-zinc-400">
                                                                    {flowStats.steps} step{flowStats.steps === 1 ? '' : 's'} · {flowStats.links}{' '}
                                                                    link{flowStats.links === 1 ? '' : 's'}
                                                                </span>
                                                                <span className="text-[10px] text-zinc-600">Live · Product → Planning</span>
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </DeskRevealSection>

                            <div className="flex flex-wrap gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => persist(doc)}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-700"
                                >
                                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Save strategy
                                </button>
                            </div>
                        </div>
                </div>
            ) : (
                <>
                    {surfaceToolbar}
                    <div className="flex min-h-[70vh] flex-1 flex-col sm:min-h-[75vh]">
                        {tool === 'narrative' && (
                            <section className="flex flex-col gap-3 bg-brand-bg p-4 sm:p-6">
                                <p className="shrink-0 text-xs text-zinc-500">
                                    Full strategic thesis — north star, where you play, how you win, and what is explicitly out of scope. Saves when you
                                    leave this field (or use Save above).
                                </p>
                                <textarea
                                    value={doc.content}
                                    onChange={(e) => setDoc({ ...doc, content: e.target.value })}
                                    onBlur={(e) => persist({ ...doc, content: e.target.value })}
                                    placeholder="North star, where you play, how you win, and what is out of scope…"
                                    className="min-h-[min(70vh,36rem)] w-full rounded-xl border border-brand-border bg-brand-card p-4 text-[15px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                                />
                            </section>
                        )}

                        {tool === 'flow' && (
                            <section className="flex w-full flex-col bg-[var(--bg)]">
                                <div className="shrink-0 border-b border-white/[0.05] px-4 py-2.5 sm:px-6">
                                    <div className="flex flex-wrap items-end justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-normal text-[var(--text)]">Strategy flow</h3>
                                            <p className="mt-1 max-w-xl text-xs font-normal leading-relaxed text-[var(--muted)]">
                                                Add steps, drag to arrange, and link between boxes. Drag the mid-line dot to bend. Saved with your
                                                strategy — the Product desk shows a read-only mirror under Planning.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                                            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 tabular-nums">{flow.nodes.length} steps</span>
                                            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 tabular-nums">{flow.edges.length} links</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex min-h-[55vh] flex-col px-4 pb-4 pt-3 sm:min-h-[60vh] sm:px-6">
                                    <StrategyFlowCanvas
                                        expanded
                                        fillHeight
                                        nodes={flow.nodes}
                                        edges={flow.edges}
                                        onChange={({ nodes, edges }) => persist({ ...doc, flow: { nodes, edges } })}
                                    />
                                </div>
                            </section>
                        )}

                        {tool === 'phases' && (
                            <section className="flex flex-col bg-brand-bg p-4 sm:p-6">
                                <p className="mb-4 max-w-prose text-xs leading-relaxed text-zinc-500">
                                    Edit phase titles, date ranges, status, and notes. Changes save with your venture strategy — the CEO overview
                                    shows a read-only timeline.
                                </p>
                                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/[0.06] bg-[#141416]">
                                    <TimelinePhaseSetter
                                        variant="page"
                                        projectName={activeProject.name}
                                        phases={phases}
                                        onPhasesChange={(next) => persist({ ...doc, phases: next })}
                                    />
                                </div>
                            </section>
                        )}

                        {tool === 'team' && (
                            <section className="mx-auto w-full max-w-4xl space-y-4 bg-brand-bg p-4 sm:p-6">
                                <p className="text-xs text-zinc-500">
                                    Assign roles for clarity. Thread is stored on this venture (single-device today; multi-user sync would use your
                                    org&apos;s identity layer later).
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        placeholder="Name"
                                        value={memberDraft.name}
                                        onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}
                                        className="min-w-[120px] flex-1 rounded border border-zinc-600 bg-zinc-900 px-2 py-2 text-sm"
                                    />
                                    <input
                                        placeholder="Role"
                                        value={memberDraft.role}
                                        onChange={(e) => setMemberDraft({ ...memberDraft, role: e.target.value })}
                                        className="min-w-[120px] flex-1 rounded border border-zinc-600 bg-zinc-900 px-2 py-2 text-sm"
                                    />
                                    <button type="button" onClick={addMember} className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold hover:bg-zinc-700">
                                        Add
                                    </button>
                                </div>
                                <ul className="flex flex-wrap gap-2">
                                    {team.members.map((m) => (
                                        <li key={m.id} className="rounded-md border border-brand-border bg-brand-input px-3 py-2 text-sm text-zinc-200">
                                            <span className="font-medium">{m.name}</span>
                                            <span className="text-zinc-500"> · {m.role}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 pb-8">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Group thread</p>
                                    <div className="mt-2 space-y-2 text-sm">
                                        {team.thread.length === 0 ? <p className="text-zinc-600">No messages yet.</p> : null}
                                        {team.thread.map((m) => (
                                            <div key={m.id} className="rounded border border-brand-border bg-brand-input px-2 py-1.5">
                                                <span className="text-[10px] text-zinc-500">
                                                    {m.author} · {new Date(m.ts).toLocaleString()}
                                                </span>
                                                <p className="text-zinc-300">{m.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <input
                                            value={chatLine}
                                            onChange={(e) => setChatLine(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), sendTeamMsg())}
                                            placeholder="Post an update…"
                                            className="flex-1 rounded border border-brand-border bg-brand-input px-2 py-2 text-sm"
                                        />
                                        <button type="button" onClick={sendTeamMsg} className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-semibold">
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {tool === 'schedule' && (
                            <section className="mx-auto w-full max-w-3xl space-y-4 bg-brand-bg p-4 sm:p-6">
                                <p className="text-xs text-zinc-500">Same timeline as the suite calendar—board meetings, launches, deadlines.</p>
                                <div className="grid gap-2 rounded-lg border border-zinc-700 bg-zinc-900 p-3 sm:grid-cols-2">
                                    <input
                                        value={calTitle}
                                        onChange={(e) => setCalTitle(e.target.value)}
                                        placeholder="Title"
                                        className="rounded border border-brand-border bg-brand-input px-2 py-2 text-sm sm:col-span-2"
                                    />
                                    <input type="datetime-local" value={calDate} onChange={(e) => setCalDate(e.target.value)} className="rounded border border-brand-border bg-brand-input px-2 py-2 text-sm" />
                                    <select value={calType} onChange={(e) => setCalType(e.target.value as ProjectEvent['type'])} className="rounded border border-brand-border bg-brand-input px-2 py-2 text-sm">
                                        <option value="milestone">Milestone</option>
                                        <option value="meeting">Meeting</option>
                                        <option value="deadline">Deadline</option>
                                        <option value="launch">Launch</option>
                                        <option value="task">Task</option>
                                    </select>
                                    <button type="button" onClick={addCalendarRow} className="rounded-lg border border-zinc-600 bg-zinc-800 py-2 text-sm sm:col-span-2">
                                        Add
                                    </button>
                                </div>
                                <ul className="space-y-2 pb-8">
                                    {events.map((ev) => (
                                        <li key={ev.id} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
                                            <span className="text-zinc-200">
                                                {ev.title} · {new Date(ev.date).toLocaleString()} · {ev.type}
                                            </span>
                                            <button type="button" onClick={() => removeEvent(ev.id)} className="text-xs text-rose-400">
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {tool === 'priorities' && (
                            <section className="mx-auto w-full max-w-3xl space-y-4 bg-brand-bg p-4 sm:p-6">
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        value={newPriority}
                                        onChange={(e) => setNewPriority(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPriority())}
                                        placeholder="Add priority…"
                                        className="min-w-[200px] flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
                                    />
                                    <button type="button" onClick={addPriority} className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold">
                                        <Plus className="inline h-4 w-4" /> Add
                                    </button>
                                </div>
                                <ul className="space-y-2 pb-8">
                                    {(doc.priorities || []).map((p) => (
                                        <li key={p.id} className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
                                            <input type="checkbox" checked={p.done} onChange={() => togglePriority(p.id)} className="mt-1" />
                                            <span className={`flex-1 text-sm ${p.done ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{p.title}</span>
                                            <button type="button" onClick={() => removePriority(p.id)} className="text-zinc-500 hover:text-rose-400">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                </>
            )}
                </div>
            </div>
        </>
    );
}
