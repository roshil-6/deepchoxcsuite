'use client';

import React from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { DeskChatThreadMount } from '@/components/DeskChatThreadSlotContext';
/** User-side â€œquestionâ€ bubble in desk block-focus mode */
export function DeskMsgUser({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[min(100%,34rem)] rounded-2xl rounded-br-sm border border-white/[0.09] bg-white/[0.07] px-3.5 py-2.5 text-left sm:px-4 sm:py-3">
                {children}
            </div>
        </div>
    );
}

/** Assistant-side details â€” label only; body flows on the canvas (no inner â€œcardâ€ around block content). */
export function DeskMsgAssistant({
    children,
    variant = 'default',
    hideDetailsLabel = false,
}: {
    children: React.ReactNode;
    /** Full width for large canvases (e.g. strategy flow map). */
    variant?: 'default' | 'fullBleed';
    /** Hide the â€œDetailsâ€ kicker (e.g. long-form narrative should feel like the page, not a inset panel). */
    hideDetailsLabel?: boolean;
}) {
    const full = variant === 'fullBleed';
    return (
        <>
            <div
                className={
                    full
                        ? 'flex min-h-0 w-full min-w-0 flex-1 flex-col'
                        : 'w-full max-w-[min(100%,42rem)]'
                }
            >
                {hideDetailsLabel ? null : (
                    <p className="mb-2 shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Details</p>
                )}
                <div
                    className={
                        full
                            ? 'min-h-0 flex-1 text-[13px] leading-relaxed text-zinc-300'
                            : 'text-[13px] leading-relaxed text-zinc-300'
                    }
                >
                    {children}
                </div>
            </div>
            <DeskChatThreadMount
                className={
                    full
                        ? 'mx-auto mt-4 w-full max-w-[min(100%,42rem)] sm:mt-5'
                        : 'mx-0 mt-4 max-w-[min(100%,42rem)] sm:mt-5'
                }
            />
        </>
    );
}

export function DeskHubRow({
    title,
    subtitle,
    onOpen,
    right,
}: {
    title: string;
    subtitle: string;
    onOpen: () => void;
    right?: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-left transition-colors duration-150 hover:border-white/[0.13] hover:bg-white/[0.045] sm:gap-3 sm:px-3.5 sm:py-3"
        >
            <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-snug text-zinc-100">{title}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-zinc-500 sm:text-[11px]">{subtitle}</span>
            </span>
            {right ? <span className="shrink-0 pt-0.5">{right}</span> : null}
        </button>
    );
}

export function DeskFocusToolbar({
    onBack,
    title,
    hint = 'Replies show under Details; type in the bar below. Same context until Back.',
    onSave,
    saving,
    saveLabel = 'Save',
    saveClassName,
    className = '',
    layout = 'default',
}: {
    onBack: () => void;
    title: string;
    hint?: string;
    onSave?: () => void;
    saving?: boolean;
    saveLabel?: string;
    saveClassName?: string;
    /** Merged onto header â€” e.g. `border-b-0 bg-transparent` for a flat document surface */
    className?: string;
    /** `compact` â€” back + save only (title lives in the page body). */
    layout?: 'default' | 'compact';
}) {
    const saveBtn =
        saveClassName ??
        'inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.1] px-2 py-1 text-[11px] font-medium text-[#0a0a0a] bg-[var(--accent)] hover:opacity-90';
    const headerBase = `relative z-30 flex shrink-0 items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2 ${className}`;

    if (layout === 'compact') {
        return (
            <header className={`${headerBase} border-b-0 bg-transparent`}>
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-zinc-200 transition hover:bg-white/[0.07]"
                >
                    <ArrowLeft className="h-3 w-3" aria-hidden />
                    Back
                </button>
                <div className="min-w-0 flex-1" aria-hidden />
                {onSave ? (
                    <button type="button" onClick={onSave} className={saveBtn}>
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {saveLabel}
                    </button>
                ) : null}
            </header>
        );
    }

    return (
        <header
            className={`${headerBase} border-b border-white/[0.06] bg-[#111117]`}
        >
            <button
                type="button"
                onClick={onBack}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-zinc-200 transition hover:bg-white/[0.07]"
            >
                <ArrowLeft className="h-3 w-3" aria-hidden />
                Back
            </button>
            <div className="min-w-0 flex-1">
                <h2 className="truncate text-[13px] font-medium text-zinc-100">{title}</h2>
                <p className="truncate text-[10px] text-zinc-500">{hint}</p>
            </div>
            {onSave ? (
                <button type="button" onClick={onSave} className={saveBtn}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    {saveLabel}
                </button>
            ) : null}
        </header>
    );
}

