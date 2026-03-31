'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOffice, getAgentSystemPrompt } from '@/lib/OfficeContext';
import { Send, Sparkles } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

/** Distinctive Dexo mark — flat geometry, aligned with suite brand tokens */
function DexoMark({ className = '' }: { className?: string }) {
    return (
        <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-brand-border bg-brand-panel ${className}`}
            aria-hidden
        >
            <svg viewBox="0 0 40 40" className="h-10 w-10 text-brand-text" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M8 12c0-2.2 1.8-4 4-4h10l10 10v14c0 2.2-1.8 4-4 4H12c-2.2 0-4-1.8-4-4V12z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                <path d="M22 8v8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="20" cy="24" r="2" className="fill-brand-teal" />
            </svg>
        </div>
    );
}

export function DexoCommandCenter() {
    const { activeProject, updateStrategy, updateProductPlan, updateBudget, updateMarketInsights } = useOffice();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'assistant',
            content:
                'I’m Dexo — I can read across your venture and help you act. Ask in plain language, or tell me what to update (strategy, product, budget, market).',
            timestamp: Date.now(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleCommandExecution = (content: string) => {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const commandData = JSON.parse(jsonMatch[0]);
                if (commandData.command && commandData.payload) {
                    switch (commandData.command) {
                        case 'updateStrategy':
                            updateStrategy(commandData.payload);
                            break;
                        case 'updateProduct':
                            updateProductPlan(commandData.payload);
                            break;
                        case 'updateBudget':
                            updateBudget(commandData.payload);
                            break;
                        case 'updateMarket':
                            updateMarketInsights(commandData.payload);
                            break;
                    }
                }
            }
        } catch (e) {
            console.error('Command parsing failed', e);
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const context = activeProject
                ? `
                PROJECT: ${activeProject.name}
                Strategy: ${activeProject.strategy || '—'}
                Product: ${activeProject.productPlan || '—'}
                Budget: ${activeProject.budget || '—'}
                Market: ${activeProject.marketInsights || '—'}
                Notes: ${activeProject.userNotes || '—'}
                If you update data, end with a JSON block:
                {"command":"updateStrategy"|"updateProduct"|"updateBudget"|"updateMarket","payload":"..."}
            `
                : 'No venture selected — answer generally.';

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: getAgentSystemPrompt('dexo', activeProject) + '\n\n' + context },
                        ...messages.map((m) => ({ role: m.role, content: m.content })),
                        { role: 'user', content: userMessage.content },
                    ],
                    model: 'llama3',
                }),
            });

            if (!response.ok) throw new Error('Failed');
            const data = await response.json();
            const raw = data.message?.content || 'Done.';
            handleCommandExecution(raw);
            const content = raw.replace(/```json[\s\S]*```/, '').trim();

            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content,
                    timestamp: Date.now(),
                },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: 'Couldn’t reach the model. Check that Ollama is running.',
                    timestamp: Date.now(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-full w-full bg-brand-bg text-brand-text">
            <aside className="hidden w-56 shrink-0 flex-col border-r border-brand-border/80 bg-brand-bg p-6 lg:flex">
                <DexoMark />
                <h1 className="mt-5 text-[15px] font-semibold tracking-tight text-brand-text">Dexo</h1>
                <p className="mt-1 text-xs leading-relaxed text-brand-muted">Core intelligence — one place to steer the suite.</p>
                <div className="mt-8 flex items-center gap-2 text-xs text-brand-muted">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-teal" aria-hidden />
                    <span className="truncate">{activeProject ? activeProject.name : 'No venture selected'}</span>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col bg-brand-bg">
                <header className="flex shrink-0 items-center gap-4 border-b border-brand-border bg-brand-panel/40 px-4 py-4 lg:hidden">
                    <DexoMark className="!h-12 !w-12" />
                    <div>
                        <h1 className="text-[15px] font-semibold text-brand-text">Dexo</h1>
                        <p className="text-xs text-brand-muted">Core intelligence</p>
                    </div>
                </header>

                <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto bg-brand-bg px-4 py-6 sm:px-8">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {msg.role === 'assistant' && (
                                <div className="hidden sm:block">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-brand-panel">
                                        <span className="text-[10px] font-bold text-brand-teal">D</span>
                                    </div>
                                </div>
                            )}
                            <div
                                className={`max-w-[min(100%,42rem)] rounded-xl border px-4 py-3 text-sm leading-relaxed ${
                                    msg.role === 'assistant'
                                        ? 'border-brand-border/60 bg-brand-panel/90 text-brand-text'
                                        : 'border-brand-border/50 bg-brand-input/90 text-brand-text'
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <p className="pl-10 text-sm text-brand-muted sm:pl-12">Thinking…</p>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="shrink-0 border-t border-brand-border/80 bg-brand-bg p-4 sm:p-5">
                    <div className="mx-auto flex max-w-4xl gap-2">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Message Dexo…"
                            rows={2}
                            className="min-h-[52px] flex-1 resize-none rounded-xl border border-brand-border bg-brand-input px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted outline-none transition-colors focus:border-brand-teal/40 focus:ring-1 focus:ring-brand-teal/20"
                        />
                        <button
                            type="button"
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            className="shrink-0 rounded-xl border border-brand-border bg-brand-input px-4 py-2 text-brand-text transition hover:bg-brand-card disabled:opacity-40"
                        >
                            <Send className="h-5 w-5" aria-hidden />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
