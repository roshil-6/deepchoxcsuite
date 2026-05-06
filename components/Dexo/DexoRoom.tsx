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

// â"€â"€â"€ Global CSS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€â"€ Mode-adaptive data â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€â"€ Voice orb â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€â"€ Wave bars â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€â"€ Particle mark (replaces avatar in chat messages) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const DMK_CSS = `
@keyframes dmk-ring{0%,100%{opacity:.18;transform:scale(1)}50%{opacity:.38;transform:scale(1.07)}}
@keyframes dmk-core{0%,100%{opacity:.22;transform:scale(1) translate(-50%,-50%)}50%{opacity:.55;transform:scale(1.2) translate(-42%,-42%)}}
@keyframes dmk-a{0%,100%{transform:translate(0,0) scale(1);opacity:.55}50%{transform:translate(4px,-5px) scale(1.5);opacity:1}}
@keyframes dmk-b{0%,100%{transform:translate(0,0) scale(1);opacity:.45}50%{transform:translate(-5px,4px) scale(1.4);opacity:.95}}
@keyframes dmk-c{0%,100%{transform:translate(0,0) scale(1);opacity:.4}50%{transform:translate(4px,5px) scale(1.3);opacity:.9}}
@keyframes dmk-d{0%,100%{transform:translate(0,0) scale(1);opacity:.35}50%{transform:translate(-4px,-5px) scale(1.25);opacity:.8}}
@keyframes dmk-e{0%,100%{transform:translate(0,0) scale(1);opacity:.3}50%{transform:translate(3px,3px) scale(1.2);opacity:.7}}
@keyframes dmk-f{0%,100%{transform:translate(0,0) scale(1);opacity:.25}50%{transform:translate(-3px,4px) scale(1.15);opacity:.65}}
@keyframes dmk-g{0%,100%{transform:translate(0,0) scale(1);opacity:.22}50%{transform:translate(5px,-3px) scale(1.1);opacity:.6}}
`;
let dmkCssInjected = false;
function injectDmkCss() {
    if (dmkCssInjected || typeof document === 'undefined') return;
    const s = document.createElement('style'); s.textContent = DMK_CSS;
    document.head.appendChild(s); dmkCssInjected = true;
}

type DmkState = 'idle' | 'thinking' | 'speaking' | 'listening';

function DexoParticleMark({ state = 'idle' }: { state?: DmkState }) {
    injectDmkCss();
    const rgb =
        state === 'thinking'  ? '245,158,11' :
        state === 'speaking'  ? '16,185,129' :
        state === 'listening' ? '244,63,94'  :
        '148,163,184';
    const DOTS = [
        { a: 'dmk-a', d: '2.2s', dl: '0s',    x: '28%', y: '26%', r: 3   },
        { a: 'dmk-b', d: '2.8s', dl: '0.4s',  x: '62%', y: '44%', r: 2.5 },
        { a: 'dmk-c', d: '2.4s', dl: '0.75s', x: '40%', y: '66%', r: 2   },
        { a: 'dmk-d', d: '3.0s', dl: '0.2s',  x: '68%', y: '24%', r: 2   },
        { a: 'dmk-e', d: '1.9s', dl: '1.0s',  x: '18%', y: '58%', r: 1.5 },
        { a: 'dmk-f', d: '2.6s', dl: '0.55s', x: '54%', y: '74%', r: 1.5 },
        { a: 'dmk-g', d: '2.1s', dl: '0.85s', x: '74%', y: '58%', r: 1.5 },
    ];
    return (
        <div
            className="relative shrink-0"
            style={{ width: 28, height: 28 }}
        >
            {/* Pulsing outer ring */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    border: `1px solid rgba(${rgb},0.35)`,
                    boxShadow: `0 0 10px rgba(${rgb},0.18), inset 0 0 6px rgba(${rgb},0.06)`,
                    animation: 'dmk-ring 2.6s ease-in-out infinite',
                }}
            />
            {/* Filled container */}
            <div
                className="absolute inset-0 overflow-hidden rounded-full"
                style={{ background: `rgba(${rgb},0.09)` }}
            >
                {/* Soft center core */}
                <div
                    className="absolute"
                    style={{
                        width: 9, height: 9,
                        left: '50%', top: '50%',
                        borderRadius: '50%',
                        background: `rgba(${rgb},0.35)`,
                        filter: 'blur(4px)',
                        animation: 'dmk-core 2.8s ease-in-out infinite',
                    }}
                />
                {DOTS.map((p, i) => (
                    <span
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: p.r, height: p.r,
                            left: p.x, top: p.y,
                            background: `rgba(${rgb},1)`,
                            filter: `blur(0.4px)`,
                            boxShadow: `0 0 ${p.r * 2}px rgba(${rgb},0.55)`,
                            animation: `${p.a} ${p.d} ${p.dl} ease-in-out infinite`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

// â"€â"€â"€ Voice hook replaced by useDexoConversationalVoice from lib/useDexoConversationalVoice â"€â"€â"€â"€â"€

// â"€â"€â"€ Main component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

    // â"€â"€ Transcript handler: fill input and auto-submit â"€â"€
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

            {/* â"€â"€ Sticky mode header â"€â"€ */}
            {activeProject && (
                <div className="relative z-20 shrink-0" style={{ background: '#111113' }}>
                    <div className="mx-auto flex max-w-[660px] items-center gap-3 px-4 py-2.5">
                        <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.18em] shrink-0" style={{ color: '#5c5c6e' }}>VENTURE</span>
                        <span className="max-w-[160px] truncate font-sans text-[13px] font-medium" style={{ color: '#f2f2f5' }}>
                            {activeProject.name}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.12)' }} className="select-none">|</span>
                        <button
                            type="button"
                            onClick={() => setModePanelOpen(o => !o)}
                            className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
                            style={{ color: '#5c5c6e', background: 'none', border: 'none' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#8c8c9e'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#5c5c6e'; }}
                        >
                            <span className="text-xs leading-none">{activePriorityDef?.icon ?? 'â—Ž'}</span>
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

            {/* â"€â"€ Scrollable body (min-h-0 required or flex won't shrink below content ←' no scroll on mobile) â"€â"€ */}
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
                        <div
                            className="mb-5 overflow-hidden rounded-2xl"
                            style={{
                                background: 'rgba(14,13,18,0.97)',
                                border: '1px solid rgba(255,255,255,0.10)',
                                boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 16px 48px rgba(0,0,0,0.5)',
                            }}
                        >
                            {/* Top accent line */}
                            <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.20) 40%, rgba(255,255,255,0.10) 70%, transparent 100%)' }} />

                            <div className="px-5 py-4">
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                                            <ClipboardList className="h-4.5 w-4.5" style={{ color: 'rgba(255,255,255,0.50)' }} aria-hidden />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                                Mission Brief · {(setupMission.sourceRole ?? 'staff').toUpperCase()}
                                            </p>
                                            <h2 className="mt-0.5 text-[15px] font-semibold leading-snug tracking-tight" style={{ color: '#f2f2f5' }}>
                                                {setupMission.title}
                                            </h2>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSetupMission(null);
                                            if (setupCacheKey && typeof window !== 'undefined') {
                                                try { sessionStorage.removeItem(setupCacheKey); } catch { /* noop */ }
                                            }
                                        }}
                                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white/[0.06]"
                                        style={{ color: 'rgba(255,255,255,0.28)' }}
                                        aria-label="Dismiss setup focus"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* Detail */}
                                <div className="mb-3 max-h-36 overflow-y-auto rounded-xl px-3.5 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>{setupMission.detail}</p>
                                </div>

                                {/* Required info */}
                                <div className="rounded-xl px-3.5 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                        Required from you
                                    </p>
                                    <ul className="space-y-1.5">
                                        {(Array.isArray(setupMission.requiredInfo) && setupMission.requiredInfo.length > 0
                                            ? setupMission.requiredInfo
                                            : ['Confirm what is missing and ask Dexo for exact fields to update.']
                                        ).map((line, idx) => (
                                            <li key={`${idx}-${line}`} className="flex gap-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                                <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} aria-hidden />
                                                <span>{line}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <p className="mt-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                    Dexo has full context. You can continue here without switching rooms.
                                </p>
                            </div>
                        </div>
                    ) : null}
                    
                    {/* â"€â"€ Tab row â"€â"€ */}
                    <div className="mb-7 flex items-center justify-between gap-4 border-b pb-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={() => setView('chat')}
                                className="relative pb-3 pr-6 text-[13px] font-medium transition-colors duration-150"
                                style={{ color: view === 'chat' ? '#f2f2f5' : 'rgba(255,255,255,0.28)' }}
                                onMouseEnter={(e) => { if (view !== 'chat') e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                                onMouseLeave={(e) => { if (view !== 'chat') e.currentTarget.style.color = 'rgba(255,255,255,0.28)'; }}
                            >
                                Chat
                                {view === 'chat' && <span className="absolute bottom-0 left-0 h-[1.5px] w-full rounded-full" style={{ background: '#f2f2f5' }} />}
                            </button>
                            {currentReport && (
                                <button
                                    type="button"
                                    onClick={() => { overviewNudgeShownRef.current = true; setView('overview'); }}
                                    className="relative pb-3 pr-6 text-[13px] font-medium transition-colors duration-150"
                                    style={{ color: view === 'overview' ? '#f2f2f5' : 'rgba(255,255,255,0.28)' }}
                                    onMouseEnter={(e) => { if (view !== 'overview') e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                                    onMouseLeave={(e) => { if (view !== 'overview') e.currentTarget.style.color = 'rgba(255,255,255,0.28)'; }}
                                >
                                    Overview
                                    {view === 'overview' && <span className="absolute bottom-0 left-0 h-[1.5px] w-full rounded-full" style={{ background: '#f2f2f5' }} />}
                                    {!overviewNudgeShownRef.current && view !== 'overview' && (
                                        <span className="absolute right-4 top-0 h-1 w-1 rounded-full bg-white/40" />
                                    )}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setView('daily')}
                                className="relative pb-3 pr-6 text-[13px] font-medium transition-colors duration-150"
                                style={{ color: view === 'daily' ? '#f2f2f5' : 'rgba(255,255,255,0.28)' }}
                                onMouseEnter={(e) => { if (view !== 'daily') e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                                onMouseLeave={(e) => { if (view !== 'daily') e.currentTarget.style.color = 'rgba(255,255,255,0.28)'; }}
                            >
                                Research
                                {view === 'daily' && <span className="absolute bottom-0 left-0 h-[1.5px] w-full rounded-full" style={{ background: '#f2f2f5' }} />}
                            </button>
                            {view === 'chat' && (
                                <button
                                    type="button"
                                    onClick={resetConversation}
                                    disabled={loading || !activeProject?.id}
                                    className="pb-3 pr-6 text-[13px] transition-colors duration-150 disabled:opacity-25"
                                    style={{ color: 'rgba(255,255,255,0.22)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.22)'; }}
                                >
                                    New
                                </button>
                            )}
                        </div>
                        <div className="pb-3">
                            <TokenDisplay compact={false} showCosts={true} />
                        </div>
                    </div>

                    {/* â"€â"€ Mode hint â"€â"€ */}
                    {view === 'chat' && activePriorityId && MODE_HINTS[activePriorityId] && (
                        <p className="-mt-2 mb-5 text-[12px] leading-relaxed text-white/24">
                            {MODE_HINTS[activePriorityId]}
                        </p>
                    )}

                    {/* â"€â"€ Overview Panel â"€â"€ */}
                    {view === 'overview' && currentReport && (
                        <div className="flex flex-col gap-8 pb-28">
                            {/* Summary */}
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <span
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                                        style={{ background: 'rgba(255,255,255,0.06)', color: '#f2f2f5', border: '1px solid rgba(255,255,255,0.12)' }}
                                    >D</span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/22">Venture Overview · updates as you chat</span>
                                </div>
                                <p className="text-[18px] font-semibold leading-snug text-white/90">{currentReport.headline}</p>
                                <p className="mt-2 text-[13.5px] leading-relaxed text-white/50">{currentReport.summary}</p>
                            </div>

                            {/* Section breakdown */}
                            {currentReport.sections.filter(s => s.insight?.trim()).length > 0 && (
                                <div className="flex flex-col gap-5">
                                    {currentReport.sections.filter(s => s.insight?.trim()).map((s, i) => (
                                        <div key={s.desk}>
                                            <div className="mb-2 flex items-center gap-2.5">
                                                <span className="text-[10px] text-white/18">{String(i + 1).padStart(2, '0')}</span>
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{s.title}</span>
                                            </div>
                                            <ul className="space-y-1.5 pl-7">
                                                {s.insight.split(/(?<=[.!?])\s+/).filter(b => b.trim().length > 8).map((b, bi) => (
                                                    <li key={bi} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-white/60">
                                                        <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-white/20" />
                                                        {b.trim()}
                                                    </li>
                                                ))}
                                            </ul>
                                            {s.action?.trim() ? (
                                                <div className="mt-2.5 flex items-start gap-2 pl-7">
                                                    <ArrowRight className="mt-[3px] h-3 w-3 shrink-0 text-blue-400/50" aria-hidden />
                                                    <p className="text-[12.5px] leading-snug text-blue-300/70">{s.action}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Risks */}
                            {currentReport.risks.filter(r => r.detail?.trim()).length > 0 && (
                                <div>
                                    <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-white/22">Risk register</p>
                                    <div className="flex flex-col gap-3">
                                        {currentReport.risks.map((r, i) => (
                                            <div key={i}>
                                                <p className="mb-1 text-[11px] font-medium text-amber-400/60">âš  {r.label} <span className="text-amber-400/30">· {r.level}</span></p>
                                                <p className="text-[13px] leading-relaxed text-white/55">{r.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommended moves */}
                            {currentReport.nextActions.filter(a => a.action?.trim()).length > 0 && (
                                <div>
                                    <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-white/22">Recommended moves</p>
                                    <ul className="flex flex-col gap-2.5">
                                        {currentReport.nextActions.slice(0, 4).map((a, i) => (
                                            <li key={i} className="flex items-start gap-3 text-[13px] text-white/58">
                                                <span className="mt-[2px] shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/28"
                                                    style={{ background: 'rgba(255,255,255,0.05)' }}>{a.desk}</span>
                                                {a.action}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setView('chat')}
                                className="self-start text-[11px] text-white/22 transition hover:text-white/50"
                            >
                                ← Back to chat
                            </button>
                        </div>
                    )}

                    {/* â"€â"€ Daily Research Panel â"€â"€ */}
                    {view === 'daily' && activeProject && (
                        <PlanGate feature="dexoDailyBriefReports">
                            <DexoDailyBriefPanel activeProject={activeProject} autoRunPulse />
                        </PlanGate>
                    )}

                    {/* â"€â"€ Chat / Analysis view â"€â"€ */}
                    {view === 'chat' && (
                    <>
                    {/* â"€â"€ Identity header â"€â"€ */}
                    <div className="mb-7 flex items-center gap-3">
                        <DexoAvatar
                            state={
                                orbState === 'loading'    ? 'thinking'  :
                                orbState === 'listening'  ? 'listening' :
                                orbState === 'speaking'   ? 'speaking'  :
                                orbState === 'thinking'   ? 'thinking'  : 'idle'
                            }
                            size="sm"
                            pulse
                            className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-[16px] font-semibold leading-tight tracking-tight" style={{ color: '#f2f2f5' }}>
                                    {activeProject?.name ?? 'Dexo'}
                                </h1>
                                {(isSpeaking || isListening) && (
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                                        style={isListening
                                            ? { background: 'rgba(244,63,94,0.10)', color: '#f87171' }
                                            : { background: 'rgba(16,185,129,0.10)', color: '#34d399' }}
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                                        {isListening ? 'Listening' : 'Speaking'}
                                    </span>
                                )}
                            </div>
                            <p className="mt-0.5 text-[12.5px]" style={{ color: '#5c5c6e' }}>Tell me what&apos;s on your mind.</p>
                        </div>
                    </div>
                    {voiceError && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[11px] text-white/35"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {voiceError}
                        </div>
                    )}

                    {convo.length > 0 && (
                        <div className="pb-28">
                            <div className="flex flex-col gap-5">
                                {convo.map((msg) => {
                                    const isUser = msg.role === 'user';
                                    const isInterrupted = msg.text === '— interrupted —';

                                    if (isInterrupted) {
                                        return (
                                            <div key={msg.id}>
                                                <p className="border-l-2 border-white/10 pl-3 text-[11px] italic text-white/18">— interrupted —</p>
                                            </div>
                                        );
                                    }

                                    if (isUser) {
                                        return (
                                            <div key={msg.id} className="flex justify-end">
                                                <div
                                                    className="max-w-[82%] sm:max-w-[72%] rounded-2xl rounded-br-md px-4 py-3 text-[13.5px] leading-relaxed"
                                                    style={{
                                                        background: '#242428',
                                                        border: '1px solid rgba(255,255,255,0.09)',
                                                        color: '#f2f2f5',
                                                    }}
                                                >
                                                    {msg.text}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // AI message — raw text, no box
                                    return (
                                        <div key={msg.id} className="flex flex-col items-start gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <DexoParticleMark state="idle" />
                                                <span className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#5c5c6e' }}>DEXO</span>
                                            </div>
                                            <div className="w-full pl-8">
                                                <p className="text-[14px] leading-[1.75] whitespace-pre-wrap" style={{ color: '#8c8c9e' }}>{msg.text}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => isSpeaking ? stopSpeaking() : speakJarvis(msg.text)}
                                                    className="mt-2 inline-flex items-center gap-1 text-[10px] transition"
                                                    style={{ color: 'rgba(255,255,255,0.16)' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.16)'; }}
                                                    title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                                                >
                                                    {isSpeaking
                                                        ? <><VolumeX className="h-2.5 w-2.5" /> Stop</>
                                                        : <><Volume2 className="h-2.5 w-2.5" /> Speak</>
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Overview ready nudge */}
                                {currentReport && !loading && convo.some(m => m.role === 'dexo') && (
                                    <div className="flex flex-col items-start gap-2 pl-8">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#5c5c6e' }}>Overview ready</p>
                                        <p className="text-[13px] leading-snug font-medium" style={{ color: '#f2f2f5' }}>{currentReport.headline}</p>
                                        <button
                                            type="button"
                                            onClick={() => { overviewNudgeShownRef.current = true; setView('overview'); }}
                                            className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-150"
                                            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: '#8c8c9e' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#1c1c1f'; e.currentTarget.style.color = '#f2f2f5'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8c8c9e'; }}
                                        >
                                            <Activity className="h-3 w-3" />
                                            See full overview
                                        </button>
                                    </div>
                                )}

                                {/* Quick reply chips */}
                                {!loading && convo.length > 0 && convo[convo.length - 1]?.role === 'dexo' && (() => {
                                    const chips = MODE_QUICK_REPLIES[activePriorityId ?? ''] ?? MODE_QUICK_REPLIES.all;
                                    return chips.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 pl-8 pt-1">
                                            {chips.map((reply) => (
                                                <button
                                                    key={reply}
                                                    type="button"
                                                    onClick={() => {
                                                        const uid = ++convoId.current;
                                                        setConvo(prev => [...prev, { role: 'user', text: reply, id: uid }]);
                                                        void run('converse', reply);
                                                    }}
                                                    className="rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-150"
                                                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: '#8c8c9e' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#1c1c1f'; e.currentTarget.style.color = '#f2f2f5'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8c8c9e'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
                                                >
                                                    {reply}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null;
                                })()}

                                {/* Typing indicator */}
                                {loading && convo[convo.length - 1]?.role === 'user' && (
                                    <div className="flex flex-col items-start gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <DexoParticleMark state="thinking" />
                                            <span className="text-[9px] uppercase tracking-[0.2em] text-white/22">Dexo</span>
                                        </div>
                                        <div className="pl-8 flex items-center gap-1.5 py-1">
                                            {[0, 1, 2].map((i) => (
                                                <span
                                                    key={i}
                                                    className="h-[5px] w-[5px] rounded-full bg-white/25 animate-bounce"
                                                    style={{ animationDelay: `${i * 150}ms` }}
                                                />
                                            ))}
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

            {/* â"€â"€ Input strip â"€â"€ */}
            <div className="relative z-10 shrink-0">
                <div className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-[#111113] to-transparent" />
                <div
                    className="px-4 pb-5 pt-3"
                    style={{ background: '#111113', borderTop: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <div className="mx-auto max-w-[660px] space-y-2">

                        {/* Listening indicator */}
                        {isListening && (
                            <div className="flex items-center gap-2.5 px-1">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500 animate-pulse" />
                                <div className="flex flex-1 items-end gap-[3px] h-3.5">
                                    {[...Array(14)].map((_, i) => (
                                        <span
                                            key={i}
                                            className="w-[2px] rounded-full bg-rose-500/40 animate-pulse"
                                            style={{ height: `${5 + Math.sin(i * 0.9) * 8}px`, animationDelay: `${i * 55}ms` }}
                                        />
                                    ))}
                                </div>
                                <span className="text-[11px] font-medium text-rose-400/80">Listening</span>
                            </div>
                        )}

                        {/* Interim transcript */}
                        {voiceInterimTranscript && (
                            <p className="truncate px-1 text-[12px] italic text-white/28">
                                {voiceInterimTranscript}
                            </p>
                        )}

                        {/* Main input */}
                        <div
                            className={`flex items-end gap-2 rounded-2xl px-3 py-3 transition-all duration-200 ${
                                isListening   ? 'shadow-[0_0_0_1.5px_rgba(244,63,94,0.35)]' :
                                isSpeaking    ? 'shadow-[0_0_0_1.5px_rgba(16,185,129,0.3)]' :
                                isProcessing  ? 'shadow-[0_0_0_1.5px_rgba(99,102,241,0.3)]' :
                                'focus-within:shadow-[0_0_0_1.5px_rgba(255,255,255,0.12)]'
                            }`}
                            style={{ background: '#1c1c1f', border: '1px solid rgba(255,255,255,0.09)' }}
                        >
                            {/* Mic button */}
                            <div className="relative shrink-0">
                                {isListening && (
                                    <span className="absolute inset-0 rounded-full animate-ping bg-rose-500/15" />
                                )}
                                <button
                                    type="button"
                                    onClick={onMicClick}
                                    title={isListening ? 'Stop listening' : isSpeaking ? 'Interrupt' : 'Voice input'}
                                    className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                                        isListening   ? 'bg-rose-500/15 text-rose-400' :
                                        isSpeaking    ? 'bg-emerald-500/10 text-emerald-400' :
                                        isProcessing  ? 'bg-indigo-500/10 text-indigo-400' :
                                        'text-white/28 hover:bg-white/[0.07] hover:text-white/60'
                                    }`}
                                >
                                    {isListening ? (
                                        <div className="flex items-end gap-[2px]">
                                            {[8, 12, 8].map((h, i) => (
                                                <span key={i} className="w-[2px] rounded-full bg-current animate-pulse"
                                                    style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }} />
                                            ))}
                                        </div>
                                    ) : isSpeaking ? (
                                        <Volume2 className="h-4 w-4" />
                                    ) : (
                                        <Mic className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            {/* Textarea */}
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
                                    : loading       ? (activePriorityId ? (MODE_LOADING_TEXT[activePriorityId] ?? 'Analyzing…') : 'Analyzing…')
                                    : 'Message Dexo…'
                                }
                                className="min-h-[32px] min-w-0 flex-1 resize-none border-none bg-transparent py-1 text-[14px] leading-[1.5] text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-0"
                                style={{ maxHeight: '160px', overflowY: 'auto' }}
                            />

                            {/* Right-side controls: hands-free · mute · send/stop */}
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setHandsFree((h) => !h)}
                                    title={handsFree ? 'Hands-free on — turn off' : 'Enable hands-free conversation'}
                                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                                        handsFree ? 'bg-blue-500/15 text-blue-400' : 'text-white/20 hover:text-white/50'
                                    }`}
                                >
                                    <AudioLines className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMuted((m) => !m)}
                                    title={isMuted ? 'Unmute Dexo' : 'Mute Dexo'}
                                    className="flex h-7 w-7 items-center justify-center rounded-full text-white/20 transition-colors hover:text-white/50"
                                >
                                    {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                </button>

                                {isSpeaking ? (
                                    <button
                                        type="button"
                                        onClick={stopSpeaking}
                                        title="Stop speaking"
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 transition hover:bg-rose-500/25"
                                    >
                                        <Square className="h-3.5 w-3.5 fill-current" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSend}
                                        disabled={!inputText.trim() || loading}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-20"
                                        style={{
                                            background: inputText.trim() && !loading ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                                            color: inputText.trim() && !loading ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                                        }}
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Voice settings micro-link */}
                        <div className="flex items-center justify-between px-1">
                            <button
                                type="button"
                                onClick={() => setShowVoiceSettings(true)}
                                className="inline-flex items-center gap-1 text-[10px] text-white/15 transition hover:text-white/38"
                                title={`Voice: ${voicePreset}`}
                            >
                                <Settings2 className="h-2.5 w-2.5" />
                                Voice · {voicePreset}
                            </button>
                            {(isSpeaking || isListening) && (
                                <button
                                    type="button"
                                    onClick={isSpeaking ? stopSpeaking : stopListening}
                                    className="text-[10px] text-rose-400/45 transition hover:text-rose-400/80"
                                >
                                    Stop
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

