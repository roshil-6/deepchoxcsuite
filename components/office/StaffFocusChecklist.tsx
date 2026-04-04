'use client';

import React, { useState } from 'react';
import { Check, Circle } from 'lucide-react';

type Props = {
    lines: string[];
    completedLines: string[];
    onMarkDone: (line: string, note?: string) => void | Promise<void>;
    disabled?: boolean;
    className?: string;
};

export function StaffFocusChecklist({ lines, completedLines, onMarkDone, disabled, className = '' }: Props) {
    const doneSet = new Set(completedLines.map((s) => s.trim()));
    const [noteFor, setNoteFor] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState('');
    const [busy, setBusy] = useState(false);

    if (!lines.length) return null;

    const submit = async (line: string, withNote: boolean) => {
        if (disabled || busy) return;
        setBusy(true);
        try {
            await onMarkDone(line, withNote ? noteDraft.trim() || undefined : undefined);
            setNoteFor(null);
            setNoteDraft('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <ul className={`divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.06] ${className}`}>
            {lines.map((line, i) => {
                const trimmed = line.trim();
                const done = doneSet.has(trimmed);
                const noteOpen = noteFor === line;
                return (
                    <li key={`${i}-${trimmed.slice(0, 48)}`} className="px-2.5 py-2 sm:px-3 sm:py-2">
                        <div className="flex items-start gap-2">
                            <span className="mt-0.5 shrink-0 text-zinc-500" aria-hidden>
                                {done ? <Check className="h-3.5 w-3.5 text-emerald-500/90" strokeWidth={2.5} /> : <Circle className="h-3.5 w-3.5" />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p
                                    className={`text-[13px] leading-snug ${done ? 'text-brand-muted line-through decoration-brand-muted/50' : 'text-brand-text'}`}
                                >
                                    {line}
                                </p>
                                {!done ? (
                                    <>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <button
                                                type="button"
                                                disabled={disabled || busy}
                                                onClick={() => submit(line, false)}
                                                className="text-[10px] font-medium text-amber-200/95 underline decoration-amber-500/40 underline-offset-2 hover:decoration-amber-400/70 disabled:opacity-50"
                                            >
                                                Done
                                            </button>
                                            <span className="text-[10px] text-brand-muted/40">·</span>
                                            <button
                                                type="button"
                                                disabled={disabled || busy}
                                                onClick={() => {
                                                    setNoteFor(noteOpen ? null : line);
                                                    if (noteOpen) setNoteDraft('');
                                                }}
                                                className="text-[10px] font-medium text-brand-muted underline decoration-white/15 underline-offset-2 hover:text-brand-text disabled:opacity-50"
                                            >
                                                {noteOpen ? 'Cancel note' : '+ note'}
                                            </button>
                                        </div>
                                        {noteOpen ? (
                                            <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-end">
                                                <textarea
                                                    value={noteDraft}
                                                    onChange={(e) => setNoteDraft(e.target.value)}
                                                    placeholder="Shipped / blocker / next…"
                                                    rows={2}
                                                    className="min-h-0 flex-1 resize-none rounded-md border border-white/[0.08] bg-black/25 px-2 py-1 text-[11px] text-brand-text placeholder:text-brand-muted/50"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={disabled || busy}
                                                    onClick={() => submit(line, true)}
                                                    className="shrink-0 rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-medium text-amber-100 disabled:opacity-50"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <span className="mt-0.5 inline-block text-[9px] text-emerald-500/70">Journal</span>
                                )}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
