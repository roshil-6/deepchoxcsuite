'use client';

/**
 * Dexo — AI Command Center
 * Grey background (consistent with app), voice orb, Perplexity-inspired layout
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// ─── Sphere icon (golden-ratio dot distribution) ──────────────────────────────

interface Dot { x: number; y: number; r: number; opacity: number }

function buildSphereDots(size: number): Dot[] {
    const cx = size / 2, cy = size / 2, radius = size * 0.44;
    const TOTAL = 180;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const dots: Dot[] = [];
    for (let i = 0; i < TOTAL; i++) {
        const inclination = Math.acos(1 - 2 * (i / (TOTAL - 1)));
        const azimuth = goldenAngle * i;
        const x3 = Math.sin(inclination) * Math.cos(azimuth);
        const y3 = Math.sin(inclination) * Math.sin(azimuth);
        const z3 = Math.cos(inclination);
        if (z3 < -0.08) continue;
        const depth = (z3 + 1) / 2;
        dots.push({
            x: cx + x3 * radius,
            y: cy + y3 * radius * 0.96,
            r: 0.5 + depth * 1.4,
            opacity: 0.15 + depth * 0.75,
        });
    }
    return dots;
}

function DexoSphere({ size = 44, color = 'white' }: { size?: number; color?: string }) {
    const dots = useMemo(() => buildSphereDots(size), [size]);
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
            {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={color} opacity={d.opacity} />
            ))}
        </svg>
    );
}

// ─── Voice orb — central visual, reacts to state ──────────────────────────────

function VoiceOrb({ state }: { state: VoiceState | 'loading' }) {
    const isActive = state !== 'idle';

    // ring colors
    const ringCls =
        state === 'listening'  ? 'ring-sky-400/50  shadow-[0_0_40px_rgba(56,189,248,0.2)]' :
        state === 'speaking'   ? 'ring-violet-400/50 shadow-[0_0_40px_rgba(167,139,250,0.2)]' :
        state === 'loading'    ? 'ring-zinc-500/30' :
        state === 'processing' ? 'ring-amber-400/40 shadow-[0_0_28px_rgba(251,191,36,0.12)]' :
                                 'ring-violet-500/20 shadow-[0_0_18px_rgba(139,92,246,0.08)]';

    const innerGrad =
        state === 'listening'  ? 'from-sky-950/80 to-sky-900/50' :
        state === 'speaking'   ? 'from-violet-950/80 to-violet-900/50' :
        state === 'processing' ? 'from-amber-950/60 to-amber-900/40' :
        state === 'loading'    ? 'from-zinc-800/60 to-zinc-900/40' :
                                 'from-zinc-900/70 to-zinc-800/40';

    const sphereColor =
        state === 'listening'  ? 'rgba(147,210,255,1)' :
        state === 'speaking'   ? 'rgba(196,167,255,1)' :
        state === 'processing' ? 'rgba(251,211,147,1)' :
        state === 'loading'    ? 'rgba(160,160,180,0.6)' :
                                 'rgba(180,160,240,0.9)';

    return (
        <div className={`relative flex items-center justify-center rounded-full ring-2 transition-all duration-500 ${ringCls}`}
            style={{ width: 100, height: 100 }}>
            {/* Outer ping */}
            {isActive && state !== 'loading' && (
                <span
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{
                        background: state === 'listening'  ? 'rgba(56,189,248,0.3)' :
                                    state === 'speaking'   ? 'rgba(139,92,246,0.3)' :
                                    'rgba(251,191,36,0.3)',
                        animationDuration: state === 'speaking' ? '1.5s' : '1.2s',
                    }}
                />
            )}
            {/* Inner circle */}
            <div className={`flex items-center justify-center rounded-full bg-gradient-to-br transition-all duration-500 ${innerGrad}`}
                style={{ width: 88, height: 88 }}>
                {state === 'loading' ? (
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                ) : (
                    <DexoSphere size={52} color={sphereColor} />
                )}
            </div>
        </div>
    );
}

// ─── Waveform bars ────────────────────────────────────────────────────────────

function WaveBars({ active, color = 'bg-violet-400' }: { active: boolean; color?: string }) {
    return (
        <div className="flex items-center gap-[3px]">
            {[0, 1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className={`w-[2px] rounded-full ${color} transition-all duration-100`}
                    style={{
                        height: active ? `${10 + Math.sin(i * 1.3) * 7}px` : '3px',
                        opacity: active ? 1 : 0.3,
                        animation: active
                            ? `dexo-wave 0.65s ease-in-out ${i * 85}ms infinite alternate`
                            : 'none',
                    }}
                />
            ))}
            <style>{`
                @keyframes dexo-wave { from { height: 4px; } to { height: 18px; } }
            `}</style>
        </div>
    );
}

// ─── Voice hook ───────────────────────────────────────────────────────────────

function useDexoVoice(onTranscript: (t: string) => void) {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recRef = useRef<any>(null);
    const speakingRef = useRef(false);

    const startListening = useCallback(() => {
        if (typeof window === 'undefined') return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
        if (!SR) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rec: any = new SR();
        rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
        rec.onstart  = () => setVoiceState('listening');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => {
            const txt: string = e.results[0]?.[0]?.transcript ?? '';
            if (txt.trim()) { onTranscript(txt.trim()); setVoiceState('processing'); }
        };
        rec.onerror = () => setVoiceState('idle');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onend   = () => setVoiceState((s: any) => s === 'listening' ? 'idle' : s);
        recRef.current = rec;
        rec.start();
    }, [onTranscript]);

    const stopListening = useCallback(() => {
        recRef.current?.stop();
        setVoiceState('idle');
    }, []);

    const speak = useCallback((text: string, onEnd?: () => void) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.93; utt.pitch = 0.88; utt.volume = 1;

        const doSpeak = () => {
            const voices = window.speechSynthesis.getVoices();
            const voice =
                voices.find((v) => /google uk english male/i.test(v.name)) ??
                voices.find((v) => v.lang.startsWith('en') && !/zira|hazel/i.test(v.name)) ??
                voices[0];
            if (voice) utt.voice = voice;
            utt.onstart = () => { speakingRef.current = true;  setVoiceState('speaking'); };
            utt.onend   = () => { speakingRef.current = false; setVoiceState('idle'); onEnd?.(); };
            utt.onerror = () => { speakingRef.current = false; setVoiceState('idle'); };
            window.speechSynthesis.speak(utt);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            doSpeak();
        } else {
            window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
        }
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
        speakingRef.current = false;
        setVoiceState('idle');
    }, []);

    useEffect(() => () => {
        recRef.current?.stop();
        window.speechSynthesis?.cancel();
    }, []);

    return { voiceState, startListening, stopListening, speak, stopSpeaking };
}

// ─── Status palette ───────────────────────────────────────────────────────────

const SC = {
    strong:   { dot: 'bg-emerald-400', bar: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-300/90', label: 'Strong'   },
    caution:  { dot: 'bg-amber-400',   bar: 'bg-amber-400',   badge: 'bg-amber-500/10 text-amber-300/90',     label: 'Caution'  },
    risk:     { dot: 'bg-orange-400',  bar: 'bg-orange-400',  badge: 'bg-orange-500/10 text-orange-300/90',   label: 'Risk'     },
    critical: { dot: 'bg-red-400',     bar: 'bg-red-400',     badge: 'bg-red-500/10 text-red-300/90',         label: 'Critical' },
} as const;

const RC = {
    high:   { icon: 'text-red-400',   badge: 'border-red-500/25 bg-red-500/8 text-red-300'       },
    medium: { icon: 'text-amber-400', badge: 'border-amber-500/25 bg-amber-500/8 text-amber-300'  },
    low:    { icon: 'text-sky-400',   badge: 'border-sky-500/25 bg-sky-500/8 text-sky-300'        },
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
                            <div className={`h-full rounded-full ${c.bar} opacity-60`} style={{ width: '100%' }} />
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
                    <button type="button" onClick={() => onRead(`${section.title}. ${section.insight}. Next step: ${section.action}`)}
                        className="flex items-center gap-1.5 text-[10px] text-zinc-700 transition hover:text-zinc-400">
                        <Volume2 className="h-3 w-3" /> Read aloud
                    </button>
                </div>
            )}
            <div className="ml-[26px] h-px bg-white/[0.04]" />
        </div>
    );
}

// ─── Loading state ────────────────────────────────────────────────────────────

function LoadingState({ name, onMic }: { name: string; onMic: () => void }) {
    const desks = ['Strategy', 'Finance', 'Product', 'Market', 'GTM'];
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((n) => (n + 1) % desks.length), 850);
        return () => clearInterval(t);
    }, [desks.length]);

    return (
        <div className="flex flex-col items-center gap-8 py-20 text-center select-none">
            {/* Animated orb */}
            <div className="relative">
                <span className="absolute inset-0 rounded-full animate-ping opacity-10"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5), transparent)', animationDuration: '2.5s' }} />
                <span className="absolute inset-3 rounded-full animate-ping opacity-10"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4), transparent)', animationDuration: '2s', animationDelay: '0.4s' }} />
                <div className="relative flex h-[100px] w-[100px] items-center justify-center rounded-full"
                    style={{
                        background: 'radial-gradient(circle at 38% 35%, rgba(45,31,94,0.9) 0%, rgba(15,11,31,0.8) 55%, rgba(8,8,16,0.7) 100%)',
                        boxShadow: '0 0 0 1px rgba(139,92,246,0.15), 0 0 30px rgba(139,92,246,0.1)',
                    }}>
                    <DexoSphere size={60} color="rgba(196,167,255,0.85)" />
                </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
                <p className="text-[17px] font-semibold tracking-tight text-zinc-200">Analyzing {name}</p>
                <p className="text-[12px] text-zinc-600">GPT-4o and Claude Haiku working simultaneously</p>
            </div>

            {/* Cycling desk chips */}
            <div className="flex items-center gap-2">
                {desks.map((d, i) => (
                    <span key={d}
                        className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-all duration-600"
                        style={{
                            color: tick === i ? 'rgba(196,167,255,0.95)' : 'rgba(113,113,122,0.45)',
                            borderColor: tick === i ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.05)',
                            background: tick === i ? 'rgba(139,92,246,0.1)' : 'transparent',
                        }}>
                        {d}
                    </span>
                ))}
            </div>

            {/* Speak now nudge */}
            <div className="flex flex-col items-center gap-3">
                <p className="text-[11px] text-zinc-700">You can speak while Dexo is analyzing</p>
                <button type="button" onClick={onMic}
                    className="flex items-center gap-2.5 rounded-2xl border border-violet-500/20 bg-violet-500/[0.07] px-5 py-3 text-[12px] font-medium text-violet-300/80 transition hover:border-violet-500/35 hover:bg-violet-500/12 hover:text-violet-200">
                    <Mic className="h-4 w-4" />
                    Tap to speak
                </button>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DexoRoom() {
    const {
        activeProject,
        updateStrategy,
        updateProductPlan,
        updateMarketInsights,
        updateBudget,
        updateDirectives,
    } = useOffice();

    const [report, setReport]   = useState<JarvisReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [applied, setApplied] = useState<Set<string>>(new Set());
    const [convo, setConvo]     = useState<{ role: 'user' | 'dexo'; text: string }[]>([]);

    const inputRef   = useRef<HTMLTextAreaElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const onTranscript = useCallback((t: string) => {
        setInputText(t);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const { voiceState, startListening, stopListening, speak, stopSpeaking } = useDexoVoice(onTranscript);

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
            setApplied(new Set());
            if (!isMuted && data.report.voiceResponse)
                setTimeout(() => speak(data.report!.voiceResponse), 600);
            if (mode === 'converse' && userMsg) {
                setConvo((prev) => [
                    ...prev,
                    { role: 'user', text: userMsg },
                    { role: 'dexo', text: data.report!.voiceResponse },
                ]);
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Request failed');
        } finally {
            setLoading(false);
        }
    }, [activeProject, buildCtx, report?.headline, isMuted, speak]);

    useEffect(() => {
        if (activeProject?.id && !report && !loading) void run('analyze');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProject?.id]);

    const handleSend = async () => {
        const t = inputText.trim();
        if (!t || loading) return;
        setInputText('');
        await run('converse', t);
    };
    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
    };

    const applyField = (field: keyof JarvisReport['proposedUpdates'], content: string) => {
        const stamp = `\n\n— Dexo · ${new Date().toLocaleString()} —\n${content}`;
        switch (field) {
            case 'strategy':       updateStrategy((activeProject?.strategy ?? '') + stamp); break;
            case 'productPlan':    updateProductPlan((activeProject?.productPlan ?? '') + stamp); break;
            case 'marketInsights': updateMarketInsights((activeProject?.marketInsights ?? '') + stamp); break;
            case 'budget':         updateBudget((activeProject?.budget ?? '') + stamp); break;
            case 'teamDirectives': updateDirectives((activeProject?.teamDirectives ?? '') + stamp); break;
        }
        setApplied((prev) => new Set([...prev, field]));
    };
    const applyAll = () => {
        if (!report) return;
        const u = report.proposedUpdates;
        if (u.strategy)       applyField('strategy', u.strategy);
        if (u.productPlan)    applyField('productPlan', u.productPlan);
        if (u.marketInsights) applyField('marketInsights', u.marketInsights);
        if (u.budget)         applyField('budget', u.budget);
        if (u.teamDirectives) applyField('teamDirectives', u.teamDirectives);
    };

    const pending = report
        ? (Object.entries(report.proposedUpdates)
              .filter(([, v]) => v !== null) as [string, string][])
              .filter(([k]) => !applied.has(k))
        : [];

    const orbState: VoiceState | 'loading' = loading ? 'loading' : voiceState;
    const isListening  = voiceState === 'listening';
    const isSpeaking   = voiceState === 'speaking';
    const isProcessing = voiceState === 'processing';

    // ── Empty state ──
    if (!activeProject?.id) {
        return (
            <div className="flex h-full items-center justify-center bg-zinc-950">
                <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/40 bg-slate-900/30">
                        <DexoSphere size={36} color="rgba(148,163,184,0.6)" />
                    </div>
                    <p className="text-[13px] text-slate-600">Select a venture to activate Dexo.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-zinc-950">

            {/* ── Top bar ── */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800/60 px-5 py-3">
                <div className="flex items-center gap-3">
                    {/* Sphere mark */}
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-900/40">
                        <DexoSphere size={20} color="rgba(148,163,184,0.8)" />
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                        <span className="font-semibold tracking-tight text-slate-300">dexo</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">{activeProject.name}</span>
                        {report && (
                            <>
                                <span className="text-zinc-700">·</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                    report.confidence === 'high'   ? 'text-emerald-400/80' :
                                    report.confidence === 'medium' ? 'text-amber-400/80' :
                                    'text-slate-600'
                                }`}>{report.confidence} confidence</span>
                            </>
                        )}
                    </div>

                    {/* Voice state pills */}
                    {isSpeaking && (
                        <div className="flex items-center gap-2 rounded-full border border-slate-500/25 bg-slate-500/10 px-3 py-1">
                            <WaveBars active color="bg-slate-400" />
                            <span className="text-[10px] font-medium text-slate-300">Speaking</span>
                            <button type="button" onClick={stopSpeaking} className="ml-1 text-slate-500 hover:text-slate-200">
                                <Square className="h-2.5 w-2.5" />
                            </button>
                        </div>
                    )}
                    {isListening && (
                        <div className="flex items-center gap-2 rounded-full border border-slate-500/25 bg-slate-500/10 px-3 py-1">
                            <WaveBars active color="bg-slate-400" />
                            <span className="text-[10px] font-medium text-slate-300">Listening</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    <button type="button"
                        onClick={() => { isMuted ? setIsMuted(false) : (stopSpeaking(), setIsMuted(true)); }}
                        title={isMuted ? 'Enable voice' : 'Mute voice'}
                        className="rounded-lg p-2 text-slate-600 transition hover:text-slate-300">
                        {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" onClick={() => run('analyze')} disabled={loading}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-slate-600 hover:text-slate-200 disabled:opacity-40">
                        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Analyzing' : 'Re-analyze'}
                    </button>
                </div>
            </header>

            {/* ── Scrollable body ── */}
            <div className="custom-scrollbar flex-1 overflow-y-auto bg-zinc-950">
                <div className="mx-auto max-w-[660px] px-5 pb-8 pt-8">

                    {/* Loading fill */}
                    {loading && !report && (
                        <LoadingState name={activeProject.name} onMic={startListening} />
                    )}

                    {/* Re-analyzing banner */}
                    {loading && report && (
                        <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-2.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                            <span className="text-[12px] text-slate-300/80">Dexo is re-analyzing your venture…</span>
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                            <p className="flex-1 text-[12px] text-red-300">{error}</p>
                            <button type="button" onClick={() => run('analyze')} className="text-[11px] text-red-400 underline hover:text-red-200">Retry</button>
                        </div>
                    )}

                    {report && (
                        <div className="space-y-8">

                            {/* ── Orb + headline ── */}
                            <div className="flex flex-col items-center gap-5">
                                <VoiceOrb state={orbState} />
                                <div className="space-y-2.5 text-center">
                                    <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-100">
                                        {report.headline}
                                    </h1>
                                    <p className="mx-auto max-w-lg text-[13.5px] leading-[1.75] text-slate-400">
                                        {report.summary}
                                    </p>
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
                                            <div key={i} className="flex items-start gap-3.5">
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
                                    {report.nextActions.map((a) => (
                                        <div key={a.priority} className="flex items-baseline gap-3.5">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[9px] font-bold text-zinc-700">{a.priority}</span>
                                            <p className="min-w-0 flex-1 text-[13px] leading-snug text-zinc-300">{a.action}</p>
                                            <span className={`shrink-0 text-[10px] font-medium ${TFC[a.timeframe] ?? 'text-zinc-600'}`}>{a.timeframe}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Conversation ── */}
                            {convo.length > 0 && (
                                <div className="space-y-5">
                                    <div className="h-px bg-white/[0.04]" />
                                    {convo.map((msg, i) => (
                                        <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${msg.role === 'dexo' ? 'bg-slate-800/40' : 'bg-slate-900/40'}`}>
                                                {msg.role === 'dexo'
                                                    ? <Sparkles className="h-3 w-3 text-slate-400" />
                                                    : <Activity className="h-3 w-3 text-slate-600" />}
                                            </div>
                                            <p className={`max-w-[84%] text-[13px] leading-relaxed ${msg.role === 'dexo' ? 'text-slate-300' : 'text-slate-200'}`}>{msg.text}</p>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                            )}

                            {/* ── Follow-up chips ── */}
                            {report.followUp.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {report.followUp.map((q, i) => (
                                        <button key={i} type="button"
                                            onClick={() => { setInputText(q); inputRef.current?.focus(); }}
                                            className="rounded-full border border-slate-700/40 px-4 py-2 text-[12px] text-slate-500 transition hover:border-slate-600/50 hover:bg-slate-900/40 hover:text-slate-300">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom dock ── */}
            <div className="shrink-0 border-t border-slate-800/60 bg-zinc-950">

                {/* Staged updates */}
                {pending.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800/50 px-5 py-2.5 custom-scrollbar">
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-700">Staged</span>
                        {pending.map(([field, content]) => (
                            <button key={field} type="button"
                                onClick={() => applyField(field as keyof JarvisReport['proposedUpdates'], content)}
                                className="shrink-0 flex items-center gap-1.5 rounded-full border border-slate-700/40 bg-slate-900/40 px-3 py-1 text-[10px] font-medium text-slate-300/80 transition hover:bg-slate-800/50 hover:text-slate-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-500/70" />
                                {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </button>
                        ))}
                        {pending.length > 1 && (
                            <button type="button" onClick={applyAll}
                                className="ml-auto shrink-0 flex items-center gap-1.5 rounded-full border border-slate-700/50 bg-slate-800/40 px-3.5 py-1 text-[10px] font-semibold text-slate-200 transition hover:bg-slate-800/60">
                                <Zap className="h-3 w-3" /> Apply all
                            </button>
                        )}
                    </div>
                )}

                {/* Input bar */}
                <div className="px-5 py-4">
                    <div className="mx-auto max-w-[660px]">
                        <div className={`flex items-end gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
                            isListening  ? 'border-slate-600/50 bg-slate-900/30 ring-1 ring-slate-600/20' :
                            isSpeaking   ? 'border-slate-700/35 bg-slate-900/20' :
                            isProcessing ? 'border-slate-600/30 bg-slate-900/20' :
                                           'border-slate-800/50 bg-slate-900/20 focus-within:border-slate-700/40 focus-within:bg-slate-900/25'
                        }`}>
                            {/* Mic — prominent */}
                            <button type="button"
                                onMouseDown={() => isListening ? stopListening() : startListening()}
                                title={isListening ? 'Stop' : 'Speak to Dexo'}
                                className={`shrink-0 flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium transition-all ${
                                    isListening
                                        ? 'bg-slate-700/40 text-slate-200 ring-1 ring-slate-600/40'
                                        : isSpeaking
                                            ? 'bg-slate-700/30 text-slate-300'
                                            : 'bg-slate-900/40 text-slate-500 hover:bg-slate-700/30 hover:text-slate-300'
                                }`}>
                                {isListening ? (
                                    <><WaveBars active color="bg-sky-400" /><MicOff className="h-3.5 w-3.5" /></>
                                ) : (
                                    <><Mic className="h-3.5 w-3.5" /><span className="text-[10px]">Speak</span></>
                                )}
                            </button>

                            <textarea ref={inputRef}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={onKey}
                                rows={1}
                                disabled={loading}
                                placeholder={
                                    isListening   ? 'Listening — speak now…' :
                                    isProcessing  ? 'Processing…' :
                                    isSpeaking    ? 'Dexo is speaking…' :
                                    loading       ? 'Analyzing…' :
                                    'Ask Dexo anything about your venture…'
                                }
                                className="custom-scrollbar min-h-[22px] flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed text-slate-100 placeholder-slate-600 outline-none disabled:opacity-50"
                                style={{ maxHeight: '130px', overflowY: 'auto' }}
                            />

                            {isSpeaking ? (
                                <button type="button" onClick={stopSpeaking}
                                    className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-700/30 text-slate-300 ring-1 ring-slate-600/30 transition hover:bg-slate-700/40">
                                    <Square className="h-3 w-3" />
                                </button>
                            ) : (
                                <button type="button" onClick={handleSend}
                                    disabled={!inputText.trim() || loading}
                                    className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-700/40 text-slate-200 transition hover:bg-slate-600/60 disabled:opacity-25">
                                    <Send className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <p className="mt-1.5 text-center text-[9px] text-slate-700">
                            {isListening ? 'Click mic again to stop · message auto-submits' : 'Enter to send · mic to speak · Shift+Enter for new line'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
