'use client';

/**
 * Dexo — AI Command Center
 * Jarvis-style: non-blocking, always-interruptible, reactive orb
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    AudioLines,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Loader2,
    MessageSquarePlus,
    Mic,
    MicOff,
    Send,
    Settings2,
    Sparkles,
    Square,
    Volume2,
    VolumeX,
    X,
    Zap,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import type { JarvisReport, JarvisSection } from '@/app/api/jarvis/route';
import { VoiceSettingsPanel, useVoicePreset, type VoicePreset } from '@/components/Dexo/VoiceSettings';
import { speak as voiceEngineSpeak, stopSpeaking as stopSpeakingNative, createSpeechQueue, initVoiceCache, type VoiceSettings } from '@/lib/voiceEngine';
import { speechFriendlyText } from '@/lib/speechFriendly';
import { pickEnglishPlaybackVoice, resumeSpeechSynthIfNeeded } from '@/lib/voiceEngine';
import { useTokens, useAnalysisCost, useChatCost } from '@/lib/tokens/useTokens';
import { useDexoConversationalVoice, type VoiceState as ConvoVoiceState } from '@/lib/useDexoConversationalVoice';
import { TokenDisplay, TokenConfirmButton, TokenInlineCost } from '@/components/tokens/TokenDisplay';
import { TokenWarningBanner, TokenInlineWarning, TokenCostPill } from '@/components/tokens/TokenWarning';
import { useUpgradeModal } from '@/components/tokens/UpgradeModal';
import { clearDexoConvo, loadDexoConvo, saveDexoConvo, nextConvoId, type DexoConvoMessage } from '@/lib/dexoConvoStorage';
import { buildInitialDexoMessages, shouldReplaceDexoSeedMessage } from '@/lib/dexoWelcome';
import { DEXO_LOADING_TAGLINES } from '@/lib/dexoLoading';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { dexoAutoSaveHintLines, dexoFullVenturePatchFromJarvis } from '@/lib/dexoApplyJarvisProductPatch';
import { buildDexoJarvisVentureContext } from '@/lib/dexoJarvisContext';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import type { DexoBootstrapPayload } from '@/lib/dexoBootstrap';
import { DexoParticleCanvas } from '@/components/Dexo/DexoParticleSphere';
import { submitDexoVenturePatch } from '@/lib/dexoProposalClient';

// ─── Global CSS ──────────────────────────────────────────────────────────────

const ORB_CSS = `
@keyframes orb-breathe {
    0%,100% { transform: scale(1);   opacity: 1; }
    50%      { transform: scale(1.06); opacity: 0.9; }
}
@keyframes orb-listen {
    0%,100% { box-shadow: 0 0 0 0 rgba(196,201,212,0), 0 0 52px rgba(196,201,212,0.14); transform: scale(1); }
    50%     { box-shadow: 0 0 0 14px rgba(196,201,212,0), 0 0 72px rgba(196,201,212,0.22); transform: scale(1.04); }
}
@keyframes orb-speak {
    /* Softer, tighter glow — large spread reads as a square plate behind the orb */
    0%,100% { box-shadow: 0 0 28px rgba(148,163,184,0.18), 0 0 48px rgba(148,163,184,0.08); }
    50%     { box-shadow: 0 0 36px rgba(148,163,184,0.26), 0 0 64px rgba(148,163,184,0.12); }
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

// ─── Voice orb ────────────────────────────────────────────────────────────────

function VoiceOrb({ state, onClick }: { state: ConvoVoiceState | 'loading'; onClick?: () => void }) {
    const listening    = state === 'listening';
    const speaking     = state === 'speaking';
    const thinking     = state === 'thinking';
    const interrupted  = state === 'interrupted';
    const loading      = state === 'loading';

    const ringColor =
        listening   ? 'rgba(244,63,94,0.5)' :   // Rose for listening
        speaking    ? 'rgba(16,185,129,0.45)' : // Emerald for speaking
        thinking    ? 'rgba(245,158,11,0.4)' :  // Amber for thinking
        interrupted ? 'rgba(249,115,22,0.4)' :   // Orange for interrupted
        loading     ? 'rgba(100,116,139,0.3)' :
                      'rgba(255,255,255,0.12)';

    const glowStyle: React.CSSProperties = {
        animation:
            listening   ? 'orb-listen 1.2s ease-in-out infinite' :
            speaking    ? 'orb-speak 1.5s ease-in-out infinite' :
            thinking    ? 'orb-breathe 2s ease-in-out infinite' :
            state === 'idle' ? 'orb-breathe 4s ease-in-out infinite' : 'none',
    };

    const bgStyle: React.CSSProperties = {
        background:
            listening   ? 'radial-gradient(circle at 38% 35%, rgba(244,63,94,0.2) 0%, rgba(150,30,60,0.15) 60%, rgba(80,15,40,0.1) 100%)' :
            speaking    ? 'radial-gradient(circle at 38% 35%, rgba(16,185,129,0.2) 0%, rgba(10,130,90,0.15) 60%, rgba(5,80,60,0.1) 100%)' :
            thinking    ? 'radial-gradient(circle at 38% 35%, rgba(245,158,11,0.2) 0%, rgba(180,120,20,0.15) 60%, rgba(100,70,10,0.1) 100%)' :
            interrupted ? 'radial-gradient(circle at 38% 35%, rgba(249,115,22,0.2) 0%, rgba(200,100,20,0.15) 60%, rgba(120,60,15,0.1) 100%)' :
            loading     ? 'radial-gradient(circle at 38% 35%, rgba(32,32,36,0.9) 0%, rgba(22,22,26,0.85) 60%, rgba(14,14,18,0.82) 100%)' :
                          'radial-gradient(circle at 38% 35%, rgba(34,34,38,0.88) 0%, rgba(24,24,28,0.82) 60%, rgba(16,16,20,0.78) 100%)',
    };

    return (
        <div
            onClick={onClick}
            className="rounded-full"
            style={{
                width: 120,
                height: 120,
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'visible',
                ...(state === 'idle' ? glowStyle : {}),
            }}
        >
            {/* Outer ping rings */}
            {listening && <>
                <span style={{ position:'absolute', inset:-12, borderRadius:'50%', border:'1px solid rgba(196,201,212,0.2)', animation:'ping-slow 2s ease-in-out infinite' }} />
                <span style={{ position:'absolute', inset:-24, borderRadius:'50%', border:'1px solid rgba(196,201,212,0.1)', animation:'ping-slow 2s ease-in-out 0.5s infinite' }} />
            </>}
            {speaking && <>
                <span style={{ position:'absolute', inset:-8,  borderRadius:'50%', border:'1px solid rgba(148,163,184,0.2)', animation:'ring-spin 10s linear infinite' }} />
                <span style={{ position:'absolute', inset:-18, borderRadius:'50%', border:'1px dashed rgba(148,163,184,0.1)', animation:'ring-spin-r 14s linear infinite' }} />
            </>}

            {/* Main orb — box-shadow glow on this circle only (avoids a square halo from the 120×120 wrapper) */}
            <div
                style={{
                    position:'absolute', inset:0, borderRadius:'50%',
                    border: `1.5px solid ${ringColor}`,
                    transition: 'border-color 0.5s',
                    ...bgStyle,
                    ...(listening || speaking ? glowStyle : {}),
                    display:'flex', alignItems:'center', justifyContent:'center',
                    overflow: 'hidden',
                }}
            >
                {loading ? (
                    <DexoParticleCanvas mode="room" size={114} state="loading" />
                ) : (
                    <DexoParticleCanvas mode="room" size={114} state={state} />
                )}
            </div>
        </div>
    );
}

// ─── Wave bars ────────────────────────────────────────────────────────────────

function WaveBars({ active, color = 'bg-[var(--accent)]' }: { active: boolean; color?: string }) {
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

// ─── Voice hook replaced by useDexoConversationalVoice from lib/useDexoConversationalVoice ─────

// ─── Status palettes ──────────────────────────────────────────────────────────

/** Desk / health status — monochrome tiers (matches executive theme, no chroma boxes). */
const SC = {
    strong:   { dot: 'bg-[var(--text)]',           bar: 'bg-[var(--text)]',           badge: 'bg-white/[0.08] text-[var(--text)]',       label: 'Strong'   },
    caution:  { dot: 'bg-[var(--muted)]',          bar: 'bg-[var(--muted)]',          badge: 'bg-white/[0.06] text-[var(--muted)]',      label: 'Caution'  },
    risk:     { dot: 'bg-zinc-500/55',             bar: 'bg-zinc-500/55',             badge: 'bg-white/[0.05] text-[var(--muted)]',      label: 'Risk'     },
    critical: { dot: 'bg-zinc-600/50',             bar: 'bg-zinc-600/50',             badge: 'bg-white/[0.04] text-[var(--muted)]',      label: 'Critical' },
} as const;

const RC = {
    high:   { icon: 'text-[var(--muted)]', badge: 'border-[var(--border)] bg-white/[0.05] text-[var(--muted)]' },
    medium: { icon: 'text-[var(--muted)]', badge: 'border-[var(--border)] bg-white/[0.04] text-[var(--muted)]' },
    low:    { icon: 'text-[var(--muted)]', badge: 'border-[var(--border)] bg-white/[0.04] text-[var(--muted)]' },
} as const;

const TFC: Record<string, string> = {
    today:        'text-[var(--muted)]',
    'this week':  'text-[var(--muted)]',
    'this month': 'text-[var(--muted)]',
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
                        <span className="text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{d}</span>
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
                    <span className="w-[52px] shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{section.desk}</span>
                    <span className={`shrink-0 rounded px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-wider ${c.badge}`}>{c.label}</span>
                    <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-[var(--muted)]">{section.insight}</span>
                </div>
                <span className="ml-2 mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60">
                    {open ? <ChevronUp className="h-3.5 w-3.5 text-[var(--muted)]" /> : <ChevronDown className="h-3.5 w-3.5 text-[var(--muted)]" />}
                </span>
            </button>
            {open && (
                <div className="mb-3 ml-[26px] space-y-2.5 border-l border-white/[0.06] pl-4">
                    <p className="text-[13px] leading-relaxed text-[var(--text)]">{section.insight}</p>
                    <div className="flex items-start gap-2">
                        <ArrowRight className="mt-[3px] h-3 w-3 shrink-0 text-[var(--muted)]" />
                        <p className="text-[12px] leading-snug text-[var(--muted)]">{section.action}</p>
                    </div>
                    <button type="button"
                        onClick={() => onRead(`${section.desk}. ${section.insight}. Next step: ${section.action}`)}
                        className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] transition hover:text-[var(--text)]">
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
        const t = setInterval(() => setTick((n) => (n + 1) % (desks.length * 2)), 900);
        return () => clearInterval(t);
    }, [desks.length]);
    const activeDesk = desks[tick % desks.length];
    const activeTagline = DEXO_LOADING_TAGLINES[tick % DEXO_LOADING_TAGLINES.length];

    return (
        <div className="mb-6 flex flex-col items-center gap-3 px-2 pb-4 text-center">
            <div className="relative">
                <div className="absolute inset-[-10px] rounded-full bg-[radial-gradient(circle,rgba(116,86,255,0.18),transparent_68%)] blur-xl" />
                <div className="relative rounded-full border border-[rgba(116,86,255,0.18)] bg-[rgba(255,255,255,0.02)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
                    <DexoParticleCanvas mode="room" size={88} state="loading" />
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-[12px] font-semibold tracking-wide text-[var(--text)]">{activeTagline}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                    Reading <span className="text-[var(--text)]">{name}</span> through <span className="text-[var(--text)]">{activeDesk}</span>
                </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
                {desks.map((d, i) => (
                    <span
                        key={d}
                        className="text-[9px] font-semibold uppercase tracking-[0.14em] transition-all duration-500"
                        style={{
                            color: activeDesk === d ? 'var(--accent)' : 'rgba(160,167,180,0.35)',
                            textShadow: activeDesk === d ? '0 0 10px var(--accent-soft)' : 'none',
                        }}
                    >
                        {d}
                    </span>
                ))}
            </div>
            <p className="text-[10px] text-[var(--muted)]">Voice and keyboard stay live while Dexo works</p>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

function truncateSetupDetail(s: string, max = 320): string {
    const t = s.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
}

export function DexoRoom() {
    const { activeProject, dexoBootstrap, setDexoBootstrap, updateProjectField } = useOffice();

    /** Analysis history - all previous analyses are kept, new ones are added */
    const [analysisHistory, setAnalysisHistory] = useState<JarvisReport[]>([]);
    /** Current/latest report - the most recent analysis */
    const [currentReport, setCurrentReport] = useState<JarvisReport | null>(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [isMuted, setIsMuted]   = useState(false);
    const [inputText, setInputText] = useState('');
    const [convo, setConvo]       = useState<DexoConvoMessage[]>([]);
    /** After Dexo speaks, reopen the mic automatically (Jarvis back-and-forth). */
    const [handsFree, setHandsFree] = useState(false);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);
    const voicePreset = useVoicePreset();
    /** Track which analysis is being viewed in detail */
    const [activeAnalysisIndex, setActiveAnalysisIndex] = useState<number | null>(null);
    /** Shown after “Set up in Dexo” so the room feels scoped to that task */
    const [setupMission, setSetupMission] = useState<DexoBootstrapPayload | null>(null);
    const convoId = useRef(0);
    const skipConvoPersistRef = useRef(true);
    const prevDexoVentureIdRef = useRef<number | undefined>(undefined);
    const activeProjectRef = useRef(activeProject);
    activeProjectRef.current = activeProject;

    // Token system integration
    const tokens = useTokens();
    useAnalysisCost();
    useChatCost();
    const upgradeModal = useUpgradeModal();

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const voiceInterimCbRef = useRef<((t: string) => void) | undefined>(undefined);
    const handsFreeRef = useRef(handsFree);
    const isMutedRef = useRef(isMuted);
    handsFreeRef.current = handsFree;
    isMutedRef.current = isMuted;
    const startListenRef = useRef<() => void>(() => {});

    const pendingTranscriptRef = useRef<string | null>(null);
    const setupCacheKey = activeProject?.id ? `deepchox-dexo-setup-${activeProject.id}` : null;

    /** Re-seed welcome when venture name or sparse/rich tier changes (not on every keystroke). */
    const dexoWelcomeRefreshKey = useMemo(() => {
        if (!activeProject?.id) return '';
        const sparse = isVentureFoundationSparse(activeProject);
        return `${activeProject.id}:${sparse ? 'sparse' : 'rich'}:${(activeProject.name ?? '').trim()}`;
    }, [
        activeProject?.id,
        activeProject?.name,
        activeProject?.strategy,
        activeProject?.productPlan,
        activeProject?.budget,
        activeProject?.marketInsights,
        activeProject?.userNotes,
    ]);

    // ── Transcript handler: fill input and auto-submit ──
    const onTranscript = useCallback((t: string) => {
        const trimmed = t.trim();
        if (!trimmed) return;
        // Must set synchronously: `useDexoVoice` sets `processing` right after this returns;
        // the auto-send effect runs on that transition and must see the ref already set.
        pendingTranscriptRef.current = trimmed;
        setInputText(trimmed);
        window.setTimeout(() => setInputText(''), 400);
    }, []);
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

    // Use conversational voice system with streaming and human-like features
    const {
        voiceState,
        voiceError,
        interimTranscript: voiceInterimTranscript,
        currentChunk: voiceCurrentChunk,
        isListening,
        isSpeaking,
        isProcessing,
        startListening,
        stopListening,
        stopSpeaking,
        setMuted,
    } = useDexoConversationalVoice({
        onTranscript,
        onInterrupt,
        onInterimRef: voiceInterimCbRef,
        projectContext: activeProject ? {
            name: activeProject.name,
            strategy: activeProject.strategy,
        } : undefined,
    });

    startListenRef.current = startListening;

    useEffect(() => {
        const p = activeProjectRef.current;
        const vid = p?.id;
        const ventureChanged = vid !== prevDexoVentureIdRef.current;
        if (ventureChanged) {
            prevDexoVentureIdRef.current = vid;
            skipConvoPersistRef.current = true;
            if (!vid) {
                setConvo([]);
                convoId.current = 0;
                requestAnimationFrame(() => {
                    skipConvoPersistRef.current = false;
                });
                return;
            }
            setConvo([]);
            convoId.current = 0;
        }
        if (!p?.id) return;

        let cancelled = false;
        skipConvoPersistRef.current = true;
        void loadDexoConvo(p.id).then((stored) => {
            if (cancelled) return;
            const initial =
                stored.length === 0 || shouldReplaceDexoSeedMessage(p, stored)
                    ? buildInitialDexoMessages(p)
                    : stored;
            setConvo(initial);
            convoId.current = nextConvoId(initial);
            requestAnimationFrame(() => {
                skipConvoPersistRef.current = false;
            });
        });
        return () => {
            cancelled = true;
        };
    }, [dexoWelcomeRefreshKey]);

    useEffect(() => {
        setAnalysisHistory([]);
        setCurrentReport(null);
        setActiveAnalysisIndex(null);
        setError(null);
    }, [activeProject?.id]);

    useEffect(() => {
        setSetupMission(null);
    }, [activeProject?.id]);

    useEffect(() => {
        if (!setupCacheKey || setupMission || typeof window === 'undefined') return;
        try {
            const raw = sessionStorage.getItem(setupCacheKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as DexoBootstrapPayload;
            if (parsed?.title && parsed?.detail) {
                setSetupMission(parsed);
            }
        } catch {
            /* noop */
        }
    }, [setupCacheKey, setupMission]);

    useEffect(() => {
        if (!activeProject?.id) return;
        if (skipConvoPersistRef.current) return;
        void saveDexoConvo(activeProject.id, convo);
    }, [convo, activeProject?.id]);

    // Legacy speak function for reading analysis reports (not streaming)
    const speakJarvis = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        const line = speechFriendlyText(text);
        if (!line) return;
        window.speechSynthesis.cancel();
        resumeSpeechSynthIfNeeded();
        const utterance = new SpeechSynthesisUtterance(line);
        utterance.rate = 1;
        utterance.pitch = 1;
        const voice = pickEnglishPlaybackVoice();
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
    }, []);

    const buildCtx = useCallback((): string => {
        if (!activeProject) return '';
        return buildDexoJarvisVentureContext(activeProject);
    }, [activeProject]);

    const resetConversation = useCallback(() => {
        if (!activeProject?.id) return;
        const projectId = activeProject.id;
        const seed = buildInitialDexoMessages(activeProject);
        void clearDexoConvo(projectId);
        skipConvoPersistRef.current = true;
        setConvo(seed);
        convoId.current = nextConvoId(seed);
        setCurrentReport(null);
        setAnalysisHistory([]);
        setActiveAnalysisIndex(null);
        setError(null);
        setSetupMission(null);
        requestAnimationFrame(() => {
            skipConvoPersistRef.current = false;
            void saveDexoConvo(projectId, seed);
        });
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
            
            const res = await fetch('/api/dexo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'jarvis',
                    payload: {
                        mode,
                        context,
                        sparseContext: isVentureFoundationSparse(activeProject),
                        userMessage: userMsg,
                        previousHeadline: currentReport?.headline,
                        conversationHistory: convo.slice(-10).map(c => ({ role: c.role, text: c.text })),
                    },
                }),
            });
            const data = await res.json() as { ok: boolean; report?: JarvisReport; error?: string };
            if (!data.ok || !data.report) { setError(data.error ?? 'Analysis failed'); return; }

            /** After a real chat turn, persist proposed venture updates (Jarvis schema) to the DB. */
            if (mode === 'converse' && userMsg && activeProject) {
                const patch = dexoFullVenturePatchFromJarvis(activeProject, data.report.proposedUpdates);
                const pending = dexoAutoSaveHintLines(patch);
                if (pending.length > 0 && activeProject.id) {
                    const out = await submitDexoVenturePatch({
                        ventureId: activeProject.id,
                        source: 'dexo_room',
                        model: 'Dexo',
                        summary: `Dexo suggests: ${pending.join(' · ')}`,
                        patch,
                        updateProjectField,
                    });
                    const hint = !out.ok
                        ? `\n\n_Could not store or apply proposal (${out.error})._`
                        : out.applied
                          ? `\n\n_Applied to your venture: ${pending.join(' · ')} (${out.mode} mode)._`
                          : `\n\n_Pending your approval: ${pending.join(' · ')}._`;
                    data.report = {
                        ...data.report,
                        voiceResponse: data.report.voiceResponse + hint,
                    };
                }
            }
            
            // If analyze mode, add to history
            if (mode === 'analyze') {
                setAnalysisHistory(prev => [...prev, data.report!]);
                setCurrentReport(data.report!);
                setActiveAnalysisIndex(null); // Show current/latest
            }
            // If converse mode, also update current report context
            else if (mode === 'converse' && userMsg) {
                setCurrentReport(data.report!);
                setConvo((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (!(last?.role === 'user' && last.text === userMsg)) {
                        next.push({ role: 'user', text: userMsg, id: ++convoId.current });
                    }
                    next.push({ role: 'dexo', text: data.report!.voiceResponse, id: ++convoId.current });
                    return next;
                });
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
            }
            
            // Note: Conversational voice responses are handled automatically by the voice hook
            // Only read analysis reports aloud if not in an active conversation
            if (!isMuted && data.report.voiceResponse && !isListening && !isSpeaking) {
                window.setTimeout(() => speakJarvis(data.report!.voiceResponse), 600);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Request failed');
        } finally {
            setLoading(false);
        }
    }, [activeProject, buildCtx, currentReport, analysisHistory, convo, isMuted, isListening, isSpeaking, speakJarvis, tokens, upgradeModal]);

    // Keep runRef current for the pending-transcript effect
    runRef.current = run;

    // Staff attention / “Set up now” — show mission banner + seed first Dexo converse turn
    useEffect(() => {
        if (!dexoBootstrap || !activeProject?.id) return;
        const payload = dexoBootstrap;
        setDexoBootstrap(null);
        setSetupMission(payload);
        if (typeof window !== 'undefined') {
            try {
                sessionStorage.setItem(`deepchox-dexo-setup-${activeProject.id}`, JSON.stringify(payload));
            } catch {
                /* noop */
            }
        }
        const t = window.setTimeout(() => {
            void runRef.current?.('converse', payload.userMessage);
        }, 200);
        return () => window.clearTimeout(t);
    }, [dexoBootstrap, activeProject?.id, setDexoBootstrap]);

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

    /** Toggle mic: click to start/stop listening */
    const onMicClick = () => {
        if (isSpeaking) {
            stopSpeaking();
            // Small delay then start listening
            setTimeout(() => startListening(), 200);
            return;
        }
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    /** Ctrl+Shift+D while focus is inside Dexo: open mic (or interrupt and listen). */
    useEffect(() => {
        if (!activeProject?.id) return;
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
    }, [activeProject?.id, isSpeaking, isListening, stopSpeaking, startListening]);

    const orbState: ConvoVoiceState | 'loading' = loading && !currentReport ? 'loading' : voiceState;

    // ── Empty state ──
    if (!activeProject?.id) {
        return (
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#030304] px-4 py-8 sm:px-6">
                {/* Ambient background */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 40%, rgba(116,86,255,0.07) 0%, transparent 70%)' }} />
                    <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(circle at center, #52525b 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                </div>
                <div className="relative z-10 max-w-sm shrink-0 space-y-6 text-center">
                    {/* Orb */}
                    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-[rgba(116,86,255,0.08)] blur-xl" />
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[rgba(116,86,255,0.18)] bg-[rgba(116,86,255,0.06)] shadow-[0_0_40px_rgba(116,86,255,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]">
                            <DexoParticleCanvas mode="room" size={52} state="idle" />
                        </div>
                    </div>
                    {/* Text */}
                    <div className="space-y-3">
                        <h2 className="font-sans text-[18px] font-semibold tracking-tight text-white">
                            No venture selected
                        </h2>
                        <p className="font-sans text-[13px] leading-relaxed text-zinc-500">
                            Open a venture from the sidebar or create one — Dexo needs a workspace before it can start analyzing and chatting.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Determine which report to display
    const displayedReport = activeAnalysisIndex !== null 
        ? analysisHistory[activeAnalysisIndex] 
        : currentReport;

    return (
        <div data-dexo-room className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#030304]">

            {/* Ambient background — subtle violet radial + dot grid */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0" style={{ background: ‘radial-gradient(ellipse 80% 50% at 50% 0%, rgba(116,86,255,0.06) 0%, transparent 65%)’ }} />
                <div className="absolute inset-0 opacity-[0.28]" style={{ backgroundImage: ‘radial-gradient(circle at center, #3f3f46 1px, transparent 1px)’, backgroundSize: ‘28px 28px’ }} />
            </div>

            {/* ── Scrollable body (min-h-0 required or flex won’t shrink below content → no scroll on mobile) ── */}
            <div className="custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                <div className="mx-auto max-w-[660px] px-5 pb-32 pt-8">

                    {loading && <AnalyzingBanner name={activeProject.name} />}

                    {/* Error */}
                    {error && !loading && (
                        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-[0_1px_2px_rgba(34,29,24,0.04)]">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                            <p className="flex-1 text-[12px] text-[var(--muted)]">{error}</p>
                            <button type="button" onClick={() => run('analyze')} className="text-[11px] text-[var(--text)] underline underline-offset-2 hover:opacity-90">Retry</button>
                        </div>
                    )}
                    
                    <TokenWarningBanner onUpgrade={upgradeModal.open} />

                    {setupMission ? (
                        <div className="mb-5 rounded-2xl border border-[rgba(116,86,255,0.22)] bg-gradient-to-br from-[rgba(116,86,255,0.14)] via-[var(--bg-card)] to-[rgba(157,136,255,0.12)] px-4 py-3.5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                            <div className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(116,86,255,0.14)] text-[var(--accent)]">
                                    <ClipboardList className="h-5 w-5" aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                                        You&apos;re here to set this up
                                    </p>
                                    <h2 className="mt-1 text-[16px] font-semibold leading-snug tracking-tight text-[var(--text)]">
                                        {setupMission.title}
                                    </h2>
                                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                        Source desk: {(setupMission.sourceRole ?? 'staff').toUpperCase()}
                                    </p>
                                    <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2">
                                        <p className="text-[12px] leading-relaxed text-[var(--muted)]">{setupMission.detail}</p>
                                    </div>
                                    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                                            Required from you
                                        </p>
                                        <ul className="mt-1.5 space-y-1.5">
                                            {(Array.isArray(setupMission.requiredInfo) && setupMission.requiredInfo.length > 0
                                                ? setupMission.requiredInfo
                                                : ['Confirm what is missing and ask Dexo for exact fields to update.']
                                            ).map((line, idx) => (
                                                <li key={`${idx}-${line}`} className="flex gap-2 text-[11px] text-[var(--text)]">
                                                    <span className="mt-[2px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]/80" aria-hidden />
                                                    <span>{line}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                                        Dexo is using this alert context plus your venture record. You can proceed here without going back.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSetupMission(null);
                                        if (setupCacheKey && typeof window !== 'undefined') {
                                            try {
                                                sessionStorage.removeItem(setupCacheKey);
                                            } catch {
                                                /* noop */
                                            }
                                        }
                                    }}
                                    className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text)]"
                                    aria-label="Dismiss setup focus"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : null}
                    
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={resetConversation}
                                disabled={loading || !activeProject?.id}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-1.5 font-sans text-[12px] font-medium text-zinc-400 transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.07)] hover:text-zinc-200 disabled:opacity-40"
                            >
                                <MessageSquarePlus className="h-3.5 w-3.5" />
                                New chat
                            </button>
                            <button
                                type="button"
                                onClick={() => run('analyze')}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(116,86,255,0.3)] bg-[rgba(116,86,255,0.12)] px-3.5 py-1.5 font-sans text-[12px] font-medium text-[#c4b5fd] transition-all duration-200 hover:border-[rgba(116,86,255,0.5)] hover:bg-[rgba(116,86,255,0.2)] disabled:opacity-40"
                            >
                                <Zap className="h-3.5 w-3.5" />
                                {loading ? 'Analyzing…' : 'Analyze'}
                            </button>
                            {activeAnalysisIndex === null ? (
                                <TokenCostPill cost={currentReport ? TOKEN_COSTS.REANALYZE : TOKEN_COSTS.ANALYSIS} />
                            ) : null}
                        </div>
                        <TokenDisplay compact={false} showCosts={true} />
                    </div>

                    {/* ── Analysis History Timeline ── */}
                    {analysisHistory.length > 0 && (
                        <div className="mb-6">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" />
                                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">History</span>
                                <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {/* Current/Active button */}
                                <button
                                    onClick={() => setActiveAnalysisIndex(null)}
                                    type="button"
                                    className={`rounded-full px-3 py-1 font-sans text-[11px] font-medium transition-all duration-200 ${
                                        activeAnalysisIndex === null
                                            ? 'bg-[rgba(116,86,255,0.2)] text-[#c4b5fd] ring-1 ring-[rgba(116,86,255,0.3)]'
                                            : 'text-zinc-500 hover:bg-[rgba(255,255,255,0.05)] hover:text-zinc-300'
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
                                            type="button"
                                            onClick={() => setActiveAnalysisIndex(actualIndex)}
                                            className={`max-w-[140px] truncate rounded-full px-3 py-1 font-sans text-[11px] font-medium transition-all duration-200 ${
                                                isActive
                                                    ? 'bg-[rgba(116,86,255,0.2)] text-[#c4b5fd] ring-1 ring-[rgba(116,86,255,0.3)]'
                                                    : 'text-zinc-500 hover:bg-[rgba(255,255,255,0.05)] hover:text-zinc-300'
                                            }`}
                                            title={r.headline}
                                        >
                                            #{actualIndex + 1} · {r.headline.slice(0, 18)}{r.headline.length > 18 ? '…' : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {displayedReport && activeAnalysisIndex !== null && (
                        <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-center">
                            <span className="text-[10px] text-[var(--muted)]">
                                Viewing archived analysis #{activeAnalysisIndex + 1}
                            </span>
                            <button
                                type="button"
                                onClick={() => setActiveAnalysisIndex(null)}
                                className="text-[10px] text-[var(--text)] underline underline-offset-2 hover:opacity-90"
                            >
                                Back to latest
                            </button>
                        </div>
                    )}

                    {/* ── Orb + voice controls (always — no “analyze first” gate) ── */}
                    <div className="mb-8 flex flex-col items-center gap-5">
                        <VoiceOrb
                            state={orbState}
                            onClick={() => {
                                if (isSpeaking) stopSpeaking();
                                else if (!isMuted) {
                                    if (displayedReport) {
                                        speakJarvis(`${displayedReport.headline}. ${displayedReport.summary}`);
                                    } else {
                                        speakJarvis(
                                            `I'm Dexo. We're in ${activeProject.name}. Tell me what you want help with first, or use Analyze latest if you want a structured brief.`,
                                        );
                                    }
                                }
                            }}
                        />
                        <div className="space-y-2 text-center">
                            {displayedReport ? (
                                <>
                                    <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text)]">
                                        {displayedReport.headline}
                                    </h1>
                                    <p className="mx-auto max-w-lg text-[13.5px] leading-[1.75] text-[var(--muted)]">
                                        {displayedReport.summary}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text)]">
                                        Dexo · {activeProject.name}
                                    </h1>
                                    <p className="mx-auto max-w-lg text-[13.5px] leading-[1.75] text-[var(--muted)]">
                                        Start with chat. Tell Dexo what you want help with, the idea in your head, or the problem you
                                        keep coming back to. Use <span className="text-[var(--text)]">Analyze latest</span> only when
                                        you want a structured brief.
                                    </p>
                                </>
                            )}
                        </div>

                        {(isSpeaking || isListening) && (
                            <div
                                className={`flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] text-[var(--text)]`}
                            >
                                <WaveBars active />
                                <span>{isListening ? 'Listening…' : 'Speaking…'}</span>
                                <button
                                    type="button"
                                    onClick={isSpeaking ? stopSpeaking : stopListening}
                                    className="ml-1 opacity-60 hover:opacity-100"
                                >
                                    <Square className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        )}

                        {voiceError && (
                            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[10px] text-[var(--muted)]">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {voiceError}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setHandsFree((h) => !h)}
                                title="After Dexo speaks, mic opens automatically"
                                className={`executive-pill px-3 py-1.5 text-[11px] ${
                                    handsFree
                                        ? 'border-[rgba(116,86,255,0.22)] bg-[var(--accent-soft)] text-[var(--text)]'
                                        : 'text-[var(--muted)]'
                                }`}
                            >
                                <AudioLines className="h-3.5 w-3.5" />
                                {handsFree ? 'Conversation on' : 'Conversation'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMuted((m) => !m)}
                                className="executive-pill px-3 py-1.5 text-[11px] text-[var(--muted)]"
                            >
                                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                {isMuted ? 'Unmute' : 'Mute'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowVoiceSettings(true)}
                                className="executive-pill border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[11px] text-[var(--text)] hover:bg-[rgba(255,255,255,0.08)]"
                                title={`Voice: ${voicePreset} (click to change)`}
                            >
                                <Settings2 className="h-3.5 w-3.5" />
                                Voice
                            </button>
                            {displayedReport && !isMuted && !isSpeaking && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        speakJarvis(`${displayedReport.headline}. ${displayedReport.summary}`)
                                    }
                                    className="executive-pill px-3 py-1.5 text-[11px] text-[var(--muted)]"
                                >
                                    <Volume2 className="h-3.5 w-3.5" /> Read brief
                                </button>
                            )}
                        </div>
                    </div>

                    {displayedReport && (
                        <div className="space-y-8">
                            <HealthStrip health={displayedReport.health} />

                            <div className="-mx-1">
                                {displayedReport.sections.map((s) => (
                                    <DeskRow key={s.desk} section={s} onRead={(t) => !isMuted && speakJarvis(t)} />
                                ))}
                            </div>

                            {displayedReport.risks.length > 0 && (
                                <div className="space-y-4">
                                    <div className="h-px bg-[var(--border)]" />
                                    {displayedReport.risks.map((r, i) => {
                                        const rc = RC[r.level];
                                        return (
                                            <div key={`risk-${i}`} className="flex items-start gap-3.5">
                                                <AlertTriangle className={`mt-[2px] h-3.5 w-3.5 shrink-0 ${rc.icon}`} />
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-medium text-[var(--text)]">{r.label}</span>
                                                        <span
                                                            className={`rounded border px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider ${rc.badge}`}
                                                        >
                                                            {r.level}
                                                        </span>
                                                    </div>
                                                    <p className="text-[12px] leading-snug text-[var(--muted)]">{r.detail}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {displayedReport.nextActions.length > 0 && (
                                <div className="space-y-3">
                                    <div className="h-px bg-[var(--border)]" />
                                    {displayedReport.nextActions.map((a, i) => (
                                        <div key={`action-${i}`} className="flex items-baseline gap-3.5">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[9px] font-bold text-[var(--text)]">
                                                {a.priority}
                                            </span>
                                            <p className="min-w-0 flex-1 text-[13px] leading-snug text-[var(--text)]">{a.action}</p>
                                            <span className={`shrink-0 text-[10px] font-medium ${TFC[a.timeframe] ?? 'text-[var(--muted)]'}`}>
                                                {a.timeframe}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {displayedReport.followUp.length > 0 && activeAnalysisIndex === null && (
                                <div className="space-y-2 pb-2">
                                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Ask Dexo</p>
                                    <div className="flex flex-wrap gap-2">
                                        {displayedReport.followUp.map((q, i) => (
                                            <button
                                                key={`fu-${i}`}
                                                type="button"
                                                onClick={() => run('converse', q)}
                                                disabled={loading}
                                                className="rounded-full border border-[rgba(116,86,255,0.18)] bg-[rgba(116,86,255,0.06)] px-4 py-1.5 font-sans text-[12px] text-[#9d88ff] transition-all duration-200 hover:border-[rgba(116,86,255,0.35)] hover:bg-[rgba(116,86,255,0.12)] hover:text-[#c4b5fd] disabled:opacity-40"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {convo.length > 0 && (
                        <div className="mt-10 pb-28">
                            {/* Divider */}
                            <div className="mb-6 flex items-center gap-3">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.07)] to-transparent" />
                                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                                    Conversation
                                </span>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.07)] to-transparent" />
                            </div>

                            <div className="space-y-4">
                                {convo.map((msg) => {
                                    const isUser = msg.role === 'user';
                                    const isInterrupted = msg.text === '— interrupted —';
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {/* Dexo avatar */}
                                            {!isUser && (
                                                <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(116,86,255,0.2)] bg-[rgba(116,86,255,0.08)] shadow-[0_0_12px_rgba(116,86,255,0.15)]">
                                                    <Sparkles className="h-3 w-3 text-[#9d88ff]" />
                                                </div>
                                            )}

                                            <div
                                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                                                    isInterrupted
                                                        ? 'border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] italic text-zinc-600'
                                                        : isUser
                                                          ? 'rounded-br-sm border border-[rgba(116,86,255,0.22)] bg-gradient-to-br from-[rgba(116,86,255,0.18)] to-[rgba(116,86,255,0.1)] text-white shadow-[0_0_24px_rgba(116,86,255,0.1),0_4px_16px_rgba(0,0,0,0.4)]'
                                                          : 'rounded-bl-sm border border-[rgba(255,255,255,0.06)] bg-[#111116] text-zinc-200 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                            </div>

                                            {/* User avatar */}
                                            {isUser && (
                                                <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)]">
                                                    <Activity className="h-3 w-3 text-zinc-500" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Input strip ── */}
            <div className="relative z-10 shrink-0">
                {/* Fade gradient from transparent → room bg, so content scrolls under it cleanly */}
                <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-[#030304] to-transparent" />
                <div className="border-t border-[rgba(255,255,255,0.05)] bg-[#030304] px-4 pb-4 pt-3">
                    <div className="mx-auto max-w-[660px] space-y-2">

                        {/* Listening indicator */}
                        {isListening && (
                            <div className="flex items-center gap-2.5 px-1">
                                <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <div className="flex flex-1 items-end gap-[3px] h-4">
                                    {[...Array(10)].map((_, i) => (
                                        <span
                                            key={i}
                                            className="w-[3px] rounded-full bg-rose-500/50 animate-pulse"
                                            style={{ height: `${6 + Math.random() * 14}px`, animationDelay: `${i * 80}ms` }}
                                        />
                                    ))}
                                </div>
                                <span className="font-sans text-[11px] font-medium text-rose-400">Listening</span>
                            </div>
                        )}

                        {/* Interim transcript */}
                        {voiceInterimTranscript && (
                            <p className="truncate px-1 font-sans text-[12px] italic text-[#9d88ff]">
                                {voiceInterimTranscript}
                            </p>
                        )}

                        {/* Input pill */}
                        <div
                            className={`flex items-end gap-2 rounded-2xl border px-3 py-2.5 backdrop-blur-sm transition-all duration-300 ${
                                isListening
                                    ? 'border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.04)] shadow-[0_0_0_1px_rgba(244,63,94,0.1),0_0_24px_rgba(244,63,94,0.08)]'
                                    : isSpeaking
                                      ? 'border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.04)] shadow-[0_0_0_1px_rgba(16,185,129,0.08)]'
                                      : isProcessing
                                        ? 'border-[rgba(116,86,255,0.3)] bg-[rgba(116,86,255,0.05)] shadow-[0_0_0_1px_rgba(116,86,255,0.12),0_0_20px_rgba(116,86,255,0.06)]'
                                        : 'border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] shadow-[0_0_0_1px_rgba(255,255,255,0.03)] focus-within:border-[rgba(116,86,255,0.25)] focus-within:shadow-[0_0_0_1px_rgba(116,86,255,0.1),0_0_20px_rgba(116,86,255,0.06)]'
                            }`}
                        >
                            {/* Mic button */}
                            <div className="relative">
                                {isListening && (
                                    <span className="absolute inset-0 rounded-full animate-ping bg-rose-500/20" />
                                )}
                                <button
                                    type="button"
                                    onClick={onMicClick}
                                    title={isListening ? 'Stop listening' : isSpeaking ? 'Interrupt' : 'Voice input'}
                                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                                        isListening
                                            ? 'bg-rose-500/90 text-white shadow-[0_0_16px_rgba(244,63,94,0.4)]'
                                            : isSpeaking
                                              ? 'bg-emerald-500/15 text-emerald-400'
                                              : isProcessing
                                                ? 'bg-[rgba(116,86,255,0.15)] text-[#9d88ff]'
                                                : 'text-zinc-500 hover:bg-[rgba(255,255,255,0.06)] hover:text-zinc-300'
                                    }`}
                                >
                                    {isListening ? (
                                        <div className="flex items-end gap-[2px]">
                                            <span className="h-2.5 w-[3px] rounded-full bg-current animate-pulse" />
                                            <span className="h-3.5 w-[3px] rounded-full bg-current animate-pulse [animation-delay:80ms]" />
                                            <span className="h-2 w-[3px] rounded-full bg-current animate-pulse [animation-delay:160ms]" />
                                        </div>
                                    ) : isSpeaking ? (
                                        <Volume2 className="h-4 w-4" />
                                    ) : (
                                        <Mic className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            {/* Text input */}
                            <textarea
                                ref={inputRef}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={onKey}
                                rows={1}
                                placeholder={
                                    isListening   ? 'Speak now…'
                                    : isProcessing  ? 'Thinking…'
                                    : isSpeaking    ? 'Dexo is speaking…'
                                    : loading       ? 'Analyzing venture…'
                                    : 'Message Dexo…'
                                }
                                className="min-h-[38px] min-w-0 flex-1 resize-none border-none bg-transparent px-1.5 py-2 font-sans text-[14px] leading-[1.45] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                                style={{ maxHeight: '84px', overflowY: 'hidden' }}
                            />

                            {/* Send / Stop button */}
                            {isSpeaking ? (
                                <button
                                    type="button"
                                    onClick={stopSpeaking}
                                    title="Stop speaking"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rose-400 transition hover:bg-rose-500/10"
                                >
                                    <Square className="h-4 w-4 fill-current" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={!inputText.trim() || loading}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7456ff] text-white shadow-[0_0_16px_rgba(116,86,255,0.35)] transition-all duration-200 hover:bg-[#8a6fff] hover:shadow-[0_0_24px_rgba(116,86,255,0.5)] disabled:opacity-20 disabled:shadow-none"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
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
