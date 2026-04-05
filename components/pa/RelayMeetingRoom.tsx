'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { projectPayloadForPA } from '@/lib/paApplyUpdates';
import { buildHeuristicMeetingPlan, type RelayMeetingGoTo, type RelayMeetingStep } from '@/lib/relayMeetingRoom';
import { usePersonalAssistantChat } from '@/components/pa/PersonalAssistantChatContext';
import { PA_BUDDY_NAME } from '@/lib/paBuddy';
import { Loader2, RefreshCw, MessageSquare, ArrowRight, Video } from 'lucide-react';

type ApiOk = {
    ok: true;
    source: 'ai' | 'heuristic';
    intro: string;
    steps: RelayMeetingStep[];
    model?: string;
    message?: string;
};

type ApiErr = { ok: false; error?: string; fallback?: string };

export function RelayMeetingRoom({ onSwitchToChat }: { onSwitchToChat: () => void }) {
    const { activeProject, switchRoom } = useOffice();
    const { relayDraftToComposer, loading: chatBusy } = usePersonalAssistantChat();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [intro, setIntro] = useState('');
    const [steps, setSteps] = useState<RelayMeetingStep[]>([]);
    const [source, setSource] = useState<'ai' | 'heuristic'>('heuristic');
    const [banner, setBanner] = useState<string | null>(null);
    const [modelLabel, setModelLabel] = useState<string | null>(null);

    const loadPlan = useCallback(async () => {
        if (!activeProject?.id) return;
        setLoading(true);
        setError(null);
        setBanner(null);
        setModelLabel(null);

        const local = buildHeuristicMeetingPlan(activeProject);
        const payload = projectPayloadForPA(activeProject);

        try {
            const res = await fetch('/api/relay-meeting-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: payload }),
            });
            const data = (await res.json()) as ApiOk | ApiErr;

            if (!data.ok) {
                setIntro(local.intro);
                setSteps(local.steps);
                setSource('heuristic');
                setError(data.error || 'Could not load AI plan');
                return;
            }

            const ok = data as ApiOk;
            if (ok.steps?.length) {
                setIntro(ok.intro || local.intro);
                setSteps(ok.steps);
                setSource(ok.source);
                if (ok.message) setBanner(ok.message);
                if (ok.model) setModelLabel(ok.model);
            } else {
                setIntro(local.intro);
                setSteps(local.steps);
                setSource('heuristic');
                setBanner(ok.message || 'Using built-in plan.');
            }
        } catch {
            setIntro(local.intro);
            setSteps(local.steps);
            setSource('heuristic');
            setError('Network error — showing built-in plan.');
        } finally {
            setLoading(false);
        }
    }, [activeProject]);

    useEffect(() => {
        void loadPlan();
    }, [loadPlan]);

    const go = useCallback(
        (room: RelayMeetingGoTo) => {
            switchRoom(room);
        },
        [switchRoom]
    );

    const draftInChat = useCallback(
        (step: RelayMeetingStep) => {
            const body = `From my Meeting Room plan — step: "${step.title}"\n\nWhat I’m trying to do: ${step.why}\n\nPlease suggest the smallest next action in the app (which desk or field) and offer to apply updates if it helps.`;
            relayDraftToComposer(body);
            onSwitchToChat();
        },
        [relayDraftToComposer, onSwitchToChat]
    );

    if (!activeProject) return null;

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-5">
            <div className="mb-6 flex flex-col gap-3 border-b border-brand-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-panel text-brand-text">
                        <Video className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-brand-text">Meeting room</h2>
                        <p className="mt-1 text-[12px] leading-relaxed text-brand-muted">
                            Clear next steps in the app — where to go, why it matters, and one tap to open that area. Refresh to
                            regenerate when your venture changes.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => void loadPlan()}
                    disabled={loading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-[11px] font-semibold text-brand-text transition hover:bg-brand-input disabled:opacity-50"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
                    Refresh plan
                </button>
            </div>

            {banner ? (
                <p className="mb-4 rounded-lg border border-brand-border/70 bg-brand-panel/40 px-3 py-2 text-[11px] text-brand-muted">
                    {banner}
                </p>
            ) : null}

            {error ? (
                <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200/90">
                    {error}
                </p>
            ) : null}

            {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-brand-muted">
                    <Loader2 className="h-8 w-8 animate-spin opacity-60" aria-hidden />
                    <p className="text-sm">Preparing your next steps…</p>
                </div>
            ) : (
                <>
                    <p className="mb-6 text-[13px] leading-[1.65] text-brand-text/95">
                        {intro || `Steps for “${activeProject.name}” — follow in order when you can.`}
                    </p>

                    <ol className="space-y-4">
                        {steps.map((step) => (
                            <li
                                key={`${step.order}-${step.title}`}
                                className="rounded-xl border border-brand-border bg-brand-panel/35 px-4 py-4 sm:px-5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex min-w-0 gap-2">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-bg font-mono text-xs font-bold text-brand-muted">
                                            {step.order}
                                        </span>
                                        <h3 className="pt-0.5 text-[14px] font-semibold leading-snug text-brand-text">
                                            {step.title}
                                        </h3>
                                    </div>
                                </div>
                                <p className="mt-3 text-[12px] leading-relaxed text-brand-muted">{step.why}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => go(step.goTo)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-teal/30 bg-brand-teal/10 px-3 py-2 text-[11px] font-semibold text-brand-text transition hover:bg-brand-teal/18"
                                    >
                                        {step.goToLabel}
                                        <ArrowRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={chatBusy}
                                        onClick={() => draftInChat(step)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-[11px] font-medium text-brand-muted transition hover:border-brand-border hover:text-brand-text disabled:opacity-50"
                                    >
                                        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                                        Draft in {PA_BUDDY_NAME} chat
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <div className="mt-8 rounded-xl border border-dashed border-brand-border/70 bg-brand-bg/60 px-4 py-4 text-center">
                        <p className="text-[11px] text-brand-muted">
                            {source === 'ai'
                                ? `Plan generated with ${modelLabel || 'AI'} from your live venture snapshot.`
                                : 'Built-in plan from your venture fields — add GROQ_API_KEY for richer, context-aware steps.'}{' '}
                            Switch to <span className="font-medium text-brand-text">Chat</span> anytime to ask {PA_BUDDY_NAME} to
                            execute changes.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
