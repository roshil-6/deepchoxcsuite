'use client';

import React, { useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import { CalendarDays, Layers, ListChecks, MessageCircle, Sparkles, Video } from 'lucide-react';
import {
    LEADERSHIP_CHIPS,
    PAChatSurface,
    usePersonalAssistantChat,
} from '@/components/pa/PersonalAssistantChatContext';
import { RelayMeetingRoom } from '@/components/pa/RelayMeetingRoom';
import { PA_BUDDY_NAME, PA_BUDDY_ROLE, PA_BUDDY_TAGLINE } from '@/lib/paBuddy';

type RelayMode = 'chat' | 'meeting';

function PersonalAssistantLayout() {
    const { activeProject, switchRoom } = useOffice();
    const { sendMessage, requestExecutiveBriefing, loading } = usePersonalAssistantChat();
    const [relayMode, setRelayMode] = useState<RelayMode>('chat');

    const strategyDoc = parseStrategy(activeProject?.strategy || '');
    const priorities = strategyDoc.priorities || [];
    const phases = strategyDoc.phases || [];
    const priDone = priorities.filter((p) => p.done).length;
    const phaseDone = phases.filter((p) => p.status === 'done').length;
    const phaseActive = phases.filter((p) => p.status === 'in_progress').length;
    const events = activeProject?.events?.length ?? 0;

    const strategicLine =
        (strategyDoc.strategicIntent || strategyDoc.vision || strategyDoc.content || '').trim() || '';

    if (!activeProject) {
        return (
            <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 bg-brand-bg px-6 py-12 text-center">
                <p className="max-w-md text-sm text-brand-muted">Choose a venture first.</p>
                <button
                    type="button"
                    onClick={() => switchRoom('dashboard')}
                    className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-white/[0.07]"
                >
                    Open overview
                </button>
            </div>
        );
    }

    return (
        <div className="flex w-full min-w-0 flex-1 flex-col bg-brand-bg lg:flex-row">
            <aside className="hidden w-[300px] shrink-0 flex-col border-r border-brand-border/50 bg-gradient-to-b from-brand-panel/25 via-brand-bg to-brand-bg lg:flex">
                <div className="shrink-0 border-b border-brand-border/40 px-4 py-4">
                    <div className="border-l-2 border-zinc-500/50 pl-3">
                        <p className="text-[11px] font-semibold tracking-wide text-brand-text">{PA_BUDDY_NAME}</p>
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-brand-muted">{PA_BUDDY_ROLE}</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-brand-muted/95">{PA_BUDDY_TAGLINE}</p>
                    </div>
                </div>
                <div className="space-y-3 px-4 py-4">
                    <section
                        className="rounded-xl border border-brand-border/60 bg-brand-panel/35 p-3 shadow-sm"
                        aria-labelledby="relay-snapshot-heading"
                    >
                        <h2 id="relay-snapshot-heading" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
                            Venture at a glance
                        </h2>
                        <p className="mt-1 text-[10px] leading-snug text-brand-muted/80">
                            Live counts from this venture — not guesses from the model.
                        </p>
                        <dl className="mt-3 space-y-2.5">
                            <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] pb-2.5 last:border-0 last:pb-0">
                                <dt className="flex min-w-0 items-center gap-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-400">
                                        <ListChecks className="h-3.5 w-3.5" aria-hidden />
                                    </span>
                                    <span className="text-left">
                                        <span className="block text-[11px] font-medium text-brand-text">Priorities</span>
                                        <span className="block text-[9px] text-brand-muted/85">CEO checklist items</span>
                                    </span>
                                </dt>
                                <dd className="shrink-0 text-right">
                                    <span className="block font-mono text-sm tabular-nums text-brand-text">
                                        {priorities.length === 0 ? '—' : `${priDone} / ${priorities.length}`}
                                    </span>
                                    <span className="block text-[9px] text-brand-muted/75">
                                        {priorities.length === 0 ? 'None set' : 'done / total'}
                                    </span>
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] pb-2.5 last:border-0 last:pb-0">
                                <dt className="flex min-w-0 items-center gap-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300/90">
                                        <Layers className="h-3.5 w-3.5" aria-hidden />
                                    </span>
                                    <span className="text-left">
                                        <span className="block text-[11px] font-medium text-brand-text">Strategy phases</span>
                                        <span className="block text-[9px] text-brand-muted/85">Roadmap horizons</span>
                                    </span>
                                </dt>
                                <dd className="shrink-0 text-right">
                                    <span className="block font-mono text-sm tabular-nums text-brand-text">
                                        {phases.length === 0 ? '—' : `${phaseDone} / ${phases.length}`}
                                    </span>
                                    <span className="block text-[9px] text-brand-muted/75">
                                        {phases.length === 0
                                            ? 'None set'
                                            : phaseActive > 0
                                              ? `${phaseActive} in progress`
                                              : 'complete / total'}
                                    </span>
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="flex min-w-0 items-center gap-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-200/90">
                                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                                    </span>
                                    <span className="text-left">
                                        <span className="block text-[11px] font-medium text-brand-text">Calendar</span>
                                        <span className="block text-[9px] text-brand-muted/85">Timeline events</span>
                                    </span>
                                </dt>
                                <dd className="shrink-0 text-right">
                                    <span className="block font-mono text-sm tabular-nums text-brand-text">{events}</span>
                                    <span className="block text-[9px] text-brand-muted/75">events</span>
                                </dd>
                            </div>
                        </dl>
                        <p className="mt-3 border-t border-white/[0.06] pt-2.5 text-[9px] leading-snug text-brand-muted/75">
                            Edit priorities and phases on the <span className="text-brand-text/90">CEO</span> or{' '}
                            <span className="text-brand-text/90">Timeline</span> desk.
                        </p>
                    </section>

                    <section
                        className="rounded-xl border border-brand-border/60 bg-brand-panel/25 p-3"
                        aria-labelledby="relay-strategy-heading"
                    >
                        <h2 id="relay-strategy-heading" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
                            Strategic line
                        </h2>
                        <p className="mt-1 text-[10px] leading-snug text-brand-muted/80">
                            What you said you&apos;re building — pulled from strategy notes.
                        </p>
                        <p className="mt-2 line-clamp-5 text-[11px] leading-relaxed text-brand-text/90">
                            {strategicLine
                                ? `${strategicLine.slice(0, 320)}${strategicLine.length > 320 ? '…' : ''}`
                                : `Nothing here yet. Add strategic intent or vision on the CEO desk so ${PA_BUDDY_NAME} stays aligned.`}
                        </p>
                    </section>

                    <section className="rounded-xl border border-brand-border/60 bg-brand-panel/25 p-3" aria-labelledby="relay-prompts-heading">
                        <h2 id="relay-prompts-heading" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
                            Quick prompts
                        </h2>
                        <p className="mt-1 text-[10px] leading-snug text-brand-muted/80">
                            Sends a starter message you can edit in the box before sending.
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {LEADERSHIP_CHIPS.map((c) => (
                                <button
                                    key={c.label}
                                    type="button"
                                    title={c.display}
                                    disabled={loading}
                                    onClick={() => sendMessage(c.prompt, { displayText: c.display })}
                                    className="rounded-lg border border-brand-border/70 bg-brand-bg/80 px-2.5 py-1.5 text-[10px] font-medium text-brand-text transition hover:border-white/15 hover:bg-brand-input/50 disabled:opacity-50"
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    <button
                        type="button"
                        onClick={() => void requestExecutiveBriefing()}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-teal/35 bg-brand-teal/10 py-2.5 text-[11px] font-semibold text-brand-text transition hover:bg-brand-teal/18 disabled:opacity-50"
                    >
                        <Sparkles className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                        Summarize this venture
                    </button>

                    <section
                        className="rounded-xl border border-brand-border/60 bg-brand-panel/30 p-3"
                        aria-labelledby="relay-meeting-aside"
                    >
                        <h2 id="relay-meeting-aside" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
                            Meeting room
                        </h2>
                        <p className="mt-1 text-[10px] leading-snug text-brand-muted/85">
                            AI-ordered next steps: which desk to open, why, and shortcuts into chat.
                        </p>
                        <button
                            type="button"
                            onClick={() => setRelayMode('meeting')}
                            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-bg/90 py-2 text-[11px] font-semibold text-brand-text transition hover:border-brand-teal/35 hover:bg-brand-input/50"
                        >
                            <Video className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                            Open meeting room
                        </button>
                    </section>

                    <p className="text-[10px] leading-relaxed text-brand-muted/80">
                        The floating {PA_BUDDY_NAME} button on other desks opens the{' '}
                        <span className="text-brand-text/85">same chat thread</span>, so context carries with you.
                    </p>
                </div>
            </aside>

            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                <header className="shrink-0 border-b border-white/[0.05] bg-brand-bg/60 px-4 py-2 backdrop-blur-md sm:px-5">
                    <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:gap-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="text-sm font-semibold text-brand-text">{PA_BUDDY_NAME}</h1>
                                <p className="text-[11px] text-brand-muted">{activeProject.name}</p>
                            </div>
                            <div
                                className="flex w-full max-w-md rounded-lg border border-brand-border/70 bg-brand-panel/40 p-0.5 sm:w-auto"
                                role="tablist"
                                aria-label="Relay mode"
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={relayMode === 'chat'}
                                    onClick={() => setRelayMode('chat')}
                                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition sm:flex-initial ${
                                        relayMode === 'chat'
                                            ? 'bg-brand-card text-brand-text shadow-sm'
                                            : 'text-brand-muted hover:text-brand-text'
                                    }`}
                                >
                                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                                    Chat
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={relayMode === 'meeting'}
                                    onClick={() => setRelayMode('meeting')}
                                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition sm:flex-initial ${
                                        relayMode === 'meeting'
                                            ? 'bg-brand-card text-brand-text shadow-sm'
                                            : 'text-brand-muted hover:text-brand-text'
                                    }`}
                                >
                                    <Video className="h-3.5 w-3.5" aria-hidden />
                                    Meeting room
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-brand-muted/90">
                            {relayMode === 'chat'
                                ? `Chat in plain English. When ${PA_BUDDY_NAME} proposes venture changes, you confirm before anything is saved.`
                                : 'Clear, ordered actions inside DeepChox — open the right desk, then use chat or Refresh to update the plan.'}
                        </p>
                    </div>
                </header>

                {relayMode === 'chat' ? (
                    <div className="shrink-0 border-b border-brand-border/40 bg-brand-panel/20 px-4 py-2.5 lg:hidden">
                        <p className="mb-2 text-[9px] font-medium uppercase tracking-wider text-brand-muted">Quick prompts</p>
                        <div className="flex flex-wrap gap-1.5">
                            {LEADERSHIP_CHIPS.map((c) => (
                                <button
                                    key={c.label}
                                    type="button"
                                    title={c.display}
                                    disabled={loading}
                                    onClick={() => sendMessage(c.prompt, { displayText: c.display })}
                                    className="rounded-lg border border-brand-border/60 bg-brand-bg/90 px-2 py-1 text-[10px] font-medium text-brand-text disabled:opacity-50"
                                >
                                    {c.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => void requestExecutiveBriefing()}
                                disabled={loading}
                                className="rounded-lg border border-white/[0.12] bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-brand-text disabled:opacity-50"
                            >
                                Summarize
                            </button>
                            <button
                                type="button"
                                onClick={() => setRelayMode('meeting')}
                                className="rounded-lg border border-brand-teal/30 bg-brand-teal/10 px-2 py-1 text-[10px] font-semibold text-brand-text"
                            >
                                Meeting room
                            </button>
                        </div>
                    </div>
                ) : null}

                {relayMode === 'meeting' ? (
                    <RelayMeetingRoom onSwitchToChat={() => setRelayMode('chat')} />
                ) : (
                    <PAChatSurface variant="page" />
                )}
            </div>
        </div>
    );
}

/** Full Assistant room — must render under `PersonalAssistantChatProvider`. */
export function PersonalAssistant() {
    return <PersonalAssistantLayout />;
}
