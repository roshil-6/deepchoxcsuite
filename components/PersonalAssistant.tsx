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
        <div className="flex w-full min-w-0 flex-1 flex-col bg-brand-bg">
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                {/* ── Compact header: name + mode tabs ── */}
                <header className="shrink-0 border-b border-white/[0.05] bg-brand-bg/60 px-4 py-2.5 backdrop-blur-md sm:px-5">
                    <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-[14px] font-semibold text-zinc-100">{PA_BUDDY_NAME}</h1>
                            <p className="text-[11px] text-zinc-500">{activeProject.name}</p>
                        </div>
                        <div
                            className="flex rounded-lg border border-white/[0.08] bg-white/[0.04] p-0.5"
                            role="tablist"
                            aria-label="Relay mode"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={relayMode === 'chat'}
                                onClick={() => setRelayMode('chat')}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                                    relayMode === 'chat'
                                        ? 'bg-white/[0.08] text-zinc-100 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
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
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                                    relayMode === 'meeting'
                                        ? 'bg-white/[0.08] text-zinc-100 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                <Video className="h-3.5 w-3.5" aria-hidden />
                                Meeting
                            </button>
                        </div>
                    </div>
                </header>

                {relayMode === 'chat' ? (
                    <>
                        {/* ── Venture at a glance — center, always visible ── */}
                        <div className="shrink-0 border-b border-white/[0.05] px-4 py-4 sm:px-5">
                            <div className="mx-auto max-w-3xl">
                                <p className="text-[12px] leading-[1.6] text-zinc-400">{PA_BUDDY_TAGLINE}</p>

                                <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
                                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                                        <ListChecks className="h-4 w-4 text-zinc-500" aria-hidden />
                                        <p className="mt-2 font-mono text-[16px] font-semibold tabular-nums leading-none text-zinc-100">
                                            {priorities.length === 0 ? '—' : `${priDone}/${priorities.length}`}
                                        </p>
                                        <p className="mt-1 text-[10px] font-medium text-zinc-400">Priorities</p>
                                        <p className="text-[9px] text-zinc-600">
                                            {priorities.length === 0 ? 'None set' : 'done / total'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                                        <Layers className="h-4 w-4 text-violet-400/80" aria-hidden />
                                        <p className="mt-2 font-mono text-[16px] font-semibold tabular-nums leading-none text-zinc-100">
                                            {phases.length === 0 ? '—' : `${phaseDone}/${phases.length}`}
                                        </p>
                                        <p className="mt-1 text-[10px] font-medium text-zinc-400">Phases</p>
                                        <p className="text-[9px] text-zinc-600">
                                            {phases.length === 0
                                                ? 'None set'
                                                : phaseActive > 0
                                                  ? `${phaseActive} active`
                                                  : 'done / total'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                                        <CalendarDays className="h-4 w-4 text-amber-400/80" aria-hidden />
                                        <p className="mt-2 font-mono text-[16px] font-semibold tabular-nums leading-none text-zinc-100">
                                            {events}
                                        </p>
                                        <p className="mt-1 text-[10px] font-medium text-zinc-400">Calendar</p>
                                        <p className="text-[9px] text-zinc-600">events</p>
                                    </div>
                                </div>

                                {strategicLine ? (
                                    <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                                        {strategicLine.slice(0, 200)}{strategicLine.length > 200 ? '…' : ''}
                                    </p>
                                ) : null}

                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    {LEADERSHIP_CHIPS.map((c) => (
                                        <button
                                            key={c.label}
                                            type="button"
                                            title={c.display}
                                            disabled={loading}
                                            onClick={() => sendMessage(c.prompt, { displayText: c.display })}
                                            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-50"
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => void requestExecutiveBriefing()}
                                        disabled={loading}
                                        className="rounded-lg border border-brand-teal/30 bg-brand-teal/8 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-200 transition hover:bg-brand-teal/15 disabled:opacity-50"
                                    >
                                        <span className="flex items-center gap-1">
                                            <Sparkles className="h-3 w-3 text-brand-teal" aria-hidden />
                                            Summarize
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <PAChatSurface variant="page" />
                    </>
                ) : (
                    <RelayMeetingRoom onSwitchToChat={() => setRelayMode('chat')} />
                )}
            </div>
        </div>
    );
}

/** Full Assistant room — must render under `PersonalAssistantChatProvider`. */
export function PersonalAssistant() {
    return <PersonalAssistantLayout />;
}
