'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, GripHorizontal, X } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { PA_BUDDY_NAME, PA_BUDDY_ROLE, PA_BUDDY_TAGLINE } from '@/lib/paBuddy';
import { PAChatSurface } from '@/components/pa/PersonalAssistantChatContext';

const STORAGE_KEY = 'deepchox-pa-float-offset';

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

/**
 * Global floating Relay chat — same executiveThread as the Assistant room. Hidden while on the PA room to avoid duplicate composers.
 */
export function FloatingPABuddy() {
    const { activeProject, activeRoom } = useOffice();
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

    useEffect(() => setMounted(true), []);
    useEffect(() => {
        setOffset(readOffset());
    }, []);

    const hideLauncher = activeRoom === 'personal_assistant' || activeRoom === 'dexo';
    const bottomLift = hideLauncher ? '1rem' : '5.75rem';

    const onPointerDownHeader = useCallback((e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
    }, [offset.x, offset.y]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.px;
        const dy = e.clientY - d.py;
        setOffset({ x: d.ox + dx, y: d.oy + dy });
    }, []);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (!dragRef.current) return;
        dragRef.current = null;
        try {
            const el = e.currentTarget as HTMLElement;
            if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        } catch {
            /* noop */
        }
        setOffset((cur) => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
            } catch {
                /* noop */
            }
            return cur;
        });
    }, []);

    if (!mounted || !activeProject?.id || hideLauncher) return null;

    const panel = open ? (
        <div
            className="fixed z-[10050] flex w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden rounded-xl border border-zinc-600 bg-zinc-900"
            style={{
                right: `max(0.75rem, calc(0.75rem - ${offset.x}px))`,
                bottom: `max(0.75rem, calc(${bottomLift} - ${offset.y}px))`,
                maxHeight: 'min(72vh, 560px)',
            }}
        >
            <header
                className="flex shrink-0 cursor-grab select-none items-center gap-2 border-b border-zinc-600 bg-zinc-800 px-3 py-2.5 active:cursor-grabbing"
                onPointerDown={onPointerDownHeader}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-300">
                    <Bot className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <GripHorizontal className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold tracking-tight text-zinc-100">{PA_BUDDY_NAME}</p>
                    <p className="truncate text-[10px] text-zinc-400">{PA_BUDDY_ROLE}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
                    aria-label="Close chat"
                >
                    <X className="h-4 w-4" />
                </button>
            </header>
            <div className="relative flex min-h-0 flex-1 flex-col" style={{ minHeight: 'min(52vh, 420px)' }}>
                <PAChatSurface variant="float" />
            </div>
        </div>
    ) : null;

    const fab = (
        <div
            className="fixed z-[10049] flex max-w-[min(100vw-2rem,320px)] flex-col items-end gap-2"
            style={{ right: 'max(0.75rem, env(safe-area-inset-right))', bottom: `max(0.75rem, calc(${bottomLift} + env(safe-area-inset-bottom)))` }}
        >
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-3 rounded-xl border border-zinc-600 bg-zinc-800 py-2 pl-2.5 pr-3 text-left transition hover:border-zinc-500 hover:bg-zinc-700"
                aria-label={`Open ${PA_BUDDY_NAME}`}
            >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-300">
                    <Bot className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 py-0.5">
                    <span className="block text-[13px] font-semibold leading-tight text-zinc-100">{PA_BUDDY_NAME}</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-zinc-400">{PA_BUDDY_TAGLINE}</span>
                </span>
            </button>
        </div>
    );

    return createPortal(
        <>
            {fab}
            {panel}
        </>,
        document.body
    );
}
