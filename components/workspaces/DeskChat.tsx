'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, RotateCcw, Target, ClipboardList, Calculator, ScanSearch, Megaphone, LucideIcon } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { RESEARCH_STAFF } from '@/lib/researchStaffLabels';
import type { DeskId } from '@/lib/deskChatTypes';
import { DESK_QUICK_STARTS } from '@/lib/deskChatTypes';
import type { PersonalAssistantUpdates } from '@/lib/paApplyUpdates';
import { mergeProjectWithPAUpdates } from '@/lib/paApplyUpdates';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string; ts: number };

// â”€â”€â”€ Storage helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STORAGE_PREFIX = 'deepchox-desk-chat-v1:';

function storageKey(projectId: number | undefined, deskId: DeskId): string {
    return `${STORAGE_PREFIX}${projectId ?? 0}:${deskId}`;
}

function loadHistory(projectId: number | undefined, deskId: DeskId): ChatMsg[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(storageKey(projectId, deskId));
        return raw ? (JSON.parse(raw) as ChatMsg[]) : [];
    } catch {
        return [];
    }
}

function saveHistory(projectId: number | undefined, deskId: DeskId, msgs: ChatMsg[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(storageKey(projectId, deskId), JSON.stringify(msgs.slice(-80)));
    } catch { /* quota */ }
}

// â”€â”€â”€ Desk config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type DeskConfig = {
    Icon: LucideIcon;
    accentRgb: string;
    accentClass: string;
    label: string;
    domain: string;
};

const DESK_CONFIG: Record<DeskId, DeskConfig> = {
    ceo: {
        Icon: Target,
        accentRgb: '148,163,184',
        accentClass: 'text-slate-400',
        label: 'Strategy & direction',
        domain: 'Narrative Â· Phases Â· Priorities',
    },
    pm: {
        Icon: ClipboardList,
        accentRgb: '56,189,248',
        accentClass: 'text-sky-400',
        label: 'Product & delivery',
        domain: 'Roadmap Â· Execution board Â· Shipping',
    },
    accountant: {
        Icon: Calculator,
        accentRgb: '52,211,153',
        accentClass: 'text-emerald-400',
        label: 'Finance & runway',
        domain: 'Burn Â· Capital Â· Funding readiness',
    },
    scout: {
        Icon: ScanSearch,
        accentRgb: '251,191,36',
        accentClass: 'text-amber-400',
        label: 'Market & landscape',
        domain: 'Competitors Â· Trends Â· Signals',
    },
    cmo: {
        Icon: Megaphone,
        accentRgb: '251,113,133',
        accentClass: 'text-rose-400',
        label: 'Growth & narrative',
        domain: 'GTM Â· Messaging Â· Positioning',
    },
};

// â”€â”€â”€ Typing animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TypingDots({ accentRgb }: { accentRgb: string }) {
    return (
        <div className="flex items-center gap-1.5 py-1">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="h-[5px] w-[5px] rounded-full"
                    style={{
                        background: `rgba(${accentRgb}, 0.6)`,
                        animation: `dc-bounce 1.3s ${i * 0.2}s ease-in-out infinite`,
                    }}
                />
            ))}
            <style>{`@keyframes dc-bounce { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)} }`}</style>
        </div>
    );
}

// â”€â”€â”€ Message bubbles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function UserMsg({ content }: { content: string }) {
    return (
        <div className="flex justify-end">
            <p
                className="max-w-[78%] rounded-2xl rounded-br-sm px-4 py-2.5 text-[13.5px] leading-[1.65] text-white/90"
                style={{ background: 'rgba(255,255,255,0.07)' }}
            >
                {content}
            </p>
        </div>
    );
}

function AssistantMsg({ content, accentRgb }: { content: string; accentRgb: string }) {
    // Split paragraphs for clean rendering
    const paras = content.split(/\n\n+/).filter(Boolean);
    return (
        <div className="space-y-3 pr-8 sm:pr-16">
            {paras.map((para, i) => {
                const lines = para.split('\n');
                const isList = lines.some((l) => l.startsWith('- ') || l.startsWith('â€¢ ') || /^\d+\.\s/.test(l));
                if (isList) {
                    return (
                        <ul key={i} className="space-y-1.5 pl-0">
                            {lines.map((line, j) => {
                                const isItem = line.startsWith('- ') || line.startsWith('â€¢ ');
                                const isNum = /^\d+\.\s/.test(line);
                                if (isItem || isNum) {
                                    return (
                                        <li key={j} className="flex items-start gap-2.5 text-[13.5px] leading-[1.65] text-white/80">
                                            <span
                                                className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full"
                                                style={{ background: `rgba(${accentRgb},0.7)` }}
                                            />
                                            <span>{line.replace(/^[-â€¢]\s|^\d+\.\s/, '')}</span>
                                        </li>
                                    );
                                }
                                return (
                                    <li key={j} className="text-[13.5px] leading-[1.65] text-white/80 list-none">{line}</li>
                                );
                            })}
                        </ul>
                    );
                }
                return (
                    <p key={i} className="text-[13.5px] leading-[1.75] text-white/80">
                        {para}
                    </p>
                );
            })}
        </div>
    );
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function DeskChat({ deskId }: { deskId: DeskId }) {
    const { activeProject, patchActiveProject, persistActiveProject } = useOffice();
    const cfg = DESK_CONFIG[deskId];
    const staff = RESEARCH_STAFF[deskId];
    const quickStarts = DESK_QUICK_STARTS[deskId];
    const projectId = activeProject?.id;

    const [messages, setMessages] = useState<ChatMsg[]>(() => loadHistory(projectId, deskId));
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [followUps, setFollowUps] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setMessages(loadHistory(projectId, deskId));
        setFollowUps([]);
        setError(null);
    }, [projectId, deskId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const resizeTextarea = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || loading || !activeProject) return;

        setError(null);
        setFollowUps([]);

        const userMsg: ChatMsg = { id: crypto.randomUUID(), role: 'user', content: trimmed, ts: Date.now() };
        const nextMsgs = [...messages, userMsg];
        setMessages(nextMsgs);
        saveHistory(projectId, deskId, nextMsgs);
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setLoading(true);

        try {
            const convo = nextMsgs.map((m) => ({ role: m.role, content: m.content }));
            const res = await fetch('/api/desk-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deskId, project: activeProject, conversation: convo }),
            });

            const data = (await res.json()) as {
                ok: boolean;
                reply?: string;
                followUpOptions?: string[];
                deskSummary?: string;
                updates?: PersonalAssistantUpdates;
                error?: string;
            };

            if (!data.ok) throw new Error(data.error ?? 'Desk AI error');

            const reply = data.reply ?? 'Got it.';
            const aiMsg: ChatMsg = { id: crypto.randomUUID(), role: 'assistant', content: reply, ts: Date.now() };
            const finalMsgs = [...nextMsgs, aiMsg];
            setMessages(finalMsgs);
            saveHistory(projectId, deskId, finalMsgs);

            if (data.followUpOptions?.length) setFollowUps(data.followUpOptions);

            if (activeProject) {
                let updated = { ...activeProject };
                if (data.updates && Object.keys(data.updates).length > 0) {
                    updated = mergeProjectWithPAUpdates(updated, data.updates);
                }
                if (data.deskSummary) {
                    const prev = updated.agentStaffSnapshot;
                    updated = {
                        ...updated,
                        agentStaffSnapshot: {
                            at: Date.now(),
                            summary: prev?.summary ?? '',
                            desks: {
                                ceo: prev?.desks?.ceo ?? '',
                                pm: prev?.desks?.pm ?? '',
                                accountant: prev?.desks?.accountant ?? '',
                                scout: prev?.desks?.scout ?? '',
                                cmo: prev?.desks?.cmo ?? '',
                                [deskId]: data.deskSummary,
                            },
                        },
                    };
                }
                const changed = (data.updates && Object.keys(data.updates).length > 0) || Boolean(data.deskSummary);
                if (changed) {
                    patchActiveProject(updated);
                    await persistActiveProject(updated);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, [loading, messages, activeProject, deskId, projectId, patchActiveProject, persistActiveProject]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const clearHistory = useCallback(() => {
        setMessages([]);
        setFollowUps([]);
        saveHistory(projectId, deskId, []);
    }, [projectId, deskId]);

    const isEmpty = messages.length === 0 && !loading;

    return (
        <div className="flex min-h-0 w-full flex-1 flex-col" style={{ background: '#111113' }}>

            {/* â”€â”€ Minimal header â”€â”€ */}
            <div
                className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.accentClass}`}
                        style={{ background: `rgba(${cfg.accentRgb},0.1)` }}
                    >
                        <cfg.Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[13px] font-semibold text-white/85 leading-none">{cfg.label}</span>
                        {activeProject?.name && (
                            <span className="ml-2 text-[11px] text-white/25">Â· {activeProject.name}</span>
                        )}
                        <p className="mt-0.5 text-[10px] tracking-wide" style={{ color: `rgba(${cfg.accentRgb},0.5)` }}>
                            {cfg.domain}
                        </p>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button
                        type="button"
                        onClick={clearHistory}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/20 transition-colors hover:bg-white/[0.05] hover:text-white/50"
                        title="Clear conversation"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* â”€â”€ Messages â”€â”€ */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
                {isEmpty ? (
                    // â”€â”€ Empty state â”€â”€
                    <div className="flex h-full flex-col items-center justify-center gap-8 pb-8">
                        <div className="text-center">
                            <div
                                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${cfg.accentClass}`}
                                style={{
                                    background: `radial-gradient(circle at 40% 40%, rgba(${cfg.accentRgb},0.15), rgba(${cfg.accentRgb},0.04))`,
                                    boxShadow: `0 0 40px rgba(${cfg.accentRgb},0.12)`,
                                }}
                            >
                                <cfg.Icon className="h-7 w-7" strokeWidth={1.5} />
                            </div>
                            <p className="text-[13px] leading-relaxed text-white/50 max-w-xs mx-auto">
                                {staff.deskHelp}
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 max-w-md">
                            {quickStarts.map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => sendMessage(q)}
                                    className="rounded-full px-3.5 py-1.5 text-[12px] text-white/50 transition-colors hover:text-white/80"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = `rgba(${cfg.accentRgb},0.08)`;
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${cfg.accentRgb},0.2)`;
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                                    }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                        {!activeProject && (
                            <p className="text-[11px] text-white/20">Select a venture to begin</p>
                        )}
                    </div>
                ) : (
                    <div className="mx-auto max-w-2xl flex flex-col gap-6">
                        {messages.map((msg, idx) => {
                            const isUser = msg.role === 'user';
                            const prevRole = idx > 0 ? messages[idx - 1].role : null;
                            const isGrouped = prevRole === msg.role;
                            return (
                                <div key={msg.id} className={isGrouped ? '-mt-2' : ''}>
                                    {isUser ? (
                                        <UserMsg content={msg.content} />
                                    ) : (
                                        <AssistantMsg content={msg.content} accentRgb={cfg.accentRgb} />
                                    )}
                                </div>
                            );
                        })}

                        {/* Typing indicator */}
                        {loading && (
                            <TypingDots accentRgb={cfg.accentRgb} />
                        )}

                        {/* Error */}
                        {error && (
                            <p className="text-[12px] text-red-400/70">{error}</p>
                        )}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>

            {/* â”€â”€ Follow-up pills â”€â”€ */}
            {followUps.length > 0 && !loading && (
                <div className="shrink-0 flex flex-wrap gap-2 px-5 pb-2 sm:px-8">
                    {followUps.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => { setFollowUps([]); sendMessage(opt); }}
                            className="rounded-full px-3.5 py-1.5 text-[11px] text-white/50 transition-colors hover:text-white/75"
                            style={{
                                background: `rgba(${cfg.accentRgb},0.06)`,
                                border: `1px solid rgba(${cfg.accentRgb},0.18)`,
                            }}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}

            {/* â”€â”€ Input â”€â”€ */}
            <div
                className="shrink-0 px-4 pb-4 pt-2 sm:px-6"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
                <div
                    className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl px-4 py-3 transition-colors"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
                        onKeyDown={handleKeyDown}
                        placeholder={activeProject ? `Message ${cfg.label.toLowerCase()}â€¦` : 'Select a venture first'}
                        disabled={!activeProject || loading}
                        className="min-h-0 flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed text-white/85 placeholder:text-white/20 outline-none disabled:opacity-40"
                        style={{ maxHeight: '120px' }}
                    />
                    <button
                        type="button"
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || loading || !activeProject}
                        className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-25"
                        style={{
                            background: `rgba(${cfg.accentRgb},0.9)`,
                        }}
                    >
                        {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-black/80" />
                        ) : (
                            <ArrowUp className="h-3.5 w-3.5 text-black/80" />
                        )}
                    </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-white/15">
                    Enter Â· Updates save to venture
                </p>
            </div>
        </div>
    );
}

