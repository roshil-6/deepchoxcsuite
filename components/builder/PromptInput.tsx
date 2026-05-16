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
  const stroke = isDark ? 'rgba(63,63,70,0.55)' : 'rgba(226,232,240,1)';

  const floatShadowPanel = isDark
    ? '0 22px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.045) inset'
    : '0 20px 50px rgba(15,23,42,0.1), 0 0 0 1px rgba(255,255,255,0.85) inset';
  const floatShadowBar = isDark
    ? '0 18px 40px rgba(0,0,0,0.55), 0 42px 88px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.07) inset'
    : '0 14px 36px rgba(15,23,42,0.1), 0 28px 72px rgba(15,23,42,0.12), 0 0 0 1px rgba(255,255,255,1) inset';

  const panelBg = isDark ? 'rgba(11,11,13,0.94)' : 'rgba(255,255,255,0.96)';
  const barBg = isDark ? 'rgba(17,17,20,0.98)' : 'rgba(255,255,255,0.99)';
  const inputWellBg = isDark ? 'rgba(3,3,4,0.65)' : '#f1f5f9';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Floating context / instructions */}
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border"
        style={{
          borderColor: stroke,
          background: panelBg,
          boxShadow: floatShadowPanel,
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-8 sm:px-6 sm:py-10">
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
                          className="rounded-xl px-3.5 py-2 text-left text-[13px] leading-snug transition-colors"
                          style={{
                            border: `1px solid ${stroke}`,
                            background: isDark ? 'rgba(24,24,27,0.45)' : 'rgba(248,250,252,1)',
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
      </div>

      {/* Lifted dock: sits above the rail with a stronger float + inner input well */}
      <div className="relative z-30 -mt-2 shrink-0 sm:-mt-3">
        <div
          className="rounded-[1.35rem] border px-4 py-4 sm:px-5 sm:py-5"
          style={{
            borderColor: stroke,
            background: barBg,
            boxShadow: floatShadowBar,
            backdropFilter: 'blur(18px) saturate(1.2)',
          }}
        >
        <div className="mx-auto max-w-[400px] space-y-4">
          <div
            className="flex flex-wrap items-center gap-3 border-b pb-3"
            style={{ borderColor: isDark ? 'rgba(63,63,70,0.35)' : 'rgba(226,232,240,0.85)' }}
          >
            <span className="text-[13px] font-medium" style={{ color: isDark ? '#fafafa' : '#0f172a' }}>
              Message
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-[12px]" style={{ color: isGenerating ? '#34d399' : textMuted }}>
                {isGenerating ? 'Working' : 'Ready'}
              </span>
              {currentSchema ? (
                <button
                  type="button"
                  onClick={() => setShowIteration(!showIteration)}
                  className="rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors"
                  style={{
                    color: showIteration ? (isDark ? '#6ee7b7' : '#0f766e') : textMuted,
                    background: showIteration ? (isDark ? 'rgba(45,212,165,0.12)' : 'rgba(236,253,245,1)') : 'transparent',
                  }}
                >
                  {showIteration ? 'Hide refinement' : 'Refinement'}
                </button>
              ) : null}
            </div>
          </div>

          {currentSchema != null && showIteration ? (
            <form onSubmit={onIterate} className="space-y-3">
              <div
                className="rounded-2xl p-px"
                style={{
                  background: isDark ? 'linear-gradient(180deg, rgba(63,63,70,0.5), rgba(24,24,27,0.35))' : 'linear-gradient(180deg, #e2e8f0, #f1f5f9)',
                  boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 1px rgba(255,255,255,0.9)',
                }}
              >
                <div
                  className="rounded-[0.9rem] p-3 sm:p-3.5"
                  style={{
                    background: inputWellBg,
                    boxShadow: isDark ? '0 3px 18px rgba(0,0,0,0.3)' : '0 3px 16px rgba(15,23,42,0.05)',
                  }}
                >
                  <textarea
                    value={iterationPrompt}
                    onChange={(e) => setIterationPrompt(e.target.value)}
                    placeholder="What should change?"
                    rows={3}
                    className="w-full resize-none border-0 bg-transparent px-0.5 py-0.5 text-[13px] leading-relaxed outline-none ring-0"
                    style={{ color: isDark ? '#fafafa' : '#0f172a' }}
                  />
                </div>
              </div>
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
            <div
              className="rounded-2xl p-px"
              style={{
                background: isDark ? 'linear-gradient(180deg, rgba(63,63,70,0.6), rgba(24,24,27,0.4))' : 'linear-gradient(180deg, #e2e8f0, #f1f5f9)',
                boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 1px rgba(255,255,255,0.9)',
              }}
            >
              <div
                className="rounded-[0.9rem] px-3.5 py-3 sm:px-4 sm:py-3.5"
                style={{
                  background: inputWellBg,
                  boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.35)' : '0 4px 20px rgba(15,23,42,0.06)',
                }}
              >
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the page..."
                  rows={currentSchema ? 3 : 4}
                  className="min-h-[6.5rem] w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed outline-none ring-0 placeholder:text-zinc-500 sm:min-h-[7.5rem]"
                  style={{ color: isDark ? '#fafafa' : '#0f172a' }}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="rounded-xl px-5 py-2.5 text-[13px] font-semibold disabled:opacity-35"
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
    </div>
  );
}
