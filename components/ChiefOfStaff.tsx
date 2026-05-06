'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOffice, AgentRole } from '@/lib/OfficeContext';
import { safeJsonParse } from '@/lib/utils';
import { Send, LayoutDashboard, ArrowUp, Loader2, CheckCircle2, Bot, Command } from 'lucide-react';
import { ModelAttribution } from '@/components/ModelAttribution';
import { useTokens } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    model?: string;
    delegation?: {
        targetAgent: AgentRole;
        task: string;
    };
}

export function ChiefOfStaff() {
    const {
        activeProject,
        broadcastDirective,
        prepopulateChat,
        agents
    } = useOffice();

    const tokens = useTokens();

    const [messages, setMessages] = useState<Message[]>([{
        id: 'welcome',
        role: 'assistant',
        content: "I am ready to coordinate your AI team. What is your high-level objective?",
        timestamp: Date.now()
    }]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading || !activeProject) return;

        const paid = tokens.spend(TOKEN_COSTS.CHAT_MESSAGE, 'Chief of Staff');
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

        try {
            const response = await fetch('/api/dexo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    payload: {
                        messages: [
                            {
                                role: 'system',
                                content: `You are the Chief of Staff.
                            CORE RULE: You are the ORCHESTRATOR. You do NOT do the deep work yourself.
                            
                            TASK: analyze the user's request and delegate it to the right department (CEO, PM, Accountant, Scout).
                            - If the user asks for "strategy", "pivot", "business model" -> Delegation: CEO
                            - If the user asks for "features", "specs", "roadmap" -> Delegation: PM
                            - If the user asks for "costs", "budget", "finance" -> Delegation: Accountant
                            - If the user asks for "competitors", "market", "trends" -> Delegation: Scout
                            - If duplicate or unclear, defaults to CEO.
                            
                            OUTPUT FORMAT:
                            Returns a JSON object ONLY (no markdown):
                            {
                                "response": "Your natural language response to the user acknowledging the request.",
                                "delegation": {
                                    "targetAgent": "ceo" | "pm" | "accountant" | "scout",
                                    "task": "The specific instruction for that agent"
                                }
                            }
                            `
                            },
                            ...messages.map(m => ({ role: m.role, content: m.content })),
                            { role: 'user', content: userMessage.content }
                        ],
                        model: 'llama3', // Fast model for orchestration
                    },
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            const data = await response.json();
            const content = data.message?.content || "";

            // Parse JSON response
            let parsedData: { response: string, delegation?: { targetAgent: AgentRole, task: string } } = { response: content };

            try {
                // Try to clean markdown if present (e.g. ```json ... ```)
                const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
                const json = JSON.parse(cleanContent);
                if (json.response) parsedData = json;
            } catch (e) {
                // Fallback if model fails to output JSON
                parsedData = {
                    response: content,
                    delegation: undefined
                };
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: parsedData.response || "I've processed that.",
                timestamp: Date.now(),
                delegation: parsedData.delegation,
                model: typeof data.model === 'string' ? data.model : undefined,
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Auto-broadcast if delegation exists
            if (parsedData.delegation) {
                broadcastDirective(`[Chief of Staff] Delegated to ${agents[parsedData.delegation.targetAgent].title}: ${parsedData.delegation.task}`);
            }

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'I encountered an issue coordinating that request.',
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#111113] border-r border-zinc-800/50 z-20 relative font-sans shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800/50 flex items-center gap-4 bg-[#111113] sticky top-0 z-10">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-xs font-semibold text-zinc-100 tracking-tight leading-none">Research coordination</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5 opacity-60">Global Orchestrator</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 sm:p-5">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                        <div className={`max-w-[90%] text-sm leading-relaxed p-3.5 rounded-2xl shadow-lg border sm:p-4 ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-tr-sm border-indigo-500/30'
                            : 'bg-zinc-900/60 text-zinc-200 border-zinc-800/50 rounded-tl-sm'
                            }`}>
                            {msg.content}
                            {msg.role === 'assistant' ? <ModelAttribution model={msg.model} /> : null}
                        </div>

                        {/* Delegation Card */}
                        {msg.delegation && (
                            <div className="ml-2 mt-2 p-4 bg-[#111113] rounded-2xl border border-zinc-700/50 w-[300px] animate-in zoom-in-95 duration-500 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/[0.05] -mr-10 -mt-10 pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Task Distributed
                                    </div>
                                    <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                        <div className="p-2 bg-black rounded-lg text-zinc-400 border border-zinc-800 shadow-sm">
                                            {agents[msg.delegation.targetAgent].icon}
                                        </div>
                                        <div className="text-sm font-bold text-zinc-200 leading-tight">
                                            {agents[msg.delegation.targetAgent].title}
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-zinc-400 italic mb-4 px-2 border-l-2 border-zinc-700 pl-3 leading-relaxed">
                                        "{msg.delegation.task}"
                                    </div>
                                    <button
                                        onClick={() => prepopulateChat(msg.delegation!.targetAgent, msg.delegation!.task)}
                                        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2 group border border-zinc-700 hover:border-zinc-500 shadow-lg"
                                    >
                                        Open Terminal <ArrowUp className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform duration-300" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400/70">Coordinating...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 border-t border-zinc-900/50 bg-[#111113]">
                <div className="relative bg-[#111113] border border-zinc-800 rounded-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all overflow-hidden shadow-inner group">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendMessage();
                        }}
                        placeholder="State executive directive..."
                        disabled={isLoading}
                        className="w-full bg-transparent border-none focus:ring-0 p-4 pr-14 text-sm text-zinc-100 placeholder:text-zinc-600 font-medium"
                        autoFocus
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        className="absolute right-2.5 top-2.5 rounded-xl bg-indigo-600 p-2 text-white shadow-lg transition-all hover:bg-indigo-500 group-focus-within:scale-105 disabled:opacity-0"
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}



