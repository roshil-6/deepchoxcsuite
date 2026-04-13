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
} from 'lucide-react';
import type { ProjectEvent } from '@/lib/db';
import type { StrategyDoc } from '@/lib/strategyDoc';
import { parseStrategy, serializeStrategy } from '@/lib/strategyDoc';
import { enrichLegacyStrategyDoc, needsTimelineAndFlowBootstrap } from '@/lib/defaultStrategyTimeline';
import { ceo } from '@/lib/ceoTheme';
import { StrategyFlowCanvas } from '@/components/workspaces/StrategyFlowCanvas';
import { TimelinePhaseSetter } from '@/components/workspaces/TimelinePhaseSetter';
import { TimelinePhaseReadOnly } from '@/components/workspaces/TimelinePhaseReadOnly';
import { DeskEmpty } from '@/components/workspaces/DeskShell';
import {
    DeskMsgUser,
    DeskMsgAssistant,
    DeskHubRow,
    DeskFocusToolbar,
} from '@/components/workspaces/DeskBlockFocusUI';
import { GuideHint } from '@/components/ui/ContextualGuide';

type ToolId = 'narrative' | 'flow' | 'phases' | 'team' | 'schedule' | 'priorities';

export type StrategyFocusKey =
    | 'strategic_intent'
    | 'vision'
    | 'phase_timeline'
    | 'key_dates'
    | 'executive_priorities'
    | 'narrative'
    | 'flow'
    | 'phases'
    | 'team'
    | 'schedule';

const FOCUS_META: Record<StrategyFocusKey, { title: string; question: string }> = {
    strategic_intent: {
        title: 'Strategic intent',
        question: 'What does winning look like for this venture in one or two lines?',
    },
    vision: {
        title: 'Vision / north star',
        question: 'What is your 12–36 month picture — where is this venture headed?',
    },
    phase_timeline: {
        title: 'Phase timeline',
        question: 'How are you sequencing work across phases? (Read-only summary here; edit horizons in the full editor.)',
    },
    key_dates: {
        title: 'Key dates & milestones',
        question: 'What dated commitments and milestones matter for this venture?',
    },
    executive_priorities: {
        title: 'Executive priorities',
        question: 'What are the top open priorities you are driving right now?',
    },
    narrative: {
        title: 'Strategy narrative',
        question: 'What is the full thesis — where you play, how you win, and what is out of scope?',
    },
    flow: {
        title: 'Visualise your plan',
        question: 'How do steps and dependencies flow from idea to outcome?',
    },
    phases: {
        title: 'Edit phase timeline',
        question: 'What are the horizons, dates, status, and notes for each phase?',
    },
    team: {
        title: 'Team workspace',
        question: 'Who is on the core team and what are you discussing in the thread?',
    },
    schedule: {
        title: 'Schedule & critical work',
        question: 'What board meetings, launches, deadlines, and tasks are on the calendar?',
    },
};

export function StrategyNotebook() {
    const { activeProject, updateStrategy, addEvent, updateProjectField, setDeskSectionFocus } = useOffice();
    const [focusKey, setFocusKey] = useState<StrategyFocusKey | null>(null);
    const [doc, setDoc] = useState<StrategyDoc>({ content: '', priorities: [] });
    const [isSaving, setIsSaving] = useState(false);
    const [newPriority, setNewPriority] = useState('');
    const [calTitle, setCalTitle] = useState('');
    const [calDate, setCalDate] = useState('');
    const [calType, setCalType] = useState<ProjectEvent['type']>('milestone');
    const [memberDraft, setMemberDraft] = useState({ name: '', role: '' });
    const [chatLine, setChatLine] = useState('');
    const timelineBootstrapRef = useRef<Set<number>>(new Set());
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
        if (id != null && needsTimelineAndFlowBootstrap(parsed) && !timelineBootstrapRef.current.has(id)) {
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
        setFocusKey(null);
        setDeskSectionFocus(null);
    }, [activeProject?.id, setDeskSectionFocus]);

    const openFocusKey = (key: StrategyFocusKey) => {
        const m = FOCUS_META[key];
        setDeskSectionFocus({ room: 'ceo', sectionId: key, title: m.title, prompt: m.question });
        setFocusKey(key);
    };

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

    const goHub = () => {
        setDeskSectionFocus(null);
        setFocusKey(null);
    };

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
        return <DeskEmpty>Select a venture to open Research strategy and direction.</DeskEmpty>;
    }

    const navItems: { id: ToolId; label: string; sub: string }[] = [
        { id: 'narrative', label: 'Strategy narrative', sub: 'Full thesis' },
        { id: 'flow', label: 'Visualise your plan', sub: 'Flow boxes & links' },
        { id: 'phases', label: 'Edit phase timeline', sub: 'Horizons, dates & notes' },
        { id: 'team', label: 'Team workspace', sub: 'Roles & thread' },
        { id: 'schedule', label: 'Schedule & critical work', sub: 'Dates & tasks' },
    ];

    const modeIcon = (id: ToolId) => {
        const c = 'h-4 w-4 shrink-0 sm:h-5 sm:w-5';
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

    const meta = focusKey ? FOCUS_META[focusKey] : null;

    const focusToolbar = meta ? (
        <DeskFocusToolbar
            onBack={goHub}
            title={meta.title}
            onSave={() => persist(doc)}
            saving={isSaving}
            saveClassName={`inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.1] px-2 py-1 text-[11px] font-medium text-[#0a0a0a] ${ceo.accentBg} ${ceo.accentBgHover}`}
        />
    ) : null;

    const renderFocusBody = (key: StrategyFocusKey) => {
        switch (key) {
            case 'strategic_intent':
                return (
                    <>
                        <label className="sr-only" htmlFor="ceo-strategic-intent-f">
                            Strategic intent
                        </label>
                        <textarea
                            id="ceo-strategic-intent-f"
                            value={doc.strategicIntent ?? ''}
                            onChange={(e) => setDoc({ ...doc, strategicIntent: e.target.value })}
                            onBlur={(e) => persist({ ...doc, strategicIntent: e.target.value })}
                            placeholder={intentPinned}
                            rows={5}
                            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2.5 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
                        />
                    </>
                );
            case 'vision':
                return (
                    <>
                        <label className="sr-only" htmlFor="ceo-vision-f">
                            Vision
                        </label>
                        <textarea
                            id="ceo-vision-f"
                            value={doc.vision ?? ''}
                            onChange={(e) => setDoc({ ...doc, vision: e.target.value })}
                            onBlur={(e) => persist({ ...doc, vision: e.target.value })}
                            placeholder="Longer-horizon picture — where this venture is headed in 12–36 months."
                            rows={5}
                            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2.5 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
                        />
                    </>
                );
            case 'phase_timeline':
                return (
                    <>
                        <TimelinePhaseReadOnly
                            phases={phases}
                            emptyHint="No phases yet. Open the full phase editor below or use Product → Planning."
                        />
                        <button
                            type="button"
                            onClick={() => openFocusKey('phases')}
                            className="mt-3 w-full rounded-lg border border-white/[0.08] bg-zinc-800/50 px-3 py-2 text-center text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800/80"
                        >
                            Open full phase editor
                        </button>
                    </>
                );
            case 'key_dates':
                return (
                    <>
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
                            <p className="mt-2 text-xs text-zinc-600">No dated entries yet.</p>
                        ) : (
                            <ul className="mt-2 space-y-2">
                                {events.slice(0, 24).map((ev) => (
                                    <li key={ev.id} className="rounded-md border border-white/[0.06] bg-zinc-900/30 px-2.5 py-2">
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
                            onClick={() => openFocusKey('schedule')}
                            className="mt-3 w-full rounded-md border border-white/[0.06] bg-zinc-800/35 px-3 py-2 text-xs font-normal text-zinc-300 transition hover:bg-zinc-800/55"
                        >
                            Open full schedule workspace
                        </button>
                    </>
                );
            case 'executive_priorities':
                return (
                    <>
                        <div className="flex flex-wrap gap-2">
                            <input
                                value={newPriority}
                                onChange={(e) => setNewPriority(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPriority())}
                                placeholder="Add a priority…"
                                className="min-w-[10rem] flex-1 rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200"
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
                            <p className="mt-2 text-xs text-zinc-600">No priorities yet.</p>
                        ) : (
                            <ul className="mt-2 space-y-2">
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
                                        <span
                                            className={`min-w-0 flex-1 text-sm ${pr.done ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}
                                        >
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
                    </>
                );
            case 'narrative':
                return (
                    <textarea
                        value={doc.content}
                        onChange={(e) => setDoc({ ...doc, content: e.target.value })}
                        onBlur={(e) => persist({ ...doc, content: e.target.value })}
                        placeholder="North star, where you play, how you win, and what is out of scope…"
                        className="min-h-[min(55vh,28rem)] w-full rounded-lg border border-brand-border bg-brand-card p-3 text-[15px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                    />
                );
            case 'flow':
                return (
                    <div className="flex min-h-[50vh] flex-col">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 tabular-nums">{flow.nodes.length} steps</span>
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 tabular-nums">{flow.edges.length} links</span>
                        </div>
                        <div className="min-h-[45vh] flex-1">
                            <StrategyFlowCanvas
                                expanded
                                fillHeight
                                nodes={flow.nodes}
                                edges={flow.edges}
                                onChange={({ nodes, edges }) => persist({ ...doc, flow: { nodes, edges } })}
                            />
                        </div>
                    </div>
                );
            case 'phases':
                return (
                    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-white/[0.06] bg-[#141416]">
                        <TimelinePhaseSetter
                            variant="page"
                            projectName={activeProject.name}
                            phases={phases}
                            onPhasesChange={(next) => persist({ ...doc, phases: next })}
                        />
                    </div>
                );
            case 'team':
                return (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <input
                                placeholder="Name"
                                value={memberDraft.name}
                                onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}
                                className="min-w-[100px] flex-1 rounded border border-zinc-600 bg-zinc-900 px-2 py-2 text-sm"
                            />
                            <input
                                placeholder="Role"
                                value={memberDraft.role}
                                onChange={(e) => setMemberDraft({ ...memberDraft, role: e.target.value })}
                                className="min-w-[100px] flex-1 rounded border border-zinc-600 bg-zinc-900 px-2 py-2 text-sm"
                            />
                            <button
                                type="button"
                                onClick={addMember}
                                className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-semibold hover:bg-zinc-700"
                            >
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
                        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Group thread</p>
                            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto text-sm">
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
                                <button
                                    type="button"
                                    onClick={sendTeamMsg}
                                    className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-semibold"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'schedule':
                return (
                    <div className="space-y-3">
                        <div className="grid gap-2 rounded-lg border border-zinc-700 bg-zinc-900 p-3 sm:grid-cols-2">
                            <input
                                value={calTitle}
                                onChange={(e) => setCalTitle(e.target.value)}
                                placeholder="Title"
                                className="rounded border border-brand-border bg-brand-input px-2 py-2 text-sm sm:col-span-2"
                            />
                            <input
                                type="datetime-local"
                                value={calDate}
                                onChange={(e) => setCalDate(e.target.value)}
                                className="rounded border border-brand-border bg-brand-input px-2 py-2 text-sm"
                            />
                            <select
                                value={calType}
                                onChange={(e) => setCalType(e.target.value as ProjectEvent['type'])}
                                className="rounded border border-brand-border bg-brand-input px-2 py-2 text-sm"
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
                                className="rounded-lg border border-zinc-600 bg-zinc-800 py-2 text-sm sm:col-span-2"
                            >
                                Add
                            </button>
                        </div>
                        <ul className="space-y-2">
                            {events.map((ev) => (
                                <li
                                    key={ev.id}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                                >
                                    <span className="text-zinc-200">
                                        {ev.title} · {new Date(ev.date).toLocaleString()} · {ev.type}
                                    </span>
                                    <button type="button" onClick={() => removeEvent(ev.id)} className="text-xs text-rose-400">
                                        Remove
                                    </button>
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
        <>
            <div className="flex w-full min-w-0 flex-col bg-[var(--color-brand-bg)]">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-brand-bg)]">
                    {focusKey && meta ? (
                        <>
                            {focusToolbar}
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-3 pb-28 sm:space-y-4 sm:px-5 sm:pb-32">
                                    <DeskMsgUser>
                                        <p className="text-[13px] font-semibold text-zinc-50">{meta.title}</p>
                                        <p className="mt-1 text-[12px] leading-relaxed text-zinc-300">{meta.question}</p>
                                    </DeskMsgUser>
                                    <DeskMsgAssistant>{renderFocusBody(focusKey)}</DeskMsgAssistant>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex w-full flex-col bg-[var(--color-brand-bg)]">
                            <div className="space-y-2 px-4 py-3 pb-28 sm:px-5 sm:py-4 sm:pb-32">
                                <p className="text-[10px] leading-snug text-zinc-500">
                                    Tap a block — other sections hide while you work. The bar below chats in context of the open block until you
                                    press Back.
                                </p>

                                <GuideHint
                                    id="ceo-no-intent"
                                    when={!doc.strategicIntent?.trim() && !doc.vision?.trim()}
                                    variant="tip"
                                    message='Start with "Strategic intent" — one or two lines on what winning looks like. Your AI team reads this on every sync to align all five desks.'
                                    action="Open Strategic intent"
                                    onAction={() => openFocusKey('strategic_intent')}
                                />

                                <div className="space-y-1.5 sm:space-y-2">
                                    <DeskHubRow
                                        title="Strategic intent"
                                        subtitle={
                                            doc.strategicIntent?.trim()
                                                ? 'One or two lines — what winning looks like. (Saved.)'
                                                : 'One or two lines — what winning looks like for this venture.'
                                        }
                                        onOpen={() => openFocusKey('strategic_intent')}
                                    />
                                    <DeskHubRow
                                        title="Vision / north star"
                                        subtitle="12–36 month picture. Saved when you leave the field."
                                        onOpen={() => openFocusKey('vision')}
                                    />
                                    <DeskHubRow
                                        title="Phase timeline"
                                        subtitle={`Read-only here (${phases.length} phase${phases.length === 1 ? '' : 's'}). Edit horizons in the full editor or Product → Planning.`}
                                        onOpen={() => openFocusKey('phase_timeline')}
                                    />
                                    <DeskHubRow
                                        title="Key dates & milestones"
                                        subtitle={
                                            events.length > 0
                                                ? `${events.length} dated · Suite calendar entries for this venture.`
                                                : 'Suite calendar entries for this venture.'
                                        }
                                        onOpen={() => openFocusKey('key_dates')}
                                    />
                                    <DeskHubRow
                                        title="Executive priorities"
                                        subtitle={
                                            (doc.priorities || []).length > 0
                                                ? `${(doc.priorities || []).filter((p) => !p.done).length} open · Checklist stored with strategy.`
                                                : 'Checklist stored with strategy.'
                                        }
                                        onOpen={() => openFocusKey('executive_priorities')}
                                    />
                                </div>

                                <p className="pt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">More on this desk</p>
                                <ul className="grid gap-1.5 sm:gap-2">
                                    {navItems.map((item) => {
                                        const isFlow = item.id === 'flow';
                                        const fk = item.id as StrategyFocusKey;
                                        return (
                                            <li key={item.id}>
                                                <DeskHubRow
                                                    title={item.label}
                                                    subtitle={item.sub}
                                                    onOpen={() => openFocusKey(fk)}
                                                    right={
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400 sm:h-9 sm:w-9">
                                                            {modeIcon(item.id)}
                                                        </span>
                                                    }
                                                />
                                                {isFlow ? (
                                                    <p className="mt-0.5 px-1 text-[9px] text-zinc-600">
                                                        {flowStats.steps} steps · {flowStats.links} links · live mirror under Product → Planning
                                                    </p>
                                                ) : null}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <div className="flex flex-wrap gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => persist(doc)}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-100 transition hover:bg-zinc-700"
                                    >
                                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                        Save strategy
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
