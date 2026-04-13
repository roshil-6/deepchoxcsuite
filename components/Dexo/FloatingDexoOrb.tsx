'use client';

/**
 * Floating Dexo Orb — draggable FAB
 * Live canvas sphere that rotates + breathes, reacts to hover
 * Voice greeting on first touch, welcome back on subsequent touches
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOffice } from '@/lib/OfficeContext';

const STORAGE_KEY     = 'deepchox-dexo-orb-offset';
const TOUCH_COUNT_KEY = 'deepchox-dexo-touches';
const DRAG_THRESHOLD  = 6;
const ORB_SIZE        = 72; // px — the button diameter
const CANVAS_SIZE     = 50; // canvas sphere inside

// ─── Voice helpers ──────────────────────────────────────────────────────────

function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const voice =
        voices.find((v) => /google uk english male/i.test(v.name)) ??
        voices.find((v) => /daniel|oliver|aaron/i.test(v.name)) ??
        voices.find((v) => v.lang === 'en-GB' && v.name.toLowerCase().includes('male')) ??
        voices.find((v) => v.lang.startsWith('en-') && !/(female|zira|hazel|cortana)/i.test(v.name)) ??
        voices[0];
    if (voice) utt.voice = voice;
    window.speechSynthesis.speak(utt);
}

function getTouchCount(): number {
    if (typeof window === 'undefined') return 0;
    try {
        const raw = localStorage.getItem(TOUCH_COUNT_KEY);
        return raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
        return 0;
    }
}

function incrementTouchCount(): number {
    if (typeof window === 'undefined') return 1;
    try {
        const next = getTouchCount() + 1;
        localStorage.setItem(TOUCH_COUNT_KEY, String(next));
        return next;
    } catch {
        return 1;
    }
}

function playDexoGreeting() {
    const count = incrementTouchCount();
    if (count === 1) {
        speak("Hello, I am Dexo. Let's analyze your venture and make it perfect.");
    } else {
        speak("Welcome back.");
    }
}

// ─── Persist helpers ──────────────────────────────────────────────────────────

function readOffset(): { x: number; y: number } {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { x: 0, y: 0 };
        const p = JSON.parse(raw) as { x?: unknown; y?: unknown };
        if (typeof p.x === 'number' && typeof p.y === 'number') return { x: p.x, y: p.y };
    } catch { /* noop */ }
    return { x: 0, y: 0 };
}

function saveOffset(o: { x: number; y: number }) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); } catch { /* noop */ }
}

// ─── CSS injected once ────────────────────────────────────────────────────────

const FAB_CSS = `
@keyframes fab-ping {
    0%   { transform: scale(1);    opacity: 0.55; }
    70%  { transform: scale(1.55); opacity: 0; }
    100% { transform: scale(1.55); opacity: 0; }
}
@keyframes fab-ring-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
@keyframes fab-ring-spin-r {
    from { transform: rotate(0deg); }
    to   { transform: rotate(-360deg); }
}
@keyframes fab-breathe {
    0%,100% { opacity: 0.45; }
    50%     { opacity: 0.75; }
}
`;

if (typeof document !== 'undefined') {
    const el = document.createElement('style');
    el.id = 'fab-css';
    if (!document.getElementById('fab-css')) {
        el.textContent = FAB_CSS;
        document.head.appendChild(el);
    }
}

// ─── Particle seed (built once) ───────────────────────────────────────────────

interface FParticle { theta: number; phi: number; baseR: number; phase: number; speed: number }

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const FAB_PARTICLES: FParticle[] = (() => {
    const out: FParticle[] = [];
    for (let i = 0; i < 220; i++) {
        out.push({
            theta: Math.acos(1 - 2 * (i / 219)),
            phi:   GOLDEN * i,
            baseR: i < 160 ? 0.42 : 0.22,   // outer + inner shell
            phase: Math.random() * Math.PI * 2,
            speed: 0.6 + Math.random() * 0.7,
        });
    }
    return out;
})();

// ─── Live canvas sphere ───────────────────────────────────────────────────────

function OrbCanvas({ size, hovered }: { size: number; hovered: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef    = useRef<number>(0);
    const hovRef    = useRef(hovered);
    hovRef.current  = hovered;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width  = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const cx = size / 2, cy = size / 2;
        const tiltX = 0.22;

        const draw = (ts: number) => {
            const t    = ts * 0.001;
            const hov  = hovRef.current;
            const rotY = t * (hov ? 0.55 : 0.22);

            ctx.clearRect(0, 0, size, size);

            const pts = FAB_PARTICLES.map((p) => {
                // Breathing pulse — faster + bigger on hover
                const breathe = hov
                    ? Math.sin(t * 3.8 * p.speed + p.phase) * 0.16
                    : Math.sin(t * 1.2 * p.speed + p.phase) * 0.04;
                const r   = size * p.baseR * (1 + breathe);
                const phi = p.phi + rotY;

                const x3 =  Math.sin(p.theta) * Math.cos(phi);
                const y3 =  Math.sin(p.theta) * Math.sin(phi) * Math.cos(tiltX) - Math.cos(p.theta) * Math.sin(tiltX);
                const z3 =  Math.sin(p.theta) * Math.sin(phi) * Math.sin(tiltX) + Math.cos(p.theta) * Math.cos(tiltX);

                return { x: cx + x3 * r, y: cy + y3 * r, z: z3, p };
            });

            pts.sort((a, b) => a.z - b.z);

            pts.forEach(({ x, y, z, p }) => {
                const depth = (z + 1) / 2;
                const hov   = hovRef.current;

                // Color: warm white idle → bright icy-blue on hover
                let cr: number, cg: number, cb: number;
                if (hov) {
                    const pulse = (Math.sin(ts * 0.005 + p.phase) + 1) / 2;
                    cr = Math.round(190 + pulse * 50);
                    cg = Math.round(215 + pulse * 30);
                    cb = 255;
                } else {
                    cr = 165; cg = 178; cb = 200;
                }

                const baseSize   = p.baseR > 0.3 ? 1.05 : 0.65;
                const dotR       = baseSize * (0.7 + depth * 1.6);
                const alpha      = (0.18 + depth * 0.72) * (hov ? 1 : 0.85);

                ctx.beginPath();
                ctx.arc(x, y, Math.max(0.25, dotR), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
                ctx.fill();

                // Soft glow halo on front particles when hovered
                if (hov && depth > 0.68 && p.baseR > 0.3) {
                    ctx.beginPath();
                    ctx.arc(x, y, dotR * 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${cr},${cg},${cb},${(alpha * 0.1).toFixed(3)})`;
                    ctx.fill();
                }
            });

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [size]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: size, height: size, display: 'block' }}
        />
    );
}

// ─── Main FAB ─────────────────────────────────────────────────────────────────

export function FloatingDexoOrb() {
    const { activeProject, activeRoom, switchRoom } = useOffice();
    const [mounted, setMounted] = useState(false);
    const [offset, setOffset]   = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);

    const dragRef = useRef<{
        px: number; py: number; ox: number; oy: number; dragged: boolean;
    } | null>(null);

    useEffect(() => { setMounted(true); setOffset(readOffset()); }, []);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y, dragged: false };
    }, [offset]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.px;
        const dy = e.clientY - d.py;
        if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) d.dragged = true;
        if (d.dragged) setOffset({ x: d.ox + dx, y: d.oy + dy });
    }, []);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        const d = dragRef.current;
        dragRef.current = null;
        try {
            const el = e.currentTarget as HTMLElement;
            if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        } catch { /* noop */ }
        setOffset((cur) => { saveOffset(cur); return cur; });
        if (d && !d.dragged) {
            playDexoGreeting();
            switchRoom('dexo');
        }
    }, [switchRoom]);

    const onPointerCancel = useCallback((e: React.PointerEvent) => {
        const d = dragRef.current;
        dragRef.current = null;
        try {
            const el = e.currentTarget as HTMLElement;
            if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        } catch { /* noop */ }
        if (d?.dragged) setOffset((cur) => { saveOffset(cur); return cur; });
    }, []);

    if (!mounted || !activeProject?.id || activeRoom === 'dexo') return null;

    const anchorStyle: React.CSSProperties = {
        right:  `max(0.75rem, calc(0.75rem - ${offset.x}px))`,
        bottom: `max(5rem,   calc(5.75rem  - ${offset.y}px))`,
    };

    const fab = (
        <div className="fixed z-[10049]" style={anchorStyle}>

            {/* Tooltip */}
            {hovered && (
                <div className="pointer-events-none absolute bottom-full right-0 mb-3 whitespace-nowrap rounded-xl border border-slate-700/40 bg-zinc-950/95 px-3 py-1.5 text-[11px] font-medium text-slate-300 shadow-2xl backdrop-blur-sm">
                    Open Dexo
                    <span className="ml-2 text-zinc-600">· drag to move</span>
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
                aria-label="Open Dexo"
                className="group relative touch-none select-none"
                style={{
                    width:  ORB_SIZE,
                    height: ORB_SIZE,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.3s ease',
                    transform: hovered ? 'scale(1.10)' : 'scale(1)',
                    background: hovered
                        ? 'radial-gradient(circle at 38% 35%, rgba(15,60,100,0.95) 0%, rgba(8,30,55,0.92) 55%, rgba(3,10,25,0.90) 100%)'
                        : 'radial-gradient(circle at 38% 35%, rgba(40,55,80,0.85)  0%, rgba(20,30,50,0.80) 55%, rgba(8,12,25,0.78) 100%)',
                    boxShadow: hovered
                        ? '0 0 0 1.5px rgba(100,160,220,0.55), 0 0 32px rgba(80,140,210,0.30), 0 0 70px rgba(60,120,190,0.15), 0 12px 40px rgba(0,0,0,0.7)'
                        : '0 0 0 1px rgba(80,100,130,0.35), 0 0 18px rgba(80,100,130,0.10), 0 8px 28px rgba(0,0,0,0.6)',
                }}
            >
                {/* Persistent slow ping ring */}
                <span
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{
                        border: '1px solid rgba(100,160,220,0.22)',
                        animation: 'fab-ping 3s ease-out infinite',
                    }}
                    aria-hidden
                />

                {/* Hover: second ping ring */}
                {hovered && (
                    <span
                        className="pointer-events-none absolute inset-0 rounded-full"
                        style={{
                            border: '1px solid rgba(120,180,255,0.18)',
                            animation: 'fab-ping 3s ease-out 1s infinite',
                        }}
                        aria-hidden
                    />
                )}

                {/* Spinning orbit ring */}
                <span
                    className="pointer-events-none absolute rounded-full"
                    style={{
                        inset: -5,
                        border: '1px solid rgba(100,140,190,0.18)',
                        borderTopColor:    hovered ? 'rgba(120,180,255,0.55)' : 'rgba(100,140,190,0.30)',
                        borderRightColor:  'transparent',
                        borderBottomColor: 'transparent',
                        animation: 'fab-ring-spin 5s linear infinite',
                        transition: 'border-top-color 0.3s',
                    }}
                    aria-hidden
                />

                {/* Counter-rotating dashed ring */}
                <span
                    className="pointer-events-none absolute rounded-full"
                    style={{
                        inset: -10,
                        border: '1px dashed rgba(80,120,170,0.12)',
                        borderTopColor: hovered ? 'rgba(100,160,230,0.25)' : 'transparent',
                        animation: 'fab-ring-spin-r 9s linear infinite',
                    }}
                    aria-hidden
                />

                {/* Inner ambient glow disc */}
                <span
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{
                        background: hovered
                            ? 'radial-gradient(circle, rgba(80,150,255,0.12) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(80,100,140,0.06) 0%, transparent 70%)',
                        animation: 'fab-breathe 3s ease-in-out infinite',
                        transition: 'background 0.4s',
                    }}
                    aria-hidden
                />

                {/* Live canvas sphere */}
                <span className="relative z-10" style={{ display: 'flex' }}>
                    <OrbCanvas size={CANVAS_SIZE} hovered={hovered} />
                </span>

                {/* "dexo" label underneath — fades in on hover */}
                <span
                    className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold uppercase tracking-[0.18em] transition-opacity duration-200"
                    style={{ color: 'rgba(120,140,170,0.7)', opacity: hovered ? 1 : 0 }}
                    aria-hidden
                >
                    dexo
                </span>
            </button>
        </div>
    );

    return createPortal(fab, document.body);
}
