'use client';

import React from 'react';
import {
  Check,
  Code,
  ExternalLink,
  FileJson,
  Globe,
  Package,
} from 'lucide-react';
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

/** Export menu keeps tiny icons for scanability; top bar is text-first. */
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
  const stroke = isDark ? 'rgba(82,82,91,0.55)' : 'rgba(203,213,225,0.85)';
  const bg = isDark ? '#09090b' : '#f8fafc';
  const panel = isDark ? '#101012' : '#ffffff';

  const muted = isDark ? '#71717a' : '#64748b';

  const linkBtn = `text-[13px] font-medium underline-offset-4 hover:underline ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" style={{ background: bg }}>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-4 sm:p-5">
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl"
          style={{
            border: `1px solid ${stroke}`,
            background: panel,
          }}
        >
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
            style={{ borderBottom: `1px solid ${stroke}` }}
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
              <span className="text-[14px] font-medium tracking-tight" style={{ color: isDark ? '#fafafa' : '#0f172a' }}>
                App preview
              </span>
              <span className="text-[13px]" style={{ color: muted }}>
                {currentSchema ? 'Showing layout' : 'Idle'}
              </span>
              <div className="flex items-center gap-1" role="tablist">
                <button
                  role="tab"
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="rounded-md px-3 py-1.5 text-[12px] font-medium"
                  style={{
                    background: activeTab === 'preview' ? (isDark ? '#27272a' : '#f1f5f9') : 'transparent',
                    color: activeTab === 'preview' ? (isDark ? '#fafafa' : '#0f172a') : muted,
                  }}
                >
                  Canvas
                </button>
                <button
                  role="tab"
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className="rounded-md px-3 py-1.5 text-[12px] font-medium"
                  style={{
                    background: activeTab === 'code' ? (isDark ? '#27272a' : '#f1f5f9') : 'transparent',
                    color: activeTab === 'code' ? (isDark ? '#fafafa' : '#0f172a') : muted,
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
                      <button onClick={() => onExport('json')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-zinc-500/10" style={{ color: isDark ? '#e4e4e7' : '#404040' }} type="button">
                        <FileJson size={14} />
                        JSON schema
                      </button>
                      <button onClick={() => onExport('html')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-zinc-500/10" style={{ color: isDark ? '#e4e4e7' : '#404040' }} type="button">
                        <ExternalLink size={14} />
                        HTML bundle
                      </button>
                      <button onClick={() => onExport('react')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-zinc-500/10" style={{ color: isDark ? '#e4e4e7' : '#404040' }} type="button">
                        <Code size={14} />
                        React starter
                      </button>
                      <div className="my-1 h-px" style={{ background: stroke }} />
                      <button onClick={() => onExport('static-tailwind')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-zinc-500/10" style={{ color: isDark ? '#e4e4e7' : '#404040' }} type="button">
                        <Globe size={14} />
                        Static + Tailwind CDN
                      </button>
                      <button onClick={() => onExport('kit')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-zinc-500/10" style={{ color: isDark ? '#e4e4e7' : '#404040' }} type="button">
                        <Package size={14} />
                        Deploy kit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden" style={{ background: isDark ? '#050508' : '#fafafa' }}>
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
                <div className="flex h-full min-h-[280px] items-center px-10 py-14">
                  <div className="max-w-[28rem]" style={{ color: isDark ? '#a1a1aa' : '#64748b' }}>
                    <p className="text-[15px] font-normal leading-[1.7]" style={{ color: isDark ? '#d4d4d8' : '#475569' }}>
                      Nothing rendered yet.
                    </p>
                    <p className="mt-4 text-[14px] leading-relaxed">
                      Use the agent on the left to describe what you want. There are no shortcuts or starter prompts in
                      this panel until you&apos;ve generated a layout.
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
            <div className="shrink-0 px-5 py-2.5" style={{ borderTop: `1px solid ${stroke}` }}>
              <p className="text-center text-[12px]" style={{ color: muted }}>
                {`${currentSchema.name} · ${currentSchema.sections.length} sections`}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
