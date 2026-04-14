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
    AudioLines,
    ChevronDown,
    ChevronUp,
    Coins,
    Loader2,
    Mic,
    MicOff,
    RefreshCw,
    Send,
    Settings2,
    Sparkles,
    Square,
    Volume2,
    VolumeX,
    Zap,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import type { JarvisReport, JarvisSection } from '@/app/api/jarvis/route';
import { VoiceSettingsPanel, useVoicePreset, type VoicePreset } from '@/components/Dexo/VoiceSettings';
import { speak as voiceEngineSpeak, stopSpeaking as stopSpeakingNative, createSpeechQueue, initVoiceCache, type VoiceSettings } from '@/lib/voiceEngine';
import { useTokens, useAnalysisCost, useChatCost } from '@/lib/tokens/useTokens';
import { TokenDisplay, TokenConfirmButton, TokenInlineCost } from '@/components/tokens/TokenDisplay';
import { TokenWarningBanner, TokenInlineWarning, TokenCostPill } from '@/components/tokens/TokenWarning';
import { useUpgradeModal } from '@/components/tokens/UpgradeModal';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';

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

// ─── Voice hook (Jarvis-style: interrupt, live transcript, chain listen) ─────

function useDexoVoice(
    onTranscript: (t: string) => void,
    onInterrupt?: () => void,
    onInterimRef?: React.MutableRefObject<((t: string) => void) | undefined>,
    voicePreset: VoicePreset = 'jarvis'
) {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [voiceError, setVoiceError] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recRef = useRef<any>(null);
    const speakingRef = useRef(false);
    const mutedRef = useRef(false);
    const speechQueueRef = useRef(createSpeechQueue());

    // Re-init voice cache when needed
    useEffect(() => {
        initVoiceCache();
    }, []);

    const stopListening = useCallback(() => {
        recRef.current?.stop();
        onInterimRef?.current?.('');
        setVoiceState('idle');
    }, [onInterimRef]);

    const stopSpeakingHook = useCallback(() => {
        speechQueueRef.current.cancel();
        stopSpeakingNative();
        speakingRef.current = false;
        setVoiceState('idle');
    }, []);

    const startListening = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (speakingRef.current) {
            speechQueueRef.current.cancel();
            stopSpeakingNative();
            speakingRef.current = false;
            onInterrupt?.();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
        if (!SR) {
            setVoiceError('Speech recognition not supported in this browser');
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rec: any = new SR();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onstart = () => setVoiceState('listening');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => {
            let interim = '';
            let finalText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i] as SpeechRecognitionResult;
                const piece = r[0]?.transcript ?? '';
                if (r.isFinal) finalText += piece;
                else interim += piece;
            }
            onInterimRef?.current?.(interim.trim());
            const ft = finalText.trim();
            if (ft) {
                onInterimRef?.current?.('');
                onTranscript(ft);
                setVoiceState('processing');
            }
        };
        rec.onerror = (e: ErrorEvent) => {
            onInterimRef?.current?.('');
            // Don't show error for no-speech (user didn't speak)
            if (e.message?.includes('no-speech')) {
                setVoiceState('idle');
                return;
            }
            setVoiceState('idle');
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onend = () => setVoiceState((s: any) => (s === 'listening' ? 'idle' : s));
        recRef.current = rec;
        rec.start();
    }, [onTranscript, onInterrupt, onInterimRef]);

    // Enhanced speak using voice engine
    const speak = useCallback(async (text: string, onEnd?: () => void) => {
        if (typeof window === 'undefined' || mutedRef.current) {
            onEnd?.();
            return;
        }
        
        // Cancel any ongoing speech first
        speechQueueRef.current.cancel();
        
        try {
            await voiceEngineSpeak(text, {
                preset: voicePreset,
                onStart: () => {
                    speakingRef.current = true;
                    setVoiceState('speaking');
                },
                onEnd: () => {
                    speakingRef.current = false;
                    setVoiceState('idle');
                    onEnd?.();
                },
                onError: () => {
                    speakingRef.current = false;
                    setVoiceState('idle');
                    onEnd?.();
                },
            });
        } catch {
            speakingRef.current = false;
            setVoiceState('idle');
            onEnd?.();
        }
    }, [voicePreset]);

    const setMuted = useCallback((m: boolean) => {
        mutedRef.current = m;
        if (m) {
            speechQueueRef.current.cancel();
            speakingRef.current = false;
            setVoiceState('idle');
        }
    }, []);

    useEffect(
        () => () => {
            recRef.current?.stop();
            speechQueueRef.current.cancel();
        },
        []
    );

    return { voiceState, voiceError, startListening, stopListening, speak, stopSpeaking: stopSpeakingHook, setMuted };
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
        <div className="mb-6 flex flex-col items-center gap-3 px-2 text-center">
            <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400/80" />
                <span className="text-[12px] font-medium tracking-wide text-slate-400">Analyzing {name}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
                {desks.map((d, i) => (
                    <span
                        key={d}
                        className="text-[9px] font-semibold uppercase tracking-[0.14em] transition-all duration-500"
                        style={{
                            color: tick === i ? 'rgba(56,189,248,0.95)' : 'rgba(100,116,139,0.35)',
                            textShadow: tick === i ? '0 0 12px rgba(56,189,248,0.35)' : 'none',
                        }}
                    >
                        {d}
                    </span>
                ))}
            </div>
            <p className="text-[10px] text-zinc-600">Voice and keyboard stay live — Dexo is non-blocking</p>
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

    /** Analysis history - all previous analyses are kept, new ones are added */
    const [analysisHistory, setAnalysisHistory] = useState<JarvisReport[]>([]);
    /** Current/latest report - the most recent analysis */
    const [currentReport, setCurrentReport] = useState<JarvisReport | null>(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [isMuted, setIsMuted]   = useState(false);
    const [inputText, setInputText] = useState('');
    const [convo, setConvo]       = useState<{ role: 'user' | 'dexo'; text: string; id: number }[]>([]);
    const [showIntro, setShowIntro] = useState(true);
    const [voiceInterim, setVoiceInterim] = useState('');
    /** After Dexo speaks, reopen the mic automatically (Jarvis back-and-forth). */
    const [handsFree, setHandsFree] = useState(false);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);
    const voicePreset = useVoicePreset();
    /** Track which analysis is being viewed in detail */
    const [activeAnalysisIndex, setActiveAnalysisIndex] = useState<number | null>(null);
    const convoId = useRef(0);
    
    // Token system integration
    const tokens = useTokens();
    const analysisCost = useAnalysisCost();
    const chatCost = useChatCost();
    const upgradeModal = useUpgradeModal();

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const micPointerActiveRef = useRef(false);
    /** True if this press started (or took over) recognition — release should stop. */
    const micDroveSessionRef = useRef(false);
    const voiceInterimCbRef = useRef<((t: string) => void) | undefined>(undefined);
    voiceInterimCbRef.current = (t: string) => setVoiceInterim(t);
    const handsFreeRef = useRef(handsFree);
    const isMutedRef = useRef(isMuted);
    handsFreeRef.current = handsFree;
    isMutedRef.current = isMuted;
    const startListenRef = useRef<() => void>(() => {});

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
    
    // Expose run to window for testing
    useEffect(() => {
        // @ts-expect-error - debug access
        if (typeof window !== 'undefined') window.dexoRun = runRef.current;
    }, []);

    const onInterrupt = useCallback(() => {
        // Dexo was interrupted — acknowledge it
        setConvo((prev) => [...prev, { role: 'dexo', text: '— interrupted —', id: ++convoId.current }]);
    }, []);

    const { voiceState, voiceError, startListening, stopListening, speak, stopSpeaking, setMuted } = useDexoVoice(
        onTranscript,
        onInterrupt,
        voiceInterimCbRef,
        voicePreset
    );
    startListenRef.current = startListening;
    const isListening = voiceState === 'listening';
    const isSpeaking = voiceState === 'speaking';
    const isProcessing = voiceState === 'processing';

    const afterDexoSpeak = useCallback(() => {
        if (handsFreeRef.current && !isMutedRef.current) {
            window.setTimeout(() => startListenRef.current(), 480);
        }
    }, []);

    const speakJarvis = useCallback((text: string) => speak(text, afterDexoSpeak), [speak, afterDexoSpeak]);

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
        
        // Check and spend tokens
        const cost = mode === 'analyze' 
            ? (currentReport ? TOKEN_COSTS.REANALYZE : TOKEN_COSTS.ANALYSIS)
            : TOKEN_COSTS.CHAT_MESSAGE;
        
        const tokenResult = tokens.spend(cost, mode === 'analyze' ? 'New Analysis' : 'Chat Message');
        
        if (!tokenResult.success) {
            setError(tokenResult.message || 'Insufficient tokens');
            upgradeModal.open(tokenResult.message);
            return;
        }
        
        setLoading(true); setError(null);
        // Stop speaking before making a new request
        if (isSpeaking) stopSpeaking();
        try {
            // Build context including previous analyses for continuity
            let context = buildCtx();
            if (analysisHistory.length > 0) {
                const previousAnalyses = analysisHistory
                    .slice(-3) // Last 3 analyses
                    .map((r, i) => `\n[Previous Analysis ${i + 1}]: ${r.headline}\n${r.summary}`)
                    .join('\n');
                context += previousAnalyses;
            }
            if (currentReport) {
                context += `\n[Current Analysis]: ${currentReport.headline}\n${currentReport.summary}`;
            }
            
            const res = await fetch('/api/jarvis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode, context,
                    userMessage: userMsg,
                    previousHeadline: currentReport?.headline,
                    conversationHistory: convo.slice(-10).map(c => ({ role: c.role, text: c.text })),
                }),
            });
            const data = await res.json() as { ok: boolean; report?: JarvisReport; error?: string };
            if (!data.ok || !data.report) { setError(data.error ?? 'Analysis failed'); return; }
            
            // If analyze mode, add to history
            if (mode === 'analyze') {
                setAnalysisHistory(prev => [...prev, data.report!]);
                setCurrentReport(data.report!);
                setActiveAnalysisIndex(null); // Show current/latest
            }
            // If converse mode, also update current report context
            else if (mode === 'converse' && userMsg) {
                setCurrentReport(data.report!);
                setConvo((prev) => [
                    ...prev,
                    { role: 'user', text: userMsg, id: ++convoId.current },
                    { role: 'dexo', text: data.report!.voiceResponse, id: ++convoId.current },
                ]);
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
            }
            
            if (!isMuted && data.report.voiceResponse) {
                window.setTimeout(() => speak(data.report!.voiceResponse, afterDexoSpeak), 600);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Request failed');
        } finally {
            setLoading(false);
        }
    }, [activeProject, buildCtx, currentReport, analysisHistory, convo, isMuted, speak, isSpeaking, stopSpeaking, afterDexoSpeak, tokens, upgradeModal]);

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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    /** Press-and-hold mic: capture utterance on release (Iron Man HUD style). */
    const onMicPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        micPointerActiveRef.current = true;
        micDroveSessionRef.current = false;
        if (isSpeaking) {
            stopSpeaking();
            startListening();
            micDroveSessionRef.current = true;
            return;
        }
        if (!isListening) {
            startListening();
            micDroveSessionRef.current = true;
        }
    };

    const onMicPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!micPointerActiveRef.current) return;
        micPointerActiveRef.current = false;
        const drove = micDroveSessionRef.current;
        micDroveSessionRef.current = false;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        if (drove && isListening) stopListening();
    };

    /** Ctrl+Shift+D while focus is inside Dexo: open mic (or interrupt and listen). */
    useEffect(() => {
        if (showIntro || !activeProject?.id) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code !== 'KeyD' || !e.ctrlKey || !e.shiftKey) return;
            const shell = document.querySelector('[data-dexo-room]');
            const t = e.target as Node | null;
            if (!shell || !t || !shell.contains(t)) return;
            e.preventDefault();
            if (isSpeaking) {
                stopSpeaking();
                startListening();
            } else if (!isListening) startListening();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showIntro, activeProject?.id, isSpeaking, isListening, stopSpeaking, startListening]);

    const orbState: VoiceState | 'loading' = loading && !currentReport ? 'loading' : voiceState;
    const showMain = !showIntro; // once intro dismissed, always show main layout

    // ── Empty state ──
    if (!activeProject?.id) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--bg)] px-4 py-8 sm:px-6">
                <div className="max-w-sm shrink-0 space-y-5 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full ring-1 ring-sky-500/20 shadow-[0_0_40px_rgba(56,189,248,0.12)]">
                        <DexoCanvas size={40} state="idle" />
                    </div>
                    <p className="text-[15px] font-medium tracking-tight text-zinc-200">Create a venture first</p>
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
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-[var(--bg)] px-4 py-8 sm:px-6 sm:py-10">
                <div className="flex w-full max-w-md shrink-0 flex-col items-center gap-8 text-center">
                    {/* Token display for free users */}
                    <div className="absolute top-4 right-4">
                        <TokenDisplay compact={true} />
                    </div>
                    
                    <VoiceOrb
                        state="idle"
                        onClick={() => {
                            speak("I am Dexo. Let's analyze your venture and build it together.");
                        }}
                    />
                    <div className="space-y-2">
                        <p className="text-[20px] font-semibold tracking-tight text-zinc-100">I am Dexo</p>
                        <p className="text-[13px] text-zinc-500">Command-center interface — tap the core or run analysis.</p>
                    </div>
                    
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowIntro(false);
                                run('analyze');
                            }}
                            className="executive-toolbar-button executive-toolbar-button-accent px-8 py-3 text-[13px] shadow-[0_0_24px_rgba(56,189,248,0.15)]"
                        >
                            <Zap className="h-4 w-4 text-slate-400" />
                            Analyze venture
                        </button>
                        
                        {/* Token cost hint for free users */}
                        {!tokens.isPro && (
                            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
                                <Coins className="h-3 w-3" />
                                <span>First analysis: {TOKEN_COSTS.ANALYSIS} tokens</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Upgrade Modal */}
                <upgradeModal.UpgradeModal />
            </div>
        );
    }

    // True when the very first analysis is running (no report yet)
    const initialLoading = loading && !currentReport;
    
    // Determine which report to display
    const displayedReport = activeAnalysisIndex !== null 
        ? analysisHistory[activeAnalysisIndex] 
        : currentReport;

    return (
        <div data-dexo-room className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--bg)]">

            {/* ── Scrollable body ── */}
            <div className={`custom-scrollbar flex-1 overflow-y-auto ${initialLoading ? 'flex items-center justify-center' : ''}`}>

                {/* ── Full-screen centered loading state (first analysis) ── */}
                {initialLoading && (
                    <AnalyzingCenter name={activeProject.name} orbState={orbState} />
                )}

                {!initialLoading && (
                <div className="mx-auto max-w-[660px] px-5 pb-4 pt-8">

                    {/* Re-analyzing banner (report already exists) */}
                    {loading && currentReport && <AnalyzingBanner name={activeProject.name} />}

                    {/* Error */}
                    {error && !loading && (
                        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                            <p className="flex-1 text-[12px] text-red-300">{error}</p>
                            <button type="button" onClick={() => run('analyze')} className="text-[11px] text-red-400 underline hover:text-red-200">Retry</button>
                        </div>
                    )}
                    
                    {/* ── Token Warning Banner ── */}
                    <TokenWarningBanner onUpgrade={upgradeModal.open} />
                    
                    {/* ── Token Display Header ── */}
                    <div className="flex items-center justify-between mb-4">
                        <div />
                        <TokenDisplay compact={false} showCosts={true} />
                    </div>

                    {/* ── Analysis History Timeline ── */}
                    {analysisHistory.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] uppercase tracking-wider text-slate-500">Analysis History</p>
                                <span className="text-[10px] text-slate-600">{analysisHistory.length} saved</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {/* Current/Active button */}
                                <button
                                    onClick={() => setActiveAnalysisIndex(null)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                                        activeAnalysisIndex === null
                                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                            : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                                    }`}
                                >
                                    {currentReport ? 'Current' : 'Latest'}
                                </button>
                                {/* History items - most recent first */}
                                {[...analysisHistory].reverse().map((r, idx) => {
                                    const actualIndex = analysisHistory.length - 1 - idx;
                                    const isActive = activeAnalysisIndex === actualIndex;
                                    return (
                                        <button
                                            key={actualIndex}
                                            onClick={() => setActiveAnalysisIndex(actualIndex)}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] transition-all max-w-[150px] truncate ${
                                                isActive
                                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                                            }`}
                                            title={r.headline}
                                        >
                                            #{actualIndex + 1} {r.headline.slice(0, 20)}{r.headline.length > 20 ? '...' : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {displayedReport ? (
                        <div className="space-y-8">

                            {/* ── Archive indicator ── */}
                            {activeAnalysisIndex !== null && (
                                <div className="flex items-center justify-center gap-2">
                                    <span className="px-3 py-1 rounded-full border border-amber-500/30 bg-amber-950/20 text-[10px] text-amber-400">
                                        Viewing Archived Analysis #{activeAnalysisIndex + 1}
                                    </span>
                                    <button 
                                        onClick={() => setActiveAnalysisIndex(null)}
                                        className="text-[10px] text-sky-400 hover:text-sky-300 underline"
                                    >
                                        Back to Current
                                    </button>
                                </div>
                            )}

                            {/* ── Orb + headline + controls ── */}
                            <div className="flex flex-col items-center gap-5">
                                {/* Orb — tap to stop/play */}
                                <VoiceOrb
                                    state={orbState}
                                    onClick={() => {
                                        if (isSpeaking) stopSpeaking();
                                        else if (!isMuted) speakJarvis(`${displayedReport.headline}. ${displayedReport.summary}`);
                                    }}
                                />
                                <div className="space-y-2 text-center">
                                    <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-100">
                                        {displayedReport.headline}
                                    </h1>
                                    <p className="mx-auto max-w-lg text-[13.5px] leading-[1.75] text-slate-400">
                                        {displayedReport.summary}
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

                                {/* Voice error display */}
                                {voiceError && (
                                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-1.5 text-[10px] text-amber-400">
                                        <AlertTriangle className="h-3 w-3" />
                                        {voiceError}
                                    </div>
                                )}

                                {/* Action bar */}
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setHandsFree((h) => !h)}
                                        title="After Dexo speaks, mic opens automatically"
                                        className={`executive-pill px-3 py-1.5 text-[11px] ${
                                            handsFree
                                                ? 'border-sky-500/35 bg-sky-950/20 text-sky-300'
                                                : 'text-zinc-400'
                                        }`}
                                    >
                                        <AudioLines className="h-3.5 w-3.5" />
                                        {handsFree ? 'Conversation on' : 'Conversation'}
                                    </button>
                                    <button type="button"
                                        onClick={() => setIsMuted((m) => !m)}
                                        className="executive-pill px-3 py-1.5 text-[11px] text-zinc-400">
                                        {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                        {isMuted ? 'Unmute' : 'Mute'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowVoiceSettings(true)}
                                        className="executive-pill px-3 py-1.5 text-[11px] border border-sky-500/20 bg-sky-950/10 text-sky-400 hover:bg-sky-950/30 hover:border-sky-500/40"
                                        title={`Voice: ${voicePreset} (click to change)`}
                                    >
                                        <Settings2 className="h-3.5 w-3.5" />
                                        Voice
                                    </button>
                                    {!isMuted && !isSpeaking && (
                                        <button type="button"
                                            onClick={() => speakJarvis(`${displayedReport.headline}. ${displayedReport.summary}`)}
                                            className="executive-pill px-3 py-1.5 text-[11px] text-zinc-400">
                                            <Volume2 className="h-3.5 w-3.5" /> Read again
                                        </button>
                                    )}
                                    <div className="flex flex-col items-center gap-1">
                                        <button type="button"
                                            onClick={() => run('analyze')} disabled={loading}
                                            className="executive-pill px-3 py-1.5 text-[11px] text-zinc-400 disabled:opacity-40">
                                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                            {loading ? 'Analyzing…' : 'New Analysis'}
                                        </button>
                                        {activeAnalysisIndex === null && (
                                            <TokenCostPill cost={currentReport ? TOKEN_COSTS.REANALYZE : TOKEN_COSTS.ANALYSIS} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Health strip ── */}
                            <HealthStrip health={displayedReport.health} />

                            {/* ── Desk rows ── */}
                            <div className="-mx-1">
                                {displayedReport.sections.map((s) => (
                                    <DeskRow key={s.desk} section={s} onRead={(t) => !isMuted && speakJarvis(t)} />
                                ))}
                            </div>

                            {/* ── Risks ── */}
                            {displayedReport.risks.length > 0 && (
                                <div className="space-y-4">
                                    <div className="h-px bg-white/[0.04]" />
                                    {displayedReport.risks.map((r, i) => {
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
                            {displayedReport.nextActions.length > 0 && (
                                <div className="space-y-3">
                                    <div className="h-px bg-white/[0.04]" />
                                    {displayedReport.nextActions.map((a, i) => (
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
                            {displayedReport.followUp.length > 0 && activeAnalysisIndex === null && (
                                <div className="flex flex-wrap gap-2 pb-2">
                                    {displayedReport.followUp.map((q, i) => (
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
                            <p className="text-[13px] text-zinc-600">Click the orb or tap New Analysis to begin.</p>
                            <button type="button" onClick={() => run('analyze')}
                                className="executive-toolbar-button executive-toolbar-button-accent px-6 py-3 text-[12px]">
                                <Zap className="h-4 w-4" /> Analyze
                            </button>
                        </div>
                    ) : null}
                </div>
                )}
            </div>

            {/* ── Input strip — HUD style (no card chrome) ── */}
            <div className="shrink-0 border-t border-white/[0.04] bg-gradient-to-t from-black/35 via-[var(--bg)] to-[var(--bg)] px-4 py-3">
                <div className="mx-auto max-w-[660px] space-y-1">
                    {voiceInterim ? (
                        <p className="truncate px-1 text-[11px] tracking-wide text-sky-400/85">{voiceInterim}</p>
                    ) : null}
                    <div
                        className={`flex items-end gap-1.5 rounded-[28px] border px-2 py-1.5 transition-all duration-300 ${
                            isListening
                                ? 'border-sky-400/35 bg-sky-950/15 shadow-[0_0_24px_rgba(56,189,248,0.14)]'
                                : isSpeaking
                                  ? 'border-slate-500/25 bg-slate-950/25'
                                  : isProcessing
                                    ? 'border-amber-400/20 bg-amber-950/10'
                                    : 'border-white/[0.08] bg-black/20 hover:border-white/[0.11]'
                        }`}
                    >
                        <button
                            type="button"
                            onPointerDown={onMicPointerDown}
                            onPointerUp={onMicPointerUp}
                            onPointerCancel={onMicPointerUp}
                            title={
                                isListening
                                    ? 'Release to send'
                                    : isSpeaking
                                      ? 'Hold to interrupt and speak'
                                      : 'Hold to speak — release to send'
                            }
                            className={`mb-1 ml-1.5 flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-full transition-all select-none ${
                                isListening
                                    ? 'bg-sky-500/20 text-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.25)]'
                                    : isSpeaking
                                      ? 'bg-red-500/15 text-red-400 ring-1 ring-red-400/25'
                                      : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'
                            }`}
                        >
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>

                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={onKey}
                            rows={1}
                            placeholder={
                                isListening
                                    ? 'Hold mic — live transcript above…'
                                    : isProcessing
                                      ? 'Processing your voice…'
                                      : isSpeaking
                                        ? 'Hold mic to interrupt and reply…'
                                        : loading
                                          ? 'Analyzing — type or hold mic…'
                                          : 'Ask Dexo anything…'
                            }
                            className="custom-scrollbar min-h-[40px] min-w-0 flex-1 resize-none border-none bg-transparent px-2 py-2.5 text-[13px] leading-[1.6] text-brand-text placeholder:text-slate-600 focus:outline-none focus:ring-0"
                            style={{ maxHeight: '100px', overflowY: 'auto' }}
                        />

                        {isSpeaking ? (
                            <button
                                type="button"
                                onClick={stopSpeaking}
                                title="Stop speaking"
                                className="mb-1 mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/[0.05] hover:text-red-400"
                            >
                                <Square className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={!inputText.trim() || loading}
                                className="mb-1 mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[#131314] transition hover:opacity-90 disabled:opacity-25"
                            >
                                <Send className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <p className="text-center text-[9px] text-zinc-600">
                        {isListening
                            ? 'Release mic to finalize · Conversation mode keeps the channel open after Dexo replies'
                            : isSpeaking
                              ? 'Hold mic to cut in · Ctrl+Shift+D opens mic from anywhere in Dexo'
                              : 'Enter send · Shift+Enter newline · Hold mic to dictate · Ctrl+Shift+D'}
                    </p>
                </div>
            </div>

            {/* Voice Settings Panel */}
            <VoiceSettingsPanel 
                isOpen={showVoiceSettings} 
                onClose={() => setShowVoiceSettings(false)} 
            />
            
            {/* Upgrade Modal */}
            <upgradeModal.UpgradeModal />
        </div>
    );
}
