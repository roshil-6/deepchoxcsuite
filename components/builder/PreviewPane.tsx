'use client';

import React from 'react';
import type { UISchema } from '@/lib/uiSchema';
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
  selectedSectionIndex: number;
  onSelectSection: (index: number) => void;
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
}: PreviewPaneProps) {
  const stroke = isDark ? 'rgba(82,82,91,0.5)' : 'rgba(203,213,225,0.9)';
  const muted = isDark ? '#71717a' : '#64748b';
  const linkBtn = `text-[13px] font-medium underline-offset-4 hover:underline ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`;
  const canvasInset = isDark ? '#050508' : '#f4f4f5';
  const tabTrack = isDark ? 'rgba(24,24,27,0.85)' : 'rgba(241,245,249,1)';

  const panelBg = isDark ? 'rgba(11,11,13,0.94)' : 'rgba(255,255,255,0.96)';
  const panelShadow = isDark
    ? '0 22px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.045) inset'
    : '0 20px 50px rgba(15,23,42,0.1), 0 0 0 1px rgba(255,255,255,0.85) inset';

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border"
      style={{
        borderColor: stroke,
        background: panelBg,
        boxShadow: panelShadow,
        backdropFilter: 'blur(14px)',
      }}
    >
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
        style={{ borderColor: stroke }}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <span className="text-[14px] font-medium tracking-tight" style={{ color: isDark ? '#fafafa' : '#0f172a' }}>
            App preview
          </span>
          <span className="text-[13px]" style={{ color: muted }}>
            {currentSchema ? 'Showing layout' : 'Idle'}
          </span>
          <div
            className="inline-flex items-center rounded-lg p-1"
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
          <div className="flex shrink-0 flex-wrap items-center gap-4">
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
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden" style={{ background: canvasInset }}>
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
            <div className="flex h-full min-h-[280px] items-center px-8 py-12 sm:px-10">
              <div className="max-w-[28rem]" style={{ color: isDark ? '#a1a1aa' : '#64748b' }}>
                <p className="text-[15px] font-normal leading-[1.7]" style={{ color: isDark ? '#d4d4d8' : '#475569' }}>
                  Nothing rendered yet.
                </p>
                <p className="mt-4 text-[14px] leading-relaxed">
                  Use the agent on the left to describe what you want. Starter prompts stay out of this pane until there
                  is a layout.
                </p>
              </div>
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
