'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';

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
            className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-venture-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-[#030304]/80 backdrop-blur-sm"
                aria-label="Close"
                onClick={onClose}
            />
            <div
                className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[rgba(116,86,255,0.16)]"
                style={{
                    background: 'linear-gradient(160deg, #0e0c1c 0%, #08080e 100%)',
                    boxShadow: '0 32px_80px rgba(0,0,0,0.6), 0 0 0 1px rgba(116,86,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
            >
                {/* Top accent */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7456ff]/50 to-transparent" aria-hidden />

                {/* Avatar + greeting */}
                <div className="flex items-start gap-4 px-5 pt-5">
                    <DexoAvatar size="md" state="idle" pulse={false} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#7456ff]">Dexo</span>
                                <span className="ml-2 font-sans text-[9px] font-semibold uppercase tracking-widest text-zinc-600">AI Co-Founder</span>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 rounded-lg p-1.5 text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-300"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="mt-2 rounded-2xl rounded-tl-sm border border-[rgba(116,86,255,0.12)] bg-[rgba(116,86,255,0.06)] px-4 py-3">
                            <h2 id="name-venture-title" className="font-sans text-[15px] font-semibold text-white">
                                {title}
                            </h2>
                            <p className="mt-1 font-sans text-[12.5px] leading-relaxed text-zinc-400">{description}</p>
                        </div>
                    </div>
                </div>

                {/* Input */}
                <div className="px-5 pb-5 pt-4">
                    <label htmlFor="venture-name-input" className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
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
                        className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3 font-sans text-[14px] text-white placeholder:text-zinc-600 focus:border-[rgba(116,86,255,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(116,86,255,0.15)]"
                    />
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 font-sans text-[13px] font-medium text-zinc-400 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-zinc-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            className="rounded-xl bg-[#7456ff] px-5 py-2.5 font-sans text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(116,86,255,0.35)] transition hover:bg-[#8a6fff] hover:shadow-[0_0_28px_rgba(116,86,255,0.5)]"
                        >
                            Let&apos;s build it →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
