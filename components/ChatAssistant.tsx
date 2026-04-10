'use client';

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useOffice, getAgentSystemPrompt, AgentRole } from '@/lib/OfficeContext';
import { getChatRailTheme, getChatAgentRoleForRoom } from '@/lib/roomThemes';
import {
    Paperclip,
    ArrowUp,
    Bot,
    X,
    Eraser,
    Mic,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    Plus,
    AudioLines,
} from 'lucide-react';
import { ModelAttribution } from '@/components/ModelAttribution';
import { EXEC_CHAT_MODEL_STORAGE_KEY, isExecChatModelId } from '@/lib/deskConstants';
import { PA_BUDDY_NAME } from '@/lib/paBuddy';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';
import { formatProductPlanForContext, formatStrategyForContext } from '@/lib/ventureReadableContext';

function readStoredExecModel(): string {
    if (typeof window === 'undefined') return 'llama3';
    try {
        const v = localStorage.getItem(EXEC_CHAT_MODEL_STORAGE_KEY);
        if (v && isExecChatModelId(v)) return v;
    } catch {
        /* noop */
    }
    return 'llama3';
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    model?: string;
    channel?: 'pa' | 'cos';
}

export type ChatAssistantVariant =
    | 'default'
    | 'drawer'
    | 'bottomDock'
    | 'aiOs'
    | 'inlineDesk'
    /** CEO desk: composer stays in the global bottom bar; thread floats above it. */
    | 'ceoSplit';

export function ChatAssistant({
    variant = 'default',
    onClose,
    useExecutiveThread = false,
    embedInShell = false,
    onComposerInteract,
}: {
    variant?: ChatAssistantVariant;
    onClose?: () => void;
    /** Use shared venture thread (Personal Assistant + CEO desk); persisted per project. */
    useExecutiveThread?: boolean;
    /** Strip outer card when wrapped in a parent shell (e.g. inline desk embed). */
    embedInShell?: boolean;
    /** Called when user focuses composer or sends — e.g. expand minimized float. */
    onComposerInteract?: () => void;
}) {
    const {
        activeRoom,
        activeProject,
        agents,
        addFile,
        pendingChat,
        setPendingChat,
        executiveThread,
        appendExecutiveThread,
        clearExecutiveThread,
        deskSectionFocus,
        suiteIntelOpenDesk,
    } = useOffice();

    const sidebarSectionLabel =
        deskSectionFocus && deskSectionFocus.room === activeRoom
            ? deskSectionFocus.title
            : activeRoom === 'suite_intelligence' && suiteIntelOpenDesk
              ? `Intelligence Suite · ${suiteIntelOpenDesk}`
              : null;

    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    /** Floating disconnected thread panel: open/expanded state + drag offset */
    const [floatOpen, setFloatOpen] = useState(false);
    const [floatExpanded, setFloatExpanded] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const isCeoSplit = variant === 'ceoSplit';
    // Thread always floats above the message bar — never portals into desk sections
    const wantsBlockInlineThread = false;
    const focusAnchorsThread = false;

    const messages: Message[] = useMemo(() => {
        if (!useExecutiveThread) return localMessages;
        return executiveThread.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.ts,
            model: m.model,
            channel: m.channel,
        }));
    }, [useExecutiveThread, executiveThread, localMessages]);

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
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [inputValue]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Room switch reset (local thread only)
    useEffect(() => {
        if (useExecutiveThread) return;
        setLocalMessages([]);
    }, [activeRoom, useExecutiveThread]);

    const [selectedModel, setSelectedModel] = useState('llama3');

    useEffect(() => {
        setSelectedModel(readStoredExecModel());
    }, []);

    const appendTranscript = useCallback((t: string) => {
        setInputValue((prev) => (prev ? `${prev.trim()} ${t}` : t));
    }, []);
    const { voiceSupported, listening, stopListening, toggleListening } = useSpeechRecognition(appendTranscript);

    const handleVoiceToggle = useCallback(() => {
        if (!voiceSupported || isLoading) return;
        if (!listening) {
            onComposerInteract?.();
        }
        toggleListening();
    }, [
        voiceSupported,
        isLoading,
        listening,
        onComposerInteract,
        variant,
        toggleListening,
    ]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            if (content) {
                addFile(file.name, content, file.type);
                const fileNote: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `I've analyzed **${file.name}**. I'm ready to answer questions about it.`,
                    timestamp: Date.now(),
                };
                if (useExecutiveThread) {
                    appendExecutiveThread({
                        id: fileNote.id,
                        role: 'assistant',
                        content: fileNote.content,
                        ts: fileNote.timestamp,
                        channel: 'cos',
                    });
                } else {
                    setLocalMessages((prev) => [...prev, fileNote]);
                }
            }
        };
        reader.readAsText(file);
    };

    const handleSendMessage = async () => {
        stopListening();
        if ((!inputValue.trim() && !pendingChat) || isLoading || !activeProject) return;

        onComposerInteract?.();
        if (variant === 'ceoSplit') { setFloatOpen(true); }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: Date.now(),
        };

        const priorForApi = useExecutiveThread
            ? executiveThread.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
            : localMessages.map((m) => ({ role: m.role, content: m.content }));

        if (useExecutiveThread) {
            appendExecutiveThread({
                id: userMessage.id,
                role: 'user',
                content: userMessage.content,
                ts: userMessage.timestamp,
                channel: 'cos',
            });
        } else {
            setLocalMessages((prev) => [...prev, userMessage]);
        }
        setInputValue('');
        setIsLoading(true);

        try {
            const systemPrompt = getAgentSystemPrompt(effectiveAgentRole as AgentRole, activeProject);

            let fileContext = '';
            if (activeProject.files && activeProject.files.length > 0) {
                fileContext = '\n\nATTACHED FILE DATA:\n' + activeProject.files.map(f => `--- FILE: ${f.name} ---\n${f.content.substring(0, 5000)}...\n--- END FILE ---`).join('\n');
            }

            const deskSectionLine =
                deskSectionFocus && deskSectionFocus.room === activeRoom
                    ? `Desk block in focus: room "${deskSectionFocus.room}" · "${deskSectionFocus.title}" [id: ${deskSectionFocus.sectionId}]. Model instructions (ground answers in the venture fields in this message; do not invent facts): ${deskSectionFocus.prompt} Prioritize this block until the user presses Back or switches room.`
                    : activeRoom === 'suite_intelligence' && suiteIntelOpenDesk
                      ? `Intelligence Suite: user expanded the "${suiteIntelOpenDesk}" role row. Ground answers in agentStaffSnapshot.desks.${suiteIntelOpenDesk} and the venture record; do not invent facts.`
                      : 'Desk block in focus: none (general room).';

            const projectContext = `
            Current Project: ${activeProject.name}
            CEO Strategy (readable summary — not raw JSON):
            ${formatStrategyForContext(activeProject.strategy)}
            Product / PM plan (readable summary — not raw JSON):
            ${formatProductPlanForContext(activeProject.productPlan)}
            Budget: ${activeProject.budget || 'N/A'}
            Market Insights: ${activeProject.marketInsights || 'N/A'}
            Active View: ${activeRoom}
            ${deskSectionLine}
            Executive Journal: ${activeProject.userNotes || 'N/A'}
            Team Directives: ${activeProject.teamDirectives || 'N/A'}
            ${fileContext}
            `.trim();

            const fullMessages = [
                { role: 'system', content: systemPrompt + '\n\nContext:\n' + projectContext },
                ...priorForApi,
                { role: 'user', content: userMessage.content },
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
                timestamp: Date.now(),
                model: typeof data.model === 'string' ? data.model : undefined,
            };

            if (useExecutiveThread) {
                appendExecutiveThread({
                    id: assistantMessage.id,
                    role: 'assistant',
                    content: assistantMessage.content,
                    ts: assistantMessage.timestamp,
                    model: assistantMessage.model,
                    channel: 'cos',
                });
            } else {
                setLocalMessages((prev) => [...prev, assistantMessage]);
            }
        } catch (err) {
            console.error(err);
            const errMsg: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Connection error. The AI team is temporarily unreachable — please try again.',
                timestamp: Date.now(),
            };
            if (useExecutiveThread) {
                appendExecutiveThread({
                    id: errMsg.id,
                    role: 'assistant',
                    content: errMsg.content,
                    ts: errMsg.timestamp,
                    channel: 'cos',
                });
            } else {
                setLocalMessages((prev) => [...prev, errMsg]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fileInputId =
        variant === 'drawer'
            ? 'chat-file-upload-drawer'
            : variant === 'inlineDesk'
              ? 'chat-file-upload-inline-desk'
              : variant === 'bottomDock' || variant === 'aiOs' || variant === 'ceoSplit'
                ? 'chat-file-upload-dock'
                : 'chat-file-upload-default';

    const isBottomDock = variant === 'bottomDock' || variant === 'aiOs';
    const isInlineDesk = variant === 'inlineDesk';
    /** Shell context: floating bottom bar / desk embed — model menu opens upward */
    const isDockChrome = isBottomDock || isInlineDesk || isCeoSplit;
    /** ChatGPT-style unified composer (wide, #2f2f2f pill, soft shadow) */
    const msgBarChatGpt = isDockChrome || isCeoSplit;
    const isAiOs = variant === 'aiOs';
    const dockThreadEmpty = isDockChrome && messages.length === 0 && !isLoading && !isCeoSplit;
    const dockThreadActive = isDockChrome && !dockThreadEmpty;

    const threadBody = (
        <>
            {messages.length === 0 && (
                <div
                    className={`flex select-none flex-col ${
                        isCeoSplit && wantsBlockInlineThread
                            ? 'items-start py-2 text-left'
                            : isCeoSplit
                              ? 'items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                              : 'items-start rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left sm:px-5 sm:py-4'
                    }`}
                >
                    {isCeoSplit ? (
                        wantsBlockInlineThread ? (
                            <div className="text-left">
                                <p className="text-[13px] leading-relaxed text-zinc-400">{chatTheme.emptyPrompt}</p>
                                <p className="mt-3 text-[11px] text-zinc-600">
                                    {useExecutiveThread
                                        ? 'Use the bar below — replies appear here (same thread as Assistant when on strategy desk).'
                                        : 'Use the bar below — replies appear here.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.1]">
                                    <MessageSquare className="h-5 w-5 text-zinc-400" aria-hidden />
                                </div>
                                <p className="max-w-sm text-[13px] leading-relaxed text-zinc-400">{chatTheme.emptyPrompt}</p>
                                <p className="mt-4 text-[11px] text-zinc-600">
                                    {useExecutiveThread
                                        ? 'Type below — same thread as the Assistant desk.'
                                        : 'Type below — this thread is for this desk only.'}
                                </p>
                                {sidebarSectionLabel ? (
                                    <p className="mt-2 text-[11px] text-zinc-500">In context: {sidebarSectionLabel}</p>
                                ) : null}
                            </>
                        )
                    ) : (
                        <>
                            <p className="max-w-[280px] text-sm leading-relaxed text-zinc-300">{chatTheme.emptyPrompt}</p>
                            {variant !== 'drawer' && (
                                <p className="mt-3 text-xs text-zinc-600">Use the box below.</p>
                            )}
                        </>
                    )}
                </div>
            )}

            {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex gap-2.5 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                    {msg.role === 'assistant' && (
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-brand-muted">
                            <Bot className="h-3.5 w-3.5 text-brand-muted" />
                        </div>
                    )}

                    <div
                        className={`max-w-[88%] text-sm leading-relaxed ${
                            msg.role === 'user'
                                ? 'rounded-2xl rounded-br-md bg-white/[0.06] px-3 py-2.5 text-brand-text ring-1 ring-white/[0.06]'
                                : 'rounded-2xl rounded-bl-md bg-white/[0.04] px-3 py-2.5 text-brand-text/95'
                        }`}
                    >
                        {useExecutiveThread && !focusAnchorsThread ? (
                            <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-muted/80">
                                {msg.channel === 'cos'
                                    ? 'Strategy desk'
                                    : msg.role === 'user'
                                      ? 'Assistant thread'
                                      : PA_BUDDY_NAME}
                            </p>
                        ) : null}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.role === 'assistant' ? <ModelAttribution model={msg.model} /> : null}
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="flex gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                        <Bot className="h-3.5 w-3.5 text-brand-muted" />
                    </div>
                    <div className="flex items-center rounded-2xl rounded-bl-md bg-white/[0.04] px-3 py-2.5">
                        <span className="text-sm text-brand-muted">…</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </>
    );

    // Thread never portals into desk sections
    const blockInlineConversation = null;

    const onDragHeaderMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        isDraggingRef.current = true;
        dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, offsetX: dragOffset.x, offsetY: dragOffset.y };
        const onMove = (ev: MouseEvent) => {
            if (!isDraggingRef.current) return;
            setDragOffset({
                x: dragStartRef.current.offsetX + ev.clientX - dragStartRef.current.mouseX,
                y: dragStartRef.current.offsetY + ev.clientY - dragStartRef.current.mouseY,
            });
        };
        const onUp = () => {
            isDraggingRef.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [dragOffset.x, dragOffset.y]);

    const floatingThreadPanel = isCeoSplit && mounted
        ? createPortal(
            <>
                {/* Pill toggle — visible when thread has messages but panel is closed */}
                {!floatOpen && messages.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setFloatOpen(true)}
                        style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
                        className="fixed bottom-[108px] right-[340px] z-[60] flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#111113] px-3.5 py-2 text-[12px] text-zinc-400 shadow-[0_4px_24px_rgba(0,0,0,0.6)] transition hover:bg-[#1a1a1c] hover:text-zinc-200 lg:right-[360px]"
                    >
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                        <span>Thread</span>
                        <span className="ml-0.5 rounded-full bg-white/[0.08] px-1.5 py-px text-[10px] text-zinc-500">{messages.length}</span>
                    </button>
                )}
                {/* Floating thread panel */}
                {floatOpen && (
                    <div
                        style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
                        className={`fixed bottom-[108px] right-[340px] z-[60] flex flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0d0d0f] shadow-[0_12px_56px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.03)] transition-[width,height] duration-300 ease-in-out lg:right-[360px] ${
                            floatExpanded ? 'h-[520px] w-[500px]' : 'h-[300px] w-[380px]'
                        }`}
                    >
                        {/* Drag-handle header */}
                        <div
                            onMouseDown={onDragHeaderMouseDown}
                            className="flex shrink-0 cursor-grab select-none items-center justify-between gap-2 border-b border-white/[0.07] bg-[#111113] px-4 py-2.5 active:cursor-grabbing"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />
                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 truncate">
                                    {useExecutiveThread ? 'Venture Thread' : `${chatTheme.roleLabel} Thread`}
                                </span>
                                {messages.length > 0 && (
                                    <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-px text-[10px] text-zinc-600">{messages.length}</span>
                                )}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                                {messages.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => (useExecutiveThread ? clearExecutiveThread() : setLocalMessages([]))}
                                        className="rounded-md px-2 py-1 text-[10px] text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-400"
                                        title="Clear thread"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setFloatExpanded(v => !v)}
                                    className="rounded-md p-1.5 text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-400"
                                    title={floatExpanded ? 'Compact' : 'Expand'}
                                    aria-label={floatExpanded ? 'Compact thread' : 'Expand thread'}
                                >
                                    {floatExpanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronUp className="h-3.5 w-3.5" aria-hidden />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFloatOpen(false)}
                                    className="rounded-md p-1.5 text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-400"
                                    title="Close"
                                    aria-label="Close thread"
                                >
                                    <X className="h-3.5 w-3.5" aria-hidden />
                                </button>
                            </div>
                        </div>
                        {/* Messages */}
                        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
                            <div className="flex flex-col gap-3">{threadBody}</div>
                        </div>
                    </div>
                )}
            </>,
            document.body,
        )
        : null;

    return (
        <div
            className={
                isCeoSplit
                    ? `flex min-h-0 w-full flex-col overflow-visible rounded-none border-0 bg-transparent shadow-none transition-all duration-300 ${
                          focusAnchorsThread ? 'gap-2' : 'gap-5'
                      }`
                    : `flex min-h-0 flex-col overflow-hidden shadow-none transition-all duration-300 ${
                          isInlineDesk && embedInShell
                              ? dockThreadEmpty
                                  ? 'h-auto w-full rounded-none border-0 bg-transparent shadow-none'
                                  : 'w-full rounded-none border-0 bg-transparent shadow-none'
                              : isInlineDesk
                                ? dockThreadEmpty
                                    ? 'h-auto w-full rounded-3xl border border-white/[0.08] bg-[#131314]/90'
                                    : 'w-full rounded-3xl border border-white/[0.08] bg-[#131314]/90'
                                : isBottomDock && dockThreadEmpty
                                  ? `h-auto w-full ${isAiOs ? 'rounded-3xl border border-white/[0.08] bg-[#131314]/95 shadow-[0_-16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md' : 'rounded-none border-0 bg-transparent'}`
                                  : isBottomDock
                                    ? `min-h-0 w-full max-h-full flex-1 ${isAiOs ? 'rounded-3xl border border-white/[0.08] bg-[#131314]/95 shadow-[0_-16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md' : 'rounded-none border-0 bg-transparent'}`
                                    : chatTheme.railClass
                      }`
            }
        >
            {floatingThreadPanel}

            {isDockChrome && dockThreadActive && !embedInShell && !isCeoSplit ? (
                <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-white/[0.04] px-1 py-2 sm:px-0">
                    <p className="min-w-0 text-[11px] leading-snug text-brand-muted/90">
                        <span className="text-brand-text/90">{currentAgent.name}</span>
                        <span className="text-brand-muted"> · {currentAgent.title}</span>
                    </p>
                    <button
                        type="button"
                        onClick={() => (useExecutiveThread ? clearExecutiveThread() : setLocalMessages([]))}
                        className="shrink-0 text-[11px] text-brand-muted/80 transition-colors hover:text-brand-text"
                        title="Clear thread"
                    >
                        Clear
                    </button>
                </div>
            ) : isDockChrome && dockThreadActive && embedInShell ? (
                <div className="flex shrink-0 justify-end border-b border-white/[0.06] px-1 py-1.5">
                    <button
                        type="button"
                        onClick={() => (useExecutiveThread ? clearExecutiveThread() : setLocalMessages([]))}
                        className="shrink-0 text-[11px] text-brand-muted/80 transition-colors hover:text-brand-text"
                        title="Clear thread"
                    >
                        Clear thread
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
                            onClick={() => (useExecutiveThread ? clearExecutiveThread() : setLocalMessages([]))}
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
            ) : isDockChrome || activeRoom === 'dashboard' ? null : (
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
                        onClick={() => (useExecutiveThread ? clearExecutiveThread() : setLocalMessages([]))}
                        className="shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.04] p-2 text-brand-muted transition-colors hover:bg-brand-input hover:text-white"
                        title="Clear thread"
                    >
                        <Eraser className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            )}

            {!isCeoSplit && !dockThreadEmpty && (
                <div
                    className={`custom-scrollbar space-y-3 overflow-y-auto overflow-x-hidden bg-transparent px-3 pb-2 pt-3 sm:px-4 sm:pt-4 ${
                        isAiOs && dockThreadActive ? 'mb-1.5' : ''
                    } ${
                        isInlineDesk && dockThreadActive
                            ? 'max-h-[min(44vh,420px)] min-h-0 shrink-0'
                            : 'min-h-0 flex-1'
                    }`}
                >
                    {threadBody}
                </div>
            )}

            {/* File Context Chips */}
            {activeProject?.files && activeProject.files.length > 0 && (
                <div
                    className={`flex flex-wrap gap-2 px-1 py-1.5 sm:px-2 ${
                        isDockChrome
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
                className={
                    msgBarChatGpt
                        ? 'mx-auto w-full shrink-0'
                        : 'mx-auto w-full max-w-full shrink-0 border-0 bg-transparent pb-0 pt-1'
                }
            >
                {msgBarChatGpt ? (
                    <div className="group flex items-end gap-0 rounded-full bg-[#2f2f2f] shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_4px_24px_rgba(0,0,0,0.35)]">
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
                            className="mb-[7px] ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#b4b4b4] transition-colors hover:bg-white/[0.1]"
                            title="Attach"
                            aria-label="Attach file"
                        >
                            <Plus className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                        </button>
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                if (e.target.value.trim()) {
                                    onComposerInteract?.();
                                }
                            }}
                            onFocus={() => {
                                onComposerInteract?.();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Ask anything"
                            disabled={isLoading}
                            className="min-h-[44px] min-w-0 flex-1 resize-none border-none bg-transparent py-[11px] text-[15px] leading-[1.6] text-zinc-100 placeholder:text-[#8e8e8e] focus:outline-none focus:ring-0"
                            rows={1}
                        />
                        <div className="mb-[7px] mr-2 flex shrink-0 items-center gap-0.5">
                            <button
                                type="button"
                                onClick={handleVoiceToggle}
                                disabled={isLoading || !voiceSupported}
                                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/[0.1] disabled:opacity-40 ${
                                    listening ? 'bg-white/15 text-white' : 'text-[#b4b4b4]'
                                }`}
                                title={
                                    !voiceSupported
                                        ? 'Voice input needs Chrome, Edge, or Safari'
                                        : listening
                                          ? 'Stop dictation'
                                          : 'Voice input'
                                }
                                aria-label={listening ? 'Stop voice input' : 'Voice input'}
                                aria-pressed={listening}
                            >
                                <Mic className={`h-5 w-5 ${listening ? 'animate-pulse' : ''}`} strokeWidth={1.8} />
                            </button>
                            <button
                                type="button"
                                onClick={handleVoiceToggle}
                                disabled={isLoading || !voiceSupported}
                                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/[0.1] disabled:opacity-40 ${
                                    listening ? 'bg-white/15 text-white' : 'text-[#b4b4b4]'
                                }`}
                                title={
                                    !voiceSupported
                                        ? 'Voice input needs Chrome, Edge, or Safari'
                                        : listening
                                          ? 'Stop dictation'
                                          : 'Voice input'
                                }
                                aria-label={listening ? 'Stop voice input' : 'Voice input'}
                                aria-pressed={listening}
                            >
                                <AudioLines className={`h-5 w-5 ${listening ? 'animate-pulse' : ''}`} strokeWidth={1.8} />
                            </button>
                            {inputValue.trim() && (
                                <button
                                    type="button"
                                    onClick={handleSendMessage}
                                    disabled={isLoading}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-900 transition hover:bg-zinc-200 active:scale-[0.96] disabled:opacity-30"
                                    title="Send"
                                    aria-label="Send"
                                >
                                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="group relative mx-auto w-full overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-md transition-all duration-300 focus-within:border-white/[0.1] focus-within:bg-white/[0.06]">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                if (e.target.value.trim()) onComposerInteract?.();
                            }}
                            onFocus={() => onComposerInteract?.()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={chatTheme.placeholder}
                            disabled={isLoading}
                            className="relative z-10 max-h-40 min-h-[44px] w-full resize-none border-none bg-transparent px-3.5 py-2.5 text-sm leading-relaxed text-brand-text placeholder:text-zinc-500 focus:ring-0 sm:min-h-[48px] sm:px-4 sm:py-3"
                            rows={1}
                        />
                        <div className="flex items-center gap-1.5 border-t border-white/[0.06] bg-white/[0.02] px-2 py-1.5 sm:gap-2 sm:px-3">
                            <input
                                type="file"
                                id={fileInputId}
                                className="hidden"
                                onChange={handleFileUpload}
                                accept=".txt,.md,.csv,.json"
                            />
                            <div className="flex min-w-0 flex-1 items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => document.getElementById(fileInputId)?.click()}
                                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                                    title="Attach file"
                                    aria-label="Add file"
                                >
                                    <Paperclip className="h-3.5 w-3.5" aria-hidden />
                                    <span className="hidden sm:inline">{isAiOs ? 'Attach' : 'Add context'}</span>
                                </button>
                            </div>
                            <span className="min-w-0 flex-1" aria-hidden />
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    onClick={handleVoiceToggle}
                                    disabled={isLoading || !voiceSupported}
                                    className={`rounded-full p-2 transition-colors hover:bg-white/[0.06] disabled:opacity-40 ${
                                        listening
                                            ? 'text-brand-teal'
                                            : 'text-zinc-500 hover:text-zinc-200'
                                    }`}
                                    title={
                                        !voiceSupported
                                            ? 'Voice needs Chrome, Edge, or Safari'
                                            : listening
                                              ? 'Stop dictation'
                                              : 'Voice input'
                                    }
                                    aria-label={listening ? 'Stop voice input' : 'Voice input'}
                                    aria-pressed={listening}
                                >
                                    <Mic className={`h-4 w-4 ${listening ? 'animate-pulse' : ''}`} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isLoading}
                                    className="rounded-full bg-[var(--text)] p-2 text-[#0f1115] transition-colors hover:bg-white/90 active:scale-[0.98] disabled:opacity-40"
                                    title="Send"
                                    aria-label="Send"
                                >
                                    <ArrowUp className="h-4 w-4" aria-hidden />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
