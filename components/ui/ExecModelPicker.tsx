'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
 * Menu is portaled with fixed positioning so parent overflow-hidden does not clip it.
 */
export function ExecModelPicker({ value, onChange, menuAbove }: Props) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLUListElement>(null);
    const uid = useId();
    const triggerId = `exec-model-trigger-${uid}`;
    const listId = `exec-model-list-${uid}`;

    const active =
        EXEC_CHAT_MODEL_OPTIONS.find((o) => o.id === value) ?? EXEC_CHAT_MODEL_OPTIONS[0];

    useEffect(() => setMounted(true), []);

    const updatePosition = useCallback(() => {
        const el = rootRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const width = Math.min(window.innerWidth - 32, 288);
        let left = r.left;
        if (left + width > window.innerWidth - 16) left = window.innerWidth - width - 16;
        left = Math.max(8, left);

        if (menuAbove) {
            const cap = Math.min(window.innerHeight * 0.4, 280);
            const maxHeight = Math.min(cap, Math.max(120, r.top - 14));
            const top = Math.max(8, r.top - maxHeight - 6);
            setMenuStyle({
                position: 'fixed',
                top,
                left,
                width,
                maxHeight,
                overflowY: 'auto',
                zIndex: 10000,
            });
        } else {
            const cap = Math.min(window.innerHeight * 0.52, 340);
            const maxHeight = Math.min(cap, Math.max(120, window.innerHeight - r.bottom - 14));
            setMenuStyle({
                position: 'fixed',
                top: r.bottom + 6,
                left,
                width,
                maxHeight,
                overflowY: 'auto',
                zIndex: 10000,
            });
        }
    }, [menuAbove]);

    useLayoutEffect(() => {
        if (!open) {
            setMenuStyle(null);
            return;
        }
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
            setOpen(false);
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
                className="inline-flex h-8 max-w-[min(100%,220px)] items-center gap-1.5 rounded-full border-0 bg-transparent pl-2 pr-2 text-left text-[13px] font-medium text-zinc-200 transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:max-w-[260px]"
            >
                <Sparkles className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                <span className="min-w-0 truncate tabular-nums">{active.label}</span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                />
            </button>

            {mounted && open && menuStyle
                ? createPortal(
                      <ul
                          ref={menuRef}
                          id={listId}
                          role="listbox"
                          aria-labelledby={triggerId}
                          style={menuStyle}
                          className="rounded-xl border border-white/[0.1] bg-[#141518]/98 p-1 shadow-[0_12px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.05] backdrop-blur-xl"
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
                      </ul>,
                      document.body
                  )
                : null}
        </div>
    );
}
