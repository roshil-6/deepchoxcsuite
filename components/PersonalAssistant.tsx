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
import { DeskShell, DeskTabButton } from '@/components/workspaces/DeskShell';
import { ProBadge } from '@/components/PlanGate';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useSubscription } from '@/hooks/useSubscription';

type RelayMode = 'chat' | 'meeting';

function PersonalAssistantLayout() {
    const { activeProject, switchRoom } = useOffice();
    const { sendMessage, requestExecutiveBriefing, loading } = usePersonalAssistantChat();
    const { can } = useSubscription();
    const [relayMode, setRelayMode] = useState<RelayMode>('chat');
    const [upgradeOpen, setUpgradeOpen] = useState(false);

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
            >
                Chat
            </DeskTabButton>
            <DeskTabButton
                active={relayMode === 'meeting'}
                onClick={() => {
                    if (!can('relayMeetingRoom')) { setUpgradeOpen(true); return; }
                    setRelayMode('meeting');
                }}
                icon={<Video className="h-3.5 w-3.5" aria-hidden />}
            >
                <span className="flex items-center gap-1.5">
                    Meeting
                    {!can('relayMeetingRoom') && <ProBadge />}
                </span>
            </DeskTabButton>
        </>
    );

    return (
        <>
        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} highlight="Relay Meeting Room" />
        <DeskShell
            eyebrow={activeProject.name}
            title={PA_BUDDY_NAME}
            description={PA_BUDDY_TAGLINE}
            tabs={modeTabs}
            bodyFlush
            bodyClassName="flex min-h-0 flex-1 flex-col"
            className="flex-1"
        >
            {relayMode === 'chat' ? (
                <>
                    {/* ── Venture at a glance ── */}
                    <div className="shrink-0 border-b border-white/[0.06] px-5 py-4 sm:px-6">
                        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                                <ListChecks className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                                <p className="mt-2 font-mono text-[16px] font-semibold tabular-nums leading-none text-[var(--text)]">
                                    {priorities.length === 0 ? '—' : `${priDone}/${priorities.length}`}
                                </p>
                                <p className="mt-1 text-[10px] font-medium text-[var(--muted)]">Priorities</p>
                                <p className="text-[9px] text-[var(--muted)]/60">
                                    {priorities.length === 0 ? 'None set' : 'done / total'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                                <Layers className="h-4 w-4 text-violet-400/70" aria-hidden />
                                <p className="mt-2 font-mono text-[16px] font-semibold tabular-nums leading-none text-[var(--text)]">
                                    {phases.length === 0 ? '—' : `${phaseDone}/${phases.length}`}
                                </p>
                                <p className="mt-1 text-[10px] font-medium text-[var(--muted)]">Phases</p>
                                <p className="text-[9px] text-[var(--muted)]/60">
                                    {phases.length === 0
                                        ? 'None set'
                                        : phaseActive > 0
                                          ? `${phaseActive} active`
                                          : 'done / total'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                                <CalendarDays className="h-4 w-4 text-amber-400/70" aria-hidden />
                                <p className="mt-2 font-mono text-[16px] font-semibold tabular-nums leading-none text-[var(--text)]">
                                    {events}
                                </p>
                                <p className="mt-1 text-[10px] font-medium text-[var(--muted)]">Calendar</p>
                                <p className="text-[9px] text-[var(--muted)]/60">events</p>
                            </div>
                        </div>

                        {strategicLine ? (
                            <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)]/80">
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
                                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-[var(--text)] transition hover:bg-white/[0.07] disabled:opacity-50"
                                >
                                    {c.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => void requestExecutiveBriefing()}
                                disabled={loading}
                                className="rounded-lg border border-brand-teal/30 bg-brand-teal/[0.08] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--text)] transition hover:bg-brand-teal/[0.15] disabled:opacity-50"
                            >
                                <span className="flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-brand-teal" aria-hidden />
                                    Summarize
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* ── Chat thread ── */}
                    <PAChatSurface variant="page" />
                </>
            ) : (
                <RelayMeetingRoom onSwitchToChat={() => setRelayMode('chat')} />
            )}
        </DeskShell>
        </>
    );
}

/** Full Assistant room — must render under `PersonalAssistantChatProvider`. */
export function PersonalAssistant() {
    return <PersonalAssistantLayout />;
}
