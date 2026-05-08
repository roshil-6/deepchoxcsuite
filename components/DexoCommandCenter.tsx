'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOffice, getAgentSystemPrompt } from '@/lib/OfficeContext';
import { Send } from 'lucide-react';
import { ModelAttribution } from '@/components/ModelAttribution';
import { DeskShell } from '@/components/workspaces/DeskShell';
import { deskHeadline, deskHelpText } from '@/lib/researchStaffLabels';
import { useTokens } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { formatProductPlanForContext, formatStrategyForContext } from '@/lib/ventureReadableContext';
import { submitDexoVenturePatch } from '@/lib/dexoProposalClient';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    model?: string;
}

export function DexoCommandCenter() {
    const { activeProject, updateProjectField } = useOffice();
    const tokens = useTokens();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'assistant',
            content:
                'I’m Deepchox — I can read across your venture and help you act. Ask in plain language, or tell me what to update (strategy, product, budget, market).',
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

    const handleCommandExecution = async (content: string) => {
        try {
            if (!activeProject?.id) return;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const commandData = JSON.parse(jsonMatch[0]);
                if (commandData.command && commandData.payload) {
                    const patch: Record<string, unknown> = {};
                    switch (commandData.command) {
                        case 'updateStrategy':
                            patch.strategy = String(commandData.payload);
                            break;
                        case 'updateProduct':
                            patch.productPlan = String(commandData.payload);
                            break;
                        case 'updateBudget':
                            patch.budget = String(commandData.payload);
                            break;
                        case 'updateMarket':
                            patch.marketInsights = String(commandData.payload);
                            break;
                    }
                    if (Object.keys(patch).length > 0) {
                        await submitDexoVenturePatch({
                            ventureId: activeProject.id,
                            source: 'legacy_dexo_command_center',
                            model: 'Deepchox',
                            summary: 'Legacy command center suggested an update',
                            patch,
                            updateProjectField,
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Command parsing failed', e);
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const paid = tokens.spend(TOKEN_COSTS.CHAT_MESSAGE, 'Deepchox command center');
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
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const context = activeProject
                ? `
                PROJECT: ${activeProject.name}
                Strategy (plain language, not raw JSON):
                ${formatStrategyForContext(activeProject.strategy)}
                Product plan (plain language, not raw JSON):
                ${formatProductPlanForContext(activeProject.productPlan)}
                Budget: ${activeProject.budget || '—'}
                Market: ${activeProject.marketInsights || '—'}
                Notes: ${activeProject.userNotes || '—'}
                If you update data, end with a JSON block:
                {"command":"updateStrategy"|"updateProduct"|"updateBudget"|"updateMarket","payload":"..."}
            `
                : 'No venture selected — answer generally.';

            const response = await fetch('/api/dexo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    payload: {
                        messages: [
                            { role: 'system', content: getAgentSystemPrompt('dexo', activeProject) + '\n\n' + context },
                            ...messages.map((m) => ({ role: m.role, content: m.content })),
                            { role: 'user', content: userMessage.content },
                        ],
                        model: 'llama3',
                    },
                }),
            });

            if (!response.ok) throw new Error('Failed');
            const data = await response.json();
            const raw = data.message?.content || 'Done.';
            await handleCommandExecution(raw);
            const content = raw.replace(/```json[\s\S]*```/, '').trim();

            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content,
                    timestamp: Date.now(),
                    model: typeof data.model === 'string' ? data.model : undefined,
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
        <DeskShell
            className="min-h-0 flex-1"
            eyebrow="Deepchox"
            title={deskHeadline(activeProject?.name, 'dexo')}
            description={deskHelpText('dexo')}
            bodyFlush
            bodyClassName="flex min-h-0 min-w-0 flex-1 flex-col"
        >
            <div className="flex min-h-[min(28rem,70vh)] min-w-0 flex-1 flex-col lg:min-h-[min(36rem,72vh)]">
                <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6 sm:py-5">
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
                                {msg.role === 'assistant' ? <ModelAttribution model={msg.model} /> : null}
                            </div>
                        </div>
                    ))}
                    {isLoading && <p className="pl-10 text-sm text-brand-muted sm:pl-12">Thinking…</p>}
                    <div ref={messagesEndRef} />
                </div>

                <div className="shrink-0 border-t border-brand-border/60 bg-brand-panel/15 px-5 py-4 sm:px-6">
                    <div className="mx-auto flex max-w-3xl gap-2">
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
                            placeholder="Message Deepchox…"
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
        </DeskShell>
    );
}
