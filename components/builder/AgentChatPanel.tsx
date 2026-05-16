'use client';

import React from 'react';
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
  /** Rendered at the top of the composer footer (Sites tone presets, etc.). */
  slotAboveComposer?: React.ReactNode;
  submitLabel?: string;
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
}: AgentChatPanelProps) {
  const muted = isDark ? '#71717a' : '#64748b';
  const bubbleUser = isDark ? '#27272a' : '#e4e4e7';
  const bubbleAssist = isDark ? 'rgba(39,39,42,0.55)' : 'rgba(241,245,249,0.98)';
  const strokeComposer = isDark ? 'rgba(63,63,70,0.55)' : 'rgba(226,232,240,1)';
  const scrimFoot = isDark ? 'rgba(8,8,10,0.92)' : 'rgba(255,255,255,0.96)';

  const showFollowUps = Boolean(currentSchema) && suggestions.length > 0;

  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, suggestionHint, inlineError, showIteration, suggestions.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="flex flex-col gap-3 pb-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[95%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                m.role === 'user' ? 'ml-auto' : ''
              }`}
              style={{
                background: m.role === 'user' ? bubbleUser : bubbleAssist,
                color: isDark ? '#fafafa' : '#0f172a',
                border:
                  m.role === 'assistant' || m.role === 'system'
                    ? `1px solid ${isDark ? 'rgba(63,63,70,0.45)' : 'rgba(226,232,240,1)'}`
                    : undefined,
              }}
            >
              {m.role === 'assistant' || m.role === 'system' ? (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>
                  {m.role === 'system' ? 'System' : 'Agent'}
                </p>
              ) : (
                <p className="mb-1 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: muted }}>
                  You
                </p>
              )}
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          ))}

          {inlineError ? (
            <div
              className="rounded-2xl border px-4 py-2.5 text-[13px]"
              style={{
                borderColor: '#ef44444d',
                background: '#450a0a33',
                color: '#fca5a5',
              }}
              role="alert"
            >
              {inlineError}
            </div>
          ) : null}

          {suggestionHint ? (
            <p className="px-1 text-center text-[12px]" style={{ color: muted }}>
              {suggestionHint}
            </p>
          ) : null}

          {showFollowUps ? (
            <div className="space-y-2">
              <p className="px-1 text-[12px] font-medium" style={{ color: muted }}>
                Tap a follow-up to paste it:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion}-${index}`}
                    type="button"
                    onClick={() => onApplySuggestion(suggestion)}
                    disabled={isGenerating}
                    className="max-w-full rounded-xl px-3 py-2 text-left text-[13px] leading-snug disabled:opacity-40"
                    style={{
                      border: `1px solid ${strokeComposer}`,
                      background: isDark ? 'rgba(24,24,27,0.5)' : '#ffffff',
                      color: isDark ? '#e4e4e7' : '#334155',
                    }}
                  >
                    {suggestion.length > 112 ? `${suggestion.slice(0, 112)}…` : suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : currentSchema ? (
            <p className="px-1 text-[12px]" style={{ color: muted }}>
              Reply below to tweak the canvas. Toggle Refinement when you want a separate change field.
            </p>
          ) : null}

          {!currentSchema ? (
            <p className="px-1 text-[12px]" style={{ color: muted }}>
              Type below and hit Send when you&apos;re ready. The preview updates without starter chips.
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="shrink-0 border-t px-3 pb-4 pt-2"
        style={{ borderColor: isDark ? 'rgba(63,63,70,0.35)' : 'rgba(226,232,240,0.85)', background: scrimFoot }}
      >
        {slotAboveComposer ? <div className="mb-3">{slotAboveComposer}</div> : null}
        {currentSchema != null && showIteration ? (
          <form onSubmit={onIterate} className="mb-3 space-y-2">
            <label className="block text-[11px] font-medium" htmlFor="iter-reply" style={{ color: muted }}>
              Refinement
            </label>
            <textarea
              id="iter-reply"
              value={iterationPrompt}
              onChange={(e) => setIterationPrompt(e.target.value)}
              placeholder="Precise tweak for this draft..."
              rows={2}
              className="w-full resize-none rounded-xl border px-3 py-2 text-[13px] outline-none placeholder:text-zinc-500"
              style={{
                borderColor: strokeComposer,
                background: isDark ? 'rgba(24,24,27,0.6)' : '#f8fafc',
                color: isDark ? '#fafafa' : '#0f172a',
              }}
            />
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setIterationPrompt('')}
                className="text-[12px] font-medium"
                style={{ color: muted }}
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={!iterationPrompt.trim() || isGenerating}
                className="rounded-xl px-4 py-2 text-[12px] font-semibold disabled:opacity-35"
                style={{
                  background: isDark ? '#e4e4e7' : '#0f172a',
                  color: isDark ? '#09090b' : '#fafafa',
                }}
              >
                Apply tweak
              </button>
            </div>
          </form>
        ) : null}

        <div className="flex items-center justify-between gap-2 pb-2">
          {currentSchema ? (
            <button
              type="button"
              onClick={() => setShowIteration(!showIteration)}
              className="rounded-lg px-2 py-1 text-[11px] font-medium transition-colors"
              style={{
                color: showIteration ? (isDark ? '#6ee7b7' : '#0f766e') : muted,
                background: showIteration ? (isDark ? 'rgba(45,212,165,0.12)' : '#ecfdf5') : 'transparent',
              }}
            >
              Refinement field
            </button>
          ) : (
            <span aria-hidden />
          )}
          <span className="text-[11px]" style={{ color: isGenerating ? '#34d399' : muted }}>
            {isGenerating ? 'Working...' : 'Ready'}
          </span>
        </div>

        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <div
            className="relative min-h-[44px] flex-1 rounded-[1.35rem] border px-3 py-2"
            style={{
              borderColor: strokeComposer,
              background: isDark ? 'rgba(24,24,27,0.55)' : '#ffffff',
            }}
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Message the agent..."
              rows={2}
              className="max-h-[120px] min-h-[54px] w-full resize-none border-0 bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-zinc-500 sm:max-h-[160px]"
              style={{ color: isDark ? '#fafafa' : '#0f172a' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="flex h-[44px] min-w-[76px] shrink-0 items-center justify-center rounded-full px-5 text-[13px] font-semibold disabled:opacity-35 sm:h-[54px]"
            style={{
              background: isDark ? '#f8fafc' : '#0f172a',
              color: isDark ? '#09090b' : '#fafafa',
            }}
          >
            {isGenerating ? '...' : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
