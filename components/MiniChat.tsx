'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOffice, getAgentSystemPrompt, AgentRole } from '@/lib/OfficeContext';
import { ArrowUp, Bot, MoreHorizontal } from 'lucide-react';
import { DESK_AI_MODELS, type DeskModelId } from '@/lib/deskConstants';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export function MiniChat() {
    const { activeRoom, activeProject, agents, addSystemLog } = useOffice();

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState<DeskModelId>('llama3');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const effectiveAgentRole: AgentRole = (() => {
        if (['pm', 'accountant', 'scout', 'ceo', 'cmo'].includes(activeRoom)) return activeRoom as AgentRole;
        return 'ceo';
    })();
    const currentAgent = agents[effectiveAgentRole];

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
        }
    }, [inputValue]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        setMessages([]);
    }, [activeRoom]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading || !activeProject) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        addSystemLog(`Desk chat: ${inputValue.substring(0, 40)}…`, currentAgent.role.toUpperCase(), 'info');

        try {
            const systemPrompt = getAgentSystemPrompt(effectiveAgentRole as AgentRole, activeProject);
            const projectContext = `
            Current venture: ${activeProject.name}
            Active desk: ${activeRoom}
            Role: ${currentAgent.title}
            `.trim();

            const fullMessages = [
                { role: 'system', content: `${systemPrompt}\n\nContext:\n${projectContext}` },
                ...messages.map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: userMessage.content },
            ];

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: fullMessages,
                    model,
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            const data = await response.json();
            const assistantContent = data.message?.content || 'No content returned.';

            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: Date.now(),
                },
            ]);
            addSystemLog(`Desk reply · ${currentAgent.role}`, 'NETWORK', 'success');
        } catch (err) {
            console.error(err);
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: 'Request failed. Confirm your local model (e.g. Ollama) is running and the model name matches.',
                    timestamp: Date.now(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex h-full flex-col border-l border-brand-border bg-brand-bg text-[13px]">
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-zinc-800 p-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-600 bg-zinc-800 text-zinc-300">
                        {currentAgent.icon}
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-xs font-semibold text-zinc-100">{currentAgent.title}</h3>
                        <p className="mt-0.5 truncate text-[10px] text-zinc-500">{currentAgent.style}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setMessages([])}
                    className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                    title="Clear thread"
                >
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                </button>
            </div>

            <div className="border-b border-zinc-800 px-4 py-2">
                <label className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Model</span>
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value as DeskModelId)}
                        className="max-w-[160px] rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                    >
                        {DESK_AI_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
                            <Bot className="h-5 w-5 text-zinc-500" aria-hidden />
                        </div>
                        <p className="text-xs font-medium text-zinc-400">Desk channel</p>
                        <p className="mt-2 max-w-[240px] text-[11px] leading-relaxed text-zinc-500">
                            Messages use this desk&apos;s role and your venture context. Choose the model your runtime exposes (e.g.
                            Ollama).
                        </p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        <div
                            className={`max-w-[90%] rounded-lg px-3 py-2.5 ${
                                msg.role === 'user'
                                    ? 'border border-zinc-600 bg-zinc-800 text-zinc-100'
                                    : 'border border-zinc-700 bg-zinc-900 text-zinc-300'
                            }`}
                        >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                        <span className="text-[9px] text-zinc-600">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-1.5 px-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:75ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 border-t border-zinc-800 p-4">
                <div className="relative rounded-lg border border-zinc-600 bg-zinc-900 focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500">
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
                        placeholder="Message this desk…"
                        disabled={isLoading}
                        className="max-h-28 min-h-[52px] w-full resize-none border-0 bg-transparent p-3 pr-11 text-sm text-zinc-200 placeholder:text-zinc-600 focus:ring-0"
                        rows={1}
                    />
                    <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        className="absolute bottom-2 right-2 rounded-md bg-zinc-700 p-2 text-zinc-100 transition hover:bg-zinc-600 disabled:opacity-40"
                    >
                        <ArrowUp className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            </div>
        </div>
    );
}
