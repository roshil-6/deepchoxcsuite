'use client';

/**
 * Floating Dexo launcher — crisp vector mark + expandable chat (no canvas noise).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOffice } from '@/lib/OfficeContext';
import { useDexoConversationalVoice } from '@/lib/useDexoConversationalVoice';
import { clearDexoConvo, loadDexoConvo, saveDexoConvo, nextConvoId, type DexoConvoMessage } from '@/lib/dexoConvoStorage';
import {
    buildInitialDexoMessages,
    shouldReplaceDexoSeedMessage,
    buildNoVentureDexoMessages,
    shouldReplaceNoVentureSeedMessage,
} from '@/lib/dexoWelcome';
import { DEXO_LOADING_TAGLINES } from '@/lib/dexoLoading';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { dexoAutoSaveHintLines, dexoFullVenturePatchFromJarvis } from '@/lib/dexoApplyJarvisProductPatch';
import { buildDexoJarvisVentureContext, DEXO_PRE_VENTURE_CONTEXT } from '@/lib/dexoJarvisContext';
import type { JarvisReport } from '@/app/api/jarvis/route';
import { useTokens } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { useUpgradeModal } from '@/components/tokens/UpgradeModal';
import { DexoParticleCanvas } from '@/components/Dexo/DexoParticleSphere';
import { submitDexoVenturePatch } from '@/lib/dexoProposalClient';
import { speechFriendlyText } from '@/lib/speechFriendly';
import { pickEnglishPlaybackVoice, resumeSpeechSynthIfNeeded } from '@/lib/voiceEngine';
import {
    Mic,
    Send,
    X,
    Maximize2,
    Volume2,
    Square,
    MessageSquare,
    MessageSquarePlus,
    AudioWaveform,
    PhoneOff,
} from 'lucide-react';

const STORAGE_KEY = 'deepchox-dexo-orb-offset';
const DRAG_THRESHOLD = 6;
/** Visible orb diameter (inner button) */
const ORB_SIZE = 64;
/** Thin bezel between orb and edge */
const ORB_RING_PX = 2;
const ORB_OUTER = ORB_SIZE + ORB_RING_PX * 2;

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

// ─── Advanced CSS ───────────────────────────────────────────────────────────

const FAB_CSS = `
@keyframes dexo-chat-enter { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
`;

if (typeof document !== 'undefined') {
    const el = document.createElement('style');
    el.id = 'dexo-fab-css';
    if (!document.getElementById('dexo-fab-css')) {
        el.textContent = FAB_CSS;
        document.head.appendChild(el);
    }
}

function speakUtteranceLine(line: string, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || signal.aborted) {
            resolve();
            return;
        }
        resumeSpeechSynthIfNeeded();
        const t = speechFriendlyText(line);
        if (!t) {
            resolve();
            return;
        }
        const u = new SpeechSynthesisUtterance(t);
        const v = pickEnglishPlaybackVoice();
        if (v) u.voice = v;
        u.rate = 1;
        const onAbort = () => {
            try {
                window.speechSynthesis.cancel();
            } catch {
                /* noop */
            }
            resolve();
        };
        signal.addEventListener('abort', onAbort);
        u.onend = () => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        };
        u.onerror = () => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        };
        window.speechSynthesis.speak(u);
    });
}

/** Spoken Dexo replies in live voice mode — strips markdown noise. */
async function speakDexoResponseAloud(text: string, signal: AbortSignal): Promise<void> {
    if (typeof window === 'undefined') return;
    const stripped = text.replace(/[*_`#[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    const chunks = speechFriendlyText(stripped)
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
    for (const c of chunks) {
        if (signal.aborted) break;
        await speakUtteranceLine(c, signal);
    }
}

// ─── Floating Chat Panel ────────────────────────────────────────────────────

function FloatingChat({
    onClose,
    onExpand,
    variant,
}: {
    onClose: () => void;
    onExpand: () => void;
    variant: 'chat' | 'talk';
}) {
    const { activeProject, updateProjectField } = useOffice();
    const tokens = useTokens();
    const upgradeModal = useUpgradeModal();
    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<DexoConvoMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const msgId = useRef(0);
    const messagesRef = useRef<DexoConvoMessage[]>([]);
    const skipPersistRef = useRef(true);
    const prevDexoVentureIdRef = useRef<number | undefined>(undefined);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [loadingTick, setLoadingTick] = useState(0);
    messagesRef.current = messages;

    const voiceInterimCbRef = useRef<((t: string) => void) | undefined>(undefined);
    const talkLiveModeRef = useRef(variant === 'talk');
    const suspendAutoMicRestartRef = useRef(false);
    const activeProjectRef = useRef(activeProject);
    activeProjectRef.current = activeProject;

    useEffect(() => {
        talkLiveModeRef.current = variant === 'talk';
        if (variant !== 'talk') suspendAutoMicRestartRef.current = false;
    }, [variant]);

    const speechAborterRef = useRef<AbortController | null>(null);

    const dexoWelcomeRefreshKey = useMemo(() => {
        if (!activeProject?.id) return 'no-venture';
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

    const {
        interimTranscript,
        isListening,
        isSpeaking,
        startListening,
        stopListening,
        stopSpeaking,
        interrupt,
        markAssistantSpeaking,
    } = useDexoConversationalVoice({
        onTranscript: (text) => {
            if (variant === 'talk') suspendAutoMicRestartRef.current = true;
            setInputText(text);
            setTimeout(() => void handleSend(text), 100);
        },
        onInterrupt: () => {
            speechAborterRef.current?.abort();
            try {
                window.speechSynthesis.cancel();
            } catch {
                /* noop */
            }
        },
        onInterimRef: voiceInterimCbRef,
        projectContext: activeProject ? { name: activeProject.name, strategy: activeProject.strategy } : undefined,
        talkLiveModeRef,
        suspendAutoMicRestartRef,
    });

    const talkLiveRef = useRef(variant === 'talk');
    const startListeningRef = useRef(startListening);
    startListeningRef.current = startListening;

    useEffect(() => {
        talkLiveRef.current = variant === 'talk';
    }, [variant]);

    useEffect(() => {
        const p = activeProjectRef.current;
        const vid = p?.id;
        const ventureChanged = vid !== prevDexoVentureIdRef.current;
        if (ventureChanged) {
            prevDexoVentureIdRef.current = vid;
            skipPersistRef.current = true;
            setMessages([]);
            msgId.current = 0;
        }
        if (variant === 'talk') {
            requestAnimationFrame(() => {
                skipPersistRef.current = false;
            });
            return;
        }
        if (!p?.id) {
            let cancelled = false;
            skipPersistRef.current = true;
            void loadDexoConvo(null).then((stored) => {
                if (cancelled) return;
                const initial =
                    stored.length === 0 || shouldReplaceNoVentureSeedMessage(stored)
                        ? buildNoVentureDexoMessages()
                        : stored;
                setMessages(initial);
                msgId.current = nextConvoId(initial);
                requestAnimationFrame(() => {
                    skipPersistRef.current = false;
                });
            });
            return () => {
                cancelled = true;
            };
        }

        let cancelled = false;
        skipPersistRef.current = true;
        void loadDexoConvo(p.id).then((stored) => {
            if (cancelled) return;
            const initial =
                stored.length === 0 || shouldReplaceDexoSeedMessage(p, stored)
                    ? buildInitialDexoMessages(p)
                    : stored;
            setMessages(initial);
            msgId.current = nextConvoId(initial);
            requestAnimationFrame(() => {
                skipPersistRef.current = false;
            });
        });
        return () => {
            cancelled = true;
        };
    }, [dexoWelcomeRefreshKey, variant]);

    /** Live voice: welcome + spoken greeting, then open the mic. */
    useEffect(() => {
        if (variant !== 'talk') return;
        talkLiveRef.current = true;
        speechAborterRef.current?.abort();
        const ac = new AbortController();
        speechAborterRef.current = ac;
        const sig = ac.signal;
        const p = activeProjectRef.current;
        const vn = p?.name?.trim();
        const greet = vn
            ? `Hi! I'm Dexo — welcome to your live voice session for ${vn}. I'm listening. Ask me to update any part of this venture, run research, or refine your strategy, and I'll work through it with you in real time. When you're done, tap End session or say end session.`
            : `Hi! I'm Dexo. Let's create your venture together — tell me what you're exploring or the problem you care about. When you're ready, use New venture in the sidebar to save a workspace. I'm listening live. When you're finished, tap End session or say end session.`;

        skipPersistRef.current = true;
        setMessages([{ role: 'dexo', text: greet, id: ++msgId.current }]);
        requestAnimationFrame(() => {
            skipPersistRef.current = false;
        });

        void (async () => {
            if (!sig.aborted && talkLiveRef.current) {
                window.setTimeout(() => {
                    if (talkLiveRef.current) startListeningRef.current();
                }, 380);
            }
            try {
                markAssistantSpeaking(true);
                await speakDexoResponseAloud(greet, sig);
            } finally {
                markAssistantSpeaking(false);
            }
            if (!sig.aborted && talkLiveRef.current) {
                window.setTimeout(() => {
                    if (talkLiveRef.current) startListeningRef.current();
                }, 400);
            }
        })();

        return () => {
            ac.abort();
            try {
                window.speechSynthesis.cancel();
            } catch {
                /* noop */
            }
        };
    }, [variant, dexoWelcomeRefreshKey, markAssistantSpeaking]);

    useEffect(() => {
        if (skipPersistRef.current) return;
        void saveDexoConvo(activeProject?.id ?? null, messages);
    }, [messages, activeProject?.id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!loading) return;
        const timer = window.setInterval(() => {
            setLoadingTick((n) => (n + 1) % DEXO_LOADING_TAGLINES.length);
        }, 900);
        return () => window.clearInterval(timer);
    }, [loading]);

    const resetConversation = useCallback(() => {
        skipPersistRef.current = true;
        if (!activeProject?.id) {
            const seed = buildNoVentureDexoMessages();
            void clearDexoConvo(null);
            setMessages(seed);
            msgId.current = nextConvoId(seed);
            requestAnimationFrame(() => {
                skipPersistRef.current = false;
                void saveDexoConvo(null, seed);
            });
            return;
        }
        const projectId = activeProject.id;
        const seed = buildInitialDexoMessages(activeProject);
        void clearDexoConvo(projectId);
        setMessages(seed);
        msgId.current = nextConvoId(seed);
        requestAnimationFrame(() => {
            skipPersistRef.current = false;
            void saveDexoConvo(projectId, seed);
        });
    }, [activeProject]);

    const endTalkSession = useCallback(() => {
        talkLiveRef.current = false;
        speechAborterRef.current?.abort();
        try {
            window.speechSynthesis.cancel();
        } catch {
            /* noop */
        }
        interrupt();
        stopListening();
    }, [interrupt, stopListening]);

    const stopVoiceOutput = useCallback(() => {
        speechAborterRef.current?.abort();
        stopSpeaking();
    }, [stopSpeaking]);

    const handleSend = async (override?: string) => {
        const text = (override || inputText).trim();
        if (!text || loading) return;

        if (
            variant === 'talk' &&
            /^(end(\s+session)?|stop(\s+session)?|that\'?s?\s+all|i\'?m\s+done|goodbye)\.?$/i.test(text)
        ) {
            setInputText('');
            setMessages((prev) => [
                ...prev,
                { role: 'user', text, id: ++msgId.current },
                {
                    role: 'dexo',
                    text: 'Live session ended. Open the orb anytime for chat or another voice session.',
                    id: ++msgId.current,
                },
            ]);
            suspendAutoMicRestartRef.current = false;
            endTalkSession();
            return;
        }

        const project = activeProjectRef.current;

        const tokenResult = tokens.spend(TOKEN_COSTS.CHAT_MESSAGE, 'Chat Message');
        if (!tokenResult.success) {
            suspendAutoMicRestartRef.current = false;
            upgradeModal.open(tokenResult.message);
            return;
        }

        setInputText('');

        const uid = ++msgId.current;
        const prior = messagesRef.current;

        setMessages((prev) => [...prev, { role: 'user', text, id: uid }]);
        if (variant === 'talk') suspendAutoMicRestartRef.current = true;
        setLoading(true);

        let dexoReply = '';

        try {
            const context = project?.id
                ? buildDexoJarvisVentureContext(project)
                : DEXO_PRE_VENTURE_CONTEXT;
            const res = await fetch('/api/dexo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'jarvis',
                    payload: {
                        mode: 'converse',
                        context,
                        sparseContext: project ? isVentureFoundationSparse(project) : false,
                        userMessage: text,
                        conversationHistory: prior.slice(-10).map((c) => ({ role: c.role, text: c.text })),
                    },
                }),
            });
            const data = (await res.json()) as { ok: boolean; report?: JarvisReport; error?: string };
            if (!data.ok || !data.report) {
                dexoReply = data.error ?? 'Dexo could not complete that turn.';
                setMessages((prev) => [...prev, { role: 'dexo', text: dexoReply, id: ++msgId.current }]);
            } else {
                let reply = data.report.voiceResponse;
                if (project?.id) {
                    const patch = dexoFullVenturePatchFromJarvis(project, data.report.proposedUpdates);
                    const pending = dexoAutoSaveHintLines(patch);
                    if (pending.length > 0) {
                        const out = await submitDexoVenturePatch({
                            ventureId: project.id,
                            source: 'dexo_orb',
                            model: 'Dexo',
                            summary: `Dexo suggests: ${pending.join(' · ')}`,
                            patch,
                            updateProjectField,
                        });
                        if (!out.ok) {
                            reply += `\n\n_Could not save suggestion (${out.error}). Try again._`;
                        }
                    }
                }

                dexoReply = reply;
                setMessages((prev) => [...prev, { role: 'dexo', text: reply, id: ++msgId.current }]);
            }
        } catch {
            dexoReply = 'Connection issue. Try again.';
            setMessages((prev) => [...prev, { role: 'dexo', text: dexoReply, id: ++msgId.current }]);
        } finally {
            setLoading(false);
        }

        if (variant === 'talk') suspendAutoMicRestartRef.current = false;

        if (variant === 'talk' && talkLiveRef.current && dexoReply) {
            speechAborterRef.current?.abort();
            speechAborterRef.current = new AbortController();
            const sig = speechAborterRef.current.signal;
            window.setTimeout(() => {
                if (talkLiveRef.current && !sig.aborted) startListeningRef.current();
            }, 380);
            void (async () => {
                try {
                    markAssistantSpeaking(true);
                    await speakDexoResponseAloud(dexoReply, sig);
                } finally {
                    markAssistantSpeaking(false);
                }
                if (talkLiveRef.current && !sig.aborted) {
                    window.setTimeout(() => {
                        if (talkLiveRef.current) startListeningRef.current();
                    }, 400);
                }
            })();
        }
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    const requestClose = useCallback(() => {
        if (variant === 'talk') endTalkSession();
        onClose();
    }, [variant, endTalkSession, onClose]);

    const statusLine =
        variant === 'talk'
            ? isListening
                ? 'Live · listening — speak anytime; interrupts Dexo'
                : isSpeaking
                  ? 'Live · Dexo speaking — speak to interrupt'
                  : loading
                    ? DEXO_LOADING_TAGLINES[loadingTick]
                    : 'Live · ready'
            : isListening
              ? 'Listening'
              : isSpeaking
                ? 'Speaking'
                : loading
                  ? DEXO_LOADING_TAGLINES[loadingTick]
                  : 'Idle';

    return (
        <div
            className="flex w-[min(372px,calc(100vw-1rem))] max-h-[min(520px,calc(100dvh-5rem))] flex-col overflow-hidden rounded-xl border border-zinc-300/90 bg-zinc-50 shadow-[0_20px_50px_rgba(15,23,42,0.18)]"
        >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/90 bg-gradient-to-b from-white to-zinc-100/95 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            variant === 'talk'
                                ? 'border-teal-300/80 bg-teal-50 text-teal-700'
                                : 'border-zinc-300/90 bg-white text-zinc-600'
                        }`}
                    >
                        {variant === 'talk' ? (
                            <AudioWaveform className="h-3.5 w-3.5" strokeWidth={1.75} />
                        ) : (
                            <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold tracking-tight text-zinc-900">
                            Dexo {variant === 'talk' ? '· Live voice' : ''}
                        </p>
                        <p className="truncate text-[10px] text-zinc-500">NorthROSC Labs · DeepChox AI</p>
                        <p className="mt-0.5 truncate text-[10px] font-medium tabular-nums text-teal-700/90">{statusLine}</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                    {variant === 'talk' ? (
                        <button
                            type="button"
                            onClick={() => {
                                endTalkSession();
                                setMessages((prev) => [
                                    ...prev,
                                    {
                                        role: 'dexo',
                                        text: 'Live session ended. Open the orb anytime to start again.',
                                        id: ++msgId.current,
                                    },
                                ]);
                            }}
                            className="mr-0.5 flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-800 transition hover:bg-rose-100"
                        >
                            <PhoneOff className="h-3 w-3" strokeWidth={2} />
                            End
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={resetConversation}
                            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800"
                            title="Start a new chat"
                        >
                            <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onExpand}
                        className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800"
                        title="Open full workspace"
                    >
                        <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                        type="button"
                        onClick={requestClose}
                        className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800"
                        aria-label="Close"
                    >
                        <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                </div>
            </div>

            <div className="custom-scrollbar min-h-[120px] max-h-[min(340px,calc(100dvh-16rem))] flex-1 space-y-2.5 overflow-y-auto bg-zinc-50/90 px-3 py-3 sm:px-3.5">
                {messages.length === 0 && variant === 'chat' && (
                    <div className="flex h-full flex-col items-center justify-center px-2 py-12">
                        <p className="max-w-[248px] text-center text-[12px] leading-relaxed text-zinc-500">
                            {activeProject?.id
                                ? 'Messages stay in context for this venture. Ask for updates, decisions, or a concise read on where things stand.'
                                : 'Exploring without a saved venture — Dexo helps you clarify ideas. Use New venture when you want a named workspace and full analysis.'}
                        </p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div
                            className={`max-w-[88%] px-3 py-2 text-[13px] leading-[1.45] ${
                                msg.role === 'user'
                                    ? 'rounded-lg rounded-br-sm border border-zinc-200 bg-white text-zinc-900 shadow-sm'
                                    : 'rounded-lg rounded-bl-sm border border-zinc-200/80 bg-zinc-100/90 text-zinc-800'
                            }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-2">
                        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className="rounded-full border border-zinc-200 bg-zinc-50 p-1">
                                    <DexoParticleCanvas mode="room" size={28} state="loading" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-zinc-800">{DEXO_LOADING_TAGLINES[loadingTick]}</p>
                                    <p className="text-[10px] text-zinc-500">Generating reply…</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {interimTranscript && (
                <div className="shrink-0 border-t border-zinc-200 bg-white px-3.5 py-1.5">
                    <p className="truncate text-[11px] text-zinc-500">{interimTranscript}</p>
                </div>
            )}

            <div className="shrink-0 border-t border-zinc-200 bg-white px-3 py-2.5">
                {variant === 'talk' && (
                    <p className="mb-2 hidden text-[10px] leading-snug text-zinc-500 sm:block">
                        Mic stays active in the background: you can <span className="font-semibold text-zinc-700">interrupt</span> Dexo while it speaks. Use
                        headphones to reduce echo. Say <span className="font-semibold text-zinc-700">end session</span> or tap{' '}
                        <span className="font-semibold text-zinc-700">End</span> when finished.
                    </p>
                )}
                <div
                    className={`flex items-end gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                        isListening
                            ? 'border-teal-300 bg-teal-50/60'
                            : 'border-zinc-200 bg-zinc-50 focus-within:border-teal-400/80'
                    }`}
                >
                    <button
                        type="button"
                        onClick={() =>
                            isListening ? stopListening() : isSpeaking ? stopVoiceOutput() : startListening()
                        }
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                            isListening
                                ? 'bg-teal-600 text-white'
                                : isSpeaking
                                  ? 'bg-zinc-200 text-zinc-600'
                                  : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800'
                        }`}
                    >
                        {isListening ? (
                            <span className="flex gap-0.5">
                                <span className="h-2 w-0.5 rounded-sm bg-white" />
                                <span className="h-3 w-0.5 rounded-sm bg-white" />
                                <span className="h-1.5 w-0.5 rounded-sm bg-white" />
                            </span>
                        ) : isSpeaking ? (
                            <Volume2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        ) : (
                            <Mic className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                    </button>

                    <textarea
                        ref={inputRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={onKey}
                        rows={1}
                        placeholder={
                            isListening
                                ? 'Listening…'
                                : variant === 'talk'
                                  ? 'Or type a command — same live thread'
                                  : 'Type or use the mic — same thread as Dexo room'
                        }
                        className="min-h-[32px] min-w-0 flex-1 resize-none border-none bg-transparent px-0.5 py-1.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                        style={{ maxHeight: '80px', overflowY: 'auto' }}
                    />

                    {isSpeaking ? (
                        <button
                            type="button"
                            onClick={stopVoiceOutput}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800"
                        >
                            <Square className="h-3 w-3.5 fill-current" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleSend()}
                            disabled={!inputText.trim() || loading}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-800 shadow-sm transition hover:border-teal-400 hover:bg-teal-50 disabled:opacity-30"
                        >
                            <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                    )}
                </div>
            </div>

            <upgradeModal.UpgradeModal />
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

type DexoFabPanel = 'none' | 'menu' | 'chat' | 'talk';

const INTRO_SEEN_KEY = 'deepchox-dexo-orb-intro-seen';

export function FloatingDexoOrb() {
    const { activeProject, activeRoom, switchRoom } = useOffice();
    const [mounted, setMounted] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);
    const [fabPanel, setFabPanel] = useState<DexoFabPanel>('none');
    const [showIntro, setShowIntro] = useState(false);

    const dragRef = useRef<{
        px: number; py: number; ox: number; oy: number; dragged: boolean;
    } | null>(null);

    useEffect(() => {
        setMounted(true);
        setOffset(readOffset());
        // Show intro tooltip on first ever visit
        try {
            if (!localStorage.getItem(INTRO_SEEN_KEY)) {
                const t = window.setTimeout(() => setShowIntro(true), 1800);
                return () => window.clearTimeout(t);
            }
        } catch { /* noop */ }
    }, []);

    // Auto-dismiss intro after 7 seconds
    useEffect(() => {
        if (!showIntro) return;
        const t = window.setTimeout(() => {
            setShowIntro(false);
            try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* noop */ }
        }, 7000);
        return () => window.clearTimeout(t);
    }, [showIntro]);

    // Close menu / panels on outside click
    useEffect(() => {
        if (fabPanel === 'none') return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-dexo-fab]')) {
                setFabPanel('none');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [fabPanel]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (fabPanel === 'chat' || fabPanel === 'talk') return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y, dragged: false };
    }, [offset, fabPanel]);

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
            setFabPanel((prev) => (prev === 'none' ? 'menu' : 'none'));
        }
    }, []);

    const onPointerCancel = useCallback((e: React.PointerEvent) => {
        const d = dragRef.current;
        dragRef.current = null;
        try {
            const el = e.currentTarget as HTMLElement;
            if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        } catch { /* noop */ }
        if (d?.dragged) setOffset((cur) => { saveOffset(cur); return cur; });
    }, []);

    const expandToFull = useCallback(() => {
        setFabPanel('none');
        switchRoom('dexo');
    }, [switchRoom]);

    // Hide when in dexo room
    if (!mounted || activeRoom === 'dexo' || activeRoom === 'personal_assistant') return null;

    const anchorStyle: React.CSSProperties = {
        right: `max(0.75rem, calc(0.75rem - ${offset.x}px))`,
        bottom: `max(5rem, calc(5.75rem - ${offset.y}px))`,
    };

    return createPortal(
        <div className="fixed z-[10049]" style={anchorStyle} data-dexo-fab>
            {/* Mode picker */}
            {fabPanel === 'menu' && (
                <div
                    className="absolute bottom-[calc(100%+12px)] right-0 w-[min(calc(100vw-1.5rem),17.5rem)] rounded-xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.15)]"
                    style={{ animation: 'dexo-chat-enter 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
                >
                    <p className="text-[12px] font-semibold text-zinc-900">How should Dexo help?</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
                        Chat or live voice — uses your saved venture when you have one, or helps you explore before you name it.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={() => setFabPanel('chat')}
                            className="flex w-full items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left text-[13px] font-medium text-zinc-900 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/50"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
                                <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
                            </span>
                            <span>
                                <span className="block">Execute by Chat</span>
                                <span className="text-[10px] font-normal text-zinc-500">Type or tap mic in the thread</span>
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFabPanel('talk')}
                            className="flex w-full items-center gap-2.5 rounded-lg border border-teal-200/90 bg-teal-50/40 px-3 py-2.5 text-left text-[13px] font-medium text-zinc-900 shadow-sm transition hover:border-teal-400 hover:bg-teal-50/80"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-teal-200 bg-white text-teal-700">
                                <AudioWaveform className="h-4 w-4" strokeWidth={1.75} />
                            </span>
                            <span>
                                <span className="block">Execute by Talking</span>
                                <span className="text-[10px] font-normal text-zinc-600">Greeting, then live voice until you End</span>
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {(fabPanel === 'chat' || fabPanel === 'talk') && (
                <div
                    className="absolute bottom-[calc(100%+12px)] right-0"
                    style={{ animation: 'dexo-chat-enter 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
                >
                    <FloatingChat
                        variant={fabPanel}
                        onClose={() => setFabPanel('none')}
                        onExpand={expandToFull}
                    />
                </div>
            )}

            {/* First-time intro tooltip */}
            {showIntro && fabPanel === 'none' && (
                <div
                    className="absolute bottom-[calc(100%+12px)] right-0 w-[min(calc(100vw-1.5rem),18rem)] overflow-hidden rounded-2xl border border-[rgba(116,86,255,0.3)] shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                    style={{
                        background: 'linear-gradient(160deg, #13102a 0%, #0d0b1e 100%)',
                        animation: 'dexo-chat-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                    }}
                >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(116,86,255,0.6)] to-transparent" aria-hidden />
                    <div className="flex items-start gap-3 p-3.5">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 ring-2 ring-[rgba(116,86,255,0.35)]">
                            <img src="/dexo-avatar.jpg" alt="Dexo" className="h-full w-full object-cover object-top" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-[#7456ff]">Dexo</span>
                                <span className="font-sans text-[8px] font-semibold uppercase tracking-widest text-zinc-600">AI Co-Founder</span>
                            </div>
                            <p className="mt-1.5 font-sans text-[12px] leading-relaxed text-zinc-200">
                                Hey! You can speak to me or chat with me by clicking this icon.
                            </p>
                            <p className="mt-1 font-sans text-[10px] text-zinc-500">
                                Try live voice or text — I know your venture.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setShowIntro(false);
                                try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* noop */ }
                            }}
                            className="shrink-0 rounded-md p-0.5 text-zinc-600 transition hover:text-zinc-300"
                            aria-label="Dismiss"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Hover tooltip (only when intro already seen) */}
            {hovered && fabPanel === 'none' && !showIntro && (
                <div
                    className="pointer-events-none absolute bottom-[calc(100%+10px)] right-0 w-[min(calc(100vw-1.5rem),15rem)] rounded-xl border border-zinc-200/90 px-3 py-2.5 text-left shadow-lg"
                    style={{
                        backgroundColor: 'rgba(255,255,255,0.97)',
                        boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
                        animation: 'dexo-chat-enter 0.2s ease-out forwards',
                    }}
                >
                    <p className="text-[12px] font-semibold tracking-tight text-zinc-900">Dexo</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">AI co-founder · venture context</p>
                    {activeProject?.name ? (
                        <p className="mt-1.5 truncate text-[11px] text-zinc-600" title={activeProject.name}>
                            {activeProject.name}
                        </p>
                    ) : null}
                    <p className="mt-2 border-t border-zinc-200 pt-2 text-[10px] text-zinc-500">
                        Tap for chat or live voice · drag orb to move
                    </p>
                </div>
            )}

            {/* Launcher — neutral graphite disc, full ORB_OUTER is the tap target */}
            <div
                className="relative shrink-0 touch-none select-none"
                style={{ width: ORB_OUTER, height: ORB_OUTER }}
            >
                <span
                    className="pointer-events-none absolute rounded-full"
                    aria-hidden
                    style={{
                        inset: 0,
                        boxShadow:
                            'inset 0 0 0 1px rgba(255,255,255,0.45), 0 0 0 1px rgba(15,118,110,0.25), 0 10px 28px rgba(15,23,42,0.18)',
                    }}
                />
                <button
                    type="button"
                    title={fabPanel !== 'none' ? 'Close Dexo' : 'Open Dexo'}
                    aria-haspopup="dialog"
                    aria-expanded={fabPanel !== 'none'}
                    aria-label={fabPanel !== 'none' ? 'Close Dexo' : 'Open Dexo'}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    className="absolute inset-0 z-10 rounded-full border-none bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    style={{ cursor: 'pointer' }}
                >
                    <span
                        className="absolute overflow-hidden rounded-full"
                        style={{
                            top: ORB_RING_PX,
                            left: ORB_RING_PX,
                            width: ORB_SIZE,
                            height: ORB_SIZE,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            transform:
                                hovered ? 'scale(1.02)' : fabPanel !== 'none' ? 'scale(0.99)' : 'scale(1)',
                            background:
                                fabPanel !== 'none'
                                    ? 'radial-gradient(circle at 35% 28%, rgba(224,242,241,0.98) 0%, rgba(204,251,241,0.92) 42%, rgba(167,243,208,0.88) 100%)'
                                    : hovered
                                      ? 'radial-gradient(circle at 35% 28%, rgba(244,244,245,0.98) 0%, rgba(228,228,231,0.96) 48%, rgba(212,212,216,0.94) 100%)'
                                      : 'radial-gradient(circle at 35% 28%, rgba(250,250,250,0.99) 0%, rgba(235,235,238,0.97) 50%, rgba(220,220,224,0.95) 100%)',
                            boxShadow:
                                'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(15,23,42,0.06)',
                        }}
                    >
                        <DexoParticleCanvas
                            mode="floating"
                            size={ORB_SIZE - 4}
                            active={hovered || fabPanel !== 'none'}
                        />
                    </span>
                </button>
            </div>
        </div>,
        document.body
    );
}
