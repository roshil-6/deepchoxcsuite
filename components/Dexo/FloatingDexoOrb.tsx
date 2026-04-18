'use client';

/**
 * Floating Dexo launcher — crisp vector mark + expandable chat (no canvas noise).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOffice } from '@/lib/OfficeContext';
import { useDexoConversationalVoice } from '@/lib/useDexoConversationalVoice';
import { clearDexoConvo, loadDexoConvo, saveDexoConvo, nextConvoId, type DexoConvoMessage } from '@/lib/dexoConvoStorage';
import { buildInitialDexoMessages, shouldReplaceDexoSeedMessage } from '@/lib/dexoWelcome';
import { DEXO_LOADING_TAGLINES } from '@/lib/dexoLoading';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { dexoAutoSaveHintLines, dexoFullVenturePatchFromJarvis } from '@/lib/dexoApplyJarvisProductPatch';
import { buildDexoJarvisVentureContext } from '@/lib/dexoJarvisContext';
import type { JarvisReport } from '@/app/api/jarvis/route';
import { useTokens } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { useUpgradeModal } from '@/components/tokens/UpgradeModal';
import { DexoParticleCanvas } from '@/components/Dexo/DexoParticleSphere';
import { submitDexoVenturePatch } from '@/lib/dexoProposalClient';
import { Mic, Send, X, Maximize2, Volume2, Square, MessageSquare, MessageSquarePlus } from 'lucide-react';

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

// ─── Floating Chat Panel ────────────────────────────────────────────────────

function FloatingChat({
    onClose,
    onExpand,
}: {
    onClose: () => void;
    onExpand: () => void;
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
    const activeProjectRef = useRef(activeProject);
    activeProjectRef.current = activeProject;

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

    const {
        interimTranscript,
        isListening,
        isSpeaking,
        startListening,
        stopListening,
        stopSpeaking,
    } = useDexoConversationalVoice({
        onTranscript: (text) => {
            setInputText(text);
            setTimeout(() => handleSend(text), 100);
        },
        onInterimRef: voiceInterimCbRef,
        projectContext: activeProject ? { name: activeProject.name, strategy: activeProject.strategy } : undefined,
    });

    useEffect(() => {
        const p = activeProjectRef.current;
        const vid = p?.id;
        const ventureChanged = vid !== prevDexoVentureIdRef.current;
        if (ventureChanged) {
            prevDexoVentureIdRef.current = vid;
            skipPersistRef.current = true;
            if (!vid) {
                setMessages([]);
                msgId.current = 0;
                requestAnimationFrame(() => {
                    skipPersistRef.current = false;
                });
                return;
            }
            setMessages([]);
            msgId.current = 0;
        }
        if (!p?.id) return;

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
    }, [dexoWelcomeRefreshKey]);

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
        if (!activeProject?.id) return;
        const projectId = activeProject.id;
        const seed = buildInitialDexoMessages(activeProject);
        void clearDexoConvo(projectId);
        skipPersistRef.current = true;
        setMessages(seed);
        msgId.current = nextConvoId(seed);
        requestAnimationFrame(() => {
            skipPersistRef.current = false;
            void saveDexoConvo(projectId, seed);
        });
    }, [activeProject]);

    const handleSend = async (override?: string) => {
        const text = (override || inputText).trim();
        if (!text || loading) return;
        const project = activeProjectRef.current;
        if (!project?.id) {
            setMessages((prev) => [
                ...prev,
                { role: 'dexo', text: 'Select or create a venture first.', id: ++msgId.current },
            ]);
            return;
        }

        const tokenResult = tokens.spend(TOKEN_COSTS.CHAT_MESSAGE, 'Chat Message');
        if (!tokenResult.success) {
            upgradeModal.open(tokenResult.message);
            return;
        }

        setInputText('');

        const uid = ++msgId.current;
        const prior = messagesRef.current;

        setMessages((prev) => [...prev, { role: 'user', text, id: uid }]);
        setLoading(true);

        try {
            const context = buildDexoJarvisVentureContext(project);
            const res = await fetch('/api/dexo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'jarvis',
                    payload: {
                        mode: 'converse',
                        context,
                        sparseContext: isVentureFoundationSparse(project),
                        userMessage: text,
                        conversationHistory: prior.slice(-10).map((c) => ({ role: c.role, text: c.text })),
                    },
                }),
            });
            const data = (await res.json()) as { ok: boolean; report?: JarvisReport; error?: string };
            if (!data.ok || !data.report) {
                setMessages((prev) => [
                    ...prev,
                    { role: 'dexo', text: data.error ?? 'Dexo could not complete that turn.', id: ++msgId.current },
                ]);
                return;
            }

            let reply = data.report.voiceResponse;
            const patch = dexoFullVenturePatchFromJarvis(project, data.report.proposedUpdates);
            const pending = dexoAutoSaveHintLines(patch);
            if (pending.length > 0 && project.id) {
                const out = await submitDexoVenturePatch({
                    ventureId: project.id,
                    source: 'dexo_orb',
                    model: 'Dexo',
                    summary: `Dexo suggests: ${pending.join(' · ')}`,
                    patch,
                    updateProjectField,
                });
                reply += !out.ok
                    ? `\n\n_Could not store or apply proposal (${out.error})._`
                    : out.applied
                      ? `\n\n_Applied to your venture: ${pending.join(' · ')} (${out.mode} mode)._`
                      : `\n\n_Pending your approval: ${pending.join(' · ')}._`;
            }

            setMessages((prev) => [...prev, { role: 'dexo', text: reply, id: ++msgId.current }]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: 'dexo', text: 'Connection issue. Try again.', id: ++msgId.current },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    return (
        <div
            className="flex max-h-[520px] w-[372px] flex-col overflow-hidden rounded-lg border border-zinc-800/90"
            style={{
                backgroundColor: '#0f0f10',
                boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
            }}
        >
            <div
                className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-3.5 py-3"
                style={{ backgroundColor: '#141415' }}
            >
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-700/80 bg-zinc-900/90">
                        <MessageSquare className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium tracking-tight text-zinc-200">Dexo</p>
                        <p className="truncate text-[10px] text-zinc-600">NorthROSC Labs · DeepChox AI</p>
                        <p className="mt-0.5 truncate text-[10px] text-zinc-500 tabular-nums">
                            {isListening ? 'Listening' : isSpeaking ? 'Speaking' : loading ? DEXO_LOADING_TAGLINES[loadingTick] : 'Idle'}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                    <button
                        type="button"
                        onClick={resetConversation}
                        className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800/80 hover:text-zinc-300"
                        title="Start a new chat"
                    >
                        <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                        type="button"
                        onClick={onExpand}
                        className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800/80 hover:text-zinc-300"
                        title="Open full workspace"
                    >
                        <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800/80 hover:text-zinc-300"
                        aria-label="Close"
                    >
                        <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                </div>
            </div>

            <div
                className="custom-scrollbar min-h-[200px] max-h-[340px] flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3"
                style={{ backgroundColor: '#0c0c0d' }}
            >
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center px-2 py-12">
                        <p className="max-w-[248px] text-center text-[12px] leading-relaxed text-zinc-500">
                            Messages stay in context for this venture. Ask for updates, decisions, or a concise read on where things stand.
                        </p>
                    </div>
                )}
                {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div
                            className={`max-w-[88%] px-3 py-2 text-[13px] leading-[1.45] ${
                                msg.role === 'user' ? 'rounded-md rounded-br-sm text-zinc-100' : 'rounded-md rounded-bl-sm text-zinc-300'
                            }`}
                            style={
                                msg.role === 'user'
                                    ? {
                                          backgroundColor: '#27272a',
                                          border: '1px solid rgba(255,255,255,0.06)',
                                      }
                                    : {
                                          backgroundColor: '#18181b',
                                          border: '1px solid rgba(255,255,255,0.05)',
                                      }
                            }
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-2">
                        <div
                            className="rounded-md border border-zinc-800/90 bg-zinc-900/50 px-3 py-2.5"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="rounded-full border border-zinc-800/80 bg-[#111115] p-1">
                                    <DexoParticleCanvas mode="room" size={28} state="loading" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-zinc-200">{DEXO_LOADING_TAGLINES[loadingTick]}</p>
                                    <p className="text-[10px] text-zinc-500">Generating reply…</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {interimTranscript && (
                <div className="shrink-0 border-t border-zinc-800/60 px-3.5 py-1.5" style={{ backgroundColor: '#0f0f10' }}>
                    <p className="truncate text-[11px] text-zinc-500">{interimTranscript}</p>
                </div>
            )}

            <div className="shrink-0 border-t border-zinc-800/80 px-3 py-2.5" style={{ backgroundColor: '#141415' }}>
                <div
                    className={`flex items-end gap-2 rounded-md border px-2 py-1.5 transition-colors ${
                        isListening ? 'border-zinc-600 bg-zinc-900/40' : 'border-zinc-800 bg-[#0c0c0d] focus-within:border-zinc-600'
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => (isListening ? stopListening() : isSpeaking ? stopSpeaking() : startListening())}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors ${
                            isListening
                                ? 'bg-zinc-700 text-zinc-100'
                                : isSpeaking
                                    ? 'bg-zinc-800 text-zinc-400'
                                    : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                        }`}
                    >
                        {isListening ? (
                            <span className="flex gap-0.5">
                                <span className="h-2 w-0.5 rounded-sm bg-zinc-300" />
                                <span className="h-3 w-0.5 rounded-sm bg-zinc-300" />
                                <span className="h-1.5 w-0.5 rounded-sm bg-zinc-300" />
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
                        placeholder={isListening ? 'Listening…' : 'Type or use the mic — same thread as Dexo room'}
                        className="min-h-[32px] min-w-0 flex-1 resize-none border-none bg-transparent px-0.5 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                        style={{ maxHeight: '80px', overflowY: 'auto' }}
                    />

                    {isSpeaking ? (
                        <button
                            type="button"
                            onClick={stopSpeaking}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
                        >
                            <Square className="h-3 w-3.5 fill-current" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleSend()}
                            disabled={!inputText.trim() || loading}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-700 bg-zinc-800/80 text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-30"
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

export function FloatingDexoOrb() {
    const { activeProject, activeRoom, switchRoom } = useOffice();
    const [mounted, setMounted] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    const dragRef = useRef<{
        px: number; py: number; ox: number; oy: number; dragged: boolean;
    } | null>(null);

    useEffect(() => { setMounted(true); setOffset(readOffset()); }, []);

    // Close chat on outside click
    useEffect(() => {
        if (!chatOpen) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-dexo-fab]')) {
                setChatOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [chatOpen]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (chatOpen) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y, dragged: false };
    }, [offset, chatOpen]);

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
            setChatOpen(prev => !prev);
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
        setChatOpen(false);
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
            {/* Expandable Chat Panel */}
            {chatOpen && (
                <div
                    className="absolute bottom-[calc(100%+12px)] right-0"
                    style={{ animation: 'dexo-chat-enter 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
                >
                    <FloatingChat
                        onClose={() => setChatOpen(false)}
                        onExpand={expandToFull}
                    />
                </div>
            )}

            {hovered && !chatOpen && (
                <div
                    className="pointer-events-none absolute bottom-[calc(100%+10px)] right-0 w-[min(calc(100vw-1.5rem),15rem)] rounded-xl border border-zinc-700/80 px-3 py-2.5 text-left shadow-xl"
                    style={{
                        backgroundColor: 'rgba(18,18,20,0.96)',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                        animation: 'dexo-chat-enter 0.2s ease-out forwards',
                    }}
                >
                    <p className="text-[12px] font-semibold tracking-tight text-zinc-100">Dexo</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">AI co-founder · venture context</p>
                    {activeProject?.name ? (
                        <p className="mt-1.5 truncate text-[11px] text-zinc-400" title={activeProject.name}>
                            {activeProject.name}
                        </p>
                    ) : null}
                    <p className="mt-2 border-t border-zinc-800/80 pt-2 text-[10px] text-zinc-600">
                        Tap to chat · drag orb to reposition
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
                            'inset 0 0 0 1px rgba(255,255,255,0.09), 0 0 0 1px rgba(0,0,0,0.65), 0 10px 28px rgba(0,0,0,0.45)',
                    }}
                />
                <button
                    type="button"
                    title={chatOpen ? 'Close Dexo' : 'Open Dexo'}
                    aria-haspopup="dialog"
                    aria-expanded={chatOpen}
                    aria-label={chatOpen ? 'Close Dexo chat' : 'Open Dexo chat'}
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
                                hovered ? 'scale(1.02)' : chatOpen ? 'scale(0.99)' : 'scale(1)',
                            background: chatOpen
                                ? 'radial-gradient(circle at 35% 28%, rgba(72,72,78,0.95) 0%, rgba(36,36,40,0.99) 48%, rgba(22,22,24,1) 100%)'
                                : hovered
                                    ? 'radial-gradient(circle at 35% 28%, rgba(66,66,72,0.92) 0%, rgba(34,34,38,0.98) 50%, rgba(20,20,22,1) 100%)'
                                    : 'radial-gradient(circle at 35% 28%, rgba(58,58,64,0.9) 0%, rgba(32,32,36,0.97) 50%, rgba(18,18,20,1) 100%)',
                            boxShadow:
                                'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.35)',
                        }}
                    >
                        <DexoParticleCanvas
                            mode="floating"
                            size={ORB_SIZE - 4}
                            active={hovered || chatOpen}
                        />
                    </span>
                </button>
            </div>
        </div>,
        document.body
    );
}
