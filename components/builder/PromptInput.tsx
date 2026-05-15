'use client';

import React from 'react';
import { Lightbulb, RefreshCw, Send, Sparkles } from 'lucide-react';
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

  const muted = isDark ? '#a1a1aa' : '#71717a';
  const subtleBorder = isDark ? '#27272a' : '#e4e4e7';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scrollable suggestions & refinements */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
        {currentSchema != null && (
          <div className="rounded-xl border px-4 py-3 text-[13px] leading-snug shadow-sm"
            style={{
              borderColor: isDark ? 'rgba(59,246,173,0.25)' : 'rgba(20,184,138,0.35)',
              background: isDark ? 'rgba(20,184,138,0.06)' : 'rgba(236,253,245,0.45)',
              color: isDark ? '#d4d4d8' : '#374151',
            }}
          >
            <span className="font-semibold" style={{ color: isDark ? '#6ee7b7' : '#047857' }}>
              Current layout
            </span>
            <span className="text-zinc-500"> · </span>
            Describe changes below or tap a suggestion. The preview updates after each generation.
          </div>
        )}

        {currentSchema != null && (
        <div className="border-t pt-4" style={{ borderColor: subtleBorder }}>
          <button
            onClick={() => setShowIteration(!showIteration)}
            className="mb-3 flex items-center gap-2 text-[12px] font-semibold"
            style={{ color: '#7456ff' }}
            type="button"
          >
            <RefreshCw size={14} />
            {showIteration ? 'Hide refinement' : 'Refine layout'}
          </button>

          {showIteration && (
            <form onSubmit={onIterate} className="space-y-3">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: muted }}>
                Refinement prompt
              </label>
              <textarea
                value={iterationPrompt}
                onChange={(e) => setIterationPrompt(e.target.value)}
                placeholder="Example: darker theme, taller hero, add FAQ above footer..."
                rows={4}
                className="w-full resize-none rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed"
                style={{
                  background: isDark ? '#141416' : '#fafafa',
                  borderColor: isDark ? '#3f3f46' : '#e4e4e7',
                  color: isDark ? '#fafafa' : '#18181b',
                }}
              />
              <button
                type="submit"
                disabled={!iterationPrompt.trim() || isGenerating}
                className="w-full rounded-xl py-2.5 text-[13px] font-semibold transition-all disabled:opacity-45"
                style={{ background: isDark ? '#2a2a2e' : '#e4e4e7', color: isDark ? '#fafafa' : '#18181b' }}
              >
                Apply refinement
              </button>
            </form>
          )}
        </div>
        )}

        <div className="border-t pt-5" style={{ borderColor: subtleBorder }}>
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb size={15} style={{ color: '#fbbf24' }} />
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: muted }}>
              {currentSchema ? 'Suggested next steps' : 'Try an example'}
            </span>
          </div>
          <div className="space-y-2">
            {(currentSchema ? suggestions : SUGGESTED_PROMPTS.slice(0, 5)).map((suggestion, index) => (
              <button
                key={`${suggestion}-${index}`}
                onClick={() => onApplySuggestion(suggestion)}
                className="w-full rounded-xl border px-3 py-3 text-left text-[13px] leading-snug transition-colors hover:opacity-[0.92]"
                style={{
                  background: isDark ? '#141416' : '#ffffff',
                  borderColor: isDark ? '#2e2e32' : '#e7e7ea',
                  color: isDark ? '#e4e4e7' : '#3f3f46',
                  boxShadow: isDark ? 'none' : '0 1px 0 rgba(15,23,42,0.04)',
                }}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom composer */}
      <div
        className="shrink-0 border-t px-5 pb-5 pt-3"
        style={{
          borderColor: subtleBorder,
          background: isDark ? '#050506' : '#fbfbfb',
          boxShadow: isDark ? '0 -24px 48px rgba(0,0,0,0.45)' : '0 -12px 32px rgba(15,23,42,0.06)',
        }}
      >
        {isGenerating && (
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold" style={{ color: '#34d399' }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-55" aria-hidden />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Agent is running…
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: muted }}>
            Message agent
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the page or screen you want: audience, tone, sections, CTAs…"
            rows={4}
            className="min-h-[7rem] w-full resize-y rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed lg:min-h-[5.75rem]"
            style={{
              background: isDark ? '#101012' : '#ffffff',
              borderColor: isDark ? '#36363d' : '#d4d4d8',
              color: isDark ? '#fafafa' : '#18181b',
            }}
          />

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: '#7456ff', color: '#ffffff' }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  Working…
                </>
              ) : (
                <>
                  {currentSchema ? <Send size={17} strokeWidth={2.25} /> : <Sparkles size={17} strokeWidth={2.25} />}
                  {currentSchema ? 'Send refinement' : 'Generate layout'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
