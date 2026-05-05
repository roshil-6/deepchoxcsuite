'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';
import { VENTURE_PRIORITIES, type VenturePriorityId } from '@/lib/venturePriority';

export interface NameVentureModalProps {
    open: boolean;
    onClose: () => void;
    /** Called with trimmed name and optional focus priority id */
    onConfirm: (name: string, priorityId?: VenturePriorityId) => void;
    /** Disables the submit button while venture is being saved */
    loading?: boolean;
    /** Shown above the field */
    title?: string;
    /** Shown under the title */
    description?: string;
}

export function NameVentureModal({
    open,
    onClose,
    onConfirm,
    loading = false,
    title = 'Name your venture',
    description = 'You can change this later.',
}: NameVentureModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [value, setValue] = useState('');
    const [selectedPriority, setSelectedPriority] = useState<VenturePriorityId | undefined>(undefined);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        setValue('');
        setStep(1);
        setSelectedPriority(undefined);
        const t = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(t);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const trimmedName = value.trim();
    const canProceed = trimmedName.length > 0;

    const handleNext = () => {
        if (!canProceed) return;
        setStep(2);
    };

    const handleCreate = () => {
        onConfirm(trimmedName, selectedPriority);
    };

    const handleSkipFocus = () => {
        onConfirm(trimmedName, undefined);
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-venture-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                aria-label="Close"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[0_24px_64px_rgba(0,0,0,0.18)]">

                {/* Avatar + greeting */}
                <div className="flex items-start gap-4 px-5 pt-5">
                    <DexoAvatar size="md" state="idle" pulse={false} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#f2f2f5]">Dexo</span>
                                <span className="ml-2 font-sans text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">AI Co-Founder</span>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
                            {step === 1 ? (
                                <>
                                    <h2 id="name-venture-title" className="font-sans text-[15px] font-semibold text-[var(--text-primary)]">
                                        {title}
                                    </h2>
                                    <p className="mt-1 font-sans text-[12.5px] leading-relaxed text-[var(--text-secondary)]">{description}</p>
                                </>
                            ) : (
                                <>
                                    <h2 id="name-venture-title" className="font-sans text-[15px] font-semibold text-[var(--text-primary)]">
                                        Set a focus for Dexo
                                    </h2>
                                    <p className="mt-1 font-sans text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                                        This shapes how Dexo frames its research and responses. You can change it anytime.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-1.5 px-5 pt-3">
                    {[1, 2].map((s) => (
                        <div
                            key={s}
                            className="h-[2px] flex-1 rounded-full transition-all duration-300"
                            style={{ background: s <= step ? '#f2f2f5' : 'rgba(255,255,255,0.08)' }}
                        />
                    ))}
                </div>

                {/* Step 1 â€” Name input */}
                {step === 1 && (
                    <div className="px-5 pb-5 pt-4">
                        <label htmlFor="venture-name-input" className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                            Venture name
                        </label>
                        <input
                            ref={inputRef}
                            id="venture-name-input"
                            type="text"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && canProceed) {
                                    e.preventDefault();
                                    handleNext();
                                }
                            }}
                            placeholder="e.g. Northwind Labs"
                            autoComplete="off"
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 font-sans text-[14px] text-[var(--text-primary)] placeholder:text-[var(--muted)] focus:border-[rgba(255,255,255,0.07)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.07)]"
                        />
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 font-sans text-[13px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!canProceed}
                                className="flex items-center gap-1.5 rounded-xl bg-[#f2f2f5] px-5 py-2.5 font-sans text-[13px] font-semibold text-white transition hover:bg-[#8a6fff] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2 â€” Focus selection */}
                {step === 2 && (
                    <div className="px-5 pb-5 pt-4">
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                            {VENTURE_PRIORITIES.filter((p) => p.id !== 'custom').map((p) => {
                                const isSelected = selectedPriority === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setSelectedPriority(isSelected ? undefined : p.id)}
                                        className={`group relative flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                                            isSelected
                                                ? 'border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.07)]'
                                                : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.07)]'
                                        }`}
                                    >
                                        {isSelected && (
                                            <span className="absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.07)]">
                                                <Check className="h-2 w-2 text-[#94a3b8]" strokeWidth={2.5} />
                                            </span>
                                        )}
                                        <span className="font-mono text-[11px] leading-none text-[var(--muted)]">{p.icon}</span>
                                        <span className={`font-sans text-[11.5px] font-semibold leading-tight ${isSelected ? 'text-[#e9e3ff]' : 'text-[var(--text-primary)]'}`}>
                                            {p.label}
                                        </span>
                                        <span className="font-sans text-[10px] leading-snug text-[var(--muted)]">{p.tagline}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 font-sans text-[13px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                            >
                                â† Back
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleSkipFocus}
                                    disabled={loading}
                                    className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 font-sans text-[13px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] disabled:opacity-50"
                                >
                                    {loading ? 'Creatingâ€¦' : 'Skip'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={loading}
                                    className="rounded-xl bg-[#f2f2f5] px-5 py-2.5 font-sans text-[13px] font-semibold text-white transition hover:bg-[#8a6fff] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? 'Creatingâ€¦' : "Let's build it â†’"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

