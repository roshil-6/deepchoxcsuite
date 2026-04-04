'use client';

import React from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import { ClipboardList, Lightbulb } from 'lucide-react';
import {
    LEADERSHIP_CHIPS,
    PAChatSurface,
    usePersonalAssistantChat,
} from '@/components/pa/PersonalAssistantChatContext';
import { PA_BUDDY_NAME, PA_BUDDY_ROLE, PA_BUDDY_TAGLINE } from '@/lib/paBuddy';

function PersonalAssistantLayout() {
    const { activeProject, switchRoom } = useOffice();
    const { sendMessage, requestExecutiveBriefing, loading } = usePersonalAssistantChat();

    const strategyDoc = parseStrategy(activeProject?.strategy || '');
    const priorities = strategyDoc.priorities || [];
    const phases = strategyDoc.phases || [];
    const priDone = priorities.filter((p) => p.done).length;
    const phaseDone = phases.filter((p) => p.status === 'done').length;
    const events = activeProject?.events?.length ?? 0;

    if (!activeProject) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-brand-bg px-6 text-center">
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
        <div className="flex h-full min-h-0 flex-col bg-brand-bg lg:flex-row">
            <aside className="hidden w-[260px] shrink-0 flex-col border-r border-white/[0.04] bg-gradient-to-b from-brand-panel/12 to-transparent lg:flex">
                <div className="shrink-0 px-3 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-brand-muted/80">{PA_BUDDY_NAME}</p>
                    <p className="text-[11px] text-brand-text/90">{PA_BUDDY_ROLE}</p>
                    <p className="mt-1.5 text-[10px] leading-snug text-brand-muted/85">{PA_BUDDY_TAGLINE}</p>
                </div>
                <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                    <div className="rounded-xl bg-white/[0.03] p-2.5 ring-1 ring-white/[0.04]">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-brand-text">
                            <ClipboardList className="h-3 w-3 text-brand-muted" aria-hidden />
                            Snapshot
                        </div>
                        <ul className="mt-1.5 space-y-0.5 text-[11px] text-brand-muted/90">
                            <li>Pri {priDone}/{priorities.length || 0}</li>
                            <li>Ph {phaseDone}/{phases.length || 0}</li>
                            <li>Events {events}</li>
                        </ul>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-2.5 ring-1 ring-white/[0.04]">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-brand-text">
                            <Lightbulb className="h-3 w-3 text-brand-muted" aria-hidden />
                            Intent
                        </div>
                        <p className="mt-1 line-clamp-4 text-[11px] leading-snug text-brand-muted/90">
                            {(strategyDoc.strategicIntent || strategyDoc.vision || strategyDoc.content || '').trim().slice(0, 280) ||
                                'Add on CEO desk.'}
                        </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-2.5 ring-1 ring-white/[0.04]">
                        <p className="text-[10px] font-medium text-brand-muted">Prompts</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                            {LEADERSHIP_CHIPS.map((c) => (
                                <button
                                    key={c.label}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => sendMessage(c.prompt, { displayText: c.display })}
                                    className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[9px] font-medium text-brand-text transition hover:bg-white/[0.09] disabled:opacity-50"
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void requestExecutiveBriefing()}
                        disabled={loading}
                        className="w-full rounded-xl bg-white/[0.05] py-2 text-[11px] font-medium text-brand-text ring-1 ring-white/[0.06] transition hover:bg-white/[0.08] disabled:opacity-50"
                    >
                        Briefing
                    </button>
                    <p className="text-[9px] leading-snug text-brand-muted/70">
                        On other desks, use the floating {PA_BUDDY_NAME} button — same thread.
                    </p>
                </div>
            </aside>

            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <header className="shrink-0 border-b border-white/[0.05] bg-brand-bg/60 px-4 py-2 backdrop-blur-md sm:px-5">
                    <div className="mx-auto flex max-w-2xl flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-sm font-semibold text-brand-text">{PA_BUDDY_NAME}</h1>
                            <p className="text-[11px] text-brand-muted">{activeProject.name}</p>
                        </div>
                        <p className="max-w-xs text-[10px] leading-snug text-brand-muted/90 sm:text-right">
                            Natural language updates — Groq applies changes to your venture when you ask.
                        </p>
                    </div>
                </header>

                <div className="shrink-0 border-b border-white/[0.04] px-4 py-2 lg:hidden">
                    <div className="flex flex-wrap gap-1">
                        {LEADERSHIP_CHIPS.map((c) => (
                            <button
                                key={c.label}
                                type="button"
                                disabled={loading}
                                onClick={() => sendMessage(c.prompt, { displayText: c.display })}
                                className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[9px] font-medium text-brand-text disabled:opacity-50"
                            >
                                {c.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => void requestExecutiveBriefing()}
                            disabled={loading}
                            className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-medium text-brand-text disabled:opacity-50"
                        >
                            Brief
                        </button>
                    </div>
                </div>

                <PAChatSurface variant="page" />
            </div>
        </div>
    );
}

/** Full Assistant room — must render under `PersonalAssistantChatProvider`. */
export function PersonalAssistant() {
    return <PersonalAssistantLayout />;
}
