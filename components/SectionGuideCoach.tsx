'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { getSectionGuideSteps, type SectionGuideStep } from '@/lib/sectionGuides';
import { WORKSPACE_TITLES } from '@/components/ui/appNav';

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
    if (!open || steps.length === 0) return null;

    const step = steps[stepIndex];
    const last = stepIndex >= steps.length - 1;
    const first = stepIndex === 0;

    return (
        <div
            className="fixed bottom-24 left-[max(0.75rem,env(safe-area-inset-left))] z-[260] w-[min(calc(100vw-1.5rem),22rem)] rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl lg:bottom-[max(1rem,env(safe-area-inset-bottom))] lg:w-[min(100vw-2rem,24rem)]"
            role="dialog"
            aria-modal="false"
            aria-labelledby="section-guide-title"
            aria-describedby="section-guide-body"
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        Room guide
                    </p>
                    <p
                        id="section-guide-title"
                        className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]"
                    >
                        {roomLabel}
                    </p>
                    <p className="mt-1 text-[11px] tabular-nums text-[var(--text-muted)]">
                        Step {stepIndex + 1} of {steps.length}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-lg p-1 text-[var(--text-muted)] transition hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                    aria-label="Close guide"
                >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
            </div>

            <div className="mb-1 flex gap-1">
                {steps.map((_, i) => (
                    <span
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                            i === stepIndex ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
                        }`}
                    />
                ))}
            </div>

            <h3 className="mt-3 text-[13px] font-semibold text-[var(--text-primary)]">{step.title}</h3>
            <p id="section-guide-body" className="mt-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                {step.body}
            </p>
            {step.lookFor ? (
                <p className="mt-2 border-t border-[var(--border)] pt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text-secondary)]">Look for: </span>
                    {step.lookFor}
                </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
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
                    className="ml-auto text-[11px] font-medium text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-secondary)] hover:underline"
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
