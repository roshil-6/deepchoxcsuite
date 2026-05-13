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
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: isDark ? '#0a0a0a' : '#f5f5f7' }}>
      <div
        className="relative z-20 h-14 border-b flex items-center justify-between px-4 flex-shrink-0"
        style={{ background: isDark ? '#0c0c0e' : '#ffffff', borderColor: isDark ? '#27272a' : '#e4e4e7' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: isDark ? '#27272a' : '#f4f4f5' }}>
            <button
              onClick={() => setActiveTab('preview')}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
              style={{
                background: activeTab === 'preview' ? (isDark ? '#3f3f46' : '#ffffff') : 'transparent',
                color: activeTab === 'preview' ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#a1a1aa' : '#71717a'),
              }}
              type="button"
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
              style={{
                background: activeTab === 'code' ? (isDark ? '#3f3f46' : '#ffffff') : 'transparent',
                color: activeTab === 'code' ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#a1a1aa' : '#71717a'),
              }}
              type="button"
            >
              Code
            </button>
          </div>
        </div>

        {currentSchema && (
          <div className="flex items-center gap-2">
            <button
              onClick={onCopySchema}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: isDark ? '#27272a' : '#f4f4f5', color: isDark ? '#d4d4d8' : '#52525b' }}
              type="button"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: '#7456ff', color: '#ffffff' }}
                type="button"
              >
                <Download size={14} />
                Export
              </button>

              {showExportMenu && (
                <div
                  className="absolute right-0 top-full mt-1 w-56 rounded-lg border shadow-lg z-30 overflow-hidden"
                  style={{ background: isDark ? '#18181b' : '#ffffff', borderColor: isDark ? '#3f3f46' : '#e4e4e7' }}
                >
                  <button onClick={() => onExport('json')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:opacity-80" style={{ color: isDark ? '#d4d4d8' : '#52525b' }} type="button">
                    <FileJson size={14} />
                    JSON Schema
                  </button>
                  <button onClick={() => onExport('html')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:opacity-80" style={{ color: isDark ? '#d4d4d8' : '#52525b' }} type="button">
                    <ExternalLink size={14} />
                    HTML (inline)
                  </button>
                  <button onClick={() => onExport('react')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:opacity-80" style={{ color: isDark ? '#d4d4d8' : '#52525b' }} type="button">
                    <Code size={14} />
                    React starter
                  </button>
                  <div className="h-px my-0.5" style={{ background: isDark ? '#3f3f46' : '#e4e4e7' }} />
                  <button onClick={() => onExport('static-tailwind')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:opacity-80" style={{ color: isDark ? '#d4d4d8' : '#52525b' }} type="button">
                    <Globe size={14} />
                    Static + Tailwind CDN
                  </button>
                  <button onClick={() => onExport('kit')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:opacity-80" style={{ color: isDark ? '#d4d4d8' : '#52525b' }} type="button">
                    <Package size={14} />
                    Deploy kit (all files)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'preview' ? (
          currentSchema ? (
            <DynamicUIRenderer
              schema={currentSchema}
              selectedSectionIndex={selectedSectionIndex}
              onSelectSection={onSelectSection}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: isDark ? '#27272a' : '#f4f4f5' }}>
                  <Wand2 size={32} style={{ color: '#7456ff' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: isDark ? '#ffffff' : '#18181b' }}>
                  Create your first UI
                </h3>
                <p className="text-sm mb-6" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
                  Describe what you want and AI will generate a working interface.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_PROMPTS.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={`${suggestion}-${index}`}
                      onClick={() => onApplySuggestion(suggestion)}
                      className="px-3 py-1.5 text-xs rounded-full border"
                      style={{
                        background: isDark ? '#18181b' : '#fafafa',
                        borderColor: isDark ? '#3f3f46' : '#e4e4e7',
                        color: isDark ? '#a1a1aa' : '#71717a',
                      }}
                      type="button"
                    >
                      {suggestion.slice(0, 40)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="h-full p-4">
            <pre className="h-full overflow-auto p-4 rounded-lg text-xs font-mono" style={{ background: isDark ? '#18181b' : '#fafafa', color: isDark ? '#d4d4d8' : '#52525b' }}>
              {currentSchema ? JSON.stringify(currentSchema, null, 2) : '// Generate a UI to see the schema'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
