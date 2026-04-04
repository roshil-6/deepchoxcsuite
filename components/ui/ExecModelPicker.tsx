'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Sparkles } from 'lucide-react';
import { EXEC_CHAT_MODEL_OPTIONS, type ExecChatModelId } from '@/lib/deskConstants';

type Props = {
    value: string;
    onChange: (id: ExecChatModelId) => void;
    /** Menu opens upward — use when the trigger sits on the bottom row of a composer */
    menuAbove?: boolean;
};

/**
 * Compact model switcher (Claude / Gemini / Cursor–style pill).
 * Full option list with blurbs in the popover only.
 */
export function ExecModelPicker({ value, onChange, menuAbove }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const uid = useId();
    const triggerId = `exec-model-trigger-${uid}`;
    const listId = `exec-model-list-${uid}`;

    const active =
        EXEC_CHAT_MODEL_OPTIONS.find((o) => o.id === value) ?? EXEC_CHAT_MODEL_OPTIONS[0];

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const menuPosition = menuAbove
        ? 'bottom-full left-0 mb-1.5 max-h-[min(40vh,280px)]'
        : 'top-full left-0 mt-1.5 max-h-[min(52vh,340px)]';

    return (
        <div className="relative shrink-0" ref={rootRef}>
            <button
                type="button"
                id={triggerId}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={listId}
                onClick={() => setOpen((v) => !v)}
                title={active.blurb}
                className="inline-flex h-8 max-w-[min(100%,200px)] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] pl-2 pr-2 text-left text-[12px] font-medium text-zinc-200 shadow-sm transition hover:border-white/[0.16] hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 sm:h-8 sm:max-w-[240px] sm:pl-2.5 sm:pr-2.5"
            >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                <span className="min-w-0 truncate tabular-nums">{active.label}</span>
                <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                />
            </button>

            {open ? (
                <ul
                    id={listId}
                    role="listbox"
                    aria-labelledby={triggerId}
                    className={`absolute z-[100] w-[min(calc(100vw-2rem),18rem)] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#141518]/98 p-1 shadow-[0_12px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.05] backdrop-blur-xl ${menuPosition}`}
                >
                    {EXEC_CHAT_MODEL_OPTIONS.map((opt) => {
                        const isSelected = opt.id === active.id;
                        return (
                            <li key={opt.id} role="presentation">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                                        isSelected
                                            ? 'bg-white/[0.08] text-zinc-50'
                                            : 'text-zinc-300 hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                                        {isSelected ? (
                                            <Check className="h-3.5 w-3.5 text-zinc-400" strokeWidth={2.5} aria-hidden />
                                        ) : null}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[12px] font-medium leading-tight">{opt.label}</span>
                                        <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{opt.blurb}</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </div>
    );
}
