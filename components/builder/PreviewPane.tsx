'use client';

import React from 'react';
import {
  Check,
  Code,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Globe,
  Package,
  Wand2,
} from 'lucide-react';
import type { UISchema } from '@/lib/uiSchema';
import { SUGGESTED_PROMPTS } from '@/lib/uiSchema';
import { DynamicUIRenderer } from './DynamicUIRenderer';

interface PreviewPaneProps {
  isDark: boolean;
  currentSchema: UISchema | null;
  activeTab: 'preview' | 'code';
  setActiveTab: (value: 'preview' | 'code') => void;
  copied: boolean;
  onCopySchema: () => void;
  showExportMenu: boolean;
  setShowExportMenu: (value: boolean) => void;
  onExport: (format: 'json' | 'html' | 'react' | 'static-tailwind' | 'kit') => void;
  onApplySuggestion: (suggestion: string) => void;
  selectedSectionIndex: number;
  onSelectSection: (index: number) => void;
}

function ghostBtn(isDark: boolean) {
  return `inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3.5 text-[12px] font-semibold transition-colors active:scale-[0.98] ${
    isDark
      ? 'border-zinc-600/50 bg-zinc-900/30 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/50'
      : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
  }`;
}

export function PreviewPane({
  isDark,
  currentSchema,
  activeTab,
  setActiveTab,
  copied,
  onCopySchema,
  showExportMenu,
  setShowExportMenu,
  onExport,
  onApplySuggestion,
  selectedSectionIndex,
  onSelectSection,
}: PreviewPaneProps) {
  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      style={{
        background: isDark
          ? 'radial-gradient(ellipse 140% 80% at 50% -20%, rgba(45,212,191,0.07) 0%, transparent 50%), linear-gradient(#080808,#050505)'
          : 'linear-gradient(165deg,#f1f5f9 0%, #e8edf3 40%, #e2e8f0 100%)',
      }}
    >
      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-3 sm:p-4 lg:p-5">
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border"
          style={{
            borderColor: isDark ? 'rgba(63,63,70,0.65)' : 'rgba(209,213,219,1)',
            background: isDark ? 'rgba(12,12,14,0.96)' : 'rgba(255,255,255,0.94)',
            boxShadow: isDark
              ? '0 28px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)'
              : '0 22px 50px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
            style={{ borderColor: isDark ? 'rgba(63,63,70,0.55)' : 'rgba(229,231,235,1)' }}
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <span className="text-[13px] font-semibold tracking-tight" style={{ color: isDark ? '#fafafa' : '#0f172a' }}>
                    App preview
                  </span>
                  {currentSchema ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{
                        borderColor: isDark ? 'rgba(52,211,153,0.4)' : 'rgba(13,148,136,0.35)',
                        color: isDark ? '#6ee7b7' : '#0f766e',
                        background: isDark ? 'rgba(52,211,153,0.08)' : 'rgba(236,253,245,0.95)',
                      }}
                    >
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
                      Synced
                    </span>
                  ) : (
                    <span
                      className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{
                        borderColor: isDark ? '#3f3f46' : '#e5e7eb',
                        color: isDark ? '#71717a' : '#64748b',
                      }}
                    >
                      Waiting
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px]" style={{ color: isDark ? '#71717a' : '#94a3b8' }}>
                  Full-width viewport - resize the window freely
                </p>
              </div>

              <div
                className="flex shrink-0 items-center rounded-xl p-[3px]"
                role="tablist"
                style={{ background: isDark ? '#18181b' : '#f1f5f9' }}
              >
                <button
                  role="tab"
                  aria-selected={activeTab === 'preview'}
                  onClick={() => setActiveTab('preview')}
                  type="button"
                  className="rounded-[10px] px-4 py-2 text-xs font-semibold transition-all"
                  style={{
                    background: activeTab === 'preview' ? (isDark ? '#27272a' : '#ffffff') : 'transparent',
                    color: activeTab === 'preview' ? (isDark ? '#fafafa' : '#0f172a') : isDark ? '#a1a1aa' : '#64748b',
                    boxShadow: activeTab === 'preview' && !isDark ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                  }}
                >
                  Canvas
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'code'}
                  onClick={() => setActiveTab('code')}
                  type="button"
                  className="rounded-[10px] px-4 py-2 text-xs font-semibold transition-all"
                  style={{
                    background: activeTab === 'code' ? (isDark ? '#27272a' : '#ffffff') : 'transparent',
                    color: activeTab === 'code' ? (isDark ? '#fafafa' : '#0f172a') : isDark ? '#a1a1aa' : '#64748b',
                    boxShadow: activeTab === 'code' && !isDark ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                  }}
                >
                  Schema
                </button>
              </div>
            </div>

            {currentSchema ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button onClick={onCopySchema} className={ghostBtn(isDark)} type="button">
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'JSON'}</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-[12px] font-bold tracking-wide transition-colors active:scale-[0.98] ${
                      isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                    type="button"
                  >
                    <Download size={15} strokeWidth={2.25} />
                    Export
                  </button>

                  {showExportMenu && (
                    <div
                      className="absolute right-0 top-full z-40 mt-1.5 w-60 overflow-hidden rounded-xl border shadow-2xl"
                      style={{
                        background: isDark ? '#171717' : '#ffffff',
                        borderColor: isDark ? '#404040' : '#e5e7eb',
                      }}
                    >
                      <button onClick={() => onExport('json')} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium hover:bg-zinc-500/10" style={{ color: isDark ? '#e5e5e5' : '#404040' }} type="button">
                        <FileJson size={14} />
                        JSON schema
                      </button>
                      <button onClick={() => onExport('html')} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium hover:bg-zinc-500/10" style={{ color: isDark ? '#e5e5e5' : '#404040' }} type="button">
                        <ExternalLink size={14} />
                        HTML bundle
                      </button>
                      <button onClick={() => onExport('react')} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium hover:bg-zinc-500/10" style={{ color: isDark ? '#e5e5e5' : '#404040' }} type="button">
                        <Code size={14} />
                        React starter
                      </button>
                      <div className="mx-2 h-px" style={{ background: isDark ? '#404040' : '#f3f4f6' }} />
                      <button onClick={() => onExport('static-tailwind')} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium hover:bg-zinc-500/10" style={{ color: isDark ? '#e5e5e5' : '#404040' }} type="button">
                        <Globe size={14} />
                        Static + Tailwind CDN
                      </button>
                      <button onClick={() => onExport('kit')} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium hover:bg-zinc-500/10" style={{ color: isDark ? '#e5e5e5' : '#404040' }} type="button">
                        <Package size={14} />
                        Deploy kit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden" style={{ background: isDark ? '#050508' : '#f8fafc' }}>
            {activeTab === 'preview' ? (
              currentSchema ? (
                <div className="h-full min-h-0 overflow-auto">
                  <DynamicUIRenderer
                    schema={currentSchema}
                    selectedSectionIndex={selectedSectionIndex}
                    onSelectSection={onSelectSection}
                  />
                </div>
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center p-10">
                  <div className="w-full max-w-md text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border" style={{ borderColor: isDark ? '#3f3f46' : '#e5e7eb', background: isDark ? '#18181b' : '#ffffff' }}>
                      <Wand2 size={34} strokeWidth={1.5} style={{ color: '#7356ee' }} />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold tracking-tight" style={{ color: isDark ? '#fafafa' : '#0f172a' }}>
                      Nothing to preview yet
                    </h3>
                    <p className="mb-8 text-sm leading-relaxed" style={{ color: isDark ? '#a1a1aa' : '#64748b' }}>
                      Describe your UI in the agent panel - we will assemble sections here in real time.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                      {SUGGESTED_PROMPTS.slice(0, 3).map((suggestion, index) => (
                        <button
                          key={`${suggestion}-${index}`}
                          onClick={() => onApplySuggestion(suggestion)}
                          className={`rounded-xl border px-4 py-2.5 text-left text-[12px] font-medium transition-colors ${
                            isDark
                              ? 'border-zinc-600/50 bg-zinc-900/40 text-zinc-200 hover:bg-zinc-800/60'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                          }`}
                          type="button"
                        >
                          {suggestion.length > 48 ? `${suggestion.slice(0, 48)}...` : suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full min-h-[240px] p-4">
                <pre
                  className="h-full min-h-[200px] overflow-auto rounded-xl border p-4 text-xs leading-relaxed"
                  style={{
                    borderColor: isDark ? '#27272a' : '#e5e7eb',
                    background: isDark ? '#0c0c0e' : '#ffffff',
                    color: isDark ? '#d4d4d8' : '#475569',
                  }}
                >
                  {currentSchema ? JSON.stringify(currentSchema, null, 2) : '// Generate a layout to inspect raw schema'}
                </pre>
              </div>
            )}
          </div>

          {/* Bottom strip - mirrors \"Analyzing…\" pills in reference */}
          <div
            className="flex shrink-0 items-center justify-center border-t px-4 py-2.5"
            style={{ borderColor: isDark ? 'rgba(63,63,70,0.45)' : 'rgba(229,231,235,1)', background: isDark ? 'rgba(21,49,53,0.25)' : 'rgba(236,253,245,0.85)' }}
          >
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: isDark ? '#5eead4' : '#0f766e' }}>
              {currentSchema ? `${currentSchema.name} · ${currentSchema.sections.length} sections` : 'Compose a prompt to hydrate this canvas'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
