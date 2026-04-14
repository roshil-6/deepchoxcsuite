'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { getPersonalAssistantSystemPrompt, useOffice } from '@/lib/OfficeContext';
import { isVentureUnsettled, PA_WELCOME_MESSAGE } from '@/lib/ventureSetupState';
import { ArrowUp, Bot, ChevronRight, FileUp, Mic, PenLine } from 'lucide-react';
import { EXEC_CHAT_MODEL_OPTIONS, EXEC_CHAT_MODEL_STORAGE_KEY, isExecChatModelId } from '@/lib/deskConstants';
import type { ExecutiveThreadMessage } from '@/lib/executiveThread';
import {
    mergeProjectWithPAUpdates,
    projectPayloadForPA,
    summarizeAppliedUpdates,
    type PersonalAssistantUpdates,
} from '@/lib/paApplyUpdates';
import { PA_BUDDY_NAME } from '@/lib/paBuddy';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';

type Msg = ExecutiveThreadMessage;

export const LEADERSHIP_CHIPS: { label: string; display: string; prompt: string }[] = [
    {
        label: 'Today',
        display: "Today's leadership priorities",
        prompt:
            'Using this venture only: list my top 3 priorities for today as the founder, why each matters, and which desk (CEO/CTO/CFO/CMO/CSO) should own follow-up. If data is missing, say exactly what to capture first.',
    },
    {
        label: 'Gaps',
        display: 'Where are we weakest?',
        prompt:
            'From the venture JSON: name the 2–3 biggest gaps (strategy, execution, finance, GTM, market intel) with evidence from the fields. Give concrete fixes; offer to apply updates if I say yes.',
    },
    {
        label: 'Week plan',
        display: 'Plan my week',
        prompt:
            'Propose a practical 5-day founder plan aligned to current phases, kanban, and calendar — no invented metrics.',
    },
    {
        label: 'Sync',
        display: 'Next staff sync focus',
        prompt:
            'Given staff snapshot, focus today, and execution board: what should the next Sync AI staff run emphasize? Flag any tension between officer narratives.',
    },
];

function isOtherFollowUpLabel(s: string): boolean {
    const t = s.toLowerCase().trim();
    return t.startsWith('other') || t.includes('type below') || t.includes("i'll type") || t.includes('type my answer');
}

function readStoredExecModel(): string {
    if (typeof window === 'undefined') return 'llama3';
    try {
        const v = localStorage.getItem(EXEC_CHAT_MODEL_STORAGE_KEY);
        if (v && isExecChatModelId(v)) return v;
    } catch {
        /* noop */
    }
    return 'llama3';
}

type ChatContextValue = {
    activeProject: ReturnType<typeof useOffice>['activeProject'];
    messages: ExecutiveThreadMessage[];
    input: string;
    setInput: (s: string) => void;
    loading: boolean;
    selectedModel: string;
    setSelectedModel: (s: string) => void;
    lastFollowUpMsg: ExecutiveThreadMessage | null;
    voiceSupported: boolean;
    listening: boolean;
    fileLabel: string | null;
    fileError: string | null;
    sendMessage: (userText: string, opts?: { displayText?: string }) => Promise<void>;
    requestExecutiveBriefing: () => Promise<void>;
    startListening: () => void;
    stopListening: () => void;
    handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    focusComposer: () => void;
    /** Put text in the Relay composer and focus it (e.g. from Meeting Room). */
    relayDraftToComposer: (text: string) => void;
    endRef: React.RefObject<HTMLDivElement | null>;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
};

const PersonalAssistantChatContext = createContext<ChatContextValue | null>(null);

export function usePersonalAssistantChat(): ChatContextValue {
    const ctx = useContext(PersonalAssistantChatContext);
    if (!ctx) throw new Error('usePersonalAssistantChat must be used within PersonalAssistantChatProvider');
    return ctx;
}

export function PersonalAssistantChatProvider({ children }: { children: ReactNode }) {
    const { activeProject, executiveThread, appendExecutiveThread, persistActiveProject } = useOffice();
    const messages = executiveThread;
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [fileLabel, setFileLabel] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState('llama3');
    const endRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const welcomeSeededForProject = useRef<string | number | null>(null);

    /**
     * Quick replies only on the latest assistant message in the thread, and only if that turn is PA.
     * (A newer Chief-of-staff / cos reply must not leave old PA option chips active.)
     */
    const lastFollowUpMsg = useMemo(() => {
        let lastAssistantIdx = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'assistant') {
                lastAssistantIdx = i;
                break;
            }
        }
        if (lastAssistantIdx < 0) return null;
        const m = messages[lastAssistantIdx];
        if (m.channel !== 'pa') return null;
        if (m.followUpOptions && m.followUpOptions.length > 0) return m;
        return null;
    }, [messages]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        setSelectedModel(readStoredExecModel());
    }, []);

    const appendTranscript = useCallback((t: string) => {
        setInput((prev) => (prev ? `${prev.trim()} ${t}` : t));
    }, []);
    const { voiceSupported, listening, startListening, stopListening } = useSpeechRecognition(appendTranscript);

    useEffect(() => {
        stopListening();
        setInput('');
        setFileLabel(null);
        setFileError(null);
        welcomeSeededForProject.current = null;
    }, [activeProject?.id, stopListening]);

    useEffect(() => {
        const id = activeProject?.id;
        if (!id || !isVentureUnsettled(activeProject)) return;
        if (welcomeSeededForProject.current === id) return;
        if (executiveThread.length > 0) return;
        welcomeSeededForProject.current = id;
        appendExecutiveThread({
            id: `pa-welcome-${String(id)}`,
            role: 'assistant',
            content: PA_WELCOME_MESSAGE,
            ts: Date.now(),
            channel: 'pa',
        });
    }, [activeProject, executiveThread.length, appendExecutiveThread]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [input]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileError(null);
        setFileLabel(file.name);
        const name = file.name.toLowerCase();
        const ok =
            file.type === 'text/plain' ||
            name.endsWith('.md') ||
            name.endsWith('.txt') ||
            name.endsWith('.csv') ||
            name.endsWith('.json');
        if (!ok) {
            setFileError('Use .txt, .md, .csv, .json — or paste below.');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const text = typeof reader.result === 'string' ? reader.result : '';
            setInput((prev) => (prev ? `${prev.trim()}\n\n---\n${text}` : text));
        };
        reader.readAsText(file);
        e.target.value = '';
    }, []);

    const relayDraftToComposer = useCallback((text: string) => {
        setInput(text.trim());
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    }, []);

    const focusComposer = useCallback(() => {
        textareaRef.current?.focus();
    }, []);

    const sendMessage = useCallback(
        async (userText: string, opts?: { displayText?: string }) => {
            const modelUserContent = userText.trim();
            const displayContent = (opts?.displayText ?? userText).trim();
            if (!modelUserContent || loading || !activeProject?.id) return;

            stopListening();

            const userMsg: Msg = {
                id: Date.now().toString(),
                role: 'user',
                content: displayContent,
                ts: Date.now(),
                channel: 'pa',
            };
            appendExecutiveThread(userMsg);
            setInput('');
            setLoading(true);

            try {
                const priorConvo = messages
                    .filter((m) => m.channel === 'pa' && (m.role === 'user' || m.role === 'assistant'))
                    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
                    .slice(-14);
                const conversation = [...priorConvo, { role: 'user' as const, content: modelUserContent }];

                const paRes = await fetch('/api/personal-assistant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project: projectPayloadForPA(activeProject),
                        conversation,
                    }),
                });
                const paData = await paRes.json();

                if (paData.ok === true && typeof paData.reply === 'string') {
                    const updates = (paData.updates || {}) as PersonalAssistantUpdates;
                    const hasUpdates = updates && Object.keys(updates).length > 0;
                    if (hasUpdates) {
                        const merged = mergeProjectWithPAUpdates(activeProject, updates);
                        await persistActiveProject(merged);
                    }
                    let replyBody = paData.reply as string;
                    replyBody += summarizeAppliedUpdates(updates);
                    const followUp =
                        Array.isArray(paData.followUpOptions) && paData.followUpOptions.length
                            ? (paData.followUpOptions as string[]).filter((s) => typeof s === 'string' && s.trim()).slice(0, 4)
                            : undefined;
                    appendExecutiveThread({
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: replyBody,
                        ts: Date.now(),
                        model: typeof paData.model === 'string' ? paData.model : undefined,
                        channel: 'pa',
                        followUpOptions: followUp,
                    });
                    return;
                }

                const errHint =
                    typeof paData.error === 'string' ? paData.error : 'Venture-aware assistant unavailable.';
                const rich = getPersonalAssistantSystemPrompt(activeProject).slice(0, 8000);
                const res = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: 'assistant',
                        message: `[Context note: ${errHint}]\n\n${modelUserContent}`,
                        companyContext: `${activeProject.name}\n\n${rich}`,
                    }),
                });
                const data = await res.json();
                if (!res.ok) {
                    const err =
                        typeof data.details === 'string'
                            ? data.details
                            : typeof data.error === 'string'
                              ? data.error
                              : 'Personal Assistant unavailable.';
                    appendExecutiveThread({
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: err,
                        ts: Date.now(),
                        channel: 'pa',
                    });
                    return;
                }
                if (data.loading) {
                    appendExecutiveThread({
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: 'AI is warming up, please wait 20 seconds and try again.',
                        ts: Date.now(),
                        channel: 'pa',
                    });
                } else {
                    const text =
                        typeof data.response === 'string' ? data.response : 'No response generated.';
                    const modelLabel = typeof data.model === 'string' ? data.model : undefined;
                    appendExecutiveThread({
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: text,
                        ts: Date.now(),
                        model: modelLabel,
                        channel: 'pa',
                    });
                }
            } catch {
                appendExecutiveThread({
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: 'Something went wrong. Please try again.',
                    ts: Date.now(),
                    channel: 'pa',
                });
            } finally {
                setLoading(false);
            }
        },
        [activeProject, appendExecutiveThread, loading, messages, persistActiveProject, stopListening]
    );

    const requestExecutiveBriefing = useCallback(async () => {
        if (!activeProject?.id || loading) return;
        await sendMessage(
            '[Executive briefing request] In one concise response: summarize venture health, top 3 risks or gaps, and the next three actions I should take. Use only the venture context you have.',
            { displayText: 'Executive briefing' }
        );
    }, [activeProject?.id, loading, sendMessage]);

    const value = useMemo(
        () => ({
            activeProject,
            messages,
            input,
            setInput,
            loading,
            selectedModel,
            setSelectedModel,
            lastFollowUpMsg,
            voiceSupported,
            listening,
            fileLabel,
            fileError,
            sendMessage,
            requestExecutiveBriefing,
            startListening,
            stopListening,
            handleFileInput,
            focusComposer,
            relayDraftToComposer,
            endRef,
            textareaRef,
            fileInputRef,
        }),
        [
            activeProject,
            messages,
            input,
            loading,
            selectedModel,
            lastFollowUpMsg,
            voiceSupported,
            listening,
            fileLabel,
            fileError,
            sendMessage,
            requestExecutiveBriefing,
            startListening,
            stopListening,
            handleFileInput,
            focusComposer,
            relayDraftToComposer,
        ]
    );

    return (
        <PersonalAssistantChatContext.Provider value={value}>{children}</PersonalAssistantChatContext.Provider>
    );
}

/** Optional first “Relay” block on the full-page assistant — same bubble styling as real messages. */
export type PAChatPageIntro = {
    ventureName: string;
    buddyLabel: string;
    tagline: string;
};

/** Shared thread + composer — aligned with CEO desk surfaces (cards, rings, executive grey). */
export function PAChatSurface({
    variant,
    pageIntro,
}: {
    variant: 'page' | 'float';
    /** Settled ventures only; merged desk headline + hint into one assistant-style opener. */
    pageIntro?: PAChatPageIntro | null;
}) {
    const {
        activeProject,
        messages,
        input,
        setInput,
        loading,
        lastFollowUpMsg,
        voiceSupported,
        listening,
        fileLabel,
        fileError,
        sendMessage,
        startListening,
        stopListening,
        handleFileInput,
        focusComposer,
        endRef,
        textareaRef,
        fileInputRef,
    } = usePersonalAssistantChat();

    const [dismissedFollowUpForId, setDismissedFollowUpForId] = useState<string | null>(null);

    useEffect(() => {
        setDismissedFollowUpForId(null);
    }, [lastFollowUpMsg?.id]);

    useEffect(() => {
        if (messages.length < 2 || !lastFollowUpMsg?.id) return;
        const last = messages[messages.length - 1];
        const prev = messages[messages.length - 2];
        if (last.role === 'user' && prev.id === lastFollowUpMsg.id && prev.role === 'assistant') {
            setDismissedFollowUpForId(prev.id);
        }
    }, [messages, lastFollowUpMsg?.id]);

    const isFloat = variant === 'float';
    const maxW = isFloat ? 'max-w-none' : 'max-w-3xl';

    const assistantAvatar = (
        <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--text)]"
            aria-hidden
        >
            <Bot className="h-3.5 w-3.5 opacity-90" strokeWidth={1.75} />
        </div>
    );

    /** Assistant copy block — accent rail + soft gradient fill. */
    const assistantBodyClass =
        'min-w-0 max-w-[min(100%,36rem)] flex-1 rounded-xl rounded-tl-sm border border-white/[0.07] border-l-[3px] border-l-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-4 py-3 text-[13px] leading-relaxed text-[var(--text)] sm:px-4 sm:py-3.5';
    const userBubbleClass =
        'min-w-0 max-w-[min(100%,26rem)] rounded-xl rounded-br-sm border border-white/[0.09] bg-[var(--color-brand-input)]/90 px-4 py-2.5 text-[13px] leading-relaxed text-[var(--text)] sm:px-4 sm:py-3';

    const showPageIntro =
        !isFloat && pageIntro && activeProject && !isVentureUnsettled(activeProject);

    const pageIntroBlock =
        showPageIntro && pageIntro ? (
            <div className="flex min-w-0 w-full justify-start gap-2.5 sm:gap-3">
                {assistantAvatar}
                <div className={assistantBodyClass}>
                    <p className="font-semibold text-[var(--text)]">{pageIntro.ventureName}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--text)]/92">
                        <span className="font-medium text-[var(--text)]">{pageIntro.buddyLabel}</span>
                        <span className="text-[var(--muted)]"> — {pageIntro.tagline}</span>
                    </p>
                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">
                        Say what changed on any desk — strategy, execution board, or calendar — and Relay will keep the
                        venture record in sync.
                    </p>
                </div>
            </div>
        ) : null;

    const messageThread = (
        <>
            {pageIntroBlock}
            {messages.map((m) => (
                <div
                    key={m.id}
                    className={`flex min-w-0 w-full gap-2.5 sm:gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    {m.role === 'assistant' ? assistantAvatar : null}
                    <div className={m.role === 'user' ? userBubbleClass : assistantBodyClass}>
                        <p className="break-words whitespace-pre-wrap text-[var(--text)]/95">{m.content}</p>
                        {m.role === 'assistant' &&
                            m.channel === 'pa' &&
                            m.followUpOptions &&
                            m.followUpOptions.length > 0 &&
                            m.id === lastFollowUpMsg?.id &&
                            m.id !== dismissedFollowUpForId && (
                                <div className="mt-3 space-y-2" role="group" aria-label="Quick replies">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {m.followUpOptions.map((opt, i) => {
                                            const isOther = isOtherFollowUpLabel(opt);
                                            return (
                                                <button
                                                    key={`${m.id}-opt-${i}`}
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => {
                                                        if (isOther) {
                                                            focusComposer();
                                                            return;
                                                        }
                                                        setDismissedFollowUpForId(m.id);
                                                        void sendMessage(opt, { displayText: opt });
                                                    }}
                                                    className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] font-medium leading-snug transition disabled:opacity-40 ${
                                                        isOther
                                                            ? 'border border-dashed border-white/[0.14] bg-transparent text-[var(--muted)] hover:border-white/[0.22] hover:bg-white/[0.04] hover:text-[var(--text)]'
                                                            : 'border border-white/[0.09] bg-white/[0.04] text-[var(--text)] hover:border-white/[0.16] hover:bg-white/[0.08]'
                                                    }`}
                                                >
                                                    {isOther ? (
                                                        <PenLine className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                                    ) : (
                                                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                                                    )}
                                                    <span className="min-w-0 flex-1">{opt}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            ))}
            {loading && (
                <div className="flex min-w-0 w-full justify-start gap-2.5 sm:gap-3">
                    {assistantAvatar}
                    <div className={`flex min-w-0 max-w-[min(100%,36rem)] flex-1 items-center gap-2 ${assistantBodyClass}`}>
                        <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted)]" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted)] [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted)] [animation-delay:300ms]" />
                        </span>
                        <span className="text-[12px] text-[var(--muted)]">Relay is thinking…</span>
                    </div>
                </div>
            )}
            <div ref={endRef} />
        </>
    );

    const composerCore = (
        <div className="executive-panel-strong group relative flex min-w-0 items-end gap-1.5 rounded-2xl px-2 py-2 transition-[box-shadow,border-color] focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--shadow-panel)]">
            <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,text/plain"
                className="hidden"
                onChange={handleFileInput}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text)] disabled:opacity-40"
                title="Attach file"
                aria-label="Attach file"
            >
                <FileUp className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>
            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage(input);
                    }
                }}
                placeholder={`Message ${PA_BUDDY_NAME}…`}
                rows={1}
                disabled={loading}
                className="mb-0.5 min-h-[48px] min-w-0 flex-1 resize-none border-none bg-transparent py-3 text-[15px] leading-[1.55] text-[var(--text)] placeholder:text-[var(--muted)]/70 focus:outline-none focus:ring-0"
            />
            <div className="mb-0.5 flex shrink-0 items-center gap-1 pr-0.5">
                {voiceSupported ? (
                    <button
                        type="button"
                        onClick={() => (listening ? stopListening() : startListening())}
                        disabled={loading}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-white/[0.06] disabled:opacity-40 ${listening ? 'bg-white/[0.1] text-[var(--text)]' : 'text-[var(--muted)]'}`}
                        aria-pressed={listening}
                        aria-label={listening ? 'Stop voice input' : 'Voice input'}
                    >
                        <Mic className={`h-5 w-5 ${listening ? 'animate-pulse' : ''}`} strokeWidth={1.75} aria-hidden />
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={() => void sendMessage(input)}
                    disabled={loading || !input.trim()}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.12] bg-[var(--accent)] text-[#0a0a0a] transition hover:opacity-90 disabled:opacity-25"
                    aria-label="Send"
                >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </button>
            </div>
            {fileError ? (
                <p className="absolute bottom-full left-0 right-0 mb-1.5 rounded-lg border border-rose-500/30 bg-rose-950/90 px-3 py-2 text-[11px] text-rose-100">
                    {fileError}
                </p>
            ) : null}
        </div>
    );

    const fileHint =
        fileLabel && !fileError ? (
            <p className="mt-2 text-center text-[11px] text-[var(--muted)]">Attached context: {fileLabel}</p>
        ) : null;

    if (isFloat) {
        return (
            <>
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pt-2">
                    <div className={`mx-auto w-full ${maxW} pb-40`}>
                        <div className="rounded-xl border border-white/[0.08] bg-zinc-800/45 p-3">
                            <div className="space-y-5">{messageThread}</div>
                        </div>
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[var(--color-brand-bg)] via-[var(--color-brand-bg)]/94 to-transparent px-3 pb-3 pt-10">
                    <div className="pointer-events-auto mx-auto w-full max-w-3xl">
                        {composerCore}
                        {fileHint}
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
            <div
                className={`custom-scrollbar mx-auto flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 pb-5 pt-3 scroll-pb-4 sm:px-6 sm:pb-6 sm:pt-4 ${maxW}`}
            >
                {/* min-h-full + justify-end: short threads sit bottom-aligned; long threads scroll fully (flex-1 here breaks scroll height) */}
                <div className="flex w-full min-h-full flex-col justify-end">
                    <div className="w-full rounded-2xl border border-white/[0.08] bg-zinc-800/45 p-3 sm:p-4">
                        <div className="w-full space-y-5 sm:space-y-5">{messageThread}</div>
                    </div>
                </div>
            </div>
            <div className="relative z-10 shrink-0 border-t border-white/[0.08] bg-[var(--color-brand-bg)]/98 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:px-6 sm:pt-4">
                <div className={`relative mx-auto w-full ${maxW}`}>
                    {composerCore}
                    {fileHint}
                </div>
            </div>
        </div>
    );
}
