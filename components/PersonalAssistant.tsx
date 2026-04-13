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
import { PA_BUDDY_NAME, PA_BUDDY_TAGLINE } from '@/lib/paBuddy';
import { ceo } from '@/lib/ceoTheme';
import { DeskShell, DeskTabButton } from '@/components/workspaces/DeskShell';

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
            <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 bg-[var(--color-brand-bg)] px-6 py-12 text-center">
                <p className="max-w-md text-sm text-[var(--muted)]">Choose a venture first.</p>
                <button
                    type="button"
                    onClick={() => switchRoom('dashboard')}
                    className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-white/[0.07]"
                >
                    Open overview
                </button>
            </div>
        );
    }

    const modeTabs = (
        <>
            <DeskTabButton
                active={relayMode === 'chat'}
                onClick={() => setRelayMode('chat')}
                icon={<MessageCircle className="h-3.5 w-3.5" aria-hidden />}
                className={
                    relayMode === 'chat'
                        ? '!border-white/[0.1] !bg-[var(--color-brand-card)] text-[var(--text)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                        : ''
                }
            >
                Chat
            </DeskTabButton>
            <DeskTabButton
                active={relayMode === 'meeting'}
                onClick={() => setRelayMode('meeting')}
                icon={<Video className="h-3.5 w-3.5" aria-hidden />}
                className={
                    relayMode === 'meeting'
                        ? '!border-white/[0.1] !bg-[var(--color-brand-card)] text-[var(--text)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                        : ''
                }
            >
                Meeting
            </DeskTabButton>
        </>
    );

    return (
        <DeskShell
            eyebrow={activeProject.name}
            title={PA_BUDDY_NAME}
            description={PA_BUDDY_TAGLINE}
            tabs={modeTabs}
            bodyFlush
            bodyClassName="flex min-h-0 flex-1 flex-col"
            className="min-h-0 flex-1"
            headerSpineClassName="bg-gradient-to-b from-white/40 via-white/15 to-white/5"
        >
            {relayMode === 'chat' ? (
                <>
                    {/* ── Venture pulse (matches CEO desk card language) ── */}
                    <div className="shrink-0 border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
                        <div
                            className={`mx-auto max-w-3xl rounded-2xl border border-white/[0.07] bg-[var(--color-brand-card)]/85 p-4 shadow-[0_16px_48px_-28px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.04] backdrop-blur-md sm:p-5 ${ceo.cardHover}`}
                        >
                            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                                        Venture pulse
                                    </p>
                                    <p className="mt-0.5 text-[12px] text-[var(--text)]/90">At-a-glance before you message Relay</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                <div className="rounded-xl border border-white/[0.06] bg-[var(--color-brand-input)]/50 px-3 py-3 transition-colors hover:border-white/[0.1]">
                                    <ListChecks className={`h-4 w-4 ${ceo.accent}`} aria-hidden />
                                    <p className="mt-2 font-mono text-[17px] font-semibold tabular-nums leading-none text-[var(--text)]">
                                        {priorities.length === 0 ? '—' : `${priDone}/${priorities.length}`}
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium text-[var(--muted)]">Priorities</p>
                                    <p className="text-[9px] leading-tight text-[var(--muted)]/70">
                                        {priorities.length === 0 ? 'None set' : 'done / total'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.06] bg-[var(--color-brand-input)]/50 px-3 py-3 transition-colors hover:border-white/[0.1]">
                                    <Layers className={`h-4 w-4 ${ceo.accentMuted}`} aria-hidden />
                                    <p className="mt-2 font-mono text-[17px] font-semibold tabular-nums leading-none text-[var(--text)]">
                                        {phases.length === 0 ? '—' : `${phaseDone}/${phases.length}`}
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium text-[var(--muted)]">Phases</p>
                                    <p className="text-[9px] leading-tight text-[var(--muted)]/70">
                                        {phases.length === 0
                                            ? 'None set'
                                            : phaseActive > 0
                                              ? `${phaseActive} active`
                                              : 'done / total'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.06] bg-[var(--color-brand-input)]/50 px-3 py-3 transition-colors hover:border-white/[0.1]">
                                    <CalendarDays className={`h-4 w-4 ${ceo.accent}`} aria-hidden />
                                    <p className="mt-2 font-mono text-[17px] font-semibold tabular-nums leading-none text-[var(--text)]">
                                        {events}
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium text-[var(--muted)]">Calendar</p>
                                    <p className="text-[9px] leading-tight text-[var(--muted)]/70">events</p>
                                </div>
                            </div>

                            {strategicLine ? (
                                <p className="mt-3 line-clamp-2 border-t border-white/[0.05] pt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                                    {strategicLine.slice(0, 220)}
                                    {strategicLine.length > 220 ? '…' : ''}
                                </p>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.05] pt-4">
                                {LEADERSHIP_CHIPS.map((c) => (
                                    <button
                                        key={c.label}
                                        type="button"
                                        title={c.display}
                                        disabled={loading}
                                        onClick={() => void sendMessage(c.prompt, { displayText: c.display })}
                                        className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium text-[var(--text)] transition hover:border-white/[0.14] hover:bg-white/[0.07] disabled:opacity-50"
                                    >
                                        {c.label}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => void requestExecutiveBriefing()}
                                    disabled={loading}
                                    className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] px-3.5 py-1.5 text-[11px] font-semibold text-[#0a0a0a] transition hover:opacity-90 disabled:opacity-50 ${ceo.accentBg}`}
                                >
                                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                                    Summarize
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Chat thread ── */}
                    <PAChatSurface variant="page" />
                </>
            ) : (
                <RelayMeetingRoom onSwitchToChat={() => setRelayMode('chat')} />
            )}
        </DeskShell>
    );
}

/** Full Assistant room — must render under `PersonalAssistantChatProvider`. */
export function PersonalAssistant() {
    return <PersonalAssistantLayout />;
}
