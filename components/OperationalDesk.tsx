'use client';

import React, { useState } from 'react';
import { MiniChat } from './MiniChat';
import { GripVertical, MessageSquare, Bell } from 'lucide-react';
import { useOffice, type AgentRole } from '@/lib/OfficeContext';

export function OperationalDesk({
    children,
    /** When true, desk AI is provided by the app-level bottom dock (e.g. Executive overview / CFO) — no right MiniChat rail */
    hideSideChat = false,
}: {
    children: React.ReactNode;
    hideSideChat?: boolean;
}) {
    const [isChatOpen, setIsChatOpen] = useState(true);
    const { activeRoom, staffAttentionPending, dismissStaffAttention } = useOffice();

    const deskRole = activeRoom as AgentRole;
    const waiting = staffAttentionPending.filter((i) => i.role === deskRole);

    if (hideSideChat) {
        return (
            <div className="relative flex h-full w-full flex-col overflow-hidden bg-brand-bg">
                {waiting.length > 0 && (
                    <div className="shrink-0 border-b border-amber-500/25 bg-amber-950/40 px-4 py-2.5">
                        <div className="flex items-start gap-2">
                            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                            <div className="min-w-0 flex-1 space-y-2">
                                {waiting.map((w) => (
                                    <div key={w.id} className="text-[12px] leading-snug text-zinc-200">
                                        <span className="font-medium text-amber-200/95">{w.title}</span>
                                        <span className="text-zinc-400"> — {w.message}</span>
                                        <button
                                            type="button"
                                            onClick={() => dismissStaffAttention(w.id)}
                                            className="ml-2 text-[10px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
            </div>
        );
    }

    return (
        <div className="group/desk relative flex h-full w-full overflow-hidden bg-brand-bg">
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-brand-bg">
                {waiting.length > 0 && (
                    <div className="shrink-0 border-b border-amber-500/25 bg-amber-950/40 px-4 py-2.5">
                        <div className="flex items-start gap-2">
                            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                            <div className="min-w-0 flex-1 space-y-2">
                                {waiting.map((w) => (
                                    <div key={w.id} className="text-[12px] leading-snug text-zinc-200">
                                        <span className="font-medium text-amber-200/95">{w.title}</span>
                                        <span className="text-zinc-400"> — {w.message}</span>
                                        <button
                                            type="button"
                                            onClick={() => dismissStaffAttention(w.id)}
                                            className="ml-2 text-[10px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {children}
            </div>

            <div
                className={`relative z-20 flex h-full shrink-0 flex-col border-l border-brand-border bg-brand-bg transition-all duration-300 ease-out ${
                    isChatOpen ? 'w-[min(100%,400px)]' : 'w-[52px]'
                }`}
            >
                <div className="relative min-h-0 flex-1 overflow-hidden">
                    <div
                        className={`absolute inset-0 transition-opacity duration-200 ${
                            isChatOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                        }`}
                    >
                        <MiniChat />
                    </div>
                    <div
                        className={`absolute inset-0 flex flex-col items-center gap-6 pt-8 transition-opacity duration-200 ${
                            isChatOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => setIsChatOpen(true)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-100"
                            title="Open desk chat"
                        >
                            <MessageSquare className="h-5 w-5" aria-hidden />
                        </button>
                        <span className="max-h-[140px] text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 [writing-mode:vertical-rl] rotate-180">
                            Desk channel
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="absolute left-0 top-1/2 z-30 flex h-11 w-5 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-zinc-600 bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
                    title={isChatOpen ? 'Collapse desk chat' : 'Expand desk chat'}
                >
                    <GripVertical className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </button>
            </div>
        </div>
    );
}
