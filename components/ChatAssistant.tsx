'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOffice, getAgentSystemPrompt, AgentRole } from '@/lib/OfficeContext';
import { getChatRailTheme, getChatAgentRoleForRoom } from '@/lib/roomThemes';
import { Paperclip, ArrowUp, Bot, X, Eraser, Mic } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export type ChatAssistantVariant = 'default' | 'drawer' | 'bottomDock' | 'aiOs';

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
        variant === 'drawer'
            ? 'chat-file-upload-drawer'
            : variant === 'bottomDock' || variant === 'aiOs'
              ? 'chat-file-upload-dock'
              : 'file-upload';

    const isBottomDock = variant === 'bottomDock' || variant === 'aiOs';
    const isAiOs = variant === 'aiOs';
    const dockThreadEmpty = isBottomDock && messages.length === 0 && !isLoading;

    return (
        <div
            className={`flex min-h-0 flex-col overflow-hidden shadow-none transition-all duration-300 ${
                isBottomDock && dockThreadEmpty
                    ? 'h-auto w-full rounded-none border-0 bg-transparent'
                    : isBottomDock
                      ? 'h-full min-h-0 max-h-full rounded-none border-0 bg-transparent'
                      : chatTheme.railClass
            }`}
        >
            {isBottomDock && !dockThreadEmpty ? (
                <div className="flex shrink-0 items-baseline justify-between gap-2 pb-2 pt-0.5">
                    <p className="min-w-0 text-[11px] leading-snug text-brand-muted/90">
                        <span className="text-brand-text/90">{currentAgent.name}</span>
                        <span className="text-brand-muted"> · {currentAgent.title}</span>
                    </p>
                    <button
                        type="button"
                        onClick={() => setMessages([])}
                        className="shrink-0 text-[11px] text-brand-muted/80 transition-colors hover:text-brand-text"
                        title="Clear thread"
                    >
                        Clear
                    </button>
                </div>
            ) : variant === 'drawer' ? (
                <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-brand-border bg-brand-panel/95 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-600 bg-zinc-800 text-zinc-300">
                            <Bot className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-100">Chat</p>
                            <p className="truncate text-[10px] text-zinc-500">Same model as elsewhere</p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setMessages([])}
                            className="rounded-lg border border-zinc-700/60 bg-zinc-900/50 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                            title="Clear thread"
                        >
                            <Eraser className="h-3.5 w-3.5" aria-hidden />
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
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-brand-text shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                            {currentAgent.icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] leading-snug text-brand-text/90">
                                <span className="font-medium text-white">{chatTheme.roleLabel}</span>
                                <span className="text-brand-muted"> · </span>
                                <span className="text-[12px] text-brand-muted">{currentAgent.title}</span>
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">{chatTheme.subtitle}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMessages([])}
                        className="shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.04] p-2 text-brand-muted transition-colors hover:bg-brand-input hover:text-white"
                        title="Clear thread"
                    >
                        <Eraser className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            )}

            {!dockThreadEmpty && (
            <div
                className={`custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto ${
                    isBottomDock ? 'bg-transparent px-0 pb-2 pt-0' : 'bg-brand-bg p-4 sm:p-5'
                }`}
            >
                {messages.length === 0 && (
                    <div
                        className={`flex select-none flex-col items-start text-left ${
                            isBottomDock
                                ? 'py-1'
                                : `rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6 ${variant === 'drawer' ? 'min-h-[120px]' : 'min-h-[160px]'}`
                        }`}
                    >
                        <p className="max-w-[280px] text-sm leading-relaxed text-zinc-300">{chatTheme.emptyPrompt}</p>
                        {variant !== 'drawer' && (
                            <p className="mt-3 text-xs text-zinc-600">Use the box below.</p>
                        )}
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2.5 sm:gap-3 ${isBottomDock ? '' : 'animate-in fade-in slide-in-from-bottom-4 duration-500'} ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {msg.role === 'assistant' && (
                            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isBottomDock ? 'bg-white/[0.04] text-brand-muted' : 'border border-zinc-600 bg-zinc-800'}`}>
                                <Bot className={`h-3.5 w-3.5 ${isBottomDock ? 'text-brand-muted' : 'text-zinc-400'}`} />
                            </div>
                        )}

                        <div className={`max-w-[88%] text-sm leading-relaxed ${msg.role === 'user'
                            ? isBottomDock
                                ? `rounded-2xl rounded-br-md bg-white/[0.06] px-3 py-2.5 text-brand-text ring-1 ring-white/[0.06]`
                                : `rounded-lg rounded-tr-sm border p-4 text-zinc-50 ${chatTheme.userBubbleClass}`
                            : isBottomDock
                              ? 'rounded-2xl rounded-bl-md bg-white/[0.04] px-3 py-2.5 text-brand-text/95'
                              : 'rounded-lg rounded-tl-sm border border-zinc-600 bg-zinc-800 p-4 font-sans text-zinc-300'
                            }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className={isBottomDock ? 'flex gap-2.5' : 'flex gap-4 p-2'}>
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isBottomDock ? 'bg-white/[0.04]' : 'border border-zinc-600 bg-zinc-800'}`}>
                            <Bot className={`h-3.5 w-3.5 ${isBottomDock ? 'text-brand-muted' : 'text-zinc-400'}`} />
                        </div>
                        <div className={`flex items-center ${isBottomDock ? 'rounded-2xl rounded-bl-md bg-white/[0.04] px-3 py-2.5' : 'rounded-lg rounded-tl-sm border border-zinc-700 bg-zinc-800 px-5 py-3'}`}>
                            <span className={`text-sm ${isBottomDock ? 'text-brand-muted' : 'text-zinc-500'}`}>…</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            )}

            {/* File Context Chips */}
            {activeProject?.files && activeProject.files.length > 0 && (
                <div
                    className={`flex flex-wrap gap-2 px-1 py-1.5 sm:px-2 ${
                        isBottomDock
                            ? 'border-0 bg-transparent'
                            : 'border-t border-brand-border bg-brand-panel/80 px-6 py-3'
                    }`}
                >
                    {activeProject.files.map(f => (
                        <div key={f.id} className="flex cursor-default items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] text-zinc-300 shadow-sm transition-colors hover:bg-zinc-800">
                            <span className="text-zinc-500">File</span>
                            <span className="max-w-[120px] truncate">{f.name}</span>
                        </div>
                    ))}
                </div>
            )}

            <div
                className={`shrink-0 ${
                    isBottomDock
                        ? 'border-0 bg-transparent pb-0 pt-1'
                        : 'border-t border-brand-border bg-brand-panel/90 p-4 sm:p-5'
                }`}
            >
                <div
                    className={`group relative overflow-hidden transition-all duration-300 ${
                        isAiOs
                            ? 'rounded-full border border-white/[0.06] bg-white/[0.04] backdrop-blur-md focus-within:border-white/[0.1] focus-within:bg-white/[0.06]'
                            : isBottomDock
                              ? 'rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] focus-within:bg-white/[0.06] focus-within:ring-white/[0.1]'
                              : 'rounded-xl border border-brand-border bg-brand-bg/90 focus-within:ring-1 focus-within:ring-white/[0.1]'
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
                        placeholder={isAiOs ? 'Ask your executive team anything…' : chatTheme.placeholder}
                        disabled={isLoading}
                        className={`relative z-10 max-h-40 w-full resize-none border-none bg-transparent text-sm leading-relaxed text-brand-text placeholder:text-brand-muted focus:ring-0 ${
                            isAiOs
                                ? 'min-h-[52px] py-4 pl-5 pr-[7.5rem] sm:min-h-[56px] sm:pl-6 sm:pr-28'
                                : isBottomDock
                                  ? 'min-h-[44px] p-3 pr-12 sm:min-h-[48px] sm:p-3.5 sm:pr-14'
                                  : 'min-h-[52px] p-3 pr-12 sm:p-4 sm:pr-14'
                        }`}
                        rows={1}
                    />
                    <div
                        className={`absolute bottom-2 right-2 z-10 flex items-center gap-1 sm:bottom-2.5 sm:right-3 ${isAiOs ? 'sm:gap-2' : ''}`}
                    >
                        {isAiOs && (
                            <button
                                type="button"
                                className="rounded-full p-2 text-[var(--muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text)]"
                                title="Voice (browser)"
                                aria-label="Voice input"
                            >
                                <Mic className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            className={`rounded-full p-2 transition-colors active:scale-[0.98] disabled:opacity-40 ${
                                isAiOs
                                    ? 'bg-[var(--text)] text-[#0f1115] hover:bg-white/90'
                                    : isBottomDock
                                      ? 'bg-zinc-300/90 text-[#131314] hover:bg-zinc-200'
                                      : 'bg-zinc-300 text-[#131314] hover:bg-zinc-200'
                            }`}
                        >
                            <ArrowUp className="h-4 w-4" aria-hidden />
                        </button>
                    </div>
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
                                    : 'text-[12px] font-medium text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Paperclip className="h-3.5 w-3.5" aria-hidden />
                            <span>{isAiOs ? 'Attach' : 'Add context'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
