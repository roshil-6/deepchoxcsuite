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

    if (!activeProject) {
        return <DeskEmpty>Select a venture to open the CEO desk.</DeskEmpty>;
    }

    const navItems: { id: ToolId; label: string; sub: string }[] = [
        { id: 'narrative', label: 'Strategy narrative', sub: 'Full thesis' },
        { id: 'flow', label: 'Visualise your plan', sub: 'Flow boxes & links' },
        { id: 'phases', label: 'Strategy time phases', sub: 'Horizon planning' },
        { id: 'team', label: 'Team workspace', sub: 'Roles & thread' },
        { id: 'schedule', label: 'Schedule & critical work', sub: 'Dates & tasks' },
        { id: 'priorities', label: 'Executive priorities', sub: 'Checklist' },
    ];

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
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-zinc-700 bg-zinc-900/40 px-6 py-3 sm:px-8">
            <button
                type="button"
                onClick={goHub}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-xs font-semibold text-zinc-100 hover:border-brand-teal/35 hover:bg-brand-bg"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
            </button>
            <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-zinc-100 sm:text-base">{activeNav.label}</h2>
                <p className="truncate text-[11px] text-zinc-500">{activeNav.sub}</p>
            </div>
            <button
                type="button"
                onClick={() => persist(doc)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-xs font-semibold text-[#0a0a0a] shadow-sm shadow-brand-teal/15 ${ceo.accentBg} ${ceo.accentBgHover}`}
            >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
            </button>
        </header>
    );

    return (
        <>
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-brand-bg">
            {deskView === 'hub' ? (
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-brand-bg">
                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                        <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-500" htmlFor="ceo-strategic-intent">
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
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-baseline justify-between gap-2 px-0.5">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Planning surfaces</p>
                                    <p className="text-[10px] text-zinc-600">Updates save to the venture · Product mirrors the flow</p>
                                </div>
                                <ul className="grid gap-3">
                                    {navItems.map((item) => {
                                        const isFlow = item.id === 'flow';
                                        return (
                                            <li key={item.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => openSurface(item.id)}
                                                    className="group flex w-full items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-left transition hover:border-white/[0.1] hover:bg-white/[0.05]"
                                                >
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 transition group-hover:text-zinc-200">
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
                                                                <span className="text-[10px] text-zinc-600">Live · same graph in Product → Planning</span>
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="flex flex-wrap gap-3 pt-1 pb-8">
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
                </div>
            ) : (
                <>
                    {surfaceToolbar}
                    <div className="flex min-h-0 min-h-[70vh] flex-1 flex-col overflow-hidden sm:min-h-[75vh]">
                        {tool === 'narrative' && (
                            <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-brand-bg p-4 sm:p-6">
                                <p className="shrink-0 text-xs text-zinc-500">
                                    Full strategic thesis — north star, where you play, how you win, and what is explicitly out of scope.
                                </p>
                                <textarea
                                    value={doc.content}
                                    onChange={(e) => setDoc({ ...doc, content: e.target.value })}
                                    placeholder="North star, where you play, how you win, and what is out of scope…"
                                    className="min-h-0 w-full flex-1 rounded-xl border border-brand-border bg-brand-card p-4 text-[15px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                                />
                            </section>
                        )}

                        {tool === 'flow' && (
                            <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg)]">
                                <div className="shrink-0 border-b border-[var(--border)] px-4 py-3 sm:px-6">
                                    <div className="flex flex-wrap items-end justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-medium text-[var(--text)]">Strategy flow</h3>
                                            <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
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
                                <div className="flex min-h-0 min-h-[55vh] flex-1 flex-col px-4 pb-4 pt-3 sm:min-h-[60vh] sm:px-6">
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
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                <TimelinePhaseSetter
                                    projectName={activeProject.name}
                                    phases={phases}
                                    onPhasesChange={(next) => persist({ ...doc, phases: next })}
                                />
                            </div>
                        )}

                        {tool === 'team' && (
                            <section className="custom-scrollbar mx-auto w-full max-w-4xl flex-1 space-y-4 overflow-y-auto bg-brand-bg p-4 sm:p-6">
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
                                    <div className="custom-scrollbar mt-2 max-h-48 space-y-2 overflow-y-auto text-sm">
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
                            <section className="custom-scrollbar mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto bg-brand-bg p-4 sm:p-6">
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
                            <section className="custom-scrollbar mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto bg-brand-bg p-4 sm:p-6">
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
        </>
    );
}
