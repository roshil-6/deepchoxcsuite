'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Loader2, Sparkles, X } from 'lucide-react';
import type { UISchema } from '@/lib/uiSchema';
import { DynamicUIRenderer } from './DynamicUIRenderer';
import { MatrixBackdrop } from './MatrixBackdrop';

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
  selectedSectionIndex: number;
  onSelectSection: (index: number) => void;
  onDismiss?: () => void;
  /** Large pill over empty canvas while the agent is working (mock “Initializing agent…”). */
  ambientGenerating?: boolean;
}

/** Preview in its own floating panel (elevated chrome + canvas inset). */
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
  selectedSectionIndex,
  onSelectSection,
  onDismiss,
  ambientGenerating = false,
}: PreviewPaneProps) {
  const stroke = isDark ? 'rgba(82,82,91,0.5)' : 'rgba(203,213,225,0.9)';
  const muted = isDark ? '#71717a' : '#64748b';
  const linkBtn = `text-[13px] font-medium underline-offset-4 hover:underline ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`;
  const canvasInset = isDark ? '#050508' : '#f4f4f5';
  const tabTrack = isDark ? 'rgba(24,24,27,0.85)' : 'rgba(241,245,249,1)';

  const panelBg = isDark ? 'rgba(9,9,11,0.98)' : 'rgba(255,255,255,0.96)';
  const panelShadow = isDark
    ? '0 24px 70px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.035)'
    : '0 20px 50px rgba(15,23,42,0.1), inset 0 1px 0 rgba(255,255,255,0.85)';

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border"
      style={{
        borderColor: stroke,
        background: panelBg,
        boxShadow: panelShadow,
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex shrink-0 flex-col" style={{ borderColor: stroke }}>
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : stroke}` }}
        >
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: isDark ? '#f4f4f5' : '#0f172a' }}>
            App Preview
          </span>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-opacity hover:opacity-90"
              style={{
                borderColor: isDark ? 'rgba(82,82,91,0.45)' : stroke,
                background: isDark ? 'rgba(18,18,21,0.9)' : '#ffffff',
                color: isDark ? '#fafafa' : '#0f172a',
              }}
              aria-label="Hide preview panel"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          ) : (
            <span className="h-9 w-9 shrink-0" aria-hidden />
          )}
        </div>

        <div
          className="flex flex-col gap-3 px-4 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2 sm:px-6"
          style={{ background: isDark ? 'rgba(6,7,10,0.45)' : 'rgba(249,250,251,0.92)' }}
        >
          <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-1 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <span className="text-[13px]" style={{ color: muted }}>
              {currentSchema ? 'Showing layout' : 'Idle'}
            </span>
            <div
              className="inline-flex items-center rounded-lg p-[3px]"
              style={{ background: tabTrack }}
              role="tablist"
              aria-label="Preview mode"
            >
              <button
                role="tab"
                aria-selected={activeTab === 'preview'}
                type="button"
                onClick={() => setActiveTab('preview')}
                className="rounded-md px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: activeTab === 'preview' ? (isDark ? '#3f3f46' : '#ffffff') : 'transparent',
                  color: activeTab === 'preview' ? (isDark ? '#fafafa' : '#0f172a') : muted,
                  boxShadow: activeTab === 'preview' && !isDark ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                }}
              >
                Canvas
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'code'}
                type="button"
                onClick={() => setActiveTab('code')}
                className="rounded-md px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: activeTab === 'code' ? (isDark ? '#3f3f46' : '#ffffff') : 'transparent',
                  color: activeTab === 'code' ? (isDark ? '#fafafa' : '#0f172a') : muted,
                  boxShadow: activeTab === 'code' && !isDark ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                }}
              >
                Schema
              </button>
            </div>
          </div>

          {currentSchema ? (
            <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:w-auto sm:justify-end">
              <button type="button" className={linkBtn} onClick={onCopySchema}>
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className={linkBtn}
                >
                  Export
                </button>
                {showExportMenu && (
                  <div
                    className="absolute right-0 top-full z-40 mt-2 w-56 rounded-lg border py-1 shadow-lg"
                    style={{ background: isDark ? '#18181b' : '#ffffff', borderColor: stroke }}
                  >
                    <button onClick={() => onExport('json')} className="w-full px-4 py-2 text-left text-xs hover:bg-zinc-500/10" style={{ color: isDark ? '#e4e4e7' : '#404040' }} type="button">
                      JSON schema
                    </button>
                    <button onClick={() => onExport('html')} className="w-full px-4 py-2 text-left text-xs hover:bg-zinc-500/10" style={{ color: isDark ? '#e4e4e7' : '#404040' }} type="button">
                      HTML bundle
                    </button>
                    <button onClick={() => onExport('react')} className="w-full px-4 py-2 text-left text-xs hover:bg-zinc-500/10" style={{ color: isDark ? '#e4e4e7' : '#404040' }} type="button">
                      React starter
                    </button>
                    <div className="my-1 h-px" style={{ background: stroke }} />
                    <button onClick={() => onExport('static-tailwind')} className="w-full px-4 py-2 text-left text-xs hover:bg-zinc-500/10" style={{ color: isDark ? '#e4e4e7' : '#404040' }} type="button">
                      Static + Tailwind CDN
                    </button>
                    <button onClick={() => onExport('kit')} className="w-full px-4 py-2 text-left text-xs hover:bg-zinc-500/10" style={{ color: isDark ? '#e4e4e7' : '#404040' }} type="button">
                      Deploy kit
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="min-w-[1px]" aria-hidden />
          )}
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          background: canvasInset,
          backgroundImage: isDark
            ? 'radial-gradient(circle at 20% -10%,rgba(45,212,191,0.07),transparent 52%), radial-gradient(circle at 80% 0%,rgba(6,182,212,0.06),transparent 45%)'
            : undefined,
        }}
      >
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
            <div className="relative flex h-full min-h-[280px] flex-col items-center justify-start px-6 py-10 sm:px-10 sm:py-14">
              {isDark ? <MatrixBackdrop /> : null}
              <div
                className="relative z-[2] mx-auto w-full max-w-md rounded-[1.85rem] border px-7 pb-10 pt-9 text-center shadow-2xl backdrop-blur-md sm:max-w-lg sm:px-11 sm:pb-12 sm:pt-11"
                style={{
                  borderColor: isDark ? 'rgba(63,63,70,0.5)' : 'rgba(226,232,240,1)',
                  background: isDark ? 'rgba(13,17,23,0.82)' : 'rgba(255,255,255,0.93)',
                  boxShadow: isDark
                    ? '0 48px 100px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)'
                    : '0 40px 80px rgba(15,23,42,0.12)',
                }}
              >
                <div
                  className="mx-auto mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border shadow-lg"
                  style={{
                    borderColor: isDark ? 'rgba(45,212,191,0.32)' : 'rgba(20,184,166,0.28)',
                    background: isDark
                      ? 'linear-gradient(150deg,rgba(6,78,72,0.55),rgba(17,24,39,0.65))'
                      : 'linear-gradient(150deg,#ecfdf5,#cffafe)',
                    boxShadow: isDark ? '0 18px 44px rgba(6,78,72,0.28)' : '0 14px 36px rgba(20,184,166,0.2)',
                  }}
                >
                  <Sparkles className="h-7 w-7" style={{ color: isDark ? '#6ee7b7' : '#0d9488' }} strokeWidth={1.5} />
                </div>
                <h2
                  className="text-[21px] font-semibold leading-tight tracking-[-0.02em] sm:text-[23px]"
                  style={{ color: isDark ? '#fafafa' : '#0f172a' }}
                >
                  Deploy your application
                </h2>
                <p
                  className="mx-auto mt-3 max-w-[22rem] text-[14px] leading-relaxed"
                  style={{ color: isDark ? '#a1a1aa' : '#64748b' }}
                >
                  Make your app publicly available once the agent finishes the first pass. Describe the experience in the
                  agent column and this canvas fills in automatically.
                </p>

                <div className="relative mx-auto mt-9 max-w-[320px]">
                  <button
                    type="button"
                    aria-label="Previous slide"
                    className="absolute -left-1 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border md:-left-3"
                    style={{
                      borderColor: isDark ? 'rgba(63,63,70,0.55)' : '#e2e8f0',
                      background: isDark ? '#101014' : '#ffffff',
                      color: isDark ? '#d4d4d8' : '#475569',
                    }}
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <div
                    className="aspect-[16/10] overflow-hidden rounded-2xl border shadow-inner"
                    style={{
                      borderColor: isDark ? 'rgba(63,63,70,0.45)' : '#e2e8f0',
                      background: isDark
                        ? 'linear-gradient(168deg,#0a1018 0%,#111827 45%,#0f172a 100%)'
                        : 'linear-gradient(168deg,#f8fafc,#e2e8f0)',
                      boxShadow: isDark ? 'inset 0 0 0 1px rgba(255,255,255,0.04)' : 'inset 0 1px 2px rgba(15,23,42,0.06)',
                    }}
                  >
                    <div
                      className="flex h-full min-h-[120px] w-full items-center justify-center p-5"
                      style={{
                        backgroundImage: isDark
                          ? 'radial-gradient(circle at 50% 20%,rgba(45,212,191,0.08),transparent 55%),radial-gradient(circle at 80% 80%,rgba(59,130,246,0.06),transparent 50%)'
                          : 'radial-gradient(circle at 50% 30%,rgba(45,212,191,0.12),transparent 50%)',
                      }}
                    >
                      <div
                        className="h-[72%] w-[88%] rounded-xl border"
                        style={{
                          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)',
                          background: isDark ? 'rgba(6,9,14,0.65)' : 'rgba(255,255,255,0.75)',
                        }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Next slide"
                    className="absolute -right-1 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border md:-right-3"
                    style={{
                      borderColor: isDark ? 'rgba(63,63,70,0.55)' : '#e2e8f0',
                      background: isDark ? '#101014' : '#ffffff',
                      color: isDark ? '#d4d4d8' : '#475569',
                    }}
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
                <div className="mt-6 flex items-center justify-center gap-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: i === 0 ? 28 : 8,
                        background:
                          i === 0
                            ? isDark
                              ? '#34d399'
                              : '#14b8a6'
                            : isDark
                              ? 'rgba(255,255,255,0.12)'
                              : 'rgba(15,23,42,0.14)',
                      }}
                    />
                  ))}
                </div>
              </div>
              {ambientGenerating ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-10 z-[3] flex justify-center px-6">
                  <div
                    className="inline-flex items-center gap-3 rounded-full border px-7 py-3 text-[14px] font-semibold shadow-2xl"
                    style={{
                      borderColor: isDark ? 'rgba(63,63,70,0.55)' : 'rgba(203,213,225,1)',
                      background: isDark ? 'rgba(12,12,14,0.92)' : '#ffffff',
                      color: isDark ? '#fafafa' : '#0f172a',
                    }}
                  >
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-400" aria-hidden />
                    Initializing agent..
                  </div>
                </div>
              ) : null}
            </div>
          )
        ) : (
          <div className="h-full min-h-[200px] p-4">
            <pre
              className="h-full min-h-[160px] overflow-auto rounded-lg p-4 text-[12px] leading-relaxed"
              style={{
                border: `1px solid ${stroke}`,
                background: isDark ? '#0c0c0e' : '#ffffff',
                color: muted,
              }}
            >
              {currentSchema ? JSON.stringify(currentSchema, null, 2) : '// Generate a layout first.'}
            </pre>
          </div>
        )}
      </div>

      {currentSchema ? (
        <div className="shrink-0 border-t px-5 py-2.5" style={{ borderColor: stroke, background: isDark ? 'rgba(5,5,6,0.35)' : 'rgba(249,250,251,0.8)' }}>
          <p className="text-center text-[12px]" style={{ color: muted }}>
            {`${currentSchema.name} · ${currentSchema.sections.length} sections`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
