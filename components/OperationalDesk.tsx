'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, Sparkles, X } from 'lucide-react';
import { DexoParticleCanvas } from '@/components/Dexo/DexoParticleSphere';
import { useOffice, type AgentRole } from '@/lib/OfficeContext';
import { useDeskChatThreadSlotState } from '@/components/DeskChatThreadSlotContext';
import type { StaffAttentionItem } from '@/lib/db';
import { buildDexoStaffAttentionBootstrap } from '@/lib/dexoStaffAttentionPrompt';

const STAFF_BANNER_OFFSET_KEY = 'deepchox-staff-attention-offset';

function readStaffBannerOffset(room: string): { x: number; y: number } {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
        const raw = localStorage.getItem(`${STAFF_BANNER_OFFSET_KEY}-${room}`);
        if (!raw) return { x: 0, y: 0 };
        const p = JSON.parse(raw) as { x?: unknown; y?: unknown };
        if (typeof p.x === 'number' && typeof p.y === 'number') return { x: p.x, y: p.y };
    } catch {
        /* noop */
    }
    return { x: 0, y: 0 };
}

function saveStaffBannerOffset(room: string, o: { x: number; y: number }) {
    try {
        localStorage.setItem(`${STAFF_BANNER_OFFSET_KEY}-${room}`, JSON.stringify(o));
    } catch {
        /* noop */
    }
}

function StaffAttentionBanner({
    room,
    waiting,
    dismissStaffAttention,
}: {
    room: string;
    waiting: StaffAttentionItem[];
    dismissStaffAttention: (id: string) => void | Promise<void>;
}) {
    const { switchRoom, setDexoBootstrap } = useOffice();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const offsetRef = useRef(offset);
    offsetRef.current = offset;

    const setOffsetSynced = useCallback((next: { x: number; y: number }) => {
        offsetRef.current = next;
        setOffset(next);
    }, []);
    const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
    const [closingAll, setClosingAll] = useState(false);

    useEffect(() => {
        const o = readStaffBannerOffset(room);
        const maxY =
            typeof window !== 'undefined' ? Math.min(220, Math.round(window.innerHeight * 0.22)) : 200;
        const maxX = Math.min(typeof window !== 'undefined' ? window.innerWidth : 800, 800) * 0.42;
        const clamped = {
            x: Math.max(-maxX, Math.min(maxX, o.x)),
            y: Math.max(-maxY, Math.min(maxY, o.y)),
        };
        offsetRef.current = clamped;
        setOffset(clamped);
        if (clamped.x !== o.x || clamped.y !== o.y) saveStaffBannerOffset(room, clamped);
    }, [room]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        const t = e.target as HTMLElement;
        if (t.closest('button') || t.closest('a')) return;
        const o = offsetRef.current;
        dragRef.current = { px: e.clientX, py: e.clientY, ox: o.x, oy: o.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.px;
        const dy = e.clientY - d.py;
        const maxX = Math.min(typeof window !== 'undefined' ? window.innerWidth : 800, 800) * 0.42;
        const nx = Math.max(-maxX, Math.min(maxX, d.ox + dx));
        const maxY =
            typeof window !== 'undefined' ? Math.min(220, Math.round(window.innerHeight * 0.22)) : 200;
        const ny = Math.max(-maxY, Math.min(maxY, d.oy + dy));
        setOffsetSynced({ x: nx, y: ny });
    }, [setOffsetSynced]);

    const endDrag = useCallback(
        (e: React.PointerEvent) => {
            if (!dragRef.current) return;
            dragRef.current = null;
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                /* noop */
            }
            saveStaffBannerOffset(room, offsetRef.current);
        },
        [room]
    );

    const closeBanner = useCallback(() => {
        if (closingAll) return;
        setClosingAll(true);
        void Promise.allSettled(waiting.map((w) => Promise.resolve(dismissStaffAttention(w.id)))).finally(() => {
            setClosingAll(false);
        });
    }, [closingAll, dismissStaffAttention, waiting]);

    const banner = (
        <div
            className="pointer-events-none fixed right-2 bottom-28 z-[280] w-[min(calc(100vw-1rem),34rem)] max-w-[min(100vw-1rem,36rem)] sm:right-5 sm:bottom-32"
            style={{
                transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
        >
            <div
                className="pointer-events-auto max-h-[min(72dvh,28rem)] touch-none overflow-y-auto overflow-x-hidden rounded-2xl border border-white/[0.1] shadow-[0_16px_48px_rgba(0,0,0,0.55)] sm:p-4"
                style={{ background: 'linear-gradient(135deg, rgba(32,32,36,0.98), rgba(22,22,26,0.99))' }}
            >
                <div
                    role="toolbar"
                    aria-label="Move notification"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="flex cursor-grab items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2 active:cursor-grabbing sm:px-4 sm:py-2.5"
                >
                    <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                        <span className="select-none text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                            Drag to move
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={closeBanner}
                        disabled={closingAll}
                        className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Close notifications"
                        title="Close"
                    >
                        <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                </div>
                <div className="space-y-2.5 p-3.5 pt-3 sm:p-4 sm:pt-3">
                    <div className="flex flex-row items-start gap-3 sm:gap-4">
                        <div
                            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.12]"
                            style={{ background: 'radial-gradient(circle at 35% 25%, rgba(55,55,62,0.95), rgba(18,18,22,1))' }}
                            aria-hidden
                        >
                            <DexoParticleCanvas mode="floating" size={44} active />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2.5">
                            {waiting.slice(0, 2).map((w) => (
                                <div
                                    key={w.id}
                                    className="space-y-2 rounded-xl border border-white/[0.1] bg-white/[0.03] p-2.5 sm:p-3"
                                >
                                    <div className="text-[11px] leading-relaxed sm:text-[12px]" style={{ color: '#D4D4D8' }}>
                                        <p className="font-semibold text-[#FAFAFA]">{w.title}</p>
                                        <p className="mt-1.5" style={{ color: '#C4C4CC' }}>
                                            {w.message}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDexoBootstrap(buildDexoStaffAttentionBootstrap(w));
                                                switchRoom('dexo');
                                            }}
                                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/70 shadow-[0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/10 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10"
                                        >
                                            <Sparkles className="h-3.5 w-3.5 opacity-90" strokeWidth={2.25} aria-hidden />
                                            Set up now
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => dismissStaffAttention(w.id)}
                                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/[0.18] bg-white/[0.1] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-zinc-100 shadow-[0_1px_0_rgba(255,255,255,0.06)] transition hover:border-emerald-400/35 hover:bg-emerald-500/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45"
                                        >
                                            <X className="h-3.5 w-3.5 opacity-90" strokeWidth={2.25} aria-hidden />
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {waiting.length > 2 && (
                                <div className="text-[10px]" style={{ color: '#8B8B96' }}>
                                    +{waiting.length - 2} more
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (!mounted || typeof document === 'undefined') return null;
    return createPortal(banner, document.body);
}

/** Hub view: registers bottom slot for floating thread. Block focus: inner `DeskChatThreadMount` under Details wins. */
export function OperationalDesk({ children }: { children: React.ReactNode }) {
    const { activeRoom, staffAttentionPending, dismissStaffAttention, deskSectionFocus } = useOffice();
    const slotCtx = useDeskChatThreadSlotState();
    const hubRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const set = slotCtx?.setDeskThreadSlot;
        if (!set || deskSectionFocus) return;
        const el = hubRef.current;
        if (el) set(el);
    }, [deskSectionFocus, slotCtx?.setDeskThreadSlot]);

    /** Clear hub slot when leaving an operational desk so dashboard/other rooms do not keep a stale DOM target. */
    useLayoutEffect(() => {
        const set = slotCtx?.setDeskThreadSlot;
        return () => {
            set?.(null);
        };
    }, [slotCtx?.setDeskThreadSlot]);

    const deskRole = activeRoom as AgentRole;
    const waiting = staffAttentionPending.filter((i) => i.role === deskRole);

    return (
        <div className="relative flex min-h-0 w-full flex-1 flex-col bg-transparent">
            {waiting.length > 0 && (
                <StaffAttentionBanner room={activeRoom} waiting={waiting} dismissStaffAttention={dismissStaffAttention} />
            )}
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
            <div ref={hubRef} className="mx-auto w-full max-w-3xl shrink-0 px-0" aria-hidden />

        </div>
    );
}


