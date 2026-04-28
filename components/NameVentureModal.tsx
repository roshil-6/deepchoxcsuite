'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';

export interface NameVentureModalProps {
    open: boolean;
    onClose: () => void;
    /** Called with trimmed name; empty string falls back to default venture naming in the shell. */
    onConfirm: (name: string) => void;
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
    description = 'You can change this later. Next, the Assistant helps you shape the venture in chat.',
}: NameVentureModalProps) {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        setValue('');
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

    const submit = () => {
        onConfirm(value.trim());
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
                                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#7456ff]">Dexo</span>
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
                            <h2 id="name-venture-title" className="font-sans text-[15px] font-semibold text-[var(--text-primary)]">
                                {title}
                            </h2>
                            <p className="mt-1 font-sans text-[12.5px] leading-relaxed text-[var(--text-secondary)]">{description}</p>
                        </div>
                    </div>
                </div>

                {/* Input */}
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
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                submit();
                            }
                        }}
                        placeholder="e.g. Northwind Labs"
                        autoComplete="off"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 font-sans text-[14px] text-[var(--text-primary)] placeholder:text-[var(--muted)] focus:border-[rgba(116,86,255,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(116,86,255,0.12)]"
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
                            onClick={submit}
                            disabled={loading}
                            className="rounded-xl bg-[#7456ff] px-5 py-2.5 font-sans text-[13px] font-semibold text-white transition hover:bg-[#8a6fff] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? 'Creating…' : "Let's build it →"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
