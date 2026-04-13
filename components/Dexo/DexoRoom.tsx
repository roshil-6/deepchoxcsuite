'use client';

/**
 * Dexo — AI Command Center
 * Jarvis-style: non-blocking, always-interruptible, reactive orb
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    Loader2,
    Mic,
    MicOff,
    RefreshCw,
    Send,
    Sparkles,
    Square,
    Volume2,
    VolumeX,
    Zap,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import type { JarvisReport, JarvisSection } from '@/app/api/jarvis/route';

// ─── Global CSS ──────────────────────────────────────────────────────────────

const ORB_CSS = `
@keyframes orb-breathe {
    0%,100% { transform: scale(1);   opacity: 1; }
    50%      { transform: scale(1.06); opacity: 0.9; }
}
@keyframes orb-listen {
    0%,100% { box-shadow: 0 0 0 0 rgba(56,189,248,0), 0 0 60px rgba(56,189,248,0.25); transform: scale(1); }
    50%     { box-shadow: 0 0 0 18px rgba(56,189,248,0), 0 0 90px rgba(56,189,248,0.40); transform: scale(1.04); }
}
@keyframes orb-speak {
    0%,100% { box-shadow: 0 0 40px rgba(148,163,184,0.2); }
    50%     { box-shadow: 0 0 80px rgba(148,163,184,0.40); }
}
@keyframes ring-spin   { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
@keyframes ring-spin-r { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
@keyframes ping-slow   { 0%,100% { transform: scale(1);   opacity: 0.15; } 50% { transform: scale(1.35); opacity: 0; } }
@keyframes dexo-wave   { from { height: 3px; } to { height: 18px; } }
@keyframes p-float-a { 0%,100% { transform: translate(0,0)   scale(1);   opacity: 0.45; } 50% { transform: translate(6px,-7px)  scale(1.15); opacity: 1; } }
@keyframes p-float-b { 0%,100% { transform: translate(0,0)   scale(1);   opacity: 0.45; } 50% { transform: translate(-7px,6px)  scale(1.15); opacity: 1; } }
@keyframes p-float-c { 0%,100% { transform: translate(0,0)   scale(1);   opacity: 0.45; } 50% { transform: translate(5px,7px)   scale(1.15); opacity: 1; } }
@keyframes p-float-d { 0%,100% { transform: translate(0,0)   scale(1);   opacity: 0.3; }  50% { transform: translate(-5px,-6px) scale(1.1);  opacity: 0.85; } }
`;

if (typeof document !== 'undefined') {
    const el = document.createElement('style');
    el.textContent = ORB_CSS;
    document.head.appendChild(el);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// ─── Canvas sphere — 60fps, fully reactive ────────────────────────────────────

interface SParticle {
    theta: number; phi: number;
    baseR: number;
    phase: number; phase2: number; phase3: number;
    speed: number;
    layer: 'outer' | 'mid' | 'inner';
}

function buildParticles(): SParticle[] {
    const golden = Math.PI * (3 - Math.sqrt(5));
    const out: SParticle[] = [];
    // Outer shell — 260
    for (let i = 0; i < 260; i++) {
        const theta = Math.acos(1 - 2 * (i / 259));
        out.push({ theta, phi: golden * i, baseR: 0.42,
            phase: Math.random() * Math.PI * 2, phase2: Math.random() * Math.PI * 2, phase3: Math.random() * Math.PI * 2,
            speed: 0.7 + Math.random() * 0.8, layer: 'outer' });
    }
    // Mid shell — 100
    for (let i = 0; i < 100; i++) {
        const theta = Math.acos(1 - 2 * (i / 99));
        out.push({ theta, phi: golden * i * 1.4, baseR: 0.26,
            phase: Math.random() * Math.PI * 2, phase2: Math.random() * Math.PI * 2, phase3: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 0.6, layer: 'mid' });
    }
    // Inner core — 40
    for (let i = 0; i < 40; i++) {
        const theta = Math.acos(1 - 2 * (i / 39));
        out.push({ theta, phi: golden * i * 1.9, baseR: 0.12,
            phase: Math.random() * Math.PI * 2, phase2: Math.random() * Math.PI * 2, phase3: Math.random() * Math.PI * 2,
            speed: 0.4 + Math.random() * 0.4, layer: 'inner' });
    }
    return out;
}

const SPHERE_PARTICLES = buildParticles();

function DexoCanvas({ size, state }: { size: number; state: VoiceState | 'loading' }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef    = useRef<number>(0);
    const stateRef  = useRef(state);
    stateRef.current = state;

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

        const draw = (ts: number) => {
            const t = ts * 0.001;
            const st = stateRef.current;
            ctx.clearRect(0, 0, size, size);

            // Slow Y-axis rotation + tilt for idle/loading
            const rotY = t * (st === 'speaking' ? 0.55 : st === 'listening' ? 0.35 : 0.18);
            const tiltX = 0.18; // subtle tilt

            // Compute projected particles
            const pts = SPHERE_PARTICLES.map((p) => {
                let rScale = p.baseR;

                if (st === 'speaking') {
                    // Three overlapping wave frequencies for organic pulsation
                    const w1 = Math.sin(t * 4.2 * p.speed + p.phase)  * 0.20;
                    const w2 = Math.sin(t * 7.1 * p.speed + p.phase2) * 0.11;
                    const w3 = Math.sin(t * 2.3             + p.phase3) * 0.08; // global breath
                    // Outer layer gets extra chaos
                    const chaos = p.layer === 'outer'
                        ? Math.sin(t * 11 * p.speed + p.phase + p.phase2) * 0.07 : 0;
                    rScale *= (1 + w1 + w2 + w3 + chaos);
                } else if (st === 'listening') {
                    const w = Math.sin(t * 2.8 * p.speed + p.phase) * 0.12;
                    rScale *= (1 + w);
                } else if (st === 'processing') {
                    const w = Math.sin(t * 5 * p.speed + p.phase) * 0.09;
                    rScale *= (1 + w);
                } else if (st === 'loading') {
                    const w = Math.sin(t * 0.9 * p.speed + p.phase) * 0.04;
                    rScale *= (1 + w);
                } else {
                    const w = Math.sin(t * 1.1 * p.speed + p.phase) * 0.035;
                    rScale *= (1 + w);
                }

                const r = size * rScale;
                const phi = p.phi + rotY;

                // 3D → 2D with tilt
                const x3 =  Math.sin(p.theta) * Math.cos(phi);
                const y3 =  Math.sin(p.theta) * Math.sin(phi) * Math.cos(tiltX) - Math.cos(p.theta) * Math.sin(tiltX);
                const z3 =  Math.sin(p.theta) * Math.sin(phi) * Math.sin(tiltX) + Math.cos(p.theta) * Math.cos(tiltX);

                return { x: cx + x3 * r, y: cy + y3 * r, z: z3, p, t };
            });

            // Back-to-front sort
            pts.sort((a, b) => a.z - b.z);

            pts.forEach(({ x, y, z, p }) => {
                const depth = (z + 1) / 2; // 0=back, 1=front
                const baseSize = p.layer === 'outer' ? 1.1 : p.layer === 'mid' ? 0.75 : 0.55;

                let dotR: number, cr: number, cg: number, cb: number, alpha: number;

                if (st === 'speaking') {
                    // Color oscillates between ice-white and electric blue-white
                    const pulse  = (Math.sin(t * 5.5 + p.phase) + 1) / 2;
                    const pulse2 = (Math.sin(t * 3.1 + p.phase2) + 1) / 2;
                    cr = Math.round(190 + pulse * 55);
                    cg = Math.round(210 + pulse2 * 35);
                    cb = 255;
                    alpha = (0.25 + depth * 0.75) * (0.65 + Math.sin(t * 7 + p.phase) * 0.35);
                    dotR  = baseSize * (0.9 + depth * 1.6) * (1 + Math.sin(t * 5 + p.phase) * 0.45);
                } else if (st === 'listening') {
                    cr = 147; cg = 210; cb = 255;
                    alpha = 0.22 + depth * 0.78;
                    dotR  = baseSize * (0.8 + depth * 1.5);
                } else if (st === 'processing') {
                    cr = 251; cg = 200; cb = 100;
                    alpha = 0.2 + depth * 0.7;
                    dotR  = baseSize * (0.7 + depth * 1.4);
                } else if (st === 'loading') {
                    cr = 120; cg = 130; cb = 150;
                    alpha = 0.12 + depth * 0.42;
                    dotR  = baseSize * (0.5 + depth * 1.1);
                } else {
                    cr = 165; cg = 178; cb = 200;
                    alpha = 0.18 + depth * 0.68;
                    dotR  = baseSize * (0.7 + depth * 1.5);
                }

                ctx.beginPath();
                ctx.arc(x, y, Math.max(0.25, dotR), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
                ctx.fill();

                // Glow dot on front-facing particles when speaking
                if (st === 'speaking' && depth > 0.72 && p.layer === 'outer') {
                    ctx.beginPath();
                    ctx.arc(x, y, dotR * 2.2, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${cr},${cg},${cb},${(alpha * 0.12).toFixed(3)})`;
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

// ─── Voice orb ────────────────────────────────────────────────────────────────

function VoiceOrb({ state, onClick }: { state: VoiceState | 'loading'; onClick?: () => void }) {
    const listening  = state === 'listening';
    const speaking   = state === 'speaking';
    const processing = state === 'processing';
    const loading    = state === 'loading';

    const ringColor =
        listening  ? 'rgba(56,189,248,0.5)'  :
        speaking   ? 'rgba(148,163,184,0.4)' :
        processing ? 'rgba(251,191,36,0.4)'  :
        loading    ? 'rgba(100,116,139,0.3)' :
                     'rgba(100,116,139,0.18)';

    const glowStyle: React.CSSProperties = {
        animation:
            listening  ? 'orb-listen 1.8s ease-in-out infinite' :
            speaking   ? 'orb-speak 2s ease-in-out infinite'     :
            state === 'idle' ? 'orb-breathe 4s ease-in-out infinite' : 'none',
    };

    const bgStyle: React.CSSProperties = {
        background:
            listening  ? 'radial-gradient(circle at 38% 35%, rgba(12,74,110,0.9) 0%, rgba(8,47,73,0.85) 60%, rgba(3,20,35,0.8) 100%)' :
            speaking   ? 'radial-gradient(circle at 38% 35%, rgba(30,41,59,0.92) 0%, rgba(15,23,42,0.88) 60%, rgba(7,10,20,0.85) 100%)' :
            processing ? 'radial-gradient(circle at 38% 35%, rgba(78,50,10,0.85) 0%, rgba(40,28,5,0.82) 60%, rgba(20,14,3,0.8) 100%)'  :
            loading    ? 'radial-gradient(circle at 38% 35%, rgba(30,41,59,0.8)  0%, rgba(15,23,42,0.75) 60%, rgba(7,10,20,0.7) 100%)'  :
                         'radial-gradient(circle at 38% 35%, rgba(30,41,59,0.75) 0%, rgba(15,23,42,0.70) 60%, rgba(7,10,20,0.65) 100%)',
    };

    return (
        <div
            onClick={onClick}
            style={{ width: 120, height: 120, cursor: onClick ? 'pointer' : 'default', position: 'relative', ...glowStyle }}
        >
            {/* Outer ping rings */}
            {listening && <>
                <span style={{ position:'absolute', inset:-12, borderRadius:'50%', border:'1px solid rgba(56,189,248,0.25)', animation:'ping-slow 2s ease-in-out infinite' }} />
                <span style={{ position:'absolute', inset:-24, borderRadius:'50%', border:'1px solid rgba(56,189,248,0.12)', animation:'ping-slow 2s ease-in-out 0.5s infinite' }} />
            </>}
            {speaking && <>
                <span style={{ position:'absolute', inset:-8,  borderRadius:'50%', border:'1px solid rgba(148,163,184,0.2)', animation:'ring-spin 10s linear infinite' }} />
                <span style={{ position:'absolute', inset:-18, borderRadius:'50%', border:'1px dashed rgba(148,163,184,0.1)', animation:'ring-spin-r 14s linear infinite' }} />
            </>}

            {/* Main orb */}
            <div style={{
                position:'absolute', inset:0, borderRadius:'50%',
                border: `1.5px solid ${ringColor}`,
                transition: 'border-color 0.5s',
                ...bgStyle,
                display:'flex', alignItems:'center', justifyContent:'center',
                overflow: 'hidden',
            }}>
                {loading ? (
                    <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
                ) : (
                    <DexoCanvas size={64} state={state} />
                )}
            </div>
        </div>
    );
}

// ─── Wave bars ────────────────────────────────────────────────────────────────

function WaveBars({ active, color = 'bg-slate-400' }: { active: boolean; color?: string }) {
    return (
        <div className="flex items-center gap-[3px]">
            {[0,1,2,3,4].map((i) => (
                <div key={`w${i}`} className={`w-[2px] rounded-full ${color}`}
                    style={{
                        height: active ? `${9 + Math.sin(i*1.4)*7}px` : '3px',
                        opacity: active ? 1 : 0.25,
                        transition: 'height 0.1s',
                        animation: active ? `dexo-wave 0.6s ease-in-out ${i*90}ms infinite alternate` : 'none',
                    }} />
            ))}
        </div>
    );
}

// ─── Voice hook (Jarvis-style: interrupt + auto-listen after speak) ────────────

function useDexoVoice(onTranscript: (t: string) => void, onInterrupt?: () => void) {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recRef       = useRef<any>(null);
    const speakingRef  = useRef(false);
    const mutedRef     = useRef(false);

    const stopListening = useCallback(() => {
        recRef.current?.stop();
        setVoiceState('idle');
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
        speakingRef.current = false;
        setVoiceState('idle');
    }, []);

    const startListening = useCallback(() => {
        if (typeof window === 'undefined') return;
        // Interrupt Dexo if speaking
        if (speakingRef.current) {
            window.speechSynthesis?.cancel();
            speakingRef.current = false;
            onInterrupt?.();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
        if (!SR) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rec: any = new SR();
        rec.continuous      = false;
        rec.interimResults  = false;
        rec.lang            = 'en-US';
        rec.onstart  = () => setVoiceState('listening');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => {
            const txt: string = Array.from(e.results as ArrayLike<SpeechRecognitionResult>)
                .map((r) => r[0]?.transcript ?? '')
                .join(' ')
                .trim();
            if (txt) { onTranscript(txt); setVoiceState('processing'); }
        };
        rec.onerror = () => setVoiceState('idle');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onend   = () => setVoiceState((s: any) => s === 'listening' ? 'idle' : s);
        recRef.current = rec;
        rec.start();
    }, [onTranscript, onInterrupt]);

    const speak = useCallback((text: string, onEnd?: () => void) => {
        if (typeof window === 'undefined' || !window.speechSynthesis || mutedRef.current) {
            onEnd?.();
            return;
        }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        // Natural, slightly slower Jarvis-like voice
        utt.rate   = 0.88;
        utt.pitch  = 0.82;
        utt.volume = 1;

        const doSpeak = () => {
            const voices = window.speechSynthesis.getVoices();
            const voice =
                voices.find((v) => /google uk english male/i.test(v.name))       ??
                voices.find((v) => /daniel|oliver|aaron/i.test(v.name))           ??
                voices.find((v) => v.lang === 'en-GB' && v.name.toLowerCase().includes('male')) ??
                voices.find((v) => v.lang.startsWith('en-') && !/(female|zira|hazel|cortana)/i.test(v.name)) ??
                voices[0];
            if (voice) utt.voice = voice;
            utt.onstart = () => { speakingRef.current = true;  setVoiceState('speaking'); };
            utt.onend   = () => {
                speakingRef.current = false;
                setVoiceState('idle');
                onEnd?.();
            };
            utt.onerror = () => { speakingRef.current = false; setVoiceState('idle'); };
            window.speechSynthesis.speak(utt);
        };

        if (window.speechSynthesis.getVoices().length > 0) doSpeak();
        else window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
    }, []);

    // Expose mute control without re-creating the hook
    const setMuted = useCallback((m: boolean) => {
        mutedRef.current = m;
        if (m) { window.speechSynthesis?.cancel(); speakingRef.current = false; setVoiceState('idle'); }
    }, []);

    useEffect(() => () => {
        recRef.current?.stop();
        window.speechSynthesis?.cancel();
    }, []);

    return { voiceState, startListening, stopListening, speak, stopSpeaking, setMuted };
}

// ─── Status palettes ──────────────────────────────────────────────────────────

const SC = {
    strong:   { dot: 'bg-emerald-400', bar: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-300/90', label: 'Strong'   },
    caution:  { dot: 'bg-amber-400',   bar: 'bg-amber-400',   badge: 'bg-amber-500/10 text-amber-300/90',     label: 'Caution'  },
    risk:     { dot: 'bg-orange-400',  bar: 'bg-orange-400',  badge: 'bg-orange-500/10 text-orange-300/90',   label: 'Risk'     },
    critical: { dot: 'bg-red-400',     bar: 'bg-red-400',     badge: 'bg-red-500/10 text-red-300/90',         label: 'Critical' },
} as const;

const RC = {
    high:   { icon: 'text-red-400',   badge: 'border-red-500/25 bg-red-500/[0.08] text-red-300'       },
    medium: { icon: 'text-amber-400', badge: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300'  },
    low:    { icon: 'text-sky-400',   badge: 'border-sky-500/25 bg-sky-500/[0.08] text-sky-300'        },
} as const;

const TFC: Record<string, string> = {
    today:        'text-red-400/80',
    'this week':  'text-amber-400/80',
    'this month': 'text-sky-400/80',
};

// ─── Health strip ─────────────────────────────────────────────────────────────

function HealthStrip({ health }: { health: JarvisReport['health'] }) {
    const desks = ['strategy', 'finance', 'product', 'market', 'gtm'] as const;
    return (
        <div className="flex gap-2">
            {desks.map((d) => {
                const c = SC[health[d]];
                return (
                    <div key={d} className="flex flex-1 flex-col gap-1.5">
                        <div className="h-[3px] w-full rounded-full bg-white/[0.05]">
                            <div className={`h-full w-full rounded-full ${c.bar} opacity-60`} />
                        </div>
                        <span className="text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-700">{d}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Desk row ─────────────────────────────────────────────────────────────────

function DeskRow({ section, onRead }: { section: JarvisSection; onRead: (t: string) => void }) {
    const [open, setOpen] = useState(false);
    const c = SC[section.status];
    return (
        <div className="group">
            <button type="button" onClick={() => setOpen((v) => !v)}
                className="flex w-full items-start gap-4 py-3.5 text-left">
                <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2">
                    <span className="w-[52px] shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{section.desk}</span>
                    <span className={`shrink-0 rounded px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-wider ${c.badge}`}>{c.label}</span>
                    <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-slate-400">{section.insight}</span>
                </div>
                <span className="ml-2 mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60">
                    {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-600" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-600" />}
                </span>
            </button>
            {open && (
                <div className="mb-3 ml-[26px] space-y-2.5 border-l border-white/[0.06] pl-4">
                    <p className="text-[13px] leading-relaxed text-zinc-300">{section.insight}</p>
                    <div className="flex items-start gap-2">
                        <ArrowRight className="mt-[3px] h-3 w-3 shrink-0 text-zinc-600" />
                        <p className="text-[12px] leading-snug text-zinc-500">{section.action}</p>
                    </div>
                    <button type="button"
                        onClick={() => onRead(`${section.desk}. ${section.insight}. Next step: ${section.action}`)}
                        className="flex items-center gap-1.5 text-[10px] text-zinc-700 transition hover:text-zinc-400">
                        <Volume2 className="h-3 w-3" /> Read aloud
                    </button>
                </div>
            )}
            <div className="ml-[26px] h-px bg-white/[0.04]" />
        </div>
    );
}

// ─── Inline analyzing banner (non-blocking) ────────────────────────────────────

function AnalyzingBanner({ name }: { name: string }) {
    const desks = ['Strategy', 'Finance', 'Product', 'Market', 'GTM'];
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((n) => (n + 1) % desks.length), 850);
        return () => clearInterval(t);
    }, [desks.length]);

    return (
        <div className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-slate-700/30 bg-slate-900/30 px-6 py-5 text-center">
            <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-[13px] font-medium text-slate-300">Analyzing {name}</span>
            </div>
            <div className="flex items-center gap-2">
                {desks.map((d, i) => (
                    <span key={d}
                        className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-all duration-500"
                        style={{
                            color:        tick === i ? 'rgba(148,163,184,0.95)' : 'rgba(100,116,139,0.4)',
                            borderColor:  tick === i ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.04)',
                            background:   tick === i ? 'rgba(148,163,184,0.08)' : 'transparent',
                        }}>
                        {d}
                    </span>
                ))}
            </div>
            <p className="text-[11px] text-zinc-700">You can speak or type while Dexo is analyzing</p>
        </div>
    );
}

// ─── Full-screen centered loading (first analysis, no report yet) ─────────────

function AnalyzingCenter({ name, orbState }: { name: string; orbState: VoiceState | 'loading' }) {
    const desks = ['Strategy', 'Finance', 'Product', 'Market', 'GTM'];
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((n) => (n + 1) % desks.length), 850);
        return () => clearInterval(t);
    }, [desks.length]);

    return (
        <div className="flex flex-col items-center gap-8 text-center select-none px-6">
            <VoiceOrb state={orbState} />
            <div className="space-y-2">
                <p className="text-[17px] font-semibold tracking-tight text-zinc-200">Analyzing {name}</p>
                <p className="text-[12px] text-zinc-600">GPT-4o and Claude Haiku working simultaneously</p>
            </div>
            <div className="flex items-center gap-2">
                {desks.map((d, i) => (
                    <span key={d}
                        className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-all duration-500"
                        style={{
                            color:       tick === i ? 'rgba(148,163,184,0.95)' : 'rgba(100,116,139,0.4)',
                            borderColor: tick === i ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.04)',
                            background:  tick === i ? 'rgba(148,163,184,0.08)' : 'transparent',
                        }}>
                        {d}
                    </span>
                ))}
            </div>
            <p className="text-[11px] text-zinc-700">You can speak or type below while Dexo is analyzing</p>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DexoRoom() {
    const { activeProject } = useOffice();

    const [report, setReport]     = useState<JarvisReport | null>(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [isMuted, setIsMuted]   = useState(false);
    const [inputText, setInputText] = useState('');
    const [convo, setConvo]       = useState<{ role: 'user' | 'dexo'; text: string; id: number }[]>([]);
    const [showIntro, setShowIntro] = useState(true);
    const convoId = useRef(0);

    const inputRef   = useRef<HTMLTextAreaElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // ── Transcript handler: fill input and auto-submit ──
    const onTranscript = useCallback((t: string) => {
        setInputText(t);
        // Small delay so user sees what was transcribed, then auto-send
        setTimeout(() => {
            setInputText('');
            // We'll trigger send via a ref-based approach below
            pendingTranscriptRef.current = t;
        }, 400);
    }, []);

    const pendingTranscriptRef = useRef<string | null>(null);
    const runRef = useRef<((mode: 'analyze' | 'converse', userMsg?: string) => Promise<void>) | null>(null);

    const onInterrupt = useCallback(() => {
        // Dexo was interrupted — acknowledge it
        setConvo((prev) => [...prev, { role: 'dexo', text: '— interrupted —', id: ++convoId.current }]);
    }, []);

    const { voiceState, startListening, stopListening, speak, stopSpeaking, setMuted } = useDexoVoice(onTranscript, onInterrupt);
    const isListening  = voiceState === 'listening';
    const isSpeaking   = voiceState === 'speaking';
    const isProcessing = voiceState === 'processing';

    const buildCtx = useCallback((): string => {
        if (!activeProject) return '';
        const p: string[] = [`Venture: ${activeProject.name}`];
        if (activeProject.strategy)       p.push(`Strategy:\n${activeProject.strategy.slice(0, 3000)}`);
        if (activeProject.productPlan)    p.push(`Product:\n${activeProject.productPlan.slice(0, 2000)}`);
        if (activeProject.budget)         p.push(`Finance:\n${activeProject.budget.slice(0, 1500)}`);
        if (activeProject.marketInsights) p.push(`Market:\n${activeProject.marketInsights.slice(0, 1500)}`);
        if (activeProject.teamDirectives) p.push(`Directives:\n${activeProject.teamDirectives.slice(0, 800)}`);
        if (activeProject.userNotes)      p.push(`Notes:\n${activeProject.userNotes.slice(0, 800)}`);
        if (activeProject.agentStaffSnapshot?.summary)
            p.push(`Last sync:\n${activeProject.agentStaffSnapshot.summary}`);
        return p.join('\n\n');
    }, [activeProject]);

    const run = useCallback(async (mode: 'analyze' | 'converse', userMsg?: string) => {
        if (!activeProject?.id) return;
        setLoading(true); setError(null);
        // Stop speaking before making a new request
        if (isSpeaking) stopSpeaking();
        try {
            const res = await fetch('/api/jarvis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode, context: buildCtx(),
                    userMessage: userMsg,
                    previousHeadline: report?.headline,
                }),
            });
            const data = await res.json() as { ok: boolean; report?: JarvisReport; error?: string };
            if (!data.ok || !data.report) { setError(data.error ?? 'Analysis failed'); return; }
            setReport(data.report);
            if (mode === 'converse' && userMsg) {
                setConvo((prev) => [
                    ...prev,
                    { role: 'user', text: userMsg, id: ++convoId.current },
                    { role: 'dexo', text: data.report!.voiceResponse, id: ++convoId.current },
                ]);
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
            }
            if (!isMuted && data.report.voiceResponse) {
                setTimeout(() => speak(data.report!.voiceResponse), 600);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Request failed');
        } finally {
            setLoading(false);
        }
    }, [activeProject, buildCtx, report?.headline, isMuted, speak, isSpeaking, stopSpeaking]);

    // Keep runRef current for the pending-transcript effect
    runRef.current = run;

    // Auto-send transcribed speech
    useEffect(() => {
        if (pendingTranscriptRef.current) {
            const t = pendingTranscriptRef.current;
            pendingTranscriptRef.current = null;
            void runRef.current?.('converse', t);
        }
    }, [isProcessing]);

    // Sync isMuted into the hook
    useEffect(() => { setMuted(isMuted); }, [isMuted, setMuted]);

    const handleSend = async () => {
        const t = inputText.trim();
        if (!t || loading) return;
        setInputText('');
        // Show user message immediately
        const uid = ++convoId.current;
        setConvo((prev) => [...prev, { role: 'user', text: t, id: uid }]);
        await run('converse', t);
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
    };

    // Mic button: interrupt if speaking, otherwise toggle listening
    const handleMicPress = () => {
        if (isSpeaking) {
            stopSpeaking();
            startListening();
        } else if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const orbState: VoiceState | 'loading' = loading && !report ? 'loading' : voiceState;
    const showMain = !showIntro; // once intro dismissed, always show main layout

    // ── Empty state ──
    if (!activeProject?.id) {
        return (
            <div className="flex h-full items-center justify-center bg-[var(--bg)] px-6">
                <div className="executive-panel max-w-sm space-y-4 px-6 py-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/40 bg-slate-900/30">
                        <DexoCanvas size={36} state="idle" />
                    </div>
                    <p className="text-[14px] font-medium text-zinc-300">Create a venture first</p>
                    <p className="text-[13px] leading-relaxed text-slate-500">
                        Name your venture from the left rail or overview, then come back—Dexo needs a saved workspace
                        before it can analyze.
                    </p>
                </div>
            </div>
        );
    }

    // ── Intro ──
    if (!showMain) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-[var(--bg)]">
                <div className="executive-panel-strong flex flex-col items-center gap-7 px-8 py-10 text-center">
                    <VoiceOrb state="idle" onClick={() => {
                        speak("I am Dexo. Let's analyze your venture and build it together.");
                    }} />
                    <div className="space-y-2">
                        <p className="text-[18px] font-semibold tracking-tight text-zinc-200">I am Dexo</p>
                        <p className="text-[13px] text-zinc-600">Your AI command center. Click the orb or analyze.</p>
                    </div>
                    <button type="button"
                        onClick={() => { setShowIntro(false); run('analyze'); }}
                        className="executive-toolbar-button executive-toolbar-button-accent px-7 py-3 text-[13px]">
                        <Zap className="h-4 w-4 text-slate-400" />
                        Analyze venture
                    </button>
                </div>
            </div>
        );
    }

    // True when the very first analysis is running (no report yet)
    const initialLoading = loading && !report;

    return (
        <div className="flex h-full min-h-0 flex-col bg-[var(--bg)]">

            {/* ── Scrollable body ── */}
            <div className={`custom-scrollbar flex-1 overflow-y-auto ${initialLoading ? 'flex items-center justify-center' : ''}`}>

                {/* ── Full-screen centered loading state (first analysis) ── */}
                {initialLoading && (
                    <AnalyzingCenter name={activeProject.name} orbState={orbState} />
                )}

                {!initialLoading && (
                <div className="mx-auto max-w-[660px] px-5 pb-4 pt-8">

                    {/* Re-analyzing banner (report already exists) */}
                    {loading && report && <AnalyzingBanner name={activeProject.name} />}

                    {/* Error */}
                    {error && !loading && (
                        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                            <p className="flex-1 text-[12px] text-red-300">{error}</p>
                            <button type="button" onClick={() => run('analyze')} className="text-[11px] text-red-400 underline hover:text-red-200">Retry</button>
                        </div>
                    )}

                    {report ? (
                        <div className="space-y-8">

                            {/* ── Orb + headline + controls ── */}
                            <div className="flex flex-col items-center gap-5">
                                {/* Orb — tap to stop/play */}
                                <VoiceOrb
                                    state={orbState}
                                    onClick={() => {
                                        if (isSpeaking) stopSpeaking();
                                        else if (!isMuted) speak(`${report.headline}. ${report.summary}`);
                                    }}
                                />
                                <div className="space-y-2 text-center">
                                    <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-100">
                                        {report.headline}
                                    </h1>
                                    <p className="mx-auto max-w-lg text-[13.5px] leading-[1.75] text-slate-400">
                                        {report.summary}
                                    </p>
                                </div>

                                {/* Voice status pill */}
                                {(isSpeaking || isListening) && (
                                    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] ${
                                        isListening ? 'border-sky-500/30 bg-sky-900/20 text-sky-300' : 'border-slate-600/30 bg-slate-900/30 text-slate-300'
                                    }`}>
                                        <WaveBars active color={isListening ? 'bg-sky-400' : 'bg-slate-400'} />
                                        <span>{isListening ? 'Listening…' : 'Speaking…'}</span>
                                        <button type="button" onClick={isSpeaking ? stopSpeaking : stopListening}
                                            className="ml-1 opacity-60 hover:opacity-100">
                                            <Square className="h-2.5 w-2.5" />
                                        </button>
                                    </div>
                                )}

                                {/* Action bar */}
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <button type="button"
                                        onClick={() => setIsMuted((m) => !m)}
                                        className="executive-pill px-3 py-1.5 text-[11px] text-zinc-400">
                                        {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                        {isMuted ? 'Unmute' : 'Mute'}
                                    </button>
                                    {!isMuted && !isSpeaking && (
                                        <button type="button"
                                            onClick={() => speak(`${report.headline}. ${report.summary}`)}
                                            className="executive-pill px-3 py-1.5 text-[11px] text-zinc-400">
                                            <Volume2 className="h-3.5 w-3.5" /> Read again
                                        </button>
                                    )}
                                    <button type="button"
                                        onClick={() => run('analyze')} disabled={loading}
                                        className="executive-pill px-3 py-1.5 text-[11px] text-zinc-400 disabled:opacity-40">
                                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                        {loading ? 'Analyzing…' : 'Re-analyze'}
                                    </button>
                                </div>
                            </div>

                            {/* ── Health strip ── */}
                            <HealthStrip health={report.health} />

                            {/* ── Desk rows ── */}
                            <div className="-mx-1">
                                {report.sections.map((s) => (
                                    <DeskRow key={s.desk} section={s} onRead={(t) => !isMuted && speak(t)} />
                                ))}
                            </div>

                            {/* ── Risks ── */}
                            {report.risks.length > 0 && (
                                <div className="space-y-4">
                                    <div className="h-px bg-white/[0.04]" />
                                    {report.risks.map((r, i) => {
                                        const rc = RC[r.level];
                                        return (
                                            <div key={`risk-${i}`} className="flex items-start gap-3.5">
                                                <AlertTriangle className={`mt-[2px] h-3.5 w-3.5 shrink-0 ${rc.icon}`} />
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-medium text-zinc-200">{r.label}</span>
                                                        <span className={`rounded border px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider ${rc.badge}`}>{r.level}</span>
                                                    </div>
                                                    <p className="text-[12px] leading-snug text-zinc-600">{r.detail}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ── Priority actions ── */}
                            {report.nextActions.length > 0 && (
                                <div className="space-y-3">
                                    <div className="h-px bg-white/[0.04]" />
                                    {report.nextActions.map((a, i) => (
                                        <div key={`action-${i}`} className="flex items-baseline gap-3.5">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[9px] font-bold text-zinc-300">{a.priority}</span>
                                            <p className="min-w-0 flex-1 text-[13px] leading-snug text-zinc-300">{a.action}</p>
                                            <span className={`shrink-0 text-[10px] font-medium ${TFC[a.timeframe] ?? 'text-zinc-600'}`}>{a.timeframe}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Conversation ── */}
                            {convo.length > 0 && (
                                <div className="space-y-4">
                                    <div className="h-px bg-white/[0.04]" />
                                    {convo.map((msg) => (
                                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${msg.role === 'dexo' ? 'bg-slate-800/50' : 'bg-slate-900/50'}`}>
                                                {msg.role === 'dexo'
                                                    ? <Sparkles className="h-3 w-3 text-slate-400" />
                                                    : <Activity className="h-3 w-3 text-slate-600" />}
                                            </div>
                                            <p className={`max-w-[84%] text-[13px] leading-relaxed ${
                                                msg.text === '— interrupted —' ? 'italic text-zinc-700' :
                                                msg.role === 'dexo' ? 'text-slate-300' : 'text-slate-200'
                                            }`}>{msg.text}</p>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                            )}

                            {/* ── Follow-up chips ── */}
                            {report.followUp.length > 0 && (
                                <div className="flex flex-wrap gap-2 pb-2">
                                    {report.followUp.map((q, i) => (
                                        <button key={`fu-${i}`} type="button"
                                            onClick={() => run('converse', q)} disabled={loading}
                                            className="executive-pill px-4 py-2 text-[12px] text-slate-400 disabled:opacity-40">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : !loading ? (
                        /* No report yet, show prompt to analyze */
                        <div className="flex flex-col items-center gap-6 py-20 text-center">
                            <VoiceOrb state={orbState} onClick={() => run('analyze')} />
                            <p className="text-[13px] text-zinc-600">Click the orb or tap Analyze to begin.</p>
                            <button type="button" onClick={() => run('analyze')}
                                className="executive-toolbar-button executive-toolbar-button-accent px-6 py-3 text-[12px]">
                                <Zap className="h-4 w-4" /> Analyze
                            </button>
                        </div>
                    ) : null}
                </div>
                )}
            </div>

            {/* ── Input bar — always visible once intro dismissed ── */}
            <div className="shrink-0 border-t border-white/[0.05] bg-[var(--bg)] px-5 py-3">
                <div className="mx-auto max-w-[660px]">
                    <div className={`executive-panel-strong flex items-end gap-1 px-1.5 py-1 transition-all duration-300 ${
                        isListening  ? 'border-sky-400/40 bg-sky-950/20 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]' :
                        isSpeaking   ? 'border-slate-500/30 bg-slate-900/20' :
                        isProcessing ? 'border-amber-400/25 bg-amber-950/10' :
                                       'focus-within:border-white/[0.10]'
                    }`}>
                        {/* Mic — tap to speak/interrupt */}
                        <button type="button" onMouseDown={handleMicPress}
                            title={isListening ? 'Stop' : isSpeaking ? 'Interrupt Dexo' : 'Speak to Dexo'}
                            className={`mb-1 ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                                isListening ? 'bg-sky-500/25 text-sky-300 ring-1 ring-sky-400/30' :
                                isSpeaking  ? 'bg-red-500/15 text-red-400 ring-1 ring-red-400/20' :
                                              'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'
                            }`}>
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>

                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={onKey}
                            rows={1}
                            placeholder={
                                isListening  ? 'Listening — speak now…'      :
                                isProcessing ? 'Processing your voice…'      :
                                isSpeaking   ? 'Tap mic to interrupt Dexo…'  :
                                loading      ? 'Analyzing — you can type here…' :
                                               'Ask Dexo anything…'
                            }
                            className="custom-scrollbar min-h-[40px] min-w-0 flex-1 resize-none border-none bg-transparent px-3 py-2.5 text-[13px] leading-[1.6] text-brand-text placeholder:text-slate-700 focus:outline-none focus:ring-0"
                            style={{ maxHeight: '100px', overflowY: 'auto' }}
                        />

                        {isSpeaking ? (
                            <button type="button" onClick={stopSpeaking} title="Stop speaking"
                                className="mb-1 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.05] hover:text-red-400">
                                <Square className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <button type="button" onClick={handleSend}
                                disabled={!inputText.trim() || loading}
                                className="mb-1 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-[#131314] transition hover:opacity-90 disabled:opacity-25">
                                <Send className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <p className="mt-1 text-center text-[9px] text-zinc-800">
                        {isListening ? 'Tap mic to stop · auto-submits on silence' :
                         isSpeaking  ? 'Tap mic to interrupt Dexo' :
                                       'Enter to send · mic to speak · Shift+Enter for new line'}
                    </p>
                </div>
            </div>
        </div>
    );
}
