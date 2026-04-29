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
    BarChart2,
    ChevronDown,
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
import { VenturePrioritySelector } from '@/components/Dexo/VenturePrioritySelector';
import { PlanGate } from '@/components/PlanGate';
import { readVenturePriority, getPriorityById, type VenturePriorityId } from '@/lib/venturePriority';

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

// ─── Mode-adaptive data ───────────────────────────────────────────────────────

const MODE_HINTS: Record<string, string> = {
    vision:          "Let's explore why this venture exists and who it's really for.",
    market_research: "Ask about competitors, pricing, market size, or customer segments.",
    execution:       "Tell me what's blocking you — I'll help clear it.",
    planning:        "Let's map your path — milestones, constraints, and what to sequence.",
    all:             "Everything is fair game — strategy, market, execution, and planning.",
    custom:          "Dexo is working within your custom focus.",
};

const MODE_LOADING_TEXT: Record<string, string> = {
    vision:          'Shaping your brand story…',
    market_research: 'Scanning your market landscape…',
    execution:       'Finding your next move…',
    planning:        'Mapping the path forward…',
    all:             'Analyzing your venture…',
    custom:          'Working on your focus area…',
};

const MODE_QUICK_REPLIES: Record<string, string[]> = {
    vision:          ["Why does this venture exist?", "Who is this really for?", "What makes us different?"],
    market_research: ["Who are my top competitors?", "What's my market size?", "Where's the pricing gap?"],
    execution:       ["What should I work on today?", "What's blocking me?", "3 priorities for this week"],
    planning:        ["What happens in the next 90 days?", "What are my biggest risks?", "What do I sequence first?"],
    all:             ["Give me a full venture checkup", "What needs most attention?", "Where are the biggest gaps?"],
    custom:          ["What should I focus on next?", "What's most important right now?"],
};

const MODE_REACTIONS: Record<string, string> = {
    vision:          "Switching to Vision mode. I'll dig into brand story, positioning, and your 'why' before anything else. What's the core reason this venture exists?",
    market_research: "Market research mode. I'll focus on competitors, customer segments, and market gaps from here. What do you already know about your space?",
    execution:       "Execution mode — let's cut through the noise. Short answers, one next move at a time. What's the biggest thing blocking you right now?",
    planning:        "Strategic planning mode. I'll think in timelines, sequences, and constraints. Where are you trying to be in the next 90 days?",
    all:             "Full stack mode — nothing gets deprioritised. I'll balance vision, market, execution, and planning equally. What do you want to tackle?",
    custom:          "Got it — I'm working within your custom focus now. What would you like to start with?",
};

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
    /** After Dexo speaks, reopen the mic automatically (Jarvis back-and-forth). */
    const [handsFree, setHandsFree] = useState(false);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);
    const voicePreset = useVoicePreset();
    /** Shown after "Set up in Dexo" so the room feels scoped to that task */
    const [setupMission, setSetupMission] = useState<DexoBootstrapPayload | null>(null);
    /** Toggle between chat, venture overview, and daily research */
    const [view, setView] = useState<'chat' | 'overview' | 'daily'>('chat');
    /** True once the overview nudge has been shown in this session */
    const overviewNudgeShownRef = useRef(false);
    /** Controls the sticky mode-pill panel open/close */
    const [modePanelOpen, setModePanelOpen] = useState(false);

    // Active priority for mode-adaptive UI
    const { priorityId: activePriorityId } = readVenturePriority(activeProject);
    const activePriorityDef = getPriorityById(activePriorityId ?? '');
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

    // Auto-resize Dexo input textarea
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

            // Store the latest report so the Overview tab always reflects current state
            setCurrentReport(data.report);

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

    // Staff attention / "Set up now" — show mission banner + seed first Dexo converse turn
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

    const orbState: ConvoVoiceState | 'loading' = loading ? 'loading' : voiceState;


    return (
        <div data-dexo-room className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-transparent">

            {/* ── Sticky mode header ── */}
            {activeProject && (
                <div className="relative z-20 shrink-0 border-b border-white/[0.07]" style={{ background: 'rgba(12,12,14,0.96)' }}>
                    <div className="mx-auto flex max-w-[660px] items-center gap-3 px-4 py-2">
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30 shrink-0">VENTURE</span>
                        <span className="max-w-[140px] truncate font-sans text-[12px] font-medium text-white/70">
                            {activeProject.name}
                        </span>
                        <span className="text-white/20 select-none">|</span>
                        <button
                            type="button"
                            onClick={() => setModePanelOpen(o => !o)}
                            className="flex items-center gap-1.5 rounded border border-white/[0.1] bg-white/[0.04] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-white/50 transition hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white/80"
                        >
                            <span className="text-xs leading-none">{activePriorityDef?.icon ?? '◎'}</span>
                            <span>{activePriorityDef?.label ?? 'Set focus'}</span>
                            <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-150 ${modePanelOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Mode picker — slides in below header */}
                    {modePanelOpen && (
                        <div className="mx-auto max-w-[660px] px-4 pb-3">
                            <VenturePrioritySelector
                                forceOpen
                                activeProject={activeProject}
                                onSave={(id: VenturePriorityId, customText?: string) => {
                                    const prefs = {
                                        ...(activeProject.roomPreferences ?? {}),
                                        dexoPriority: id,
                                        ...(customText !== undefined ? { dexoPriorityCustom: customText } : {}),
                                    };
                                    void updateProjectField('roomPreferences', prefs);
                                    setModePanelOpen(false);
                                    // Push Dexo mode-change reaction to chat
                                    const reaction = MODE_REACTIONS[id];
                                    if (reaction) {
                                        setConvo(prev => [...prev, { role: 'dexo', text: reaction, id: ++convoId.current }]);
                                        if (view !== 'chat') setView('chat');
                                        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>
            )}

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
                        <div className="mb-5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-3.5">
                            <div className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.05] text-white/50">
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
                    
                    {/* ── Tab row ── */}
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                        <div className="flex flex-wrap items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setView('chat')}
                                className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                                    view === 'chat'
                                        ? 'border-white/[0.18] bg-white/[0.08] text-white/80'
                                        : 'border-white/[0.07] text-white/35 hover:border-white/[0.14] hover:text-white/60'
                                }`}
                            >
                                <MessageSquarePlus className="h-3 w-3" />
                                Chat
                            </button>
                            {currentReport && (
                                <button
                                    type="button"
                                    onClick={() => { overviewNudgeShownRef.current = true; setView('overview'); }}
                                    className={`relative inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                                        view === 'overview'
                                            ? 'border-white/[0.18] bg-white/[0.08] text-white/80'
                                            : 'border-white/[0.07] text-white/35 hover:border-white/[0.14] hover:text-white/60'
                                    }`}
                                >
                                    <Activity className="h-3 w-3" />
                                    Overview
                                    {!overviewNudgeShownRef.current && view !== 'overview' && (
                                        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
                                    )}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setView('daily')}
                                className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                                    view === 'daily'
                                        ? 'border-white/[0.18] bg-white/[0.08] text-white/80'
                                        : 'border-white/[0.07] text-white/35 hover:border-white/[0.14] hover:text-white/60'
                                }`}
                            >
                                <BarChart2 className="h-3 w-3" />
                                Research
                            </button>
                            {view === 'chat' && (
                                <button
                                    type="button"
                                    onClick={resetConversation}
                                    disabled={loading || !activeProject?.id}
                                    className="inline-flex items-center gap-1.5 rounded border border-white/[0.07] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/25 transition-colors hover:border-white/[0.14] hover:text-white/50 disabled:opacity-40"
                                >
                                    New chat
                                </button>
                            )}
                        </div>
                        <TokenDisplay compact={false} showCosts={true} />
                    </div>

                    {/* ── Mode hint ── */}
                    {view === 'chat' && activePriorityId && MODE_HINTS[activePriorityId] && (
                        <div className="-mt-1 mb-4 flex items-start gap-2 border-l border-white/[0.08] pl-3">
                            <p className="font-sans text-[11.5px] leading-snug text-white/35">
                                {MODE_HINTS[activePriorityId]}
                            </p>
                        </div>
                    )}

                    {/* ── Overview Panel ── */}
                    {view === 'overview' && currentReport && (
                        <div className="space-y-px pb-28">
                            {/* Summary header */}
                            <div className="border border-white/[0.07] bg-white/[0.02] p-4 rounded-lg mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <DexoAvatar size="xs" state="idle" pulse={false} />
                                    <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/30">Dexo · Venture Overview</span>
                                    <span className="font-mono text-[8px] text-white/20">· Updates as you chat</span>
                                </div>
                                <p className="text-[15px] font-semibold leading-snug text-white/90">{currentReport.headline}</p>
                                <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{currentReport.summary}</p>
                            </div>

                            {/* Section breakdown — numbered panels */}
                            {currentReport.sections.filter(s => s.insight?.trim()).length > 0 && (
                                <div className="space-y-px">
                                    {currentReport.sections.filter(s => s.insight?.trim()).map((s, i) => (
                                        <div key={s.desk} className="border border-white/[0.07] bg-white/[0.02] p-4 first:rounded-t-lg last:rounded-b-lg">
                                            <div className="flex items-baseline gap-3 mb-2.5">
                                                <span className="font-mono text-[9px] text-white/20 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">{s.title}</span>
                                            </div>
                                            <ul className="space-y-1.5 pl-7">
                                                {s.insight.split(/(?<=[.!?])\s+/).filter(b => b.trim().length > 8).map((b, bi) => (
                                                    <li key={bi} className="flex items-start gap-2 text-[13px] leading-snug text-white/65">
                                                        <span className="mt-[5px] h-[3px] w-[3px] shrink-0 rounded-full bg-white/25" />
                                                        {b.trim()}
                                                    </li>
                                                ))}
                                            </ul>
                                            {s.action?.trim() ? (
                                                <div className="mt-3 flex items-start gap-2 pl-7 pt-2 border-t border-white/[0.05]">
                                                    <ArrowRight className="mt-[2px] h-3 w-3 shrink-0 text-blue-400/60" aria-hidden />
                                                    <p className="text-[12px] font-medium leading-snug text-blue-300/80">{s.action}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Risks */}
                            {currentReport.risks.filter(r => r.detail?.trim()).length > 0 && (
                                <div className="mt-4 space-y-px">
                                    <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25 mb-2">Risk Register</p>
                                    {currentReport.risks.map((r, i) => (
                                        <div key={i} className="border border-amber-500/[0.12] bg-amber-500/[0.03] p-4 first:rounded-t-lg last:rounded-b-lg">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-amber-400/60">⚠ {r.label}</span>
                                                <span className="font-mono text-[8px] text-amber-400/30">({r.level})</span>
                                            </div>
                                            <p className="text-[13px] leading-snug text-white/60">{r.detail}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Recommended moves */}
                            {currentReport.nextActions.filter(a => a.action?.trim()).length > 0 && (
                                <div className="mt-4 border border-white/[0.07] bg-white/[0.02] rounded-lg p-4">
                                    <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25 mb-3">Recommended Moves</p>
                                    <ul className="space-y-2">
                                        {currentReport.nextActions.slice(0, 4).map((a, i) => (
                                            <li key={i} className="flex items-start gap-3 text-[13px] text-white/60">
                                                <span className="mt-[2px] shrink-0 rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-white/30">{a.desk}</span>
                                                {a.action}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setView('chat')}
                                className="mt-4 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-white/25 transition hover:text-white/50"
                            >
                                ← Back to chat
                            </button>
                        </div>
                    )}

                    {/* ── Daily Research Panel ── */}
                    {view === 'daily' && activeProject && (
                        <PlanGate feature="dexoDailyBriefReports">
                            <DexoDailyBriefPanel activeProject={activeProject} autoRunPulse />
                        </PlanGate>
                    )}

                    {/* ── Chat / Analysis view ── */}
                    {view === 'chat' && (
                    <>
                    {/* ── Co-founder header ── */}
                    <div className="mb-5 border-b border-white/[0.06] pb-4">
                        {/* Identity row */}
                        <div className="mb-3 flex items-center gap-3">
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
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">DEXO</span>
                                    <span className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-white/30">AI Co-Founder</span>
                                    {(isSpeaking || isListening) && (
                                        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em] ${
                                            isListening ? 'border-rose-500/30 text-rose-400/80' : 'border-emerald-500/30 text-emerald-400/80'
                                        }`}>
                                            <WaveBars active />
                                            {isListening ? 'Listening' : 'Speaking'}
                                        </span>
                                    )}
                                </div>
                                <h1 className="mt-1 font-sans text-[16px] font-semibold leading-tight tracking-tight text-white/90">
                                    {activeProject?.name ?? 'Dexo'}
                                </h1>
                                <p className="mt-0.5 font-sans text-[12.5px] text-white/45">
                                    Tell me what&apos;s on your mind.
                                </p>
                            </div>
                        </div>

                        {voiceError && (
                            <div className="mb-2 flex items-center gap-2 rounded border border-white/[0.08] px-3 py-2 font-sans text-[11px] text-white/40">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {voiceError}
                            </div>
                        )}

                        {/* Voice control row */}
                        <div className="flex flex-wrap items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setHandsFree((h) => !h)}
                                title="After Dexo speaks, mic opens automatically"
                                className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition-all ${
                                    handsFree
                                        ? 'border-blue-500/40 bg-blue-500/[0.08] text-blue-400/90'
                                        : 'border-white/[0.08] text-white/30 hover:border-white/[0.14] hover:text-white/55'
                                }`}
                            >
                                <AudioLines className="h-3 w-3" />
                                {handsFree ? 'Conversation · On' : 'Conversation'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMuted((m) => !m)}
                                className="inline-flex items-center gap-1.5 rounded border border-white/[0.08] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/30 transition hover:border-white/[0.14] hover:text-white/55"
                            >
                                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                                {isMuted ? 'Unmute' : 'Mute'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowVoiceSettings(true)}
                                className="inline-flex items-center gap-1.5 rounded border border-white/[0.08] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/30 transition hover:border-white/[0.14] hover:text-white/55"
                                title={`Voice: ${voicePreset}`}
                            >
                                <Settings2 className="h-3 w-3" />
                                Voice
                            </button>
                            {(isSpeaking || isListening) && (
                                <button
                                    type="button"
                                    onClick={isSpeaking ? stopSpeaking : stopListening}
                                    className="inline-flex items-center gap-1.5 rounded border border-white/[0.08] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-rose-400/60 transition hover:border-rose-500/30 hover:text-rose-400"
                                >
                                    <Square className="h-2.5 w-2.5" />
                                    Stop
                                </button>
                            )}
                        </div>
                    </div>

                    {convo.length > 0 && (
                        <div className="pb-28">
                            <div className="space-y-1">
                                {convo.map((msg) => {
                                    const isUser = msg.role === 'user';
                                    const isInterrupted = msg.text === '— interrupted —';
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} py-1`}
                                        >
                                            {/* Label row */}
                                            {!isInterrupted && (
                                                <div className={`mb-1 flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                                                    {!isUser && <DexoAvatar size="xs" state="idle" pulse={false} />}
                                                    <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25">
                                                        {isUser ? 'You' : 'Dexo'}
                                                    </span>
                                                </div>
                                            )}

                                            <div
                                                className={`max-w-[88%] sm:max-w-[78%] ${
                                                    isInterrupted
                                                        ? 'border-l-2 border-white/[0.1] pl-3 italic text-white/25 text-[12px]'
                                                        : isUser
                                                          ? 'rounded-lg rounded-tr-sm border border-white/[0.1] bg-white/[0.06] px-3.5 py-2.5 text-[13.5px] text-white/85'
                                                          : 'rounded-lg rounded-tl-sm border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] text-white/80'
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                                                {/* Speak toggle — Dexo messages only */}
                                                {!isUser && !isInterrupted && (
                                                    <div className="mt-2 flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => isSpeaking ? stopSpeaking() : speakJarvis(msg.text)}
                                                            className="inline-flex items-center gap-1 rounded border border-white/[0.07] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white/25 transition hover:border-white/[0.14] hover:text-white/50"
                                                            title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                                                        >
                                                            {isSpeaking
                                                                ? <><VolumeX className="h-2.5 w-2.5" /> Stop</>
                                                                : <><Volume2 className="h-2.5 w-2.5" /> Speak</>
                                                            }
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Overview ready nudge */}
                                {currentReport && !loading && convo.some(m => m.role === 'dexo') && (
                                    <div className="flex flex-col items-start py-1">
                                        <div className="mb-1 flex items-center gap-2">
                                            <DexoAvatar size="xs" state="idle" pulse={false} />
                                            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25">Dexo</span>
                                        </div>
                                        <div className="max-w-[88%] rounded-lg rounded-tl-sm border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 sm:max-w-[78%]">
                                            <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-blue-400/70">Overview ready</p>
                                            <p className="mt-1.5 text-[13px] leading-snug text-white/75">
                                                {currentReport.headline}
                                            </p>
                                            <p className="mt-1 text-[11px] text-white/35">
                                                Breakdown built from your chat — sharpens as we talk.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => { overviewNudgeShownRef.current = true; setView('overview'); }}
                                                className="mt-2.5 inline-flex items-center gap-1.5 rounded border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/60 transition hover:border-white/[0.2] hover:bg-white/[0.09] hover:text-white/85"
                                            >
                                                <Activity className="h-3 w-3" />
                                                See full overview
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Quick reply chips */}
                                {!loading && convo.length > 0 && convo[convo.length - 1]?.role === 'dexo' && (() => {
                                    const chips = MODE_QUICK_REPLIES[activePriorityId ?? ''] ?? MODE_QUICK_REPLIES.all;
                                    return chips.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 pt-2 pl-6">
                                            {chips.map((reply) => (
                                                <button
                                                    key={reply}
                                                    type="button"
                                                    onClick={() => {
                                                        const uid = ++convoId.current;
                                                        setConvo(prev => [...prev, { role: 'user', text: reply, id: uid }]);
                                                        void run('converse', reply);
                                                    }}
                                                    className="flex items-center gap-1.5 rounded border border-white/[0.09] bg-white/[0.03] px-3 py-1.5 font-sans text-[11.5px] text-white/45 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white/75"
                                                >
                                                    <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />
                                                    {reply}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null;
                                })()}

                                {/* Typing indicator */}
                                {loading && convo[convo.length - 1]?.role === 'user' && (
                                    <div className="flex flex-col items-start py-1">
                                        <div className="mb-1 flex items-center gap-2">
                                            <DexoAvatar size="xs" state="thinking" pulse={false} />
                                            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25">Dexo</span>
                                        </div>
                                        <div className="rounded-lg rounded-tl-sm border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-1 w-1 rounded-full bg-white/25 animate-bounce [animation-delay:0ms]" />
                                                <span className="h-1 w-1 rounded-full bg-white/25 animate-bounce [animation-delay:150ms]" />
                                                <span className="h-1 w-1 rounded-full bg-white/25 animate-bounce [animation-delay:300ms]" />
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
                            <p className="truncate px-1 font-sans text-[12px] italic text-white/40">
                                {voiceInterimTranscript}
                            </p>
                        )}

                        {/* Input box */}
                        <div
                            className={`flex items-end gap-2 rounded-lg border px-3 py-2.5 transition-colors duration-200 ${
                                isListening
                                    ? 'border-rose-500/30 bg-rose-500/[0.03]'
                                    : isSpeaking
                                      ? 'border-emerald-500/25 bg-emerald-500/[0.02]'
                                      : isProcessing
                                        ? 'border-blue-500/25 bg-blue-500/[0.02]'
                                        : 'border-white/[0.1] bg-white/[0.03] focus-within:border-white/[0.18]'
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
                                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 ${
                                        isListening
                                            ? 'border-rose-500/50 bg-rose-500/[0.15] text-rose-400'
                                            : isSpeaking
                                              ? 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400'
                                              : isProcessing
                                                ? 'border-blue-500/30 bg-blue-500/[0.08] text-blue-400'
                                                : 'border-white/[0.08] text-white/30 hover:border-white/[0.16] hover:text-white/60'
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
                                    : loading       ? (activePriorityId ? (MODE_LOADING_TEXT[activePriorityId] ?? 'Analyzing your venture…') : 'Analyzing your venture…')
                                    : 'Message Dexo…'
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
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/[0.15] bg-white/[0.08] text-white/70 transition-colors hover:border-white/[0.25] hover:bg-white/[0.13] hover:text-white disabled:opacity-20"
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
