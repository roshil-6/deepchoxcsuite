'use client';

/**
 * Shared 3D-ish particle sphere for Deepchox — tuned to fill the circular viewport edge-to-edge.
 */

import React, { useEffect, useRef } from 'react';
import type { VoiceState as ConvoVoiceState } from '@/lib/useDexoConversationalVoice';

interface SParticle {
    theta: number;
    phi: number;
    baseR: number;
    phase: number;
    phase2: number;
    phase3: number;
    speed: number;
    layer: 'outer' | 'mid' | 'inner';
}

function buildParticles(): SParticle[] {
    const golden = Math.PI * (3 - Math.sqrt(5));
    const out: SParticle[] = [];
    // Outer shell — dense, pushes to rim of the circle
    for (let i = 0; i < 280; i++) {
        const theta = Math.acos(1 - 2 * (i / 279));
        out.push({
            theta,
            phi: golden * i,
            baseR: 0.46 + Math.random() * 0.06,
            phase: Math.random() * Math.PI * 2,
            phase2: Math.random() * Math.PI * 2,
            phase3: Math.random() * Math.PI * 2,
            speed: 0.65 + Math.random() * 0.85,
            layer: 'outer',
        });
    }
    for (let i = 0; i < 110; i++) {
        const theta = Math.acos(1 - 2 * (i / 109));
        out.push({
            theta,
            phi: golden * i * 1.4,
            baseR: 0.28 + Math.random() * 0.04,
            phase: Math.random() * Math.PI * 2,
            phase2: Math.random() * Math.PI * 2,
            phase3: Math.random() * Math.PI * 2,
            speed: 0.45 + Math.random() * 0.55,
            layer: 'mid',
        });
    }
    for (let i = 0; i < 45; i++) {
        const theta = Math.acos(1 - 2 * (i / 44));
        out.push({
            theta,
            phi: golden * i * 1.9,
            baseR: 0.1 + Math.random() * 0.06,
            phase: Math.random() * Math.PI * 2,
            phase2: Math.random() * Math.PI * 2,
            phase3: Math.random() * Math.PI * 2,
            speed: 0.35 + Math.random() * 0.45,
            layer: 'inner',
        });
    }
    return out;
}

const SPHERE_PARTICLES = buildParticles();

/** Maps 3D sphere radius so projected points use ~full canvas radius (was ~0.52 → tiny blob). */
const RADIUS_FIT_ROOM = 0.93;
const RADIUS_FIT_FLOATING = 0.96;

export type DexoParticleCanvasProps =
    | {
          size: number;
          mode: 'room';
          state: ConvoVoiceState | 'loading';
      }
    | {
          size: number;
          mode: 'floating';
          /** Hovered or chat open — brighter / slightly faster */
          active: boolean;
      };

export function DexoParticleCanvas(props: DexoParticleCanvasProps) {
    const { size, mode } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const roomStateRef = useRef<ConvoVoiceState | 'loading'>('idle');
    const floatingActiveRef = useRef(false);

    if (props.mode === 'room') {
        roomStateRef.current = props.state;
    } else {
        floatingActiveRef.current = props.active;
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);
        const cx = size / 2;
        const cy = size / 2;
        const radiusFit = mode === 'floating' ? RADIUS_FIT_FLOATING : RADIUS_FIT_ROOM;
        const tiltX = 0.18;

        const draw = (ts: number) => {
            const t = ts * 0.001;
            ctx.clearRect(0, 0, size, size);
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, size / 2 - 0.5, 0, Math.PI * 2);
            ctx.clip();

            const rs = mode === 'room' ? roomStateRef.current : null;
            const rotY =
                mode === 'floating'
                    ? t * (floatingActiveRef.current ? 0.42 : 0.2)
                    : t *
                      (rs === 'speaking' ? 0.55 : rs === 'listening' ? 0.35 : 0.18);

            const pts = SPHERE_PARTICLES.map((p) => {
                let rScale = p.baseR;

                if (mode === 'room') {
                    const rs = roomStateRef.current;
                    if (rs === 'speaking') {
                        const w1 = Math.sin(t * 4.2 * p.speed + p.phase) * 0.2;
                        const w2 = Math.sin(t * 7.1 * p.speed + p.phase2) * 0.11;
                        const w3 = Math.sin(t * 2.3 + p.phase3) * 0.08;
                        const chaos =
                            p.layer === 'outer' ? Math.sin(t * 11 * p.speed + p.phase + p.phase2) * 0.07 : 0;
                        rScale *= 1 + w1 + w2 + w3 + chaos;
                    } else if (rs === 'listening') {
                        rScale *= 1 + Math.sin(t * 2.8 * p.speed + p.phase) * 0.12;
                    } else if (rs === 'thinking') {
                        rScale *= 1 + Math.sin(t * 5 * p.speed + p.phase) * 0.09;
                    } else if (rs === 'loading') {
                        rScale *= 1 + Math.sin(t * 0.9 * p.speed + p.phase) * 0.04;
                    } else {
                        rScale *= 1 + Math.sin(t * 1.1 * p.speed + p.phase) * 0.035;
                    }
                } else {
                    const pulse = floatingActiveRef.current ? 0.06 : 0.03;
                    rScale *= 1 + Math.sin(t * 2.2 * p.speed + p.phase) * pulse;
                }

                const r = size * rScale * radiusFit;
                const phi = p.phi + rotY;
                const x3 = Math.sin(p.theta) * Math.cos(phi);
                const y3 =
                    Math.sin(p.theta) * Math.sin(phi) * Math.cos(tiltX) - Math.cos(p.theta) * Math.sin(tiltX);
                const z3 =
                    Math.sin(p.theta) * Math.sin(phi) * Math.sin(tiltX) + Math.cos(p.theta) * Math.cos(tiltX);
                return { x: cx + x3 * r, y: cy + y3 * r, z: z3, p, t };
            });

            pts.sort((a, b) => a.z - b.z);

            pts.forEach(({ x, y, z, p }) => {
                const depth = (z + 1) / 2;
                const baseSize = p.layer === 'outer' ? 1.15 : p.layer === 'mid' ? 0.78 : 0.58;
                let dotR: number;
                let cr: number;
                let cg: number;
                let cb: number;
                let alpha: number;

                if (mode === 'floating') {
                    const lit = floatingActiveRef.current;
                    const pulse = (Math.sin(t * 2 + p.phase) + 1) / 2;
                    cr = Math.round(110 + pulse * 40);
                    cg = Math.round(115 + pulse * 35);
                    cb = Math.round(200 + pulse * 35);
                    alpha = (0.22 + depth * 0.72) * (lit ? 0.95 : 0.72);
                    dotR = baseSize * (0.85 + depth * 1.65) * (lit ? 1.05 : 1);
                } else {
                    const rs = roomStateRef.current;
                    if (rs === 'speaking') {
                        const pulse = (Math.sin(t * 5.5 + p.phase) + 1) / 2;
                        const pulse2 = (Math.sin(t * 3.1 + p.phase2) + 1) / 2;
                        cr = Math.round(40 + pulse * 60);
                        cg = Math.round(190 + pulse2 * 65);
                        cb = Math.round(180 + pulse * 50);
                        alpha = (0.25 + depth * 0.75) * (0.65 + Math.sin(t * 7 + p.phase) * 0.35);
                        dotR = baseSize * (0.9 + depth * 1.6) * (1 + Math.sin(t * 5 + p.phase) * 0.45);
                    } else if (rs === 'listening') {
                        const pulse = (Math.sin(t * 4 + p.phase) + 1) / 2;
                        cr = Math.round(230 + pulse * 25);
                        cg = Math.round(100 + pulse * 40);
                        cb = Math.round(160 + pulse * 50);
                        alpha = 0.25 + depth * 0.75;
                        dotR = baseSize * (0.8 + depth * 1.5);
                    } else if (rs === 'thinking') {
                        const pulse = (Math.sin(t * 3 + p.phase) + 1) / 2;
                        cr = Math.round(220 + pulse * 35);
                        cg = Math.round(170 + pulse * 40);
                        cb = Math.round(60 + pulse * 30);
                        alpha = 0.2 + depth * 0.7;
                        dotR = baseSize * (0.7 + depth * 1.4);
                    } else if (rs === 'loading') {
                        const pulse = (Math.sin(t * 1.5 + p.phase) + 1) / 2;
                        cr = Math.round(80 + pulse * 40);
                        cg = Math.round(80 + pulse * 30);
                        cb = Math.round(160 + pulse * 60);
                        alpha = 0.15 + depth * 0.45;
                        dotR = baseSize * (0.5 + depth * 1.1);
                    } else {
                        const pulse = (Math.sin(t * 1.5 + p.phase) + 1) / 2;
                        cr = Math.round(100 + pulse * 30);
                        cg = Math.round(100 + pulse * 20);
                        cb = Math.round(180 + pulse * 40);
                        alpha = 0.2 + depth * 0.65;
                        dotR = baseSize * (0.7 + depth * 1.5);
                    }
                }

                ctx.beginPath();
                ctx.arc(x, y, Math.max(0.25, dotR), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
                ctx.fill();

                if (mode === 'room' && roomStateRef.current === 'speaking' && depth > 0.72 && p.layer === 'outer') {
                    const dist = Math.hypot(x - cx, y - cy);
                    const maxHalo = Math.max(0.35, size * 0.48 - dist - 1);
                    const haloR = Math.min(dotR * 1.45, maxHalo);
                    if (haloR > 0.5) {
                        ctx.beginPath();
                        ctx.arc(x, y, haloR, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(${cr},${cg},${cb},${(alpha * 0.12).toFixed(3)})`;
                        ctx.fill();
                    }
                }
            });

            ctx.restore();
            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, [size, mode]);

    useEffect(() => {
        if (props.mode === 'room') {
            roomStateRef.current = props.state;
        } else {
            floatingActiveRef.current = props.active;
        }
    }, [props.mode, props.mode === 'room' ? props.state : (props as { active: boolean }).active]);

    return (
        <canvas
            ref={canvasRef}
            className="rounded-full"
            style={{ width: size, height: size, display: 'block' }}
            aria-hidden
        />
    );
}
