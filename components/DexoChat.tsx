'use client';

import React, { useState, useRef, useEffect } from 'react';
import { formatStrategyForContext } from '@/lib/ventureReadableContext';
import { useOffice } from '@/lib/OfficeContext';
import { Bot, Sparkles, Send } from 'lucide-react';
import { safeJsonParse } from '@/lib/utils';
import { ModelAttribution } from '@/components/ModelAttribution';
import { useTokens } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';

const THINKING_STEPS = [
  'Analysing your venture context…',
  'Checking market signals…',
  'Cross-referencing strategy…',
  'Synthesising insights…',
  'Drafting response…',
];

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    model?: string;
}

export function DexoChat() {
    const { activeProject } = useOffice();
    const tokens = useTokens();
    const [messages, setMessages] = useState<Message[]>([{
        id: 'welcome',
        role: 'assistant',
        content: "I am Dexo, your General Intelligence Core. How can I assist you today?",
        timestamp: Date.now()
    }]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [thinkingStep, setThinkingStep] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const thinkingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const paid = tokens.spend(TOKEN_COSTS.CHAT_MESSAGE, 'Dexo chat');
        if (!paid.success) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content:
                        paid.message ??
                        'Daily AI credits are used up. Upgrade to Pro for unlimited usage, or try again after the daily reset.',
                    timestamp: Date.now(),
                },
            ]);
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setThinkingStep(0);
        thinkingTimer.current = setInterval(() => {
          setThinkingStep(s => (s + 1) % THINKING_STEPS.length);
        }, 1800);

        try {
            // Simplified Project Context for Dexo
            const context = activeProject
                ? `
                Current Context:
                Project: ${activeProject.name}
                Strategy (plain language, not raw JSON):
                ${formatStrategyForContext(activeProject.strategy)}
            `
                : 'No active project context.';

            const response = await fetch('/api/dexo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    payload: {
                        messages: [
                            { role: 'system', content: `You are Dexo. A high-intelligence general assistant.` + context },
                            ...messages.map(m => ({ role: m.role, content: m.content })),
                            { role: 'user', content: userMessage.content }
                        ],
                        model: 'llama3',
                    },
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch response');
            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message?.content || "Processing complete.",
                timestamp: Date.now(),
                model: typeof data.model === 'string' ? data.model : undefined,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Dexo Core erratic. Server connection failed.',
                timestamp: Date.now()
            }]);
        } finally {
            if (thinkingTimer.current) {
                clearInterval(thinkingTimer.current);
                thinkingTimer.current = null;
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-brand-bg text-brand-text">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 bg-[#09090b]/40 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Dexo Core</h2>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">General Intelligence Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 mt-1">
                                <Bot className="w-4 h-4 text-indigo-500" />
                            </div>
                        )}

                        <div className={`max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed shadow-xl ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-sm'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm'
                            }`}>
                            <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                            {msg.role === 'assistant' ? <ModelAttribution model={msg.model} /> : null}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-1">
                                <div className="w-4 h-4 rounded-full bg-zinc-500" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4 justify-start">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="max-w-[75%] p-4 rounded-2xl rounded-tl-sm bg-zinc-900 border border-zinc-800 shadow-xl flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                                <span className="text-xs text-zinc-400 transition-all duration-500">{THINKING_STEPS[thinkingStep]}</span>
                            </div>
                            <div className="flex gap-1 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 border-t border-brand-border bg-brand-bg">
                <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all overflow-hidden shadow-2xl">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask Dexo anything..."
                        className="w-full bg-transparent border-none focus:ring-0 p-4 pr-14 text-sm text-zinc-100 placeholder:text-zinc-600 font-medium"
                        autoFocus
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-20 flex items-center justify-center shadow-lg shadow-indigo-500/20"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-center text-[10px] text-zinc-600 mt-3 font-medium">
                    Dexo can make mistakes. Consider checking important information.
                </p>
            </div>
        </div>
    );
}
