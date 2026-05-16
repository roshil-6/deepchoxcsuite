'use client';

import React from 'react';
import type { UISchema } from '@/lib/uiSchema';

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

  const showFollowUps =
    Boolean(currentSchema) && Array.isArray(suggestions) && suggestions.length > 0;

  const textMuted = isDark ? '#a1a1aa' : '#64748b';
  const hairline = isDark ? 'rgba(63,63,70,0.35)' : 'rgba(226,232,240,0.9)';
  const inputBg = isDark ? 'rgba(9,9,11,0.55)' : '#ffffff';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-[400px] text-left">
          {!currentSchema ? (
            <>
              <p className="text-[15px] font-normal leading-[1.65]" style={{ color: isDark ? '#e4e4e7' : '#334155' }}>
                Say what kind of site or screen you are building: audience, sections, tone, and CTAs. The preview
                updates after you generate.
              </p>
              <p className="mt-6 text-[13px] leading-relaxed" style={{ color: textMuted }}>
                No templates or presets until you&apos;ve produced a first layout - then follow-up ideas can show up here.
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-normal leading-[1.65]" style={{ color: isDark ? '#f4f4f5' : '#0f172a' }}>
                Editing <span style={{ fontWeight: 600 }}>{currentSchema.name}</span>
                <span style={{ color: textMuted }}>. Send changes from the composer below.</span>
              </p>
              {showFollowUps ? (
                <div className="mt-10">
                  <p className="mb-4 text-[12px]" style={{ color: textMuted }}>
                    Follow-ups you can send next
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion}-${index}`}
                        type="button"
                        onClick={() => onApplySuggestion(suggestion)}
                        className="rounded-lg px-3.5 py-2 text-left text-[13px] leading-snug transition-colors"
                        style={{
                          border: `1px solid ${hairline}`,
                          background: isDark ? 'rgba(24,24,27,0.5)' : 'rgba(248,250,252,1)',
                          color: isDark ? '#e4e4e7' : '#334155',
                        }}
                      >
                        {suggestion.length > 96 ? `${suggestion.slice(0, 96)}…` : suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-8 text-[13px]" style={{ color: textMuted }}>
                  Describe the change you want in the composer, same flow as your first generation.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t px-6 pb-8 pt-5 sm:px-8" style={{ borderColor: hairline }}>
        <div className="mx-auto max-w-[400px] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px]" style={{ color: isGenerating ? '#34d399' : textMuted }}>
              {isGenerating ? 'Agent is running' : 'Message agent'}
            </span>
            {currentSchema ? (
              <button
                type="button"
                onClick={() => setShowIteration(!showIteration)}
                className="text-[12px] font-medium"
                style={{ color: showIteration ? '#34d399' : textMuted }}
              >
                {showIteration ? 'Hide refinement' : 'Refinement'}
              </button>
            ) : null}
          </div>

          {currentSchema != null && showIteration ? (
            <form onSubmit={onIterate} className="space-y-3">
              <textarea
                value={iterationPrompt}
                onChange={(e) => setIterationPrompt(e.target.value)}
                placeholder="What should change?"
                rows={3}
                className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none ring-0"
                style={{
                  border: `1px solid ${hairline}`,
                  background: inputBg,
                  color: isDark ? '#fafafa' : '#0f172a',
                }}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIterationPrompt('')}
                  className="text-[12px] font-medium"
                  style={{ color: textMuted }}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={!iterationPrompt.trim() || isGenerating}
                  className="rounded-lg px-4 py-2 text-[12px] font-semibold disabled:opacity-35"
                  style={{
                    background: isDark ? '#e4e4e7' : '#0f172a',
                    color: isDark ? '#09090b' : '#fafafa',
                  }}
                >
                  Apply
                </button>
              </div>
            </form>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the page..."
              rows={4}
              className="w-full resize-none rounded-lg px-3 py-3 text-[15px] leading-relaxed outline-none ring-0 placeholder:text-zinc-500"
              style={{
                border: `1px solid ${hairline}`,
                background: inputBg,
                color: isDark ? '#fafafa' : '#0f172a',
              }}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="rounded-lg px-5 py-2.5 text-[13px] font-semibold disabled:opacity-35"
                style={{
                  background: isDark ? '#f8fafc' : '#0f172a',
                  color: isDark ? '#09090b' : '#fafafa',
                }}
              >
                {isGenerating ? 'Please wait...' : currentSchema ? 'Send' : 'Generate'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
