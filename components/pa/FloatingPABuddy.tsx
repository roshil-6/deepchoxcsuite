'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, GripHorizontal, X } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { PA_BUDDY_NAME, PA_BUDDY_ROLE } from '@/lib/paBuddy';
import { PAChatSurface } from '@/components/pa/PersonalAssistantChatContext';

const STORAGE_KEY = 'deepchox-pa-float-offset';
const DRAG_THRESHOLD_PX = 10;

function readOffset(): { x: number; y: number } {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { x: 0, y: 0 };
        const p = JSON.parse(raw) as unknown;
        if (p && typeof p === 'object' && typeof (p as { x: unknown }).x === 'number') {
            return { x: (p as { x: number }).x, y: typeof (p as { y: unknown }).y === 'number' ? (p as { y: number }).y : 0 };
        }
    } catch {
        /* noop */
    }
    return { x: 0, y: 0 };
}

function persistOffset(cur: { x: number; y: number }) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
    } catch {
        /* noop */
    }
}

/**
 * Global floating Relay chat — same executiveThread as the Assistant room. Hidden while on the PA room to avoid duplicate composers.
 */
export function FloatingPABuddy() {
    const { activeProject, activeRoom } = useOffice();
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const panelDragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
    const fabDragRef = useRef<{ px: number; py: number; ox: number; oy: number; dragged: boolean } | null>(null);

    useEffect(() => setMounted(true), []);
    useEffect(() => {
        setOffset(readOffset());
    }, []);

    const hideLauncher = activeRoom === 'personal_assistant' || activeRoom === 'dexo';
    const bottomLift = hideLauncher ? '1rem' : '5.75rem';

    const anchorStyle = {
        right: `max(0.75rem, calc(0.75rem - ${offset.x}px))` as const,
        bottom: `max(0.75rem, calc(${bottomLift} - ${offset.y}px))` as const,
    };

    const onPointerDownHeader = useCallback(
        (e: React.PointerEvent) => {
            if ((e.target as HTMLElement).closest('button')) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            panelDragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
        },
        [offset.x, offset.y]
    );

    const onPointerMoveHeader = useCallback((e: React.PointerEvent) => {
        const d = panelDragRef.current;
        if (!d) return;
        const dx = e.clientX - d.px;
        const dy = e.clientY - d.py;
        setOffset({ x: d.ox + dx, y: d.oy + dy });
    }, []);

    const onPointerUpHeader = useCallback((e: React.PointerEvent) => {
        if (!panelDragRef.current) return;
        panelDragRef.current = null;
        try {
            const el = e.currentTarget as HTMLElement;
            if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        } catch {
            /* noop */
        }
        setOffset((cur) => {
            persistOffset(cur);
            return cur;
        });
    }, []);

    const onPointerDownFab = useCallback(
        (e: React.PointerEvent) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            fabDragRef.current = {
                px: e.clientX,
                py: e.clientY,
                ox: offset.x,
                oy: offset.y,
                dragged: false,
            };
        },
        [offset.x, offset.y]
    );

    const onPointerMoveFab = useCallback((e: React.PointerEvent) => {
        const d = fabDragRef.current;
        if (!d) return;
        const dx = e.clientX - d.px;
        const dy = e.clientY - d.py;
        if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) d.dragged = true;
        if (d.dragged) {
            setOffset({ x: d.ox + dx, y: d.oy + dy });
        }
    }, []);

    const onPointerUpFab = useCallback((e: React.PointerEvent) => {
        const d = fabDragRef.current;
        fabDragRef.current = null;
        try {
            const el = e.currentTarget as HTMLElement;
            if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        } catch {
            /* noop */
        }
        setOffset((cur) => {
            persistOffset(cur);
            return cur;
        });
        if (d && !d.dragged) setOpen(true);
    }, []);

    const onPointerCancelFab = useCallback((e: React.PointerEvent) => {
        const d = fabDragRef.current;
        fabDragRef.current = null;
        try {
            const el = e.currentTarget as HTMLElement;
            if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        } catch {
            /* noop */
        }
        if (d?.dragged) {
            setOffset((cur) => {
                persistOffset(cur);
                return cur;
            });
        }
    }, []);

    if (!mounted || !activeProject?.id || hideLauncher) return null;

    const panel = open ? (
        <div
            className="executive-panel-strong fixed z-[10050] flex w-[min(100vw-1.5rem,400px)] flex-col overflow-hidden"
            style={{
                ...anchorStyle,
                maxHeight: 'min(72vh, 580px)',
            }}
        >
            <header
                className="relative shrink-0 cursor-grab select-none border-b border-zinc-700/60 bg-gradient-to-b from-zinc-800 to-zinc-900 px-3 pb-3 pt-3 active:cursor-grabbing"
                onPointerDown={onPointerDownHeader}
                onPointerMove={onPointerMoveHeader}
                onPointerUp={onPointerUpHeader}
                onPointerCancel={onPointerUpHeader}
            >
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-700/80 hover:text-zinc-100"
                    aria-label="Close chat"
                >
                    <X className="h-4 w-4" strokeWidth={2} />
                </button>
                <div className="pr-11">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-500/60 bg-zinc-900">
                            <Bot className="relative h-5 w-5 text-zinc-200" strokeWidth={1.85} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-50">{PA_BUDDY_NAME}</p>
                            <p className="truncate text-[11px] text-zinc-500">{PA_BUDDY_ROLE}</p>
                        </div>
                        <GripHorizontal className="h-5 w-5 shrink-0 text-zinc-600" strokeWidth={2} aria-hidden />
                    </div>
                </div>
            </header>
            <div className="relative flex min-h-0 flex-1 flex-col bg-zinc-950" style={{ minHeight: 'min(52vh, 420px)' }}>
                <PAChatSurface variant="float" />
            </div>
        </div>
    ) : null;

    const fab = (
        <div className="fixed z-[10049]" style={anchorStyle}>
            <button
                type="button"
                title="Click to open · Drag to move"
                onPointerDown={onPointerDownFab}
                onPointerMove={onPointerMoveFab}
                onPointerUp={onPointerUpFab}
                onPointerCancel={onPointerCancelFab}
                className="group relative flex h-[3.5rem] w-[3.5rem] touch-none select-none items-center justify-center rounded-full border border-zinc-500/50 bg-zinc-950 text-zinc-100 transition hover:-translate-y-px hover:border-zinc-400/70 active:scale-[0.97] active:cursor-grabbing"
                aria-label={`Open ${PA_BUDDY_NAME}`}
            >
                <Bot className="relative h-[1.35rem] w-[1.35rem]" strokeWidth={2} aria-hidden />
                <span
                    className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-0.5 opacity-40 group-hover:opacity-70"
                    aria-hidden
                >
                    <span className="h-0.5 w-0.5 rounded-full bg-zinc-300" />
                    <span className="h-0.5 w-0.5 rounded-full bg-zinc-300" />
                    <span className="h-0.5 w-0.5 rounded-full bg-zinc-300" />
                </span>
            </button>
        </div>
    );

    return createPortal(
        <>
            {!open ? fab : null}
            {panel}
        </>,
        document.body
    );
}
