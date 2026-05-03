'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, RotateCcw, Target, ClipboardList, Calculator, ScanSearch, Megaphone, LucideIcon } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { RESEARCH_STAFF } from '@/lib/researchStaffLabels';
import type { DeskId } from '@/lib/deskChatTypes';
import { DESK_QUICK_STARTS } from '@/lib/deskChatTypes';
import type { PersonalAssistantUpdates } from '@/lib/paApplyUpdates';
import { mergeProjectWithPAUpdates } from '@/lib/paApplyUpdates';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string; ts: number };

// ─── Storage helpers ──────────────────────────────────────────────────────────

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
        // keep last 80 messages
        localStorage.setItem(storageKey(projectId, deskId), JSON.stringify(msgs.slice(-80)));
    } catch { /* quota */ }
}

// ─── Desk config ──────────────────────────────────────────────────────────────

type DeskConfig = {
    Icon: LucideIcon;
    accentClass: string;
    dotClass: string;
    label: string;
    domain: string;
};

const DESK_CONFIG: Record<DeskId, DeskConfig> = {
    ceo: {
        Icon: Target,
        accentClass: 'text-violet-400',
        dotClass: 'bg-violet-500',
        label: 'Strategy & direction',
        domain: 'Narrative · Phases · Priorities',
    },
    pm: {
        Icon: ClipboardList,
        accentClass: 'text-sky-400',
        dotClass: 'bg-sky-500',
        label: 'Product & delivery',
        domain: 'Roadmap · Execution board · Shipping',
    },
    accountant: {
        Icon: Calculator,
        accentClass: 'text-emerald-400',
        dotClass: 'bg-emerald-500',
        label: 'Finance & runway',
        domain: 'Burn · Capital · Funding readiness',
    },
    scout: {
        Icon: ScanSearch,
        accentClass: 'text-amber-400',
        dotClass: 'bg-amber-500',
        label: 'Market & landscape',
        domain: 'Competitors · Trends · Signals',
    },
    cmo: {
        Icon: Megaphone,
        accentClass: 'text-rose-400',
        dotClass: 'bg-rose-500',
        label: 'Growth & narrative',
        domain: 'GTM · Messaging · Positioning',
    },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
    return (
        <span className="inline-flex items-end gap-[3px]">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="h-[5px] w-[5px] rounded-full bg-[var(--text-secondary)] opacity-70"
                    style={{ animation: `bounce 1.2s ${i * 0.18}s infinite` }}
                />
            ))}
            <style>{`@keyframes bounce { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-5px) } }`}</style>
        </span>
    );
}

function UserBubble({ content }: { content: string }) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[var(--accent)] px-4 py-2.5 text-[13px] leading-relaxed text-white">
                {content}
            </div>
        </div>
    );
}

function AssistantBubble({ content, accentClass }: { content: string; accentClass: string }) {
    return (
        <div className="flex gap-2.5">
            <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${accentClass.replace('text-', 'bg-')} self-start translate-y-[6px]`} />
            <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                {content}
            </div>
        </div>
    );
}

// ─── Main DeskChat ────────────────────────────────────────────────────────────

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

    // Reload when project changes
    useEffect(() => {
        setMessages(loadHistory(projectId, deskId));
        setFollowUps([]);
        setError(null);
    }, [projectId, deskId]);

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Auto-resize textarea
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
                body: JSON.stringify({
                    deskId,
                    project: activeProject,
                    conversation: convo,
                }),
            });

            const data = (await res.json()) as {
                ok: boolean;
                reply?: string;
                followUpOptions?: string[];
                deskSummary?: string;
                updates?: PersonalAssistantUpdates;
                error?: string;
                fallbackReply?: string;
            };

            if (!data.ok) {
                throw new Error(data.error ?? 'Desk AI error');
            }

            const reply = data.reply ?? 'Got it.';
            const aiMsg: ChatMsg = { id: crypto.randomUUID(), role: 'assistant', content: reply, ts: Date.now() };
            const finalMsgs = [...nextMsgs, aiMsg];
            setMessages(finalMsgs);
            saveHistory(projectId, deskId, finalMsgs);

            if (data.followUpOptions?.length) {
                setFollowUps(data.followUpOptions);
            }

            // Patch venture with updates + desk summary
            if (activeProject) {
                let updatedProject = { ...activeProject };

                // Apply content updates (strategy, budget, etc.)
                if (data.updates && Object.keys(data.updates).length > 0) {
                    updatedProject = mergeProjectWithPAUpdates(updatedProject, data.updates);
                }

                // Save desk summary to agentStaffSnapshot for main Dexo
                if (data.deskSummary) {
                    const prev = updatedProject.agentStaffSnapshot;
                    updatedProject = {
                        ...updatedProject,
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

                // Only persist if something actually changed
                const hasUpdates = data.updates && Object.keys(data.updates).length > 0;
                const hasSummary = Boolean(data.deskSummary);
                if (hasUpdates || hasSummary) {
                    patchActiveProject(updatedProject);
                    await persistActiveProject(updatedProject);
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
        <div className="flex min-h-0 w-full flex-1 flex-col bg-[var(--bg-card)]">

            {/* ── Header ── */}
            <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-elevated)] ${cfg.accentClass}`}>
                            <cfg.Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-[var(--text-primary)] leading-none">
                                    {cfg.label}
                                </span>
                                {activeProject?.name && (
                                    <>
                                        <span className="text-[var(--text-tertiary)]">·</span>
                                        <span className="truncate text-[11px] text-[var(--text-secondary)]">
                                            {activeProject.name}
                                        </span>
                                    </>
                                )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)] tracking-wide">
                                {cfg.domain}
                            </p>
                        </div>
                    </div>
                    {messages.length > 0 && (
                        <button
                            type="button"
                            onClick={clearHistory}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-secondary)]"
                            title="Clear conversation"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Message thread ── */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {isEmpty ? (
                    // Empty state
                    <div className="flex h-full flex-col items-center justify-center gap-6 py-8">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] ${cfg.accentClass} ring-1 ring-[var(--border)]`}>
                            <cfg.Icon className="h-6 w-6" />
                        </div>
                        <div className="text-center max-w-xs">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{staff.deskHelp}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
                            {quickStarts.map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => sendMessage(q)}
                                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-left text-[12px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                        {!activeProject && (
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                                Select a venture to begin
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {messages.map((msg) =>
                            msg.role === 'user' ? (
                                <UserBubble key={msg.id} content={msg.content} />
                            ) : (
                                <AssistantBubble key={msg.id} content={msg.content} accentClass={cfg.accentClass} />
                            ),
                        )}
                        {loading && (
                            <div className="flex gap-2.5">
                                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${cfg.dotClass} self-start translate-y-[6px] opacity-60`} />
                                <div className="text-[13px] text-[var(--text-secondary)] py-0.5">
                                    <TypingDots />
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-[12px] text-red-400">
                                {error}
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>

            {/* ── Follow-up pills ── */}
            {followUps.length > 0 && !loading && (
                <div className="shrink-0 flex flex-wrap gap-1.5 px-4 pb-2 sm:px-5">
                    {followUps.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => { setFollowUps([]); sendMessage(opt); }}
                            className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Input bar ── */}
            <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 sm:px-4">
                <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 transition-colors focus-within:border-[var(--accent)]/40">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
                        onKeyDown={handleKeyDown}
                        placeholder={activeProject ? `Ask ${cfg.label.toLowerCase()}…` : 'Select a venture first'}
                        disabled={!activeProject || loading}
                        className="min-h-0 flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none disabled:opacity-50"
                        style={{ maxHeight: '120px' }}
                    />
                    <button
                        type="button"
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || loading || !activeProject}
                        className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white transition-opacity disabled:opacity-30"
                    >
                        {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <ArrowUp className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-[var(--text-tertiary)]">
                    Enter to send · Shift+Enter for new line · Updates save to your venture
                </p>
            </div>
        </div>
    );
}
