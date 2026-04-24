'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Volume2, VolumeX, X } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { getSectionGuideSteps, type SectionGuideStep } from '@/lib/sectionGuides';
import { WORKSPACE_TITLES } from '@/components/ui/appNav';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';
import { pickEnglishPlaybackVoice, resumeSpeechSynthIfNeeded } from '@/lib/voiceEngine';

const COMPLETED_STORAGE_KEY = 'deepchox:section-guide-completed:v1';

function readCompletedRooms(): Record<string, boolean> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
        const p = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        const out: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(p)) {
            if (v === true) out[k] = true;
        }
        return out;
    } catch {
        return {};
    }
}

function markRoomGuideCompleted(room: string) {
    try {
        const next = { ...readCompletedRooms(), [room]: true };
        localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(next));
    } catch {
        /* noop */
    }
}

type SectionGuideContextValue = {
    openGuide: () => void;
    isAvailable: boolean;
};

const SectionGuideContext = createContext<SectionGuideContextValue | null>(null);

export function useSectionGuideOptional() {
    return useContext(SectionGuideContext);
}

function speakStep(text: string) {
    if (typeof window === 'undefined') return;
    try {
        resumeSpeechSynthIfNeeded();
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = pickEnglishPlaybackVoice();
        if (v) u.voice = v;
        u.rate = 1;
        window.speechSynthesis.speak(u);
    } catch { /* noop */ }
}

function CoachPanel({
    roomLabel,
    steps,
    stepIndex,
    open,
    onClose,
    onBack,
    onNext,
    onSkip,
    onFinish,
}: {
    roomLabel: string;
    steps: SectionGuideStep[];
    stepIndex: number;
    open: boolean;
    onClose: () => void;
    onBack: () => void;
    onNext: () => void;
    onSkip: () => void;
    onFinish: () => void;
}) {
    const [muted, setMuted] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const autoSpokenRef = useRef<string>('');

    // Auto-speak each step once when it first appears
    useEffect(() => {
        if (!open || steps.length === 0 || muted) return;
        const step = steps[stepIndex];
        if (!step) return;
        const key = `${stepIndex}:${step.body}`;
        if (autoSpokenRef.current === key) return;
        autoSpokenRef.current = key;
        setSpeaking(true);
        speakStep(step.body);
        // Clear speaking indicator after estimate
        const t = window.setTimeout(() => setSpeaking(false), step.body.length * 60 + 800);
        return () => window.clearTimeout(t);
    }, [open, stepIndex, steps, muted]);

    // Stop speech when panel closes
    useEffect(() => {
        if (!open) {
            try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
            setSpeaking(false);
        }
    }, [open]);

    if (!open || steps.length === 0) return null;

    const step = steps[stepIndex];
    const last = stepIndex >= steps.length - 1;
    const first = stepIndex === 0;

    return (
        <div
            className="fixed bottom-24 left-[max(0.75rem,env(safe-area-inset-left))] z-[260] w-[min(calc(100vw-1.5rem),22rem)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_20px_50px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl lg:bottom-[max(1rem,env(safe-area-inset-bottom))] lg:w-[min(100vw-2rem,24rem)]"
            role="dialog"
            aria-modal="false"
            aria-labelledby="section-guide-title"
            aria-describedby="section-guide-body"
        >
            {/* Violet top accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(116,86,255,0.5)] to-transparent" aria-hidden />

            {/* Dexo avatar + speech bubble */}
            <div className="flex items-start gap-3 border-b border-[var(--border)] px-4 pb-3 pt-4">
                <DexoAvatar
                    size="sm"
                    state={speaking ? 'speaking' : 'idle'}
                    pulse={speaking}
                    className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                        <div>
                            <span className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-[#7456ff]">Dexo</span>
                            <span className="ml-1.5 font-sans text-[8px] font-semibold uppercase tracking-widest text-[var(--muted)]">Guide</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    if (muted) {
                                        setMuted(false);
                                        setSpeaking(true);
                                        speakStep(step.body);
                                        const t = window.setTimeout(() => setSpeaking(false), step.body.length * 60 + 800);
                                        return () => window.clearTimeout(t);
                                    } else {
                                        setMuted(true);
                                        setSpeaking(false);
                                        try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
                                    }
                                }}
                                className="rounded-md p-1 text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                                aria-label={muted ? 'Unmute Dexo' : 'Mute Dexo'}
                                title={muted ? 'Unmute' : 'Mute'}
                            >
                                {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md p-1 text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                                aria-label="Close guide"
                            >
                                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </button>
                        </div>
                    </div>
                    {/* Speech bubble */}
                    <div className="mt-1.5 rounded-xl rounded-tl-sm border border-[rgba(116,86,255,0.15)] bg-[rgba(116,86,255,0.07)] px-3 py-2">
                        <p className="text-[11.5px] leading-relaxed text-[var(--text-secondary)]">
                            {step.body}
                        </p>
                    </div>
                </div>
            </div>

            {/* Step meta + progress */}
            <div className="px-4 pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                        <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">{roomLabel}</p>
                        <p id="section-guide-title" className="mt-0.5 text-[13px] font-semibold text-[var(--text-primary)]">
                            {step.title}
                        </p>
                    </div>
                    <span className="shrink-0 font-sans text-[10px] tabular-nums text-[var(--muted)]">
                        {stepIndex + 1}/{steps.length}
                    </span>
                </div>

                {/* Progress dots */}
                <div className="flex gap-1">
                    {steps.map((_, i) => (
                        <span
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                                i === stepIndex ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
                            }`}
                        />
                    ))}
                </div>

                {step.lookFor ? (
                    <p id="section-guide-body" className="mt-2.5 border-t border-[var(--border)] pt-2.5 text-[11px] leading-snug text-[var(--muted)]">
                        <span className="font-medium text-[var(--text-secondary)]">Look for: </span>
                        {step.lookFor}
                    </p>
                ) : <p id="section-guide-body" className="sr-only">{step.body}</p>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 px-4 pb-4 pt-3">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={first}
                    className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] transition hover:bg-[rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    Back
                </button>
                <button
                    type="button"
                    onClick={last ? onFinish : onNext}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-violet-400/35 bg-violet-500/15 px-3 py-2 text-[12px] font-semibold tracking-wide text-violet-100 shadow-[0_1px_0_rgba(255,255,255,0.06)] transition hover:border-violet-400/50 hover:bg-violet-500/25 sm:flex-none"
                >
                    {last ? 'Done' : 'Next'}
                    {!last ? <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> : null}
                </button>
                <button
                    type="button"
                    onClick={onSkip}
                    className="ml-auto text-[11px] font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--text-secondary)] hover:underline"
                >
                    Skip tour
                </button>
            </div>
        </div>
    );
}

export function SectionGuideProvider({ children }: { children: React.ReactNode }) {
    const { activeRoom } = useOffice();
    const steps = useMemo(() => getSectionGuideSteps(activeRoom), [activeRoom]);
    const roomLabel = WORKSPACE_TITLES[activeRoom] ?? activeRoom;

    const [open, setOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        setStepIndex(0);
        if (steps.length === 0) {
            setOpen(false);
            return;
        }
        const completed = readCompletedRooms();
        setOpen(!completed[activeRoom]);
    }, [activeRoom, steps.length]);

    const openGuide = useCallback(() => {
        setStepIndex(0);
        setOpen(true);
    }, []);

    const closePanel = useCallback(() => setOpen(false), []);

    const finishTour = useCallback(() => {
        markRoomGuideCompleted(activeRoom);
        setOpen(false);
    }, [activeRoom]);

    const skipTour = useCallback(() => {
        markRoomGuideCompleted(activeRoom);
        setOpen(false);
    }, [activeRoom]);

    const onBack = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);
    const onNext = useCallback(() => setStepIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);

    const ctxValue = useMemo<SectionGuideContextValue>(
        () => ({
            openGuide,
            isAvailable: steps.length > 0,
        }),
        [openGuide, steps.length]
    );

    return (
        <SectionGuideContext.Provider value={ctxValue}>
            {children}
            <CoachPanel
                roomLabel={roomLabel}
                steps={steps}
                stepIndex={stepIndex}
                open={open}
                onClose={closePanel}
                onBack={onBack}
                onNext={onNext}
                onSkip={skipTour}
                onFinish={finishTour}
            />
        </SectionGuideContext.Provider>
    );
}

/** Mobile header — compact Guide trigger */
export function SectionGuideMobileHeaderButton({ className = '' }: { className?: string }) {
    const ctx = useSectionGuideOptional();
    if (!ctx?.isAvailable) return null;
    return (
        <button
            type="button"
            onClick={ctx.openGuide}
            className={`flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] ${className}`}
            aria-label="Open room guide"
        >
            <BookOpen className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-90" strokeWidth={1.75} aria-hidden />
            Guide
        </button>
    );
}

/** Desktop left rail — full-width secondary control */
export function SectionGuideRailButton() {
    const ctx = useSectionGuideOptional();
    if (!ctx?.isAvailable) return null;
    return (
        <button
            type="button"
            onClick={ctx.openGuide}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-2 text-[12px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            aria-label="Open room guide for this workspace"
        >
            <BookOpen className="h-3.5 w-3.5 text-[var(--text-muted)]" strokeWidth={1.75} aria-hidden />
            Room guide
        </button>
    );
}
