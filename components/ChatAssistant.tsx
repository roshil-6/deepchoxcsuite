'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOffice, getAgentSystemPrompt, AgentRole } from '@/lib/OfficeContext';
import { getChatRailTheme, getChatAgentRoleForRoom } from '@/lib/roomThemes';
import { Sparkles, Paperclip, ArrowUp, Bot, Stars, X } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export type ChatAssistantVariant = 'default' | 'drawer' | 'bottomDock';

export function ChatAssistant({
    variant = 'default',
    onClose,
}: {
    variant?: ChatAssistantVariant;
    onClose?: () => void;
}) {
    const {
        activeRoom,
        activeProject,
        agents,
        addFile,
        pendingChat,
        setPendingChat,
    } = useOffice();

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Handle programmatic chat triggers
    useEffect(() => {
        if (pendingChat && !isLoading && activeProject) {
            const { message } = pendingChat;
            setInputValue(message);
            setPendingChat(null);
            setTimeout(() => {
                handleSendMessage();
            }, 100);
        }
    }, [pendingChat, isLoading, activeProject]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const chatTheme = getChatRailTheme(activeRoom);
    const effectiveAgentRole: AgentRole = getChatAgentRoleForRoom(activeRoom);
    const currentAgent = agents[effectiveAgentRole];

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [inputValue]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Room switch reset
    useEffect(() => {
        setMessages([]);
    }, [activeRoom]);

    const [selectedModel, setSelectedModel] = useState('llama3');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            if (content) {
                addFile(file.name, content, file.type);
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `I've analyzed **${file.name}**. I'm ready to answer questions about it.`,
                    timestamp: Date.now()
                }]);
            }
        };
        reader.readAsText(file);
    };

    const handleSendMessage = async () => {
        if ((!inputValue.trim() && !pendingChat) || isLoading || !activeProject) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const systemPrompt = getAgentSystemPrompt(effectiveAgentRole as AgentRole, activeProject);

            let fileContext = '';
            if (activeProject.files && activeProject.files.length > 0) {
                fileContext = '\n\nATTACHED FILE DATA:\n' + activeProject.files.map(f => `--- FILE: ${f.name} ---\n${f.content.substring(0, 5000)}...\n--- END FILE ---`).join('\n');
            }

            const projectContext = `
            Current Project: ${activeProject.name}
            CEO Strategy: ${activeProject.strategy || 'N/A'}
            Product Plan: ${activeProject.productPlan || 'N/A'}
            Budget: ${activeProject.budget || 'N/A'}
            Market Insights: ${activeProject.marketInsights || 'N/A'}
            Active View: ${activeRoom}
            Executive Journal: ${activeProject.userNotes || 'N/A'}
            Team Directives: ${activeProject.teamDirectives || 'N/A'}
            ${fileContext}
            `.trim();

            const fullMessages = [
                { role: 'system', content: systemPrompt + '\n\nContext:\n' + projectContext },
                ...messages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: userMessage.content }
            ];

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: fullMessages,
                    model: selectedModel,
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            const data = await response.json();
            const assistantContent = data.message?.content || "Connection established, but no content generated.";

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: assistantContent,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, assistantMessage]);

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Connection error. Ensure the intelligence engine (Ollama) is active.', timestamp: Date.now() }]);
        } finally {
            setIsLoading(false);
        }
    };

    const fileInputId =
        variant === 'drawer' ? 'chat-file-upload-drawer' : variant === 'bottomDock' ? 'chat-file-upload-dock' : 'file-upload';

    const isBottomDock = variant === 'bottomDock';
    const dockThreadEmpty = isBottomDock && messages.length === 0 && !isLoading;

    return (
        <div
            className={`flex min-h-0 flex-col overflow-hidden shadow-none transition-all duration-300 ${
                isBottomDock && dockThreadEmpty
                    ? 'h-auto w-full rounded-none border-0 bg-brand-bg'
                    : isBottomDock
                      ? 'h-full min-h-[min(36vh,320px)] rounded-none border-0 bg-brand-bg'
                      : chatTheme.railClass
            }`}
        >
            {isBottomDock && !dockThreadEmpty ? (
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-border/40 px-4 pb-2 pt-3 sm:px-5">
                    <p className="min-w-0 text-[12px] leading-snug text-brand-muted">
                        <span className="font-medium text-brand-text">{currentAgent.name}</span>
                        <span className="text-brand-muted"> · {currentAgent.title}</span>
                    </p>
                    <button
                        type="button"
                        onClick={() => setMessages([])}
                        className="shrink-0 text-[12px] font-medium text-brand-muted transition-colors hover:text-brand-text"
                        title="Clear thread"
                    >
                        Clear
                    </button>
                </div>
            ) : variant === 'drawer' ? (
                <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-brand-border/80 bg-brand-card/95 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-600 bg-zinc-800 text-zinc-300">
                            <Bot className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-100">AI thread</p>
                            <p className="truncate text-[10px] text-zinc-500">Optional · same model as command deck</p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setMessages([])}
                            className="rounded-lg border border-zinc-700/60 bg-zinc-900/50 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                            title="Clear thread"
                        >
                            <Sparkles className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-zinc-700/60 bg-zinc-900/50 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                                title="Hide AI panel"
                            >
                                <X className="h-3.5 w-3.5" aria-hidden />
                            </button>
                        )}
                    </div>
                </div>
            ) : isBottomDock || activeRoom === 'dashboard' ? null : (
                <div
                    className={`sticky top-0 z-10 flex items-start justify-between gap-3 border-b p-5 ${chatTheme.headerClass}`}
                >
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-input text-brand-text">
                            {currentAgent.icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] leading-snug text-brand-text/90">
                                Hey — I&apos;m{' '}
                                <span className="font-semibold text-white">{chatTheme.roleLabel}</span>.
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">{chatTheme.subtitle}</p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full animate-pulse ${chatTheme.accentDot}`} aria-hidden />
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Online</span>
                                <span className="text-brand-border">·</span>
                                <span className="truncate text-[10px] font-medium text-brand-muted">{currentAgent.title}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMessages([])}
                        className="shrink-0 rounded-xl border border-brand-border/60 bg-brand-bg/60 p-2 text-brand-muted transition-colors hover:bg-brand-input hover:text-white"
                        title="Clear thread"
                    >
                        <Sparkles className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            )}

            {!dockThreadEmpty && (
            <div
                className={`custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto bg-brand-bg ${
                    isBottomDock ? 'px-4 pb-2 pt-0 sm:px-5' : 'p-4 sm:p-5'
                }`}
            >
                {messages.length === 0 && (
                    <div
                        className={`flex select-none flex-col items-start rounded-xl border border-brand-border/50 bg-brand-bg/50 p-4 text-left sm:p-6 ${
                            variant === 'drawer' ? 'min-h-[120px]' : 'min-h-[160px]'
                        }`}
                    >
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/70">
                            <Stars className="h-4 w-4 text-zinc-500" strokeWidth={1.25} aria-hidden />
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">This thread</p>
                        <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-zinc-300">{chatTheme.emptyPrompt}</p>
                        {variant !== 'drawer' && (
                            <p className="mt-3 text-xs text-zinc-600">Say more in the composer at the bottom.</p>
                        )}
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {msg.role === 'assistant' && (
                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-600 bg-zinc-800">
                                <Bot className="h-4 w-4 text-zinc-400" />
                            </div>
                        )}

                        <div className={`max-w-[85%] rounded-lg p-4 text-sm leading-relaxed ${msg.role === 'user'
                            ? `rounded-tr-sm border text-zinc-50 ${chatTheme.userBubbleClass}`
                            : 'rounded-tl-sm border border-zinc-600 bg-zinc-800 font-sans text-zinc-300'
                            }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-4 p-2">
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-600 bg-zinc-800">
                            <Bot className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg rounded-tl-sm border border-zinc-700 bg-zinc-800 px-5 py-3">
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500"></div>
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 delay-100"></div>
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 delay-200"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            )}

            {/* File Context Chips */}
            {activeProject?.files && activeProject.files.length > 0 && (
                <div
                    className={`flex flex-wrap gap-2 border-t px-4 py-2 sm:px-5 ${
                        isBottomDock
                            ? 'border-zinc-800/35 bg-transparent'
                            : 'border-brand-border/60 bg-brand-panel/80 px-6 py-3'
                    }`}
                >
                    {activeProject.files.map(f => (
                        <div key={f.id} className="bg-zinc-900/80 text-zinc-400 text-[9px] px-2.5 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2 uppercase tracking-widest font-bold shadow-sm hover:bg-zinc-800 transition-colors cursor-default">
                            <span className="text-brand-teal">FILE</span>
                            <span className="truncate max-w-[120px] text-zinc-300">{f.name}</span>
                        </div>
                    ))}
                </div>
            )}

            <div
                className={`shrink-0 ${
                    isBottomDock
                        ? 'border-t border-brand-border/50 bg-brand-bg px-4 pb-3 pt-2 sm:px-5 sm:pb-4'
                        : 'border-t border-brand-border bg-brand-panel p-4 sm:p-5'
                }`}
            >
                <div
                    className={`group relative overflow-hidden transition-colors ${
                        isBottomDock
                            ? 'rounded-2xl border border-brand-border bg-brand-panel/70 focus-within:border-brand-teal/35'
                            : 'rounded-xl border border-brand-border bg-brand-bg focus-within:border-brand-teal/40'
                    }`}
                >
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
                        placeholder={chatTheme.placeholder}
                        disabled={isLoading}
                        className={`relative z-10 max-h-40 w-full resize-none border-none bg-transparent pr-12 text-sm leading-relaxed text-brand-text placeholder:text-brand-muted focus:ring-0 sm:pr-14 ${
                            isBottomDock ? 'min-h-[44px] p-3 sm:min-h-[48px] sm:p-3.5' : 'min-h-[52px] p-3 sm:p-4'
                        }`}
                        rows={1}
                    />
                    <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        className={`absolute bottom-2 right-2 z-10 rounded-md p-2 transition-colors active:scale-[0.98] disabled:translate-y-2 disabled:opacity-0 sm:bottom-2.5 sm:right-2.5 sm:p-2 ${
                            isBottomDock
                                ? 'border border-brand-border bg-brand-input text-brand-text hover:bg-brand-card'
                                : 'bg-brand-teal text-[#131314] hover:bg-brand-teal/90'
                        }`}
                    >
                        <ArrowUp className="h-4 w-4" aria-hidden />
                    </button>
                </div>

                <div className={`mt-2 flex items-center justify-between ${isBottomDock ? 'px-0.5' : 'px-1 sm:mt-3 sm:px-2'}`}>
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            id={fileInputId}
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".txt,.md,.csv,.json"
                        />
                        <button
                            type="button"
                            onClick={() => document.getElementById(fileInputId)?.click()}
                            className={`flex items-center gap-1.5 transition-colors hover:text-brand-text ${
                                isBottomDock
                                    ? 'text-[12px] font-medium text-brand-muted'
                                    : 'text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Paperclip className="h-3.5 w-3.5" aria-hidden />
                            <span>Add context</span>
                        </button>
                    </div>
                    {variant !== 'drawer' && !isBottomDock && (
                        <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-800" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-700">v2.1 Secure</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
