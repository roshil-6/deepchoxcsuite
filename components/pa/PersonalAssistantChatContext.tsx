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
import { ArrowUp, Bot, FileUp, Mic } from 'lucide-react';
import { ModelAttribution } from '@/components/ModelAttribution';
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
    followUpSelection: Set<string>;
    setFollowUpSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
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
    const [followUpSelection, setFollowUpSelection] = useState<Set<string>>(new Set());

    const lastFollowUpMsg = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (
                m.role === 'assistant' &&
                m.channel === 'pa' &&
                m.followUpOptions &&
                m.followUpOptions.length > 0
            )
                return m;
        }
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
        setFollowUpSelection(new Set());
    }, [lastFollowUpMsg?.id]);

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
            followUpSelection,
            setFollowUpSelection,
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
            followUpSelection,
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

/** Shared thread + composer — soft bubbles, no harsh “blocks”. */
export function PAChatSurface({ variant }: { variant: 'page' | 'float' }) {
    const {
        activeProject,
        messages,
        input,
        setInput,
        loading,
        selectedModel,
        setSelectedModel,
        followUpSelection,
        setFollowUpSelection,
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

    const isFloat = variant === 'float';
    const maxW = isFloat ? 'max-w-none' : 'max-w-2xl';

    const messageThread = (
        <>
                    {messages.length === 0 && activeProject && !isVentureUnsettled(activeProject) && (
                        <p className="px-1 text-center text-[12px] leading-relaxed text-zinc-400">
                            Say what changed on any desk — {PA_BUDDY_NAME} can update strategy, board, and calendar for you.
                        </p>
                    )}
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                        >
                            {m.role === 'assistant' && (
                                <div
                                    className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-300"
                                    aria-hidden
                                >
                                    <Bot className="h-3.5 w-3.5" strokeWidth={1.75} />
                                </div>
                            )}
                            <div
                                className={
                                    m.role === 'user'
                                        ? 'ml-4 max-w-[min(100%,88%)] rounded-xl rounded-tr-sm border border-zinc-600 bg-zinc-700 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-100 sm:ml-8 sm:max-w-[82%]'
                                        : 'max-w-[min(100%,92%)] rounded-xl rounded-tl-sm border border-zinc-600 bg-zinc-800 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-100 sm:max-w-[88%]'
                                }
                            >
                                {m.channel === 'cos' ? (
                                    <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-500">
                                        Research strategy and direction
                                    </p>
                                ) : null}
                                <p className="whitespace-pre-wrap">{m.content}</p>
                                {m.role === 'assistant' ? <ModelAttribution model={m.model} /> : null}
                                {m.role === 'assistant' &&
                                    m.channel === 'pa' &&
                                    m.followUpOptions &&
                                    m.followUpOptions.length > 0 &&
                                    m.id === lastFollowUpMsg?.id && (
                                        <div className="mt-3 border-t border-zinc-600/60 pt-2.5" role="group">
                                            <p className="mb-2 text-[10px] text-zinc-500">Tap to choose, then send or type below.</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {m.followUpOptions.map((opt, i) => {
                                                    const isOther = isOtherFollowUpLabel(opt);
                                                    const selected = followUpSelection.has(opt);
                                                    return (
                                                        <button
                                                            key={`${m.id}-opt-${i}`}
                                                            type="button"
                                                            disabled={loading}
                                                            aria-pressed={selected}
                                                            onClick={() => {
                                                                if (isOther) {
                                                                    setFollowUpSelection(new Set());
                                                                    focusComposer();
                                                                    return;
                                                                }
                                                                setFollowUpSelection((prev) => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(opt)) next.delete(opt);
                                                                    else next.add(opt);
                                                                    return next;
                                                                });
                                                            }}
                                                            className={`rounded-full px-3 py-1.5 text-left text-[11px] font-medium leading-snug transition disabled:opacity-40 ${
                                                                selected
                                                                    ? 'bg-zinc-600 text-zinc-100'
                                                                    : 'bg-zinc-700/80 text-zinc-200 hover:bg-zinc-700'
                                                            }`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                {followUpSelection.size > 0 && (
                                                    <button
                                                        type="button"
                                                        disabled={loading}
                                                        onClick={() => {
                                                            const parts = [...followUpSelection];
                                                            const combined =
                                                                parts.length === 1
                                                                    ? parts[0]
                                                                    : `Selected: ${parts.join(' · ')}`;
                                                            setFollowUpSelection(new Set());
                                                            void sendMessage(combined);
                                                        }}
                                                        className="rounded-full bg-zinc-600 px-3 py-1 text-[10px] font-semibold text-zinc-100 hover:bg-zinc-500 disabled:opacity-40"
                                                    >
                                                        Send ({followUpSelection.size})
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => {
                                                        setFollowUpSelection(new Set());
                                                        focusComposer();
                                                    }}
                                                    className="text-[10px] font-medium text-zinc-500 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200"
                                                >
                                                    Type instead
                                                </button>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start gap-2 pl-0.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-300">
                                <Bot className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                            </div>
                            <div className="flex items-center gap-1 rounded-xl rounded-tl-sm border border-zinc-600 bg-zinc-800 px-4 py-2.5">
                                <span className="inline-flex gap-0.5">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" />
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500 [animation-delay:150ms]" />
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500 [animation-delay:300ms]" />
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
        </>
    );

    const composerCore = (
        <>
            <div className="overflow-hidden rounded-xl border border-zinc-600 bg-zinc-800">
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
                    className="max-h-36 min-h-[44px] w-full resize-none border-none bg-transparent px-4 py-3 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:ring-0"
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv,.json,text/plain"
                    className="hidden"
                    onChange={handleFileInput}
                />
                <div className="flex flex-wrap items-center gap-1 border-t border-zinc-600 bg-zinc-900/40 px-2 py-1.5">
                    <span
                        className="inline-flex h-8 shrink-0 items-center px-1 text-[10px] text-zinc-500"
                        title="Model is set from your last choice; use workspace settings to change."
                    >
                        {EXEC_CHAT_MODEL_OPTIONS.find((o) => o.id === selectedModel)?.label ?? selectedModel}
                    </span>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-50"
                    >
                        <FileUp className="h-3.5 w-3.5 opacity-70" aria-hidden />
                        <span className="hidden sm:inline">File</span>
                    </button>
                    {voiceSupported ? (
                        <button
                            type="button"
                            onClick={() => (listening ? stopListening() : startListening())}
                            disabled={loading}
                            className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                                listening ? 'text-zinc-300' : 'text-zinc-400 hover:text-zinc-100'
                            }`}
                            aria-pressed={listening}
                        >
                            <Mic className="h-3.5 w-3.5 opacity-70" aria-hidden />
                            <span className="hidden sm:inline">{listening ? 'Stop' : 'Voice'}</span>
                        </button>
                    ) : null}
                    {listening ? (
                        <span className="text-[10px] text-zinc-400" aria-live="polite">
                            Listening
                        </span>
                    ) : null}
                    {fileLabel ? (
                        <span className="max-w-[88px] truncate text-[10px] text-zinc-500 sm:max-w-[120px]">
                            {fileLabel}
                        </span>
                    ) : null}
                    <span className="min-w-0 flex-1" aria-hidden />
                    <button
                        type="button"
                        onClick={() => void sendMessage(input)}
                        disabled={loading || !input.trim()}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-600 text-zinc-100 transition hover:bg-zinc-500 disabled:opacity-35"
                        aria-label="Send"
                    >
                        <ArrowUp className="h-4 w-4" />
                    </button>
                </div>
                {fileError ? (
                    <p className="border-t border-zinc-600 px-3 py-2 text-[10px] text-rose-400/90">{fileError}</p>
                ) : null}
            </div>
            <p className="mt-1.5 text-center text-[9px] text-zinc-500">Enter send · Shift+Enter new line</p>
        </>
    );

    if (isFloat) {
        return (
            <>
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pt-2">
                    <div className={`mx-auto w-full ${maxW} space-y-3 pb-36 sm:space-y-3.5`}>{messageThread}</div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-zinc-900 via-zinc-900/92 to-transparent px-3 pb-3 pt-8">
                    <div className="pointer-events-auto mx-auto w-full">{composerCore}</div>
                </div>
            </>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className={`mx-auto w-full min-w-0 space-y-3 px-3 pb-4 sm:space-y-3.5 sm:px-4 ${maxW}`}>{messageThread}</div>
            <div className="sticky bottom-0 z-20 shrink-0 border-t border-white/[0.08] bg-brand-bg/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:px-5">
                <div className={`mx-auto w-full ${maxW}`}>{composerCore}</div>
            </div>
        </div>
    );
}
