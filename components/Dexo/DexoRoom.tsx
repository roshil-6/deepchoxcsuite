'use client';

/**
 * Deepchox — AI Command Center
 * Jarvis-style: non-blocking, always-interruptible, reactive orb
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    AudioLines,
    BarChart2,
    ClipboardList,
    MessageSquarePlus,
    Mic,
    Send,
    Settings2,
    Square,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import type { JarvisReport } from '@/app/api/jarvis/route';
import { VoiceSettingsPanel, useVoicePreset } from '@/components/Dexo/VoiceSettings';
import { speechFriendlyText } from '@/lib/speechFriendly';
import { pickEnglishPlaybackVoice, resumeSpeechSynthIfNeeded } from '@/lib/voiceEngine';
import { useTokens, useChatCost } from '@/lib/tokens/useTokens';
import { useDexoConversationalVoice, type VoiceState as ConvoVoiceState } from '@/lib/useDexoConversationalVoice';
import { TokenDisplay } from '@/components/tokens/TokenDisplay';
import { TokenWarningBanner } from '@/components/tokens/TokenWarning';
import { useUpgradeModal } from '@/components/tokens/UpgradeModal';
import { clearDexoConvo, loadDexoConvo, saveDexoConvo, nextConvoId, type DexoConvoMessage } from '@/lib/dexoConvoStorage';
import { buildInitialDexoMessages, shouldReplaceDexoSeedMessage } from '@/lib/dexoWelcome';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { dexoAutoSaveHintLines, dexoFullVenturePatchFromJarvis } from '@/lib/dexoApplyJarvisProductPatch';
import { buildDexoJarvisVentureContext, DEXO_PRE_VENTURE_CONTEXT } from '@/lib/dexoJarvisContext';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import type { DexoBootstrapPayload } from '@/lib/dexoBootstrap';
import { DexoParticleCanvas } from '@/components/Dexo/DexoParticleSphere';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';
import { submitDexoVenturePatch } from '@/lib/dexoProposalClient';
import { DexoDailyBriefPanel } from '@/components/Dexo/DexoDailyBriefPanel';
import { PlanGate } from '@/components/PlanGate';

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

// ─── Main component ───────────────────────────────────────────────────────────

function truncateSetupDetail(s: string, max = 320): string {
    const t = s.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
}

export function DexoRoom() {
    const { activeProject, dexoBootstrap, setDexoBootstrap, updateProjectField } = useOffice();

    /** Current/latest report - kept for voice continuity context */
    const [currentReport, setCurrentReport] = useState<JarvisReport | null>(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [isMuted, setIsMuted]   = useState(false);
    const [inputText, setInputText] = useState('');
    const [convo, setConvo]       = useState<DexoConvoMessage[]>([]);
    /** After Deepchox speaks, reopen the mic automatically (Jarvis back-and-forth). */
    const [handsFree, setHandsFree] = useState(false);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);
    const voicePreset = useVoicePreset();
    /** Shown after "Set up in Deepchox" so the room feels scoped to that task */
    const [setupMission, setSetupMission] = useState<DexoBootstrapPayload | null>(null);
    /** Toggle between chat/analysis and daily research brief */
    const [view, setView] = useState<'chat' | 'daily'>('chat');
    const convoId = useRef(0);
    const skipConvoPersistRef = useRef(true);
    const prevDexoVentureIdRef = useRef<number | undefined>(undefined);
    const activeProjectRef = useRef(activeProject);
    activeProjectRef.current = activeProject;

    // Token system integration
    const tokens = useTokens();
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
    const runRef = useRef<((mode: 'converse', userMsg?: string) => Promise<void>) | null>(null);
    
    // Expose run to window for testing
    useEffect(() => {
        // @ts-expect-error - debug access
        if (typeof window !== 'undefined') window.dexoRun = runRef.current;
    }, []);

    const onInterrupt = useCallback(() => {
        // Deepchox was interrupted — acknowledge it
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
        setCurrentReport(null);
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

    // Auto-resize Deepchox input textarea
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, [inputText]);

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
        if (!activeProject?.id) {
            setConvo([]);
            return;
        }
        const projectId = activeProject.id;
        const seed = buildInitialDexoMessages(activeProject);
        void clearDexoConvo(projectId);
        skipConvoPersistRef.current = true;
        setConvo(seed);
        convoId.current = nextConvoId(seed);
        setError(null);
        setSetupMission(null);
        requestAnimationFrame(() => {
            skipConvoPersistRef.current = false;
            void saveDexoConvo(projectId, seed);
        });
    }, [activeProject]);

    const run = useCallback(async (mode: 'converse', userMsg?: string) => {
        // Check and spend tokens
        const tokenResult = tokens.spend(TOKEN_COSTS.CHAT_MESSAGE, 'Chat Message');
        
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

            // No venture selected — use the generic pre-venture context so the API won't 400
            if (!context.trim()) {
                context = DEXO_PRE_VENTURE_CONTEXT;
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
                        model: 'Deepchox',
                        summary: `Deepchox suggests: ${pending.join(' · ')}`,
                        patch,
                        updateProjectField,
                    });
                    const hint = !out.ok
                        ? ''
                        : out.applied
                          ? `\n\n_Applied to your venture: ${pending.join(' · ')} (${out.mode} mode)._`
                          : `\n\n_Pending your approval: ${pending.join(' · ')}._`;
                    data.report = {
                        ...data.report,
                        voiceResponse: data.report.voiceResponse + hint,
                    };
                }
            }
            
            // Update conversation
            if (mode === 'converse' && userMsg) {
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
    }, [activeProject, buildCtx, convo, isMuted, isListening, isSpeaking, speakJarvis, tokens, upgradeModal]);

    // Keep runRef current for the pending-transcript effect
    runRef.current = run;

    // Staff attention / "Set up now" — show mission banner + seed first Deepchox converse turn
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

    /** Ctrl+Shift+D while focus is inside Deepchox: open mic (or interrupt and listen). */
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

    const orbState: ConvoVoiceState | 'loading' = loading ? 'loading' : voiceState;


    return (
        <div data-dexo-room className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-transparent">

            {/* ── Scrollable body (min-h-0 required or flex won't shrink below content → no scroll on mobile) ── */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                <div className="mx-auto max-w-[660px] px-4 pb-32 pt-6 sm:px-5 sm:pt-8">

                    {/* Error */}
                    {error && !loading && (
                        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-[0_1px_2px_rgba(34,29,24,0.04)]">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                            <p className="flex-1 text-[12px] text-[var(--muted)]">{error}</p>
                            <button type="button" onClick={() => setError(null)} className="text-[11px] text-[var(--text)] underline underline-offset-2 hover:opacity-90">Dismiss</button>
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
                                                : ['Confirm what is missing and ask Deepchox for exact fields to update.']
                                            ).map((line, idx) => (
                                                <li key={`${idx}-${line}`} className="flex gap-2 text-[11px] text-[var(--text)]">
                                                    <span className="mt-[2px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]/80" aria-hidden />
                                                    <span>{line}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                                        Deepchox is using this alert context plus your venture record. You can proceed here without going back.
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
                            {/* View toggle */}
                            <button
                                type="button"
                                onClick={() => setView('chat')}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-sans text-[12px] font-medium transition-all duration-200 ${
                                    view === 'chat'
                                        ? 'border border-[rgba(116,86,255,0.3)] bg-[rgba(116,86,255,0.12)] text-[#c4b5fd]'
                                        : 'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <MessageSquarePlus className="h-3.5 w-3.5" />
                                Chat
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('daily')}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-sans text-[12px] font-medium transition-all duration-200 ${
                                    view === 'daily'
                                        ? 'border border-[rgba(116,86,255,0.3)] bg-[rgba(116,86,255,0.12)] text-[#c4b5fd]'
                                        : 'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <BarChart2 className="h-3.5 w-3.5" />
                                Daily Brief
                            </button>
                            {view === 'chat' && (
                                <button
                                    type="button"
                                    onClick={resetConversation}
                                    disabled={loading || !activeProject?.id}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-1.5 font-sans text-[12px] font-medium text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] disabled:opacity-40"
                                >
                                    New chat
                                </button>
                            )}
                        </div>
                        <TokenDisplay compact={false} showCosts={true} />
                    </div>

                    {/* ── Daily Brief Panel ── */}
                    {view === 'daily' && activeProject && (
                        <PlanGate feature="dexoDailyBriefReports">
                            <DexoDailyBriefPanel activeProject={activeProject} autoRunPulse />
                        </PlanGate>
                    )}

                    {/* ── Chat / Analysis view ── */}
                    {view === 'chat' && (
                    <>
                    {/* ── Co-founder header ── */}
                    <div className="mb-6">
                        {/* Identity row */}
                        <div className="mb-4 flex items-start gap-3 sm:gap-4">
                            <DexoAvatar
                                state={
                                    orbState === 'loading'    ? 'thinking'  :
                                    orbState === 'listening'  ? 'listening' :
                                    orbState === 'speaking'   ? 'speaking'  :
                                    orbState === 'thinking'   ? 'thinking'  : 'idle'
                                }
                                size="lg"
                                pulse
                                className="shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#7456ff]">Deepchox</span>
                                    <span className="rounded-full border border-[rgba(116,86,255,0.2)] bg-[rgba(116,86,255,0.08)] px-2 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-widest text-[#9d88ff]">AI Co-Founder</span>
                                </div>
                                <div className="mt-1.5">
                                    <h1 className="font-sans text-[15px] font-semibold leading-snug tracking-tight text-[var(--text-primary)] sm:text-[17px]">
                                        {activeProject?.name ?? 'Deepchox'}
                                    </h1>
                                    <p className="mt-1 font-sans text-[13px] leading-relaxed text-[var(--text-secondary)]">
                                        I'm here. Tell me what's on your mind.
                                    </p>
                                </div>

                                {/* Voice state badge */}
                                {(isSpeaking || isListening) && (
                                    <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans text-[11px] font-medium ${
                                        isListening ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                                    }`}>
                                        <WaveBars active />
                                        <span>{isListening ? 'Listening…' : 'Speaking…'}</span>
                                        <button
                                            type="button"
                                            onClick={isSpeaking ? stopSpeaking : stopListening}
                                            className="ml-0.5 opacity-60 hover:opacity-100"
                                        >
                                            <Square className="h-2 w-2" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {voiceError && (
                            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 font-sans text-[11px] text-[var(--text-secondary)]">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {voiceError}
                            </div>
                        )}

                        {/* Voice control pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setHandsFree((h) => !h)}
                                title="After Deepchox speaks, mic opens automatically"
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-[11px] font-medium transition-all ${
                                    handsFree
                                        ? 'bg-[rgba(116,86,255,0.15)] text-[#c4b5fd] ring-1 ring-[rgba(116,86,255,0.3)]'
                                        : 'text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-secondary)]'
                                }`}
                            >
                                <AudioLines className="h-3 w-3" />
                                {handsFree ? 'Conversation on' : 'Conversation'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMuted((m) => !m)}
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-[11px] font-medium text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-secondary)]"
                            >
                                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                                {isMuted ? 'Unmute' : 'Mute'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowVoiceSettings(true)}
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-[11px] font-medium text-zinc-600 transition hover:bg-[rgba(255,255,255,0.05)] hover:text-zinc-400"
                                title={`Voice: ${voicePreset}`}
                            >
                                <Settings2 className="h-3 w-3" />
                                Voice
                            </button>
                        </div>
                    </div>

                    {convo.length > 0 && (
                        <div className="pb-28">
                            <div className="space-y-4">
                                {convo.map((msg) => {
                                    const isUser = msg.role === 'user';
                                    const isInterrupted = msg.text === '— interrupted —';
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {/* Deepchox avatar */}
                                            {!isUser && (
                                                <DexoAvatar size="xs" state="idle" pulse={false} className="mb-1" />
                                            )}

                                            <div
                                                className={`max-w-[92%] rounded-2xl px-3 py-2.5 text-[13px] leading-relaxed sm:max-w-[85%] sm:px-4 sm:py-3 sm:text-[13.5px] ${
                                                    isInterrupted
                                                        ? 'border border-[var(--border)] bg-[var(--bg-elevated)] italic text-[var(--muted)]'
                                                        : isUser
                                                          ? 'rounded-br-sm border border-[rgba(116,86,255,0.22)] bg-gradient-to-br from-[rgba(116,86,255,0.18)] to-[rgba(116,86,255,0.1)] text-[var(--text-primary)] shadow-[0_0_24px_rgba(116,86,255,0.08),0_2px_8px_rgba(0,0,0,0.15)]'
                                                          : 'rounded-bl-sm border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap">{msg.text}</p>

                                                {/* Per-message speak/stop button — Deepchox bubbles only */}
                                                {!isUser && !isInterrupted && (
                                                    <div className="mt-1.5 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => isSpeaking ? stopSpeaking() : speakJarvis(msg.text)}
                                                            className="rounded-md p-0.5 text-[var(--muted)] opacity-50 transition hover:opacity-100 hover:bg-[rgba(255,255,255,0.07)] hover:text-[var(--text-secondary)]"
                                                            title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                                                            aria-label={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                                                        >
                                                            {isSpeaking
                                                                ? <VolumeX className="h-3 w-3" />
                                                                : <Volume2 className="h-3 w-3" />
                                                            }
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* User avatar */}
                                            {isUser && (
                                                <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)]">
                                                    <Activity className="h-3 w-3 text-[var(--muted)]" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Typing indicator — shown while Deepchox is generating a reply */}
                                {loading && convo[convo.length - 1]?.role === 'user' && (
                                    <div className="flex items-end gap-2.5 justify-start">
                                        <DexoAvatar size="xs" state="thinking" pulse={false} className="mb-1" />
                                        <div className="rounded-2xl rounded-bl-sm border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)] animate-bounce [animation-delay:0ms]" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)] animate-bounce [animation-delay:150ms]" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)] animate-bounce [animation-delay:300ms]" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={chatEndRef} />
                            </div>
                        </div>
                    )}
                    </>
                    )}
                </div>
            </div>

            {/* ── Input strip ── */}
            <div className="relative z-10 shrink-0">
                {/* Fade gradient from transparent → room bg, so content scrolls under it cleanly */}
                <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-[rgba(14,14,16,0.72)] to-transparent" />
                <div className="border-t border-[var(--border)] bg-[rgba(14,14,16,0.72)] backdrop-blur-md px-4 pb-4 pt-3">
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
                                        : 'border-[var(--border)] bg-[var(--bg-elevated)] focus-within:border-[rgba(116,86,255,0.25)] focus-within:shadow-[0_0_0_1px_rgba(116,86,255,0.08)]'
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
                                                : 'text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-secondary)]'
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
                                    : isSpeaking    ? 'Deepchox is speaking…'
                                    : loading       ? 'Analyzing venture…'
                                    : 'Message Deepchox…'
                                }
                                className="min-h-[38px] min-w-0 flex-1 resize-none border-none bg-transparent px-1.5 py-2 font-sans text-[14px] leading-[1.45] text-[var(--text-primary)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-0"
                                style={{ maxHeight: '160px', overflowY: 'auto' }}
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
