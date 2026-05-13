'use client';

import React from 'react';
import { Lightbulb, RefreshCw, Sparkles } from 'lucide-react';
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

  return (
    <div className="p-4 space-y-4 flex-1 overflow-y-auto">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
          What would you like to build?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A SaaS landing page with dark theme, hero section, feature grid, and pricing..."
          className="w-full h-32 px-3 py-2 text-sm rounded-lg border resize-none"
          style={{
            background: isDark ? '#18181b' : '#fafafa',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            color: isDark ? '#ffffff' : '#18181b',
          }}
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isGenerating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
          style={{ background: '#7456ff', color: '#ffffff' }}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate UI
            </>
          )}
        </button>
      </form>

      {currentSchema && (
        <div className="pt-4 border-t" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
          <button
            onClick={() => setShowIteration(!showIteration)}
            className="flex items-center gap-2 text-xs font-medium mb-3"
            style={{ color: '#7456ff' }}
            type="button"
          >
            <RefreshCw size={14} />
            {showIteration ? 'Hide refinement' : 'Refine this UI'}
          </button>

          {showIteration && (
            <form onSubmit={onIterate} className="space-y-2">
              <input
                type="text"
                value={iterationPrompt}
                onChange={(e) => setIterationPrompt(e.target.value)}
                placeholder="Add a testimonials section..."
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{
                  background: isDark ? '#18181b' : '#fafafa',
                  borderColor: isDark ? '#3f3f46' : '#e4e4e7',
                  color: isDark ? '#ffffff' : '#18181b',
                }}
              />
              <button
                type="submit"
                disabled={!iterationPrompt.trim() || isGenerating}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: isDark ? '#27272a' : '#f4f4f5', color: isDark ? '#ffffff' : '#18181b' }}
              >
                Apply Changes
              </button>
            </form>
          )}
        </div>
      )}

      <div className="pt-4 border-t" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Lightbulb size={14} style={{ color: '#fbbf24' }} />
          <span className="text-xs font-medium" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
            {currentSchema ? 'Suggested refinements' : 'Try these examples'}
          </span>
        </div>
        <div className="space-y-1.5">
          {(currentSchema ? suggestions : SUGGESTED_PROMPTS.slice(0, 4)).map((suggestion, index) => (
            <button
              key={`${suggestion}-${index}`}
              onClick={() => onApplySuggestion(suggestion)}
              className="w-full text-left px-3 py-2 text-xs rounded-md transition-colors"
              style={{
                background: isDark ? '#18181b' : '#fafafa',
                color: isDark ? '#d4d4d8' : '#52525b',
              }}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
