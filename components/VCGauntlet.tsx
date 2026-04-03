'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOffice, AgentRole } from '@/lib/OfficeContext';
import { Gavel, Mic, ThumbsDown, ThumbsUp, AlertTriangle, XCircle } from 'lucide-react';
import { ModelAttribution } from '@/components/ModelAttribution';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    rating?: 'pass' | 'fail' | 'neutral';
    model?: string;
}

export function VCGauntlet() {
    const { activeProject } = useOffice();
    const [messages, setMessages] = useState<Message[]>([{
        id: 'start',
        role: 'assistant',
        content: "I've looked at your deck. The numbers look... optimistic. Let's start with your Customer Acquisition Cost. How are you justifying these projections?",
        rating: 'neutral'
    }]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [score, setScore] = useState(50); // Start neutral
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Mocking the "Shark" response logic for this demo
            // In production, this hits the LLM with the 'shark' persona
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system', content: `You are The Shark (VC). AGGRESSIVE, SKEPTICAL, SHORT. 
                        Critique the user's answer. 
                        Output a JSON with: { "response": "string", "rating": "pass" | "fail" | "neutral" }` },
                        { role: 'assistant', content: messages[messages.length - 1].content },
                        { role: 'user', content: userMsg.content }
                    ],
                    model: 'llama3',
                }),
            });

            const data = await response.json();
            let content = data.message?.content || "I'm not convinced.";
            let rating: 'pass' | 'fail' | 'neutral' = 'neutral';

            // Attempt to parse explicit rating from content if model isn't perfect JSON
            if (content.toLowerCase().includes('fail')) rating = 'fail';
            else if (content.toLowerCase().includes('pass')) rating = 'pass';

            // Extract clean text if JSON
            try {
                const json = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
                content = json.response;
                rating = json.rating;
            } catch (e) { /* fallback */ }

            if (rating === 'pass') setScore(s => Math.min(100, s + 10));
            if (rating === 'fail') setScore(s => Math.max(0, s - 10));

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content,
                rating,
                model: typeof data.model === 'string' ? data.model : undefined,
            }]);

        } catch (e) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Impressive... connection lost. Wait.", rating: 'neutral' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1a0505] text-red-50 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-red-900/20 to-transparent pointer-events-none"></div>

            {/* Header */}
            <div className="p-6 flex justify-between items-center z-10 border-b border-red-900/30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-950 rounded-lg border border-red-900">
                        <Gavel className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight text-red-100">THE GAUNTLET</h1>
                        <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold">Investor Interrogation Mode</p>
                    </div>
                </div>

                {/* Score Widget */}
                <div className="flex flex-col items-end">
                    <div className="text-xs uppercase font-bold text-red-500 mb-1">Fundability Score</div>
                    <div className="w-32 h-2 bg-red-950 rounded-full overflow-hidden border border-red-900">
                        <div
                            className={`h-full transition-all duration-500 ${score > 75 ? 'bg-violet-500' : score > 40 ? 'bg-yellow-500' : 'bg-red-600'}`}
                            style={{ width: `${score}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-3xl mx-auto w-full`}>

                        {msg.role === 'assistant' && (
                            <div className="text-[10px] font-bold text-red-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                                <XCircle className="w-3 h-3" /> The Shark
                            </div>
                        )}

                        <div className={`p-6 rounded-2xl w-full text-lg leading-relaxed shadow-2xl relative ${msg.role === 'user'
                                ? 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                                : 'bg-gradient-to-br from-red-950 to-[#2a0a0a] border border-red-900/50 text-red-100 font-serif italic'
                            }`}>
                            {msg.content}
                            {msg.role === 'assistant' ? <ModelAttribution model={msg.model} /> : null}

                            {/* Rating Stamp */}
                            {msg.role === 'assistant' && msg.rating !== 'neutral' && (
                                <div className={`absolute -right-4 -bottom-4 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest rotate-[-5deg] border-2 shadow-xl ${msg.rating === 'pass'
                                        ? 'border-violet-500 bg-violet-950 text-violet-300'
                                        : 'bg-red-900 text-red-400 border-red-500'
                                    }`}>
                                    {msg.rating === 'pass' ? 'VALID POINT' : 'WEAK ANSWER'}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="text-center text-red-500/50 text-sm animate-pulse font-serif italic">
                        The Investor is judging you...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-[#1a0505] border-t border-red-900/30">
                <div className="max-w-3xl mx-auto relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Defend your valuation..."
                        className="w-full bg-red-950/20 border border-red-900/50 rounded-xl p-4 pr-12 text-red-100 placeholder:text-red-900/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    />
                </div>
            </div>
        </div>
    );
}
