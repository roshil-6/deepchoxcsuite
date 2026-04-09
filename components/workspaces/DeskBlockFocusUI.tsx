'use client';

import React from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { DeskChatThreadMount } from '@/components/DeskChatThreadSlotContext';
/** User-side “question” bubble in desk block-focus mode */
export function DeskMsgUser({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[min(100%,34rem)] rounded-2xl rounded-br-md bg-zinc-700/35 px-3.5 py-2.5 text-left ring-1 ring-white/[0.08] sm:px-4 sm:py-3">
                {children}
            </div>
        </div>
    );
}

/** Assistant-side details — label only; body flows on the canvas (no inner “card” around block content). */
export function DeskMsgAssistant({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div className="w-full max-w-[min(100%,42rem)]">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Details</p>
                <div className="text-[13px] leading-relaxed text-zinc-300">{children}</div>
            </div>
            <DeskChatThreadMount className="mx-0 mt-4 max-w-[min(100%,42rem)] sm:mt-5" />
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
            className="flex w-full items-start gap-2 rounded-lg border border-white/[0.06] bg-zinc-900/12 px-3 py-2 text-left transition hover:border-white/[0.1] hover:bg-zinc-900/28 sm:gap-3 sm:px-3.5 sm:py-2.5"
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
}: {
    onBack: () => void;
    title: string;
    hint?: string;
    onSave?: () => void;
    saving?: boolean;
    saveLabel?: string;
    saveClassName?: string;
}) {
    const saveBtn =
        saveClassName ??
        'inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.1] px-2 py-1 text-[11px] font-medium text-[#0a0a0a] bg-[var(--accent)] hover:opacity-90';
    return (
        <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-brand-bg/90 px-3 py-1.5 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-2">
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
