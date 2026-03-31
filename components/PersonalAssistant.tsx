'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import {
    mergeProjectWithPAUpdates,
    projectPayloadForPA,
    summarizeAppliedUpdates,
    type PersonalAssistantUpdates,
} from '@/lib/paApplyUpdates';
import { getAllProjects, saveProject } from '@/lib/db';
import { ArrowUp, Bot, ClipboardList, Lightbulb, Sparkles } from 'lucide-react';

type Msg = { id: string; role: 'user' | 'assistant'; content: string; ts: number };

export function PersonalAssistant() {
    const { activeProject, switchRoom, setActiveProject, setAllProjects } = useOffice();
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [input]);

    const sendMessage = async (userText: string, opts?: { displayText?: string }) => {
        const modelUserContent = userText.trim();
        const displayContent = (opts?.displayText ?? userText).trim();
        if (!modelUserContent || loading || !activeProject?.id) return;

        const userMsg: Msg = { id: Date.now().toString(), role: 'user', content: displayContent, ts: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const conversation = [
                ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                { role: 'user' as const, content: modelUserContent },
            ];

            const response = await fetch('/api/personal-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project: projectPayloadForPA(activeProject),
                    conversation,
                }),
            });
            const data = await response.json();
            if (!data.ok) {
                const err =
                    typeof data.error === 'string'
                        ? data.error
                        : 'Personal Assistant unavailable. Set GROQ_API_KEY on the server.';
                setMessages((prev) => [
                    ...prev,
                    { id: (Date.now() + 1).toString(), role: 'assistant', content: err, ts: Date.now() },
                ]);
                return;
            }

            let assistantContent = typeof data.reply === 'string' ? data.reply : '';
            const updates = data.updates as PersonalAssistantUpdates | undefined;
            if (updates && Object.keys(updates).length > 0) {
                const merged = mergeProjectWithPAUpdates(activeProject, updates);
                await saveProject(merged);
                setActiveProject(merged);
                const list = await getAllProjects();
                setAllProjects(list);
                assistantContent += summarizeAppliedUpdates(updates);
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: assistantContent || 'Done.',
                    ts: Date.now(),
                },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content:
                        'Connection error. Ensure the app is running with GROQ_API_KEY (e.g. on Render) for Personal Assistant actions.',
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
                <p className="max-w-md text-sm text-brand-muted">Select a venture to use your Personal Assistant — it needs full venture context to direct duties and give insight.</p>
                <button
                    type="button"
                    onClick={() => switchRoom('dashboard')}
                    className="rounded-lg border border-brand-border bg-brand-card px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-input"
                >
                    Go to Executive Overview
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-brand-bg lg:flex-row">
            {/* Desktop: insight column — full height, separate from chat dock */}
            <aside className="hidden w-[min(100%,380px)] shrink-0 flex-col border-brand-border bg-brand-panel lg:flex lg:border-r">
                <div className="shrink-0 border-b border-brand-border px-4 py-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Portfolio insight</h3>
                    <p className="mt-1 text-[12px] leading-snug text-brand-muted">Live snapshot from your venture record — not a substitute for AI analysis in chat.</p>
                </div>
                <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    <div className="rounded-lg border border-brand-border bg-brand-bg p-3">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-brand-text">
                            <ClipboardList className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                            Execution signals
                        </div>
                        <ul className="mt-2 space-y-1.5 text-[12px] text-brand-muted">
                            <li>Priorities: {priorities.length ? `${priDone}/${priorities.length} done` : '—'}</li>
                            <li>Phases: {phases.length ? `${phaseDone}/${phases.length} done` : '—'}</li>
                            <li>Calendar events: {events}</li>
                        </ul>
                    </div>
                    <div className="rounded-lg border border-brand-border bg-brand-bg p-3">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-brand-text">
                            <Lightbulb className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                            Strategic line
                        </div>
                        <p className="mt-2 line-clamp-6 text-[12px] leading-relaxed text-brand-muted">
                            {(strategyDoc.strategicIntent || strategyDoc.vision || strategyDoc.content || '').trim().slice(0, 420) ||
                                'Pin strategic intent and narrative on the CEO desk to populate this summary.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={requestExecutiveBriefing}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-teal/30 bg-brand-input py-2.5 text-[12px] font-semibold text-brand-text transition-colors hover:border-brand-teal/50 hover:bg-brand-card disabled:opacity-50"
                    >
                        <Sparkles className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                        {loading ? 'Requesting…' : 'Ask for executive briefing'}
                    </button>
                </div>
            </aside>

            {/* Main: messages fill the middle; composer pinned to bottom (Google AI Studio–style) */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <header className="shrink-0 border-b border-brand-border bg-brand-panel/80 px-4 py-3 backdrop-blur-sm sm:px-5">
                    <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-brand-input">
                            <Sparkles className="h-4 w-4 text-brand-teal" aria-hidden />
                        </span>
                        <div>
                            <h2 className="text-[15px] font-medium text-brand-text">Personal Assistant</h2>
                            <p className="text-[11px] text-brand-muted">Direct duties · holistic insight across {activeProject.name}</p>
                        </div>
                    </div>
                </header>

                {/* Mobile snapshot — above thread, stays out of the bottom dock */}
                <div className="shrink-0 border-b border-brand-border bg-brand-panel/50 px-4 py-2.5 lg:hidden">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Snapshot</p>
                    <p className="mt-0.5 text-[11px] text-brand-muted">
                        Priorities {priDone}/{priorities.length || 0} · Phases {phaseDone}/{phases.length || 0} · Events {events}
                    </p>
                    <button
                        type="button"
                        onClick={requestExecutiveBriefing}
                        disabled={loading}
                        className="mt-2 w-full rounded-md border border-brand-teal/30 py-1.5 text-[10px] font-semibold text-brand-text disabled:opacity-50"
                    >
                        Executive briefing
                    </button>
                </div>

                <div className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-8 sm:px-5">
                        {messages.length === 0 && (
                            <div className="rounded-xl border border-brand-border bg-brand-card/80 p-4 text-sm text-brand-muted">
                                <p className="font-medium text-brand-text">Start the conversation</p>
                                <p className="mt-2 leading-relaxed">
                                    Ask for anything — including “set my top 3 priorities”, “move phase 2 to in progress”, or “add a
                                    deadline next week”. When you give a concrete instruction, the assistant can update strategy,
                                    product, finance, intel, kanban, and calendar for you (requires GROQ on the server).
                                </p>
                            </div>
                        )}
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {m.role === 'assistant' && (
                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-input">
                                        <Bot className="h-4 w-4 text-brand-muted" aria-hidden />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[min(100%,720px)] rounded-xl border px-3 py-2.5 text-sm leading-relaxed sm:px-4 sm:py-3 ${
                                        m.role === 'user'
                                            ? 'border-brand-border bg-brand-input text-brand-text'
                                            : 'border-brand-border bg-brand-input/60 text-brand-text/95'
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap">{m.content}</p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-3 pl-4">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-input">
                                    <Bot className="h-4 w-4 text-brand-muted" aria-hidden />
                                </div>
                                <div className="flex items-center gap-1.5 rounded-xl border border-brand-border bg-brand-input/60 px-4 py-3">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-muted" />
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-muted [animation-delay:150ms]" />
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-muted [animation-delay:300ms]" />
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>
                </div>

                {/* Bottom dock — pinned to viewport bottom of this column (studio-style) */}
                <div className="shrink-0 border-t border-brand-border bg-gradient-to-t from-brand-bg via-brand-bg to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-5">
                    <div className="mx-auto max-w-3xl">
                        <div className="relative rounded-2xl border border-brand-border/80 bg-brand-panel shadow-[0_-4px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.04] focus-within:border-brand-teal/40 focus-within:ring-brand-teal/15">
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
                                placeholder="Message your assistant…"
                                rows={1}
                                disabled={loading}
                                className="max-h-40 min-h-[52px] w-full resize-none rounded-2xl border-none bg-transparent px-4 py-3.5 pr-14 text-sm text-brand-text placeholder:text-brand-muted focus:ring-0 sm:min-h-[56px] sm:px-5 sm:py-4"
                            />
                            <button
                                type="button"
                                onClick={() => sendMessage(input)}
                                disabled={loading || !input.trim()}
                                className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal text-[#131314] shadow-sm transition-colors hover:bg-brand-teal/90 disabled:opacity-40"
                                aria-label="Send"
                            >
                                <ArrowUp className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mt-2 text-center text-[10px] text-brand-muted/90 sm:text-[11px]">
                            Enter to send · Shift+Enter for new line
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
