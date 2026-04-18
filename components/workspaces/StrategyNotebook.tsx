'use client';

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
    Eraser,
} from 'lucide-react';
import type { ProjectEvent } from '@/lib/db';
import type { StrategyDoc } from '@/lib/strategyDoc';
import { parseStrategy, serializeStrategy } from '@/lib/strategyDoc';
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
import { ModelAttribution } from '@/components/ModelAttribution';
import { PA_BUDDY_NAME } from '@/lib/paBuddy';
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
    const {
        activeProject,
        updateStrategy,
        addEvent,
        updateProjectField,
        setDeskSectionFocus,
        executiveThread,
        clearExecutiveThread,
        switchRoom,
    } = useOffice();
    const [focusKey, setFocusKey] = useState<StrategyFocusKey | null>(null);
    const [doc, setDoc] = useState<StrategyDoc>({ content: '', priorities: [] });
    const [isSaving, setIsSaving] = useState(false);
    const [newPriority, setNewPriority] = useState('');
    const [calTitle, setCalTitle] = useState('');
    const [calDate, setCalDate] = useState('');
    const [calType, setCalType] = useState<ProjectEvent['type']>('milestone');
    const [memberDraft, setMemberDraft] = useState({ name: '', role: '' });
    const [chatLine, setChatLine] = useState('');
    const narrativeTextareaRef = useRef<HTMLTextAreaElement>(null);
    const narrativeThreadEndRef = useRef<HTMLDivElement>(null);
    const updateStrategyRef = useRef(updateStrategy);
    updateStrategyRef.current = updateStrategy;

    const syncNarrativeTextareaHeight = useCallback(() => {
        const el = narrativeTextareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const minPx = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.32) : 280;
        el.style.height = `${Math.max(minPx, el.scrollHeight)}px`;
    }, []);

    useLayoutEffect(() => {
        if (focusKey !== 'narrative') return;
        syncNarrativeTextareaHeight();
    }, [focusKey, doc.content, syncNarrativeTextareaHeight]);

    useEffect(() => {
        if (focusKey !== 'narrative') return;
        const onResize = () => syncNarrativeTextareaHeight();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [focusKey, syncNarrativeTextareaHeight]);

    const lastExecMsgId = executiveThread[executiveThread.length - 1]?.id;
    useEffect(() => {
        if (focusKey !== 'narrative' || !lastExecMsgId) return;
        narrativeThreadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [focusKey, lastExecMsgId]);

    const strategySyncKey = activeProject?.id ?? null;
    const strategyRaw = activeProject?.strategy ?? '';
    const activeProjectRef = useRef(activeProject);
    activeProjectRef.current = activeProject;

    const loadFromProject = useCallback(() => {
        const ap = activeProjectRef.current;
        if (!ap) return;
        setDoc(parseStrategy(ap.strategy || ''));
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
    const hasClearPlanIntent = useMemo(() => {
        const strategicIntent = doc.strategicIntent?.trim() ?? '';
        const vision = doc.vision?.trim() ?? '';
        const narrative = doc.content?.trim() ?? '';
        const meaningfulNarrative = narrative.length >= 120;
        return strategicIntent.length >= 12 && (vision.length >= 12 || meaningfulNarrative);
    }, [doc.strategicIntent, doc.vision, doc.content]);

    const goHub = () => {
        setDeskSectionFocus(null);
        setFocusKey(null);
    };

    const openPlanMap = () => {
        if (!hasClearPlanIntent) {
            openFocusKey('strategic_intent');
            return;
        }
        openFocusKey('flow');
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

    const toolbarSaveClass = `inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.1] px-2 py-1 text-[11px] font-medium text-[#0a0a0a] ${ceo.accentBg} ${ceo.accentBgHover}`;

    const focusToolbar =
        meta && focusKey && focusKey !== 'flow' ? (
            <DeskFocusToolbar
                layout={focusKey === 'narrative' ? 'compact' : 'default'}
                onBack={goHub}
                title={meta.title}
                onSave={() => persist(doc)}
                saving={isSaving}
                saveClassName={toolbarSaveClass}
            />
        ) : null;

    useEffect(() => {
        if (focusKey !== 'flow') return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [focusKey]);

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
                    <label className="block w-full min-w-0">
                        <span className="sr-only">Strategy narrative — full thesis</span>
                        <textarea
                            ref={narrativeTextareaRef}
                            value={doc.content}
                            onChange={(e) => setDoc({ ...doc, content: e.target.value })}
                            onBlur={(e) => persist({ ...doc, content: e.target.value })}
                            placeholder="North star, where you play, how you win, and what is out of scope…"
                            className="w-full resize-none overflow-hidden border-0 bg-transparent py-1 text-[16px] leading-[1.75] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                        />
                    </label>
                );
            case 'flow':
                if (!hasClearPlanIntent) {
                    return (
                        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-[#141416] p-5 shadow-[0_0_48px_-12px_rgba(139,92,246,0.28),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                            <div
                                className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[min(100%,28rem)] -translate-x-1/2 rounded-full bg-violet-500/25 blur-3xl"
                                aria-hidden
                            />
                            <div className="relative">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300/80">
                                Plan map locked for now
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-zinc-100">
                                Hold off on mapping steps until the intent is clear.
                            </h3>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                                Dexo should not invent a generic discovery-to-scale plan. First confirm what this venture is trying to achieve,
                                what problem it is actually solving, and the shape of the plan with the founder.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => openFocusKey('strategic_intent')}
                                    className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-700"
                                >
                                    Set strategic intent
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchRoom('dexo')}
                                    className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/15"
                                >
                                    Discuss with Dexo
                                </button>
                            </div>
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="flex min-h-0 w-full flex-1 flex-col">
                        <StrategyFlowCanvas
                            expanded
                            fillHeight
                            edgeToEdge
                            nodes={flow.nodes}
                            edges={flow.edges}
                            onChange={({ nodes, edges }) => persist({ ...doc, flow: { nodes, edges } })}
                        />
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

    /** Above app chrome (Dexo orb ~10049); true viewport overlay, not clipped by desk panels */
    const flowFullScreenPortal =
        focusKey === 'flow' && meta && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      className="fixed inset-0 z-[12000] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col overflow-hidden bg-[#0A0A0B]"
                      role="dialog"
                      aria-modal="true"
                      aria-label={`${meta.title} — full screen plan map`}
                  >
                      <div
                          className="pointer-events-none absolute inset-0 opacity-[0.18]"
                          style={{
                              backgroundImage:
                                  'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                              backgroundSize: '40px 40px',
                          }}
                          aria-hidden
                      />
                      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
                          <DeskFocusToolbar
                              onBack={goHub}
                              title={meta.title}
                              hint="Full viewport map — sits above the desk shell. Back returns to Strategy hub."
                              onSave={() => persist(doc)}
                              saving={isSaving}
                              saveClassName={toolbarSaveClass}
                          />
                          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
                              {renderFocusBody('flow')}
                          </div>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    return (
        <>
            {flowFullScreenPortal}
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-[var(--color-brand-bg)]">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-brand-bg)]">
                    {focusKey && meta && focusKey !== 'flow' ? (
                        focusKey === 'narrative' ? (
                            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
                                {focusToolbar}
                                <div className="px-4 pb-10 pt-2 sm:px-6 sm:pb-12">
                                    <h2 className="text-[20px] font-semibold tracking-tight text-[var(--text-primary)] sm:text-[21px]">
                                        {meta.title}
                                    </h2>
                                    <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--text-secondary)]">
                                        {meta.question}
                                    </p>
                                    <div className="mt-8">{renderFocusBody('narrative')}</div>
                                    <section className="mt-14" aria-label="Venture conversation">
                                        <div className="flex flex-wrap items-end justify-between gap-2">
                                            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                                Replies
                                            </h3>
                                            {executiveThread.length > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => clearExecutiveThread()}
                                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                                                >
                                                    <Eraser className="h-3 w-3" aria-hidden />
                                                    Clear
                                                </button>
                                            ) : null}
                                        </div>
                                        {executiveThread.length === 0 ? (
                                            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--text-secondary)]">
                                                Use the message bar below — answers stay on this page with your narrative, not in a separate thread
                                                panel.
                                            </p>
                                        ) : (
                                            <div className="mt-6 space-y-8">
                                                {executiveThread.map((m) => (
                                                    <div key={m.id} className="max-w-none">
                                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                                            {m.role === 'user'
                                                                ? 'You'
                                                                : m.channel === 'pa'
                                                                  ? PA_BUDDY_NAME
                                                                  : 'Assistant'}
                                                        </p>
                                                        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-[1.75] text-[var(--text-primary)]">
                                                            {m.content}
                                                        </p>
                                                        {m.role === 'assistant' && m.model ? (
                                                            <div className="mt-2 opacity-80">
                                                                <ModelAttribution model={m.model} />
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                                <div ref={narrativeThreadEndRef} />
                                            </div>
                                        )}
                                    </section>
                                </div>
                            </div>
                        ) : (
                            <>
                                {focusToolbar}
                                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                    <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-3 pb-28 sm:space-y-4 sm:px-5 sm:pb-32">
                                        <div className="space-y-3">
                                            <DeskMsgUser>
                                                <p className="text-[13px] font-semibold text-zinc-50">{meta.title}</p>
                                                <p className="mt-1 text-[12px] leading-relaxed text-zinc-300">{meta.question}</p>
                                            </DeskMsgUser>
                                            <DeskMsgAssistant>{renderFocusBody(focusKey)}</DeskMsgAssistant>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    ) : !focusKey ? (
                        <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-[var(--color-brand-bg)]">
                            <div className="space-y-2 px-4 py-3 pb-28 sm:px-5 sm:py-4 sm:pb-32">
                                <p className="text-[10px] leading-snug text-zinc-500">
                                    Tap a block — other sections hide while you work. The bar below chats in context of the open block until you
                                    press Back.
                                </p>

                                {activeProject?.agentStaffSnapshot?.desks?.ceo?.trim() ? (
                                    <div className="rounded-2xl border border-emerald-500/30 bg-zinc-950/95 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400/95">
                                            What ran on this desk · last staff sync
                                        </p>
                                        <p className="mt-1 text-[11px] text-zinc-500">
                                            {new Date(activeProject.agentStaffSnapshot.at).toLocaleString(undefined, {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}
                                        </p>
                                        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-white/[0.1] bg-zinc-950/90 px-3 py-2.5 shadow-inner">
                                            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-200">
                                                {activeProject.agentStaffSnapshot.desks.ceo.trim()}
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

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

                                <div
                                    onClick={openPlanMap}
                                    className="group relative w-full cursor-pointer overflow-hidden rounded-3xl border border-violet-500/25 bg-[#121216] px-5 py-6 text-left shadow-[0_18px_54px_-24px_rgba(0,0,0,0.72),0_0_56px_-8px_rgba(139,92,246,0.32),inset_0_1px_0_0_rgba(255,255,255,0.05)] transition duration-300 hover:border-violet-400/45 hover:shadow-[0_22px_60px_-20px_rgba(0,0,0,0.75),0_0_72px_-4px_rgba(167,139,250,0.42)] sm:px-6 sm:py-7"
                                >
                                    <div
                                        className="pointer-events-none absolute -top-1/2 left-1/2 h-[min(140%,28rem)] w-[min(120%,42rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.35)_0%,rgba(99,102,241,0.12)_35%,transparent_70%)] opacity-90 blur-2xl transition duration-500 group-hover:opacity-100"
                                        aria-hidden
                                    />
                                    <div
                                        className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(167,139,250,0.14),transparent_52%)]"
                                        aria-hidden
                                    />
                                    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
                                                Strategy map
                                            </p>
                                            <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
                                                Visualise your plan
                                            </h3>
                                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
                                                {hasClearPlanIntent
                                                    ? flowStats.steps > 0
                                                        ? 'Shape the sequence and dependencies you have actually agreed with the founder. This map stays linked to Product → Planning.'
                                                        : 'Your intent is clear enough to map the real plan now. Start adding the actual steps and dependencies you want Dexo to reason over.'
                                                    : 'This stays blank until the venture intent is clear. No generic validate / MVP / launch filler gets created for you.'}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/22 bg-violet-500/[0.08]">
                                                <GitBranch className="h-6 w-6 text-violet-200" aria-hidden />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-medium text-zinc-200">
                                                    {hasClearPlanIntent ? `${flowStats.steps} steps · ${flowStats.links} links` : 'Waiting for confirmed intent'}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-zinc-500">
                                                    {hasClearPlanIntent ? 'Open the map when you are ready to structure it.' : 'Start with strategy intent, then discuss the plan.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative mt-5 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openPlanMap();
                                            }}
                                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                                hasClearPlanIntent
                                                    ? 'border border-violet-500/30 bg-violet-500/[0.12] text-violet-100 hover:bg-violet-500/[0.18]'
                                                    : 'border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                                            }`}
                                        >
                                            {hasClearPlanIntent ? 'Open plan map' : 'Set intent first'}
                                        </button>
                                        {!hasClearPlanIntent ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    switchRoom('dexo');
                                                }}
                                                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800"
                                            >
                                                Discuss with Dexo
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                <p className="pt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">More on this desk</p>
                                <ul className="grid gap-1.5 sm:gap-2">
                                    {navItems
                                        .filter((item) => item.id !== 'flow')
                                        .map((item) => {
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
                    ) : null}
                </div>
            </div>
        </>
    );
}
