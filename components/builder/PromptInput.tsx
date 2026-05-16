'use client';

import React from 'react';
import {
  ArrowUp,
  ClipboardList,
  Paperclip,
  RefreshCw,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { UISchema } from '@/lib/uiSchema';
import { SUGGESTED_PROMPTS } from '@/lib/uiSchema';

interface PromptInputProps {
  isDark: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  iterationPrompt: string;
  setIterationPrompt: (value: string) => void;
  showIteration: boolean;
  setShowIteration: (value: boolean) => void;
  currentSchema: UISchema | null;
  suggestions: string[];
  isGenerating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onIterate: (e: React.FormEvent) => void;
  onApplySuggestion: (suggestion: string) => void;
}

export function PromptInput(props: PromptInputProps) {
  const {
    isDark,
    prompt,
    setPrompt,
    iterationPrompt,
    setIterationPrompt,
    showIteration,
    setShowIteration,
    currentSchema,
    suggestions,
    isGenerating,
    onSubmit,
    onIterate,
    onApplySuggestion,
  } = props;

  const iconBtn =
    'inline-flex h-10 w-10 items-center justify-center rounded-xl border text-zinc-500 transition-colors disabled:cursor-not-allowed disabled:opacity-35';

  const picks = currentSchema ? suggestions : SUGGESTED_PROMPTS.slice(0, 6);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Airy scroll: no stacked card sections */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-8 sm:px-7 sm:py-10"
        style={{
          background: isDark ? 'transparent' : 'transparent',
        }}
      >
        <div className="mx-auto max-w-[440px]">
          <div className="mb-8 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-violet-400" strokeWidth={2} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: isDark ? '#71717a' : '#94a3b8' }}>
              Agent
            </p>
          </div>

          {currentSchema ? (
            <p className="mb-10 text-[15px] font-medium leading-snug tracking-tight" style={{ color: isDark ? '#f4f4f5' : '#0f172a' }}>
              <span className="mr-2 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-400 align-middle shadow-[0_0_12px_rgba(52,211,153,0.6)]" aria-hidden />
              <span className="align-middle">Now editing </span>
              <span className={`align-middle ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{currentSchema.name}</span>
              <span className="align-middle" style={{ color: isDark ? '#71717a' : '#64748b' }}>
                . Use quick picks or write below.
              </span>
            </p>
          ) : (
            <p className="mb-10 text-[15px] font-medium leading-relaxed tracking-tight" style={{ color: isDark ? '#d4d4d8' : '#334155' }}>
              Describe a screen in one pass. The canvas on the right updates when you send.
            </p>
          )}

          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: isDark ? '#52525b' : '#94a3b8' }}>
            Quick picks
          </p>
          <div className="flex flex-wrap gap-2.5">
            {picks.map((suggestion, index) => (
              <button
                key={`${suggestion}-${index}`}
                type="button"
                onClick={() => onApplySuggestion(suggestion)}
                className={`max-w-full rounded-full border px-4 py-2.5 text-left text-[13px] leading-snug transition-colors ${
                  isDark
                    ? 'border-zinc-800/80 bg-zinc-900/30 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/40'
                    : 'border-zinc-200/90 bg-white text-zinc-700 shadow-sm hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                {suggestion.length > 72 ? `${suggestion.slice(0, 72)}…` : suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Single dock: status + optional refinement form + main message */}
      <div
        className="shrink-0 border-t px-5 pb-6 pt-5 sm:px-7"
        style={{
          borderColor: isDark ? 'rgba(39,39,42,0.85)' : 'rgba(228,228,231,1)',
          background: isDark ? 'rgba(6,6,8,0.92)' : 'rgba(248,250,252,0.98)',
        }}
      >
        <div
          className={`mx-auto max-w-[440px] overflow-hidden rounded-[22px] border ${
            isDark ? 'shadow-[0_24px_80px_rgba(0,0,0,0.55)]' : 'shadow-[0_20px_50px_rgba(15,23,42,0.07)]'
          }`}
          style={{
            borderColor: isDark ? 'rgba(63,63,70,0.55)' : 'rgba(226,232,240,1)',
            background: isDark ? '#101014' : '#ffffff',
          }}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ borderBottom: `1px solid ${isDark ? 'rgba(39,39,42,0.9)' : 'rgba(241,245,249,1)'}` }}
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                {isGenerating ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/45" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </>
                ) : (
                  <span className="inline-flex h-2 w-2 rounded-full bg-zinc-500" />
                )}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: isGenerating ? '#34d399' : isDark ? '#71717a' : '#64748b' }}>
                {isGenerating ? 'Working' : 'Ready'}
              </span>
            </div>
            {currentSchema ? (
              <button
                type="button"
                onClick={() => setShowIteration(!showIteration)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                  showIteration
                    ? isDark
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-teal-100 text-teal-800'
                    : isDark
                      ? 'text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300'
                      : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                <Wrench size={13} strokeWidth={2.25} />
                Refine
              </button>
            ) : null}
          </div>

          {currentSchema != null && showIteration ? (
            <form
              onSubmit={onIterate}
              className="space-y-3 border-b px-4 py-4 sm:px-5"
              style={{ borderColor: isDark ? 'rgba(39,39,42,0.85)' : 'rgba(241,245,249,1)' }}
            >
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: isDark ? '#71717a' : '#64748b' }}>
                Refinement (applies to current layout)
              </label>
              <textarea
                value={iterationPrompt}
                onChange={(e) => setIterationPrompt(e.target.value)}
                placeholder="What should change? e.g. darker hero, add FAQ, swap primary CTA…"
                rows={3}
                className="w-full resize-none rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed outline-none"
                style={{
                  borderColor: isDark ? '#3f3f46' : '#e2e8f0',
                  background: isDark ? '#0a0a0c' : '#f8fafc',
                  color: isDark ? '#fafafa' : '#0f172a',
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIterationPrompt('')}
                  className={`rounded-xl px-4 py-2 text-[12px] font-semibold ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'}`}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={!iterationPrompt.trim() || isGenerating}
                  className={`rounded-xl px-5 py-2 text-[12px] font-bold disabled:opacity-40 ${
                    isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  Apply
                </button>
              </div>
            </form>
          ) : null}

          <form onSubmit={onSubmit} className="p-4 sm:p-5">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Message the agent…"
              rows={4}
              className="mb-4 w-full resize-none rounded-xl border-0 bg-transparent px-0.5 py-1 text-[15px] leading-relaxed outline-none placeholder:text-zinc-500"
              style={{ color: isDark ? '#fafafa' : '#0f172a' }}
            />

            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled
                  title="Attachments (soon)"
                  className={`${iconBtn} ${isDark ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50'}`}
                >
                  <Paperclip size={18} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  disabled
                  title="Context (soon)"
                  className={`${iconBtn} ${isDark ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50'}`}
                >
                  <ClipboardList size={18} strokeWidth={2} />
                </button>
              </div>
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="inline-flex h-12 min-w-[10.5rem] items-center justify-center gap-2 rounded-2xl px-5 text-[14px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-40 sm:min-w-[11.5rem]"
                style={{
                  background: isDark ? '#f8fafc' : '#0f172a',
                  color: isDark ? '#020617' : '#f8fafc',
                  boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.4)' : '0 12px 32px rgba(15,23,42,0.15)',
                }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" strokeWidth={2} />
                    Wait
                  </>
                ) : (
                  <>
                    {currentSchema ? 'Send' : 'Generate'}
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isDark ? 'bg-black/10' : 'bg-white/15'}`}>
                      <ArrowUp size={17} strokeWidth={2.5} />
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
