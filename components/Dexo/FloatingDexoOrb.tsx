'use client';

/**
 * Floating Dexo Orb — draggable FAB
 * Icon: sphere of dots (golden-ratio distribution, 3D projection)
 * Click: navigates to Dexo room
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOffice } from '@/lib/OfficeContext';

const STORAGE_KEY = 'deepchox-dexo-orb-offset';
const DRAG_THRESHOLD_PX = 8;

function readOffset(): { x: number; y: number } {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { x: 0, y: 0 };
        const p = JSON.parse(raw) as unknown;
        if (p && typeof p === 'object' && 'x' in p && typeof (p as { x: unknown }).x === 'number') {
            return {
                x: (p as { x: number }).x,
                y: typeof (p as { y: unknown }).y === 'number' ? (p as { y: number }).y : 0,
            };
        }
    } catch { /* noop */ }
    return { x: 0, y: 0 };
}

function saveOffset(o: { x: number; y: number }) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); } catch { /* noop */ }
}

// ─── Sphere dot icon (golden-ratio dot distribution, 3D projection) ───────────

interface Dot { x: number; y: number; r: number; opacity: number; }

function buildSphereDots(size: number): Dot[] {
    const S = size;
    const cx = S / 2;
    const cy = S / 2;
    const radius = S * 0.43;
    const TOTAL = 160;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const dots: Dot[] = [];

    for (let i = 0; i < TOTAL; i++) {
        const t = i / (TOTAL - 1);
        const inclination = Math.acos(1 - 2 * t);
        const azimuth = goldenAngle * i;

        const x3 = Math.sin(inclination) * Math.cos(azimuth);
        const y3 = Math.sin(inclination) * Math.sin(azimuth);
        const z3 = Math.cos(inclination);

        // skip back hemisphere (hidden)
        if (z3 < -0.1) continue;

        const px = cx + x3 * radius;
        const py = cy + y3 * radius * 0.96;

        // depth: front dots bigger + brighter
        const depth = (z3 + 1) / 2; // 0..1
        const dotR  = 0.55 + depth * 1.35;
        const alpha = 0.18 + depth * 0.72;

        dots.push({ x: px, y: py, r: dotR, opacity: alpha });
    }

    return dots;
}

function DexoSphereIcon({ size = 36, color = 'currentColor' }: { size?: number; color?: string }) {
    const dots = useMemo(() => buildSphereDots(size), [size]);

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {dots.map((d, i) => (
                <circle
                    key={i}
                    cx={d.x}
                    cy={d.y}
                    r={d.r}
                    fill={color}
                    opacity={d.opacity}
                />
            ))}
        </svg>
    );
}

// ─── Main FAB ─────────────────────────────────────────────────────────────────

export function FloatingDexoOrb() {
    const { activeProject, activeRoom, switchRoom } = useOffice();
    const [mounted, setMounted]   = useState(false);
    const [offset, setOffset]     = useState({ x: 0, y: 0 });
    const [hovered, setHovered]   = useState(false);
    const fabDragRef = useRef<{
        px: number; py: number; ox: number; oy: number; dragged: boolean;
    } | null>(null);

    useEffect(() => { setMounted(true); setOffset(readOffset()); }, []);

    // hide while already on dexo (no point showing it)
    const hidden = activeRoom === 'dexo';
    if (!mounted || !activeProject?.id || hidden) return null;

    const anchorStyle = {
        right: `max(0.75rem, calc(0.75rem - ${offset.x}px))`,
        bottom: `max(5rem, calc(5.75rem - ${offset.y}px))`,
    } as const;

    const onPointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        fabDragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y, dragged: false };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const d = fabDragRef.current;
        if (!d) return;
        const dx = e.clientX - d.px;
        const dy = e.clientY - d.py;
        if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) d.dragged = true;
        if (d.dragged) setOffset({ x: d.ox + dx, y: d.oy + dy });
    };

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        const d = fabDragRef.current;
        fabDragRef.current = null;
        try {
            const el = e.currentTarget as HTMLElement;
            if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        } catch { /* noop */ }
        setOffset((cur) => { saveOffset(cur); return cur; });
        if (d && !d.dragged) {
            // tap → open Dexo
            switchRoom('dexo');
        }
    }, [switchRoom]);

    const onPointerCancel = useCallback((e: React.PointerEvent) => {
        const d = fabDragRef.current;
        fabDragRef.current = null;
        try {
            const el = e.currentTarget as HTMLElement;
            if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        } catch { /* noop */ }
        if (d?.dragged) setOffset((cur) => { saveOffset(cur); return cur; });
    }, []);

    const fab = (
        <div className="fixed z-[10049]" style={anchorStyle}>
            {/* Tooltip */}
            {hovered && (
                <div
                    className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-xl border border-slate-700/40 bg-zinc-950 px-3 py-1.5 text-[11px] font-medium text-slate-300 shadow-xl"
                >
                    Open Dexo
                </div>
            )}

            <button
                type="button"
                title="Open Dexo · Drag to move"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className="group relative flex h-14 w-14 touch-none select-none items-center justify-center rounded-full transition-all duration-200 active:scale-95 active:cursor-grabbing"
                style={{
                    background: 'radial-gradient(circle at 38% 35%, rgba(71, 85, 105, 0.4) 0%, rgba(30, 41, 59, 0.5) 55%, rgba(15, 23, 42, 0.7) 100%)',
                    boxShadow: hovered
                        ? '0 0 0 1px rgba(100, 116, 139, 0.5), 0 0 28px rgba(100, 116, 139, 0.2), 0 8px 32px rgba(0,0,0,0.6)'
                        : '0 0 0 1px rgba(100, 116, 139, 0.25), 0 0 14px rgba(100, 116, 139, 0.08), 0 6px 24px rgba(0,0,0,0.55)',
                    transform: hovered ? 'scale(1.06)' : 'scale(1)',
                }}
                aria-label="Open Dexo"
            >
                {/* Outer glow ring */}
                <span
                    className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300"
                    style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(100, 116, 139, 0.08) 0%, transparent 70%)',
                        opacity: hovered ? 1 : 0.5,
                    }}
                    aria-hidden
                />

                {/* Sphere icon */}
                <span className="relative z-10 text-slate-300 transition-all duration-300">
                    <DexoSphereIcon size={30} color={hovered ? 'rgba(180, 188, 204, 1)' : 'rgba(148, 163, 184, 0.9)'} />
                </span>

                {/* Bottom drag indicator dots */}
                <span
                    className="pointer-events-none absolute bottom-[5px] left-1/2 flex -translate-x-1/2 gap-[3px] opacity-30 group-hover:opacity-60 transition-opacity"
                    aria-hidden
                >
                    <span className="h-[3px] w-[3px] rounded-full bg-slate-400" />
                    <span className="h-[3px] w-[3px] rounded-full bg-slate-400" />
                    <span className="h-[3px] w-[3px] rounded-full bg-slate-400" />
                </span>
            </button>
        </div>
    );

    return createPortal(fab, document.body);
}
