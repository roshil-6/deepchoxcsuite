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
import { isVentureUnsettled } from '@/lib/ventureSetupState';
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
import { useTokens } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { buildDexoJarvisVentureContext } from '@/lib/dexoJarvisContext';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { dexoFullVenturePatchFromJarvis, dexoAutoSaveHintLines } from '@/lib/dexoApplyJarvisProductPatch';
import type { JarvisReport } from '@/app/api/jarvis/route';
import { submitDexoVenturePatch } from '@/lib/dexoProposalClient';
import { DEXO_PATCHABLE_PROJECT_KEYS, type DexoPatchContract } from '@/lib/dexoPatchSchema';

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

function patchFromMergedProject(before: any, after: any): DexoPatchContract {
    const patch: DexoPatchContract = {};
    for (const key of DEXO_PATCHABLE_PROJECT_KEYS) {
        const prev = before?.[key];
        const next = after?.[key];
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
            (patch as Record<string, unknown>)[key] = next;
        }
    }
    return patch;
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
    /** Put text in the cofounder composer and focus it (e.g. from Meeting Room). */
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
    const { activeProject, executiveThread, appendExecutiveThread, updateProjectField } = useOffice();
    const tokens = useTokens();
    const messages = executiveThread;
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [fileLabel, setFileLabel] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState('llama3');
    const endRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    }, [activeProject?.id, stopListening]);

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

            const paid = tokens.spend(TOKEN_COSTS.CHAT_MESSAGE, 'Personal Assistant');
            if (!paid.success) {
                appendExecutiveThread({
                    id: Date.now().toString(),
                    role: 'assistant',
                    content:
                        paid.message ??
                        'Daily AI credits are used up. Upgrade to Pro for unlimited usage, or try again after the daily reset.',
                    ts: Date.now(),
                    channel: 'pa',
                });
                return;
            }

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

                const paRes = await fetch('/api/dexo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'personalAssistant',
                        payload: {
                            project: projectPayloadForPA(activeProject),
                            conversation,
                        },
                    }),
                });
                const paData = await paRes.json();

                if (paData.ok === true && typeof paData.reply === 'string') {
                    const updates = (paData.updates || {}) as PersonalAssistantUpdates;
                    const hasUpdates = updates && Object.keys(updates).length > 0;
                    let proposalOutcome: Awaited<ReturnType<typeof submitDexoVenturePatch>> | null = null;
                    if (hasUpdates) {
                        const merged = mergeProjectWithPAUpdates(activeProject, updates);
                        const proposalPatch = patchFromMergedProject(activeProject, merged);
                        if (Object.keys(proposalPatch).length > 0) {
                            proposalOutcome = await submitDexoVenturePatch({
                                ventureId: activeProject.id,
                                source: 'personal_assistant',
                                model: typeof paData.model === 'string' ? paData.model : 'Dexo',
                                summary: 'Personal Assistant suggested venture updates',
                                patch: proposalPatch,
                                updateProjectField,
                            });
                        }
                    }
                    let replyBody = paData.reply as string;
                    if (hasUpdates) {
                        if (proposalOutcome && !proposalOutcome.ok) {
                            replyBody += `\n\n_Could not save or apply venture updates (${proposalOutcome.error})._`;
                        } else if (proposalOutcome?.applied) {
                            replyBody += `\n\n_Applied venture updates (${proposalOutcome.mode} mode)._`;
                        } else if (proposalOutcome) {
                            replyBody += `\n\n_Pending your approval — check the floating Dexo approvals card (bottom of the screen)._`;
                        } else {
                            replyBody += `\n\n_No venture field diff to apply._`;
                        }
                    } else {
                        replyBody += summarizeAppliedUpdates(updates);
                    }
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
                const context = `${buildDexoJarvisVentureContext(activeProject)}\n\nPA context:\n${rich}`;
                const fallbackHistory = priorConvo.map((m) => ({ role: m.role, text: m.content }));
                const res = await fetch('/api/dexo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'jarvis',
                        payload: {
                            mode: 'converse',
                            context,
                            sparseContext: isVentureFoundationSparse(activeProject),
                            userMessage: `[Context note: ${errHint}]\n\n${modelUserContent}`,
                            conversationHistory: fallbackHistory,
                            deskContextLine: 'Personal assistant channel routed through Dexo Jarvis fallback.',
                        },
                    }),
                });
                const data = (await res.json()) as { ok?: boolean; report?: JarvisReport; error?: string };
                if (!res.ok || !data.ok || !data.report) {
                    const err = typeof data.error === 'string' ? data.error : 'Personal Assistant unavailable.';
                    appendExecutiveThread({
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: err,
                        ts: Date.now(),
                        channel: 'pa',
                    });
                    return;
                }
                let text = data.report.voiceResponse || data.report.headline || 'No response generated.';
                const patch = dexoFullVenturePatchFromJarvis(activeProject, data.report.proposedUpdates);
                if (Object.values(patch).some((v) => v !== undefined)) {
                    const hints = dexoAutoSaveHintLines(patch);
                    const out = await submitDexoVenturePatch({
                        ventureId: activeProject.id,
                        source: 'personal_assistant_fallback',
                        model: 'Dexo',
                        summary: 'Personal Assistant fallback suggested updates',
                        patch,
                        updateProjectField,
                    });
                    if (hints.length > 0) {
                        if (!out.ok) text += `\n\n_Could not save or apply: ${hints.join(' · ')} (${out.error})._`;
                        else if (out.applied) text += `\n\n_Applied: ${hints.join(' · ')} (${out.mode} mode)._`;
                        else text += `\n\n_Pending your approval: ${hints.join(' · ')}._`;
                    }
                }
                appendExecutiveThread({
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: text,
                    ts: Date.now(),
                    model: 'Dexo',
                    channel: 'pa',
                });
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
        [activeProject, appendExecutiveThread, loading, messages, stopListening, tokens]
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

    /** Message copy — plain text flow (no bubble chrome). */
    const assistantBodyClass =
        'min-w-0 max-w-[min(100%,36rem)] flex-1 py-1.5 text-[13px] leading-relaxed text-[var(--text)] sm:py-2';
    const userBubbleClass =
        'min-w-0 max-w-[min(100%,26rem)] py-1.5 text-right text-[13px] leading-relaxed text-[var(--text)]/92 sm:py-2';

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
                        Say what changed on any desk — strategy, execution board, or calendar — and the cofounder
                        engine will keep the venture record in sync.
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
                        <p
                            className={`break-words whitespace-pre-wrap ${m.role === 'user' ? 'text-[var(--text)]/92' : 'text-[var(--text)]/95'}`}
                        >
                            {m.content}
                        </p>
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
                                                            ? 'bg-white/[0.03] text-[var(--muted)] hover:bg-white/[0.06] hover:text-[var(--text)]'
                                                            : 'bg-white/[0.06] text-[var(--text)] hover:bg-white/[0.1]'
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
                    <div className="flex min-w-0 max-w-[min(100%,36rem)] flex-1 items-center gap-2 py-1.5 sm:py-2">
                        <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted)]" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted)] [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted)] [animation-delay:300ms]" />
                        </span>
                        <span className="text-[12px] text-[var(--muted)]">Dexo Cofounder is thinking…</span>
                    </div>
                </div>
            )}
            <div ref={endRef} />
        </>
    );

    const composerCore = (
        <div className="executive-panel-glass group relative flex min-w-0 items-end gap-1.5 rounded-2xl px-2 py-2 transition-[background-color,box-shadow] focus-within:bg-white/[0.04]">
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
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-[#0a0a0a] transition hover:opacity-90 disabled:opacity-25"
                    aria-label="Send"
                >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </button>
            </div>
            {fileError ? (
                <p className="absolute bottom-full left-0 right-0 mb-1.5 rounded-lg bg-rose-950/90 px-3 py-2 text-[11px] text-rose-100">
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
                    <div className={`mx-auto w-full ${maxW} space-y-5 pb-40`}>{messageThread}</div>
                </div>
                <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-2">
                    <div className="mx-auto w-full max-w-3xl">
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
                    <div className="w-full space-y-5 sm:space-y-5">{messageThread}</div>
                </div>
            </div>
            <div className="relative z-10 shrink-0 bg-[var(--color-brand-bg)] px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pt-4">
                <div className={`relative mx-auto w-full ${maxW}`}>
                    {composerCore}
                    {fileHint}
                </div>
            </div>
        </div>
    );
}
