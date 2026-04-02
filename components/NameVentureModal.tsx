'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface NameVentureModalProps {
    open: boolean;
    onClose: () => void;
    /** Called with trimmed name; empty string falls back to default venture naming in the shell. */
    onConfirm: (name: string) => void;
    /** Shown above the field */
    title?: string;
    /** Shown under the title */
    description?: string;
}

export function NameVentureModal({
    open,
    onClose,
    onConfirm,
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
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-venture-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                aria-label="Close"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-brand-panel shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06]">
                <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
                    <div className="min-w-0">
                        <h2 id="name-venture-title" className="text-[15px] font-semibold tracking-tight text-brand-text">
                            {title}
                        </h2>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-brand-muted">{description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-white/[0.06] hover:text-brand-text"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="px-5 py-4">
                    <label htmlFor="venture-name-input" className="sr-only">
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
                        className="w-full rounded-xl border border-white/[0.1] bg-brand-bg/80 px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted/60 focus:border-brand-teal/40 focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                    />
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium text-brand-text transition-colors hover:bg-white/[0.08]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            className="rounded-xl bg-brand-teal px-4 py-2.5 text-[13px] font-semibold text-[#131314] shadow-md shadow-black/20 transition-colors hover:bg-brand-teal/90"
                        >
                            Continue to Assistant
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
