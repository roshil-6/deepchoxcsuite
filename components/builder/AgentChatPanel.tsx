'use client';

import React from 'react';
import { Bot, ChevronDown, Github, Loader2, Mic, Paperclip, Send, Sparkles, Square } from 'lucide-react';
import type { UISchema } from '@/lib/uiSchema';

export type ThreadMessage = {
  id: string;
  role: 'assistant' | 'user' | 'system';
  body: string;
};

interface AgentChatPanelProps {
  isDark: boolean;
  messages: ThreadMessage[];
  currentSchema: UISchema | null;
  suggestions: string[];
  suggestionHint?: string | null;
  prompt: string;
  setPrompt: (v: string) => void;
  iterationPrompt: string;
  setIterationPrompt: (v: string) => void;
  showIteration: boolean;
  setShowIteration: (v: boolean) => void;
  isGenerating: boolean;
  inlineError?: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onIterate: (e: React.FormEvent) => void;
  onApplySuggestion: (suggestion: string) => void;
  slotAboveComposer?: React.ReactNode;
  submitLabel?: string;
  onAbort?: () => void;
  onToolbarSave?: () => void;
  onToolbarFork?: () => void;
  /** Lets Sites fork copy without passing a UISchema. Defaults to requiring `currentSchema`. */
  allowToolbarForkWithoutSchema?: boolean;
  toolbarGithubHref?: string;
}

function RobotAvatar({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border"
      style={{
        borderColor: isDark ? 'rgba(45,212,191,0.25)' : 'rgba(45,212,191,0.35)',
        background: isDark
          ? 'linear-gradient(165deg,rgba(6,182,212,0.12),rgba(63,63,70,0.45))'
          : 'linear-gradient(165deg,rgba(6,182,212,0.15),rgba(241,245,249,1))',
        boxShadow: isDark ? '0 8px 20px rgba(0,0,0,0.35)' : '0 10px 24px rgba(15,23,42,0.08)',
      }}
      aria-hidden
    >
      <Bot className="h-5 w-5" style={{ color: isDark ? '#5eead4' : '#0d9488' }} strokeWidth={1.75} />
    </div>
  );
}

export function AgentChatPanel({
  isDark,
  messages,
  currentSchema,
  suggestions,
  suggestionHint,
  prompt,
  setPrompt,
  iterationPrompt,
  setIterationPrompt,
  showIteration,
  setShowIteration,
  isGenerating,
  inlineError,
  onSubmit,
  onIterate,
  onApplySuggestion,
  slotAboveComposer,
  submitLabel = 'Send',
  onAbort,
  onToolbarSave,
  onToolbarFork,
  allowToolbarForkWithoutSchema = false,
  toolbarGithubHref = 'https://github.com/roshil-6/deepchoxcsuite',
}: AgentChatPanelProps) {
  const muted = isDark ? '#71717a' : '#64748b';
  const tealBorder = 'rgba(34,211,238,0.22)';
  const userBubbleBg = isDark
    ? 'linear-gradient(135deg,#0c4a6e 8%,#0e7490 38%,#0f766f 76%,#115e56 100%)'
    : 'linear-gradient(150deg,#cffafe,#99f6e4)';
  const userInk = isDark ? '#f8fafc' : '#082f49';
  const columnBg = isDark ? '#080809' : '#f8fafc';

  const showFollowUps = Boolean(currentSchema) && suggestions.length > 0;

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [nearBottom, setNearBottom] = React.useState(true);

  const markScroll = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    setNearBottom(gap < 72);
  }, []);

  const scrollToBottom = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setNearBottom(true);
  }, []);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages.length, isGenerating, nearBottom]);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const prev = scrollContainerRef.current;
    if (!prev) return;
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          markScroll();
        })
      : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [markScroll]);

  const githubJump = React.useCallback(() => {
    if (toolbarGithubHref) window.open(toolbarGithubHref, '_blank', 'noopener,noreferrer');
  }, [toolbarGithubHref]);

  const runningCopy = 'Agent is running...';
  const idleCopy = 'Ready';
  const hasToolbar = !!(onToolbarSave || onToolbarFork);
  const forkDisabled = Boolean(
    (!allowToolbarForkWithoutSchema && currentSchema === null) || isGenerating,
  );

  return (
    <div
      className="studio-chat-root flex min-h-0 flex-1 flex-col rounded-[inherit] border-0 shadow-none outline-none ring-0 antialiased"
      style={{
        background: columnBg,
        color: isDark ? '#fafafa' : '#0f172a',
      }}
      aria-busy={isGenerating}
    >
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={markScroll}
          className="h-full overflow-y-auto overscroll-contain px-3 pb-4 pt-4 sm:px-4 sm:pb-6 sm:pt-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          <div className="flex flex-col gap-6">
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div
                    className="max-w-[min(400px,calc(100%-0.5rem))] rounded-[1.25rem] rounded-br-lg px-4 py-2.5 text-[14px] leading-[1.65] shadow-xl sm:max-w-[min(400px,calc(100%-1.5rem))] sm:rounded-[1.375rem] sm:px-[1.1rem] sm:py-3"
                    style={{
                      border: `1px solid ${tealBorder}`,
                      background: userBubbleBg,
                      boxShadow: isDark
                        ? '0 20px 44px rgba(8,61,71,0.55), inset 0 1px 0 rgba(255,255,255,0.06)'
                        : '0 14px 32px rgba(15,118,110,0.22)',
                      color: userInk,
                    }}
                  >
                    <div className="whitespace-pre-wrap">{m.body}</div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-[0.625rem] pr-6 pt-1 sm:gap-3">
                  <RobotAvatar isDark={isDark} />
                  <div
                    className="min-w-0 flex-1 text-[14px] leading-[1.75]"
                    style={{ color: isDark ? '#fafafa' : '#1e293b' }}
                  >
                    <div className="whitespace-pre-wrap">{m.body}</div>
                  </div>
                </div>
              ),
            )}

            {isGenerating ? (
              <div className="flex items-center gap-3 pl-[3px]">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full border"
                  style={{
                    borderColor: isDark ? 'rgba(63,63,70,0.45)' : 'rgba(226,232,240,1)',
                    background: isDark ? '#111114' : '#ffffff',
                  }}
                >
                  <Sparkles className="h-[18px] w-[18px] animate-pulse text-emerald-300" aria-hidden strokeWidth={1.65} />
                </div>
                <p className="text-[14px]" style={{ color: isDark ? '#a7f3d0' : '#059669' }}>
                  Making things click...
                </p>
              </div>
            ) : null}

            {inlineError ? (
              <div
                className="rounded-3xl border px-5 py-3 text-[13px]"
                style={{
                  borderColor: '#f8717166',
                  background: isDark ? 'rgba(69,10,10,0.32)' : 'rgba(254,226,226,1)',
                  color: isDark ? '#fecaca' : '#991b1b',
                }}
                role="alert"
              >
                {inlineError}
              </div>
            ) : null}

            {suggestionHint ? (
              <p className="text-center text-[13px]" style={{ color: muted }}>
                {suggestionHint}
              </p>
            ) : null}

            {showFollowUps ? (
              <div className="space-y-3 pl-[3.125rem]">
                <p className="text-[13px]" style={{ color: muted }}>
                  Pick a follow-up
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion}-${index}`}
                      type="button"
                      onClick={() => onApplySuggestion(suggestion)}
                      disabled={isGenerating}
                      className="max-w-full rounded-2xl border px-4 py-2.5 text-left text-[13px] leading-snug transition-opacity disabled:opacity-40"
                      style={{
                        borderColor: tealBorder,
                        background: isDark ? 'rgba(8,52,54,0.35)' : 'rgba(236,253,245,1)',
                        color: isDark ? '#e7fffa' : '#0f766e',
                      }}
                    >
                      {suggestion.length > 132 ? `${suggestion.slice(0, 132)}…` : suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {!nearBottom ? (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="absolute bottom-[calc(17.25rem+env(safe-area-inset-bottom,0px))] right-3 flex h-11 w-11 items-center justify-center rounded-full border shadow-2xl transition-transform hover:scale-[1.03] active:scale-[0.98] sm:right-5 md:bottom-[15.5rem]"
            style={{
              borderColor: isDark ? 'rgba(63,63,70,0.55)' : 'rgba(226,232,240,1)',
              background: isDark ? '#18181b' : '#ffffff',
              boxShadow: isDark ? '0 26px 50px rgba(0,0,0,0.55)' : '0 26px 50px rgba(15,23,42,0.18)',
              color: isDark ? '#fafafa' : '#0f172a',
              zIndex: 5,
            }}
            aria-label="Scroll chat to newest messages"
          >
            <ChevronDown className="h-6 w-6" aria-hidden strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <div
        className="shrink-0 px-3 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] pt-2.5 sm:px-4 sm:pb-5 sm:pt-3"
        style={{
          borderTop: isDark ? '1px solid rgba(63,63,70,0.28)' : '1px solid rgba(226,232,240,0.85)',
          background: isDark ? 'rgba(4,6,10,0.82)' : 'rgba(249,251,253,1)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {slotAboveComposer ? <div className="mb-4">{slotAboveComposer}</div> : null}

        {currentSchema != null && showIteration ? (
          <form onSubmit={onIterate} className="mb-4 rounded-3xl border p-4" style={{ borderColor: tealBorder }}>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: muted }} htmlFor="iter-reply">
              Targeted tweak
            </label>
            <textarea
              id="iter-reply"
              value={iterationPrompt}
              onChange={(e) => setIterationPrompt(e.target.value)}
              placeholder="Fine-grained edits for this layout..."
              rows={2}
              className="mb-3 w-full resize-none rounded-2xl border px-4 py-3 text-[13px] leading-relaxed outline-none"
              style={{
                borderColor: isDark ? 'rgba(82,82,91,0.55)' : 'rgba(203,213,225,1)',
                background: isDark ? '#101014' : '#ffffff',
                color: isDark ? '#fafafa' : '#0f172a',
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="text-[13px] font-medium"
                style={{ color: muted }}
                onClick={() => setIterationPrompt('')}
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={!iterationPrompt.trim() || isGenerating}
                className="rounded-full px-5 py-2 text-[13px] font-semibold disabled:opacity-35"
                style={{
                  border: `1px solid ${tealBorder}`,
                  background: 'linear-gradient(130deg,#0f766f,#059669)',
                  color: '#f0fdfa',
                }}
              >
                Apply tweak
              </button>
            </div>
          </form>
        ) : null}

        {currentSchema ? (
          <button
            type="button"
            onClick={() => setShowIteration(!showIteration)}
            className="mb-3 px-2 text-[12px] font-semibold"
            style={{
              color: showIteration ? (isDark ? '#34d399' : '#047857') : muted,
              letterSpacing: '0.04em',
              textDecoration: showIteration ? 'underline' : 'none',
              textUnderlineOffset: 4,
            }}
          >
            {showIteration ? 'Hide refinement' : 'Precise tweaks'}
          </button>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-3">
          <div
            className="rounded-[1.2rem] border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[1.35rem] sm:px-[1.125rem] sm:py-[0.875rem]"
            style={{
              borderColor: isDark ? 'rgba(63,63,70,0.55)' : 'rgba(226,232,240,1)',
              background: isDark ? '#0e0f14' : '#ffffff',
              boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] font-medium tracking-[-0.01em]" aria-live="polite">
              <span className="tabular-nums" style={{ color: isGenerating ? '#22c55e' : muted }}>
                ●
              </span>
              <span style={{ color: isGenerating ? '#86efac' : muted }}>{isGenerating ? runningCopy : idleCopy}</span>
            </div>
            <textarea
              id="studio-agent-msg"
              name="agentMessage"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Message Agent"
              rows={3}
              disabled={false}
              className="w-full resize-none border-0 bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-[#52525bcc]"
              style={{ color: isDark ? '#fafafa' : '#0f172a' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />

            <div
              className="mt-3 flex flex-col gap-3 border-t pt-3 text-[13px] sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:border-t sm:pt-4"
              style={{ borderColor: isDark ? 'rgba(63,63,70,0.35)' : 'rgba(226,232,240,0.95)' }}
            >
              <div className="flex flex-wrap items-center gap-5 sm:flex-nowrap sm:gap-6">
                <button
                  type="button"
                  title="Attachments (soon)"
                  className="rounded-full border border-transparent p-2 hover:border-white/10"
                  style={{ color: muted }}
                  onClick={() => {
                    /* reserved */
                  }}
                >
                  <Paperclip className="h-5 w-5" strokeWidth={1.65} />
                </button>
                <button
                  type="button"
                  title="Deepchox on GitHub"
                  className="rounded-full border border-transparent p-2 hover:border-white/10"
                  style={{ color: muted }}
                  onClick={githubJump}
                >
                  <Github className="h-5 w-5" strokeWidth={1.65} />
                </button>
                {hasToolbar ? (
                  <>
                    {onToolbarSave ? (
                      <button
                        type="button"
                        className="text-[13px] font-normal tracking-normal"
                        style={{ color: isDark ? '#e4e4e7' : '#334155' }}
                        onClick={() => void onToolbarSave()}
                      >
                        Save
                      </button>
                    ) : null}
                    {onToolbarFork ? (
                      <button
                        type="button"
                        disabled={forkDisabled}
                        className="text-[13px] font-normal tracking-normal disabled:opacity-30"
                        style={{ color: isDark ? '#e4e4e7' : '#334155' }}
                        onClick={() => void onToolbarFork()}
                      >
                        Fork
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:w-auto sm:justify-end sm:gap-4 sm:self-center">
                <button
                  type="button"
                  title="Voice (soon)"
                  className="rounded-full border border-transparent p-2 hover:border-white/10"
                  style={{ color: muted }}
                >
                  <Mic className="h-5 w-5" strokeWidth={1.65} />
                </button>
                {isGenerating && onAbort ? (
                  <button
                    type="button"
                    onClick={() => onAbort()}
                    className="relative flex h-12 w-12 items-center justify-center rounded-full border"
                    title="Stop"
                    aria-label="Stop generation"
                    style={{
                      borderColor: isDark ? 'rgba(244,244,245,0.45)' : 'rgba(71,85,105,1)',
                      background: isDark ? '#f4f4f5' : '#0f172a',
                      color: isDark ? '#09090b' : '#fafafa',
                    }}
                  >
                    <Square className="h-4 w-4 fill-current" aria-hidden />
                  </button>
                ) : isGenerating ? (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full border"
                    style={{
                      borderColor: isDark ? 'rgba(63,63,70,0.55)' : 'rgba(203,213,225,1)',
                      background: isDark ? '#111114' : '#f8fafc',
                    }}
                    aria-hidden
                  >
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!prompt.trim()}
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border shadow-lg disabled:opacity-35"
                    title={submitLabel}
                    aria-label={submitLabel}
                    style={{
                      borderColor: tealBorder,
                      background: 'linear-gradient(155deg,#0f766f,#0891b2)',
                      color: '#f0fdf4',
                      boxShadow: '0 20px 30px rgba(7,117,134,0.35)',
                    }}
                  >
                    <Send className="ml-px h-[22px] w-[22px]" strokeWidth={1.85} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="sr-only">{`Ctrl/Cmd+Enter submits; primary action is labeled ${submitLabel}.`}</p>
        </form>
      </div>
    </div>
  );
}
