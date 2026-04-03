'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import { isVentureUnsettled, PA_WELCOME_MESSAGE } from '@/lib/ventureSetupState';
import { ArrowUp, Bot, ClipboardList, FileUp, Lightbulb, Mic } from 'lucide-react';

type Msg = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    ts: number;
    /** Tap-to-answer suggestions from the model (last assistant message only). */
    followUpOptions?: string[];
};

/** Model may include "Other — type below"; user can also use the composer. */
function isOtherFollowUpLabel(s: string): boolean {
    const t = s.toLowerCase().trim();
    return t.startsWith('other') || t.includes('type below') || t.includes("i'll type") || t.includes('type my answer');
}

export function PersonalAssistant() {
    const { activeProject, switchRoom } = useOffice();
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [fileLabel, setFileLabel] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null);
    /** Multi-select for the latest assistant message’s followUpOptions (combine or “both”). */
    const [followUpSelection, setFollowUpSelection] = useState<Set<string>>(new Set());

    const strategyDoc = useMemo(() => parseStrategy(activeProject?.strategy || ''), [activeProject?.strategy]);
    const priorities = strategyDoc.priorities || [];
    const phases = strategyDoc.phases || [];
    const priDone = priorities.filter((p) => p.done).length;
    const phaseDone = phases.filter((p) => p.status === 'done').length;
    const events = activeProject?.events?.length ?? 0;

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const w = window as unknown as {
            SpeechRecognition?: new () => { stop: () => void; start: () => void };
            webkitSpeechRecognition?: new () => { stop: () => void; start: () => void };
        };
        setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    }, []);

    const lastFollowUpMsg = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.role === 'assistant' && m.followUpOptions && m.followUpOptions.length > 0) return m;
        }
        return null;
    }, [messages]);

    useEffect(() => {
        setFollowUpSelection(new Set());
    }, [lastFollowUpMsg?.id]);

    useEffect(() => {
        setMessages([]);
        setInput('');
        setFileLabel(null);
        setFileError(null);
        if (!activeProject?.id) return;
        if (isVentureUnsettled(activeProject)) {
            setMessages([
                {
                    id: 'pa-welcome',
                    role: 'assistant',
                    content: PA_WELCOME_MESSAGE,
                    ts: Date.now(),
                },
            ]);
        }
    }, [activeProject?.id]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [input]);

    const stopListening = useCallback(() => {
        try {
            recognitionRef.current?.stop();
        } catch {
            /* noop */
        }
        setListening(false);
    }, []);

    const startListening = useCallback(() => {
        if (typeof window === 'undefined') return;
        const w = window as unknown as {
            SpeechRecognition?: new () => {
                lang: string;
                interimResults: boolean;
                continuous: boolean;
                onresult: ((e: {
                    resultIndex: number;
                    results: { length: number; [i: number]: { isFinal: boolean; [0]: { transcript: string } } };
                }) => void) | null;
                onerror: (() => void) | null;
                onend: (() => void) | null;
                start: () => void;
                stop: () => void;
            };
            webkitSpeechRecognition?: new () => {
                lang: string;
                interimResults: boolean;
                continuous: boolean;
                onresult: ((e: {
                    resultIndex: number;
                    results: { length: number; [i: number]: { isFinal: boolean; [0]: { transcript: string } } };
                }) => void) | null;
                onerror: (() => void) | null;
                onend: (() => void) | null;
                start: () => void;
                stop: () => void;
            };
        };
        const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!SR) return;
        stopListening();
        const rec = new SR();
        rec.lang = 'en-US';
        rec.interimResults = true;
        rec.continuous = true;
        rec.onresult = (event) => {
            let chunk = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const r = event.results[i];
                if (r.isFinal) chunk += r[0].transcript;
            }
            const t = chunk.trim();
            if (t) setInput((prev) => (prev ? `${prev.trim()} ${t}` : t));
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);
        recognitionRef.current = rec;
        rec.start();
        setListening(true);
    }, [stopListening]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    };

    const focusComposer = useCallback(() => {
        textareaRef.current?.focus();
    }, []);

    const sendMessage = async (userText: string, opts?: { displayText?: string }) => {
        const modelUserContent = userText.trim();
        const displayContent = (opts?.displayText ?? userText).trim();
        if (!modelUserContent || loading || !activeProject?.id) return;

        const userMsg: Msg = { id: Date.now().toString(), role: 'user', content: displayContent, ts: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: 'assistant',
                    message: modelUserContent,
                    companyContext:
                        'Early stage startup, solo founder, building AI C-suite platform called DeepChox',
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
                setMessages((prev) => [
                    ...prev,
                    { id: (Date.now() + 1).toString(), role: 'assistant', content: err, ts: Date.now() },
                ]);
                return;
            }
            if (data.loading) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: 'AI is warming up, please wait 20 seconds and try again.',
                        ts: Date.now(),
                    },
                ]);
            } else {
                const text =
                    typeof data.response === 'string' ? data.response : 'No response generated.';
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: text,
                        ts: Date.now(),
                    },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: 'Something went wrong. Please try again.',
                    ts: Date.now(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const requestExecutiveBriefing = async () => {
        if (!activeProject?.id || loading) return;
        await sendMessage(
            '[Executive briefing request] In one concise response: summarize venture health, top 3 risks or gaps, and the next three actions I should take. Use only the venture context you have.',
            { displayText: 'Executive briefing' }
        );
    };

    if (!activeProject) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-brand-bg px-6 text-center">
                <p className="max-w-md text-sm text-brand-muted">Choose a venture first.</p>
                <button
                    type="button"
                    onClick={() => switchRoom('dashboard')}
                    className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-white/[0.07]"
                >
                    Open overview
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-brand-bg lg:flex-row">
            {/* Desktop: insight column — soft panels, no heavy grid */}
            <aside className="hidden w-[min(100%,380px)] shrink-0 flex-col bg-gradient-to-b from-brand-panel/20 via-transparent to-transparent lg:flex lg:border-r lg:border-white/[0.05]">
                <div className="shrink-0 px-4 py-4 sm:px-5">
                    <h3 className="text-[12px] font-medium text-brand-text/90">At a glance</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">Saved in this venture.</p>
                </div>
                <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-4 pb-4 sm:px-5">
                    <div className="rounded-2xl bg-white/[0.03] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.06] backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-brand-text">
                            <ClipboardList className="h-3.5 w-3.5 text-brand-muted" aria-hidden />
                            Progress
                        </div>
                        <ul className="mt-2.5 space-y-1.5 text-[12px] text-brand-muted/90">
                            <li>Priorities: {priorities.length ? `${priDone}/${priorities.length} done` : '—'}</li>
                            <li>Phases: {phases.length ? `${phaseDone}/${phases.length} done` : '—'}</li>
                            <li>Calendar events: {events}</li>
                        </ul>
                    </div>
                    <div className="rounded-2xl bg-white/[0.03] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.06] backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-brand-text">
                            <Lightbulb className="h-3.5 w-3.5 text-brand-muted" aria-hidden />
                            Strategy
                        </div>
                        <p className="mt-2 line-clamp-6 text-[12px] leading-relaxed text-brand-muted/90">
                            {(strategyDoc.strategicIntent || strategyDoc.vision || strategyDoc.content || '').trim().slice(0, 420) ||
                                'Nothing here yet — add intent on the CEO desk or below.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={requestExecutiveBriefing}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.05] py-2.5 text-[12px] font-medium text-brand-text ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                    >
                        {loading ? '…' : 'Request briefing'}
                    </button>
                </div>
            </aside>

            {/* Main: messages fill the middle; composer pinned to bottom */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <header className="shrink-0 border-b border-white/[0.06] bg-brand-bg/55 px-4 py-3 backdrop-blur-md sm:px-5">
                    <div className="mx-auto flex max-w-3xl flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                            <h2 className="text-[15px] font-medium tracking-tight text-brand-text">Assistant</h2>
                            <p className="mt-0.5 truncate text-[12px] text-brand-muted">{activeProject.name}</p>
                        </div>
                        <p className="text-[11px] leading-snug text-brand-muted sm:max-w-[14rem] sm:text-right">
                            Updates the venture record (strategy, tasks, calendar) when you ask.
                        </p>
                    </div>
                </header>

                {/* Mobile snapshot */}
                <div className="shrink-0 border-b border-white/[0.05] bg-white/[0.02] px-4 py-3 backdrop-blur-sm lg:hidden">
                    <p className="text-[11px] font-medium text-brand-muted">Summary</p>
                    <p className="mt-1 text-[11px] text-brand-muted/90">
                        Priorities {priDone}/{priorities.length || 0} · Phases {phaseDone}/{phases.length || 0} · Events {events}
                    </p>
                    <button
                        type="button"
                        onClick={requestExecutiveBriefing}
                        disabled={loading}
                        className="mt-2.5 w-full rounded-xl bg-white/[0.06] py-2 text-[11px] font-medium text-brand-text ring-1 ring-white/[0.08] disabled:opacity-50"
                    >
                        Briefing
                    </button>
                </div>

                <div className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-8 sm:px-5">
                        {messages.length === 0 && activeProject && !isVentureUnsettled(activeProject) && (
                            <div className="rounded-2xl bg-white/[0.03] p-4 text-sm text-brand-muted/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.06]">
                                <p className="font-medium text-brand-text">Continue</p>
                                <p className="mt-2 leading-relaxed">
                                    Ask for changes to this venture. Use file or voice under the box if you prefer.
                                </p>
                            </div>
                        )}
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {m.role === 'assistant' && (
                                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08]">
                                        <Bot className="h-4 w-4 text-brand-muted/90" aria-hidden />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[min(100%,720px)] px-3.5 py-2.5 text-sm leading-relaxed sm:px-4 sm:py-3 ${
                                        m.role === 'user'
                                            ? 'rounded-2xl rounded-br-md bg-white/[0.06] text-brand-text ring-1 ring-white/[0.08]'
                                            : 'rounded-2xl rounded-bl-md bg-white/[0.04] text-brand-text/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/[0.06]'
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap">{m.content}</p>
                                    {m.role === 'assistant' &&
                                        m.followUpOptions &&
                                        m.followUpOptions.length > 0 &&
                                        m.id === lastFollowUpMsg?.id && (
                                            <div
                                                className="mt-3.5 space-y-2.5 border-t border-white/[0.06] pt-3"
                                                role="group"
                                                aria-label="Quick replies — select one or more, then send"
                                            >
                                                <p className="text-[10px] text-brand-muted/90">
                                                    Tap one or more, then send — or type your own below.
                                                </p>
                                                <div className="flex flex-wrap gap-2">
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
                                                                className={`rounded-full px-3 py-2 text-left text-[12px] font-medium leading-snug ring-1 transition-colors disabled:opacity-40 ${
                                                                    selected
                                                                        ? 'bg-white/[0.12] text-brand-text ring-white/[0.2]'
                                                                        : 'bg-white/[0.05] text-brand-text ring-white/[0.08] hover:bg-white/[0.08]'
                                                                }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
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
                                                                sendMessage(combined);
                                                            }}
                                                            className="rounded-full bg-zinc-300 px-3 py-1.5 text-[11px] font-semibold text-[#131314] transition-colors hover:bg-zinc-200 disabled:opacity-40"
                                                        >
                                                            Send selected ({followUpSelection.size})
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={loading}
                                                        onClick={() => {
                                                            setFollowUpSelection(new Set());
                                                            focusComposer();
                                                        }}
                                                        className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-brand-text ring-1 ring-white/[0.1] transition-colors hover:bg-white/[0.1] disabled:opacity-40"
                                                    >
                                                        Type my own answer
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-3 pl-1">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08]">
                                    <Bot className="h-4 w-4 text-brand-muted/90" aria-hidden />
                                </div>
                                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.06]">
                                    <span className="text-[12px] text-brand-muted">…</span>
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>
                </div>

                {/* Bottom dock — pinned to viewport bottom of this column (studio-style) */}
                <div className="shrink-0 border-t border-white/[0.05] bg-gradient-to-t from-brand-bg via-brand-bg/98 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pb-5">
                    <div className="mx-auto max-w-3xl">
                        <div className="relative rounded-3xl bg-white/[0.04] shadow-[0_12px_48px_rgba(0,0,0,0.28)] ring-1 ring-white/[0.08] backdrop-blur-md focus-within:ring-white/[0.12]">
                            <div className="relative">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage(input);
                                        }
                                    }}
                                    placeholder="Message…"
                                    rows={1}
                                    disabled={loading}
                                    className="max-h-40 min-h-[52px] w-full resize-none rounded-t-3xl border-none bg-transparent px-4 py-3.5 pr-14 text-sm text-brand-text placeholder:text-brand-muted/70 focus:ring-0 sm:min-h-[56px] sm:px-5 sm:py-4"
                                />
                                <button
                                    type="button"
                                    onClick={() => sendMessage(input)}
                                    disabled={loading || !input.trim()}
                                    className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-300 text-[#131314] shadow-md shadow-black/20 transition-colors hover:bg-zinc-200 disabled:opacity-40"
                                    aria-label="Send"
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,.md,.csv,.json,text/plain"
                                className="hidden"
                                onChange={handleFileInput}
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2.5 sm:px-4">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={loading}
                                        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-muted transition-colors hover:text-brand-text disabled:opacity-50"
                                    >
                                        <FileUp className="h-3.5 w-3.5 opacity-70" aria-hidden />
                                        File
                                    </button>
                                    {voiceSupported ? (
                                        <button
                                            type="button"
                                            onClick={() => (listening ? stopListening() : startListening())}
                                            disabled={loading}
                                            className={`inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors disabled:opacity-50 ${
                                                listening ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-text'
                                            }`}
                                            aria-pressed={listening}
                                        >
                                            <Mic className="h-3.5 w-3.5 opacity-70" aria-hidden />
                                            {listening ? 'Stop' : 'Voice'}
                                        </button>
                                    ) : (
                                        <span className="text-[11px] text-brand-muted/70">Voice needs Chrome or Edge</span>
                                    )}
                                    {listening ? (
                                        <span className="text-[11px] text-brand-teal" aria-live="polite">
                                            Listening
                                        </span>
                                    ) : null}
                                    {fileLabel ? <span className="max-w-[140px] truncate text-[10px] text-brand-muted">{fileLabel}</span> : null}
                                </div>
                            </div>
                            {fileError ? (
                                <p className="border-t border-white/[0.06] px-3 pb-2.5 text-[11px] text-rose-400/90 sm:px-4">{fileError}</p>
                            ) : null}
                        </div>
                        <p className="mt-2 text-center text-[10px] text-brand-muted/80 sm:text-[11px]">
                            Enter to send · Shift+Enter for a new line
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
