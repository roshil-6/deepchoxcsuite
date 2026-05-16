'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { UISchema, BuildUIResponse, BuilderHistoryItem } from '@/lib/uiSchema';
import { sanitizeSchemaForUi } from '@/lib/builderSafety';
import { generateStandaloneHTML, generateReactCode } from '@/lib/builderCodegen';
import { generateStandaloneTailwindHtml, getDeployKitFiles } from '@/lib/builderExportDeploy';
import {
  loadHistory,
  saveToHistory,
  createHistoryItem,
  deleteFromHistory,
  duplicateHistoryItem,
  downloadSchemaAsJSON,
  updateSchema,
} from '@/lib/builderStorage';
import { useTheme } from '@/lib/ThemeContext';
import { PromptInput } from './builder/PromptInput';
import { HistorySidebar } from './builder/HistorySidebar';
import { PreviewPane } from './builder/PreviewPane';
import { SectionStudio } from './builder/SectionStudio';

export function BuilderView() {
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === 'dark';

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSchema, setCurrentSchema] = useState<UISchema | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<BuilderHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [iterationPrompt, setIterationPrompt] = useState('');
  const [showIteration, setShowIteration] = useState(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [showSectionStudio, setShowSectionStudio] = useState(false);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const generateUI = useCallback(async (userPrompt: string, previousSchema?: UISchema) => {
    const normalizedPrevious = previousSchema ? sanitizeSchemaForUi(previousSchema) : undefined;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/build-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          previousSchema: normalizedPrevious,
          iteration: !!normalizedPrevious,
        }),
      });

      const data = await res.json() as BuildUIResponse;

      if (!res.ok) {
        throw new Error(data.schema ? 'Failed to generate' : (data as unknown as { error: string }).error || 'Failed to generate UI');
      }

      const safe = sanitizeSchemaForUi(data.schema);
      setCurrentSchema(safe);
      setSelectedSectionIndex(0);
      setSuggestions(data.suggestions || []);
      setPrompt('');
      setIterationPrompt('');
      setShowIteration(false);

      // Save to history
      const historyItem = createHistoryItem(safe.name, userPrompt, safe);
      saveToHistory(historyItem);
      setHistory(loadHistory());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    generateUI(prompt);
  };

  const handleIterate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!iterationPrompt.trim() || !currentSchema) return;
    generateUI(iterationPrompt, currentSchema);
  };

  const loadFromHistory = (item: BuilderHistoryItem) => {
    setCurrentSchema(sanitizeSchemaForUi(item.schema));
    setSelectedSectionIndex(0);
    setPrompt('');
    setError(null);
    setShowHistory(false);
    setShowIteration(false);
  };

  const handleDelete = (id: string) => {
    deleteFromHistory(id);
    setHistory(loadHistory());
    if (currentSchema?.id === id) {
      setCurrentSchema(null);
    }
  };

  const handleDuplicate = (item: BuilderHistoryItem) => {
    const newItem = duplicateHistoryItem(item);
    saveToHistory(newItem);
    setHistory(loadHistory());
    loadFromHistory(newItem);
  };

  const handleSchemaChange = (next: UISchema) => {
    const sanitized = sanitizeSchemaForUi(next);
    setCurrentSchema(sanitized);
    if (sanitized.sections.length === 0) setSelectedSectionIndex(0);
    else if (selectedSectionIndex >= sanitized.sections.length)
      setSelectedSectionIndex(sanitized.sections.length - 1);
    updateSchema(sanitized);
    setHistory(loadHistory());
  };

  const handleExport = async (format: 'json' | 'html' | 'react' | 'static-tailwind' | 'kit') => {
    if (!currentSchema) return;

    const slug = currentSchema.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80) || 'landing';

    switch (format) {
      case 'json':
        downloadSchemaAsJSON(currentSchema);
        break;
      case 'html':
        downloadFile(generateStandaloneHTML(currentSchema), `${slug}.html`, 'text/html');
        break;
      case 'react':
        downloadFile(generateReactCode(currentSchema), `${slug}-flat.tsx`, 'text/typescript');
        break;
      case 'static-tailwind':
        downloadFile(generateStandaloneTailwindHtml(currentSchema), `${slug}-index.html`, 'text/html');
        break;
      case 'kit': {
        const files = getDeployKitFiles(currentSchema);
        for (const f of files) {
          downloadFile(f.body, f.filename, f.mime);
          await new Promise((r) => setTimeout(r, 450));
        }
        break;
      }
    }
    setShowExportMenu(false);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copySchema = () => {
    if (!currentSchema) return;
    navigator.clipboard.writeText(JSON.stringify(sanitizeSchemaForUi(currentSchema), null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applySuggestion = useCallback((suggestion: string) => {
    if (!currentSchema) {
      setPrompt(suggestion);
    } else {
      setIterationPrompt(suggestion);
      setShowIteration(true);
    }
  }, [currentSchema]);

  const openHistory = () => {
    setShowSectionStudio(false);
    setShowHistory(true);
  };

  const toggleSectionStudio = () => {
    if (!currentSchema) return;
    setShowHistory(false);
    setShowSectionStudio((v) => !v);
  };

  const border = isDark ? '#27272a' : '#e4e4e7';
  const headerBg = isDark ? 'rgba(12,12,14,0.95)' : 'rgba(255,255,255,0.94)';

  return (
    <div
      className="relative flex min-h-0 h-full w-full flex-col overflow-hidden"
      style={{ background: isDark ? '#030303' : '#eef0f4' }}
    >
      <header
        className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-5"
        style={{ borderColor: border, background: headerBg, backdropFilter: 'blur(14px)' }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="truncate text-sm font-semibold tracking-tight" style={{ color: isDark ? '#fafafa' : '#18181b' }}>
                App builder
              </span>
              <nav
                className="hidden items-center rounded-lg p-1 sm:inline-flex"
                style={{ background: isDark ? 'rgba(24,24,27,0.9)' : 'rgba(241,245,249,1)' }}
                aria-label="Workspace modes"
              >
                <span
                  className="rounded-md px-3 py-1.5 text-[12px] font-medium"
                  style={{
                    background: isDark ? '#3f3f46' : '#ffffff',
                    color: isDark ? '#fafafa' : '#18181b',
                    boxShadow: !isDark ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                  }}
                >
                  Agent
                </span>
                <span
                  className="rounded-md px-3 py-1.5 text-[12px] font-medium"
                  style={{
                    background: 'transparent',
                    color: isDark ? '#a1a1aa' : '#64748b',
                  }}
                >
                  Preview
                </span>
              </nav>
              {currentSchema ? (
                <span
                  className="inline-flex max-w-[220px] truncate rounded-md border px-2.5 py-1 text-[11px] font-medium sm:max-w-sm"
                  style={{ borderColor: isDark ? 'rgba(63,63,70,0.55)' : '#e4e4e7', color: isDark ? '#a1a1aa' : '#52525b' }}
                >
                  <span className="truncate">{currentSchema.name}</span>
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: isDark ? '#71717a' : '#71717a' }}>
              Chat on the left, live canvas on the right
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {currentSchema ? (
            <button
              type="button"
              onClick={() => toggleSectionStudio()}
              className="h-10 rounded-lg border px-3.5 text-[12px] font-medium sm:min-w-[5.5rem]"
              style={{
                borderColor: showSectionStudio ? 'rgba(45,212,191,0.45)' : isDark ? '#3f3f46' : '#e4e4e7',
                background: showSectionStudio ? (isDark ? 'rgba(6,78,72,0.35)' : 'rgba(236,253,245,1)') : isDark ? '#141416' : '#ffffff',
                color: showSectionStudio ? (isDark ? '#5eead4' : '#0f766e') : isDark ? '#d4d4d8' : '#52525b',
              }}
            >
              Structure
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openHistory()}
            className="h-10 rounded-lg border px-3.5 text-[12px] font-medium"
            style={{
              borderColor: isDark ? '#3f3f46' : '#e4e4e7',
              background: isDark ? '#141416' : '#ffffff',
              color: isDark ? '#e4e4e7' : '#3f3f46',
              boxShadow: !isDark ? '0 1px 2px rgba(15,23,42,0.04)' : 'none',
            }}
          >
            History
            {' '}
            <span style={{ opacity: 0.8 }}>{history.length}</span>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 lg:p-5">
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border lg:flex-row"
          style={{
            borderColor: isDark ? 'rgba(63,63,70,0.45)' : 'rgba(226,232,240,0.95)',
            background: isDark ? 'rgba(9,9,11,0.72)' : 'rgba(255,255,255,0.92)',
            boxShadow: isDark
              ? '0 28px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset'
              : '0 24px 70px rgba(15,23,42,0.1), 0 0 0 1px rgba(255,255,255,0.8) inset',
            backdropFilter: 'blur(12px)',
          }}
        >
          <aside
            className="flex min-h-0 w-full shrink-0 flex-col border-zinc-200 lg:h-full lg:w-[min(380px,34vw)] lg:max-w-[420px] lg:shrink-0 lg:border-b-0 border-b"
            style={{
              background: isDark ? 'rgba(6,6,8,0.35)' : 'rgba(250,250,250,0.65)',
              borderColor: border,
            }}
          >
            {error ? (
              <div
                className="mx-5 mt-4 shrink-0 rounded-lg border px-3 py-2.5 text-[12px]"
                style={{
                  background: '#ef444420',
                  borderColor: '#ef444450',
                  color: '#f87171',
                }}
                role="alert"
              >
                {error}
              </div>
            ) : null}
            <PromptInput
              isDark={isDark}
              prompt={prompt}
              setPrompt={setPrompt}
              iterationPrompt={iterationPrompt}
              setIterationPrompt={setIterationPrompt}
              showIteration={showIteration}
              setShowIteration={setShowIteration}
              currentSchema={currentSchema}
              suggestions={suggestions}
              isGenerating={isGenerating}
              onSubmit={handleSubmit}
              onIterate={handleIterate}
              onApplySuggestion={applySuggestion}
            />
          </aside>

          <div
            className="hidden w-px shrink-0 lg:block"
            style={{ background: isDark ? 'rgba(63,63,70,0.45)' : 'rgba(226,232,240,0.95)' }}
            aria-hidden
          />

          <PreviewPane
            isDark={isDark}
            currentSchema={currentSchema}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            copied={copied}
            onCopySchema={copySchema}
            showExportMenu={showExportMenu}
            setShowExportMenu={setShowExportMenu}
            onExport={handleExport}
            selectedSectionIndex={selectedSectionIndex}
            onSelectSection={setSelectedSectionIndex}
          />
        </div>

        <HistorySidebar
          isDark={isDark}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          history={history}
          currentSchema={currentSchema}
          onLoad={loadFromHistory}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />

        {currentSchema != null && showSectionStudio ? (
          <>
            <button
              type="button"
              aria-label="Close section studio"
              className="fixed inset-0 z-[52] bg-black/45 backdrop-blur-[2px]"
              onClick={() => setShowSectionStudio(false)}
            />
            <div className="fixed bottom-0 right-0 top-[52px] z-[54] flex h-[calc(100dvh-3.25rem)] max-h-[calc(100dvh-3.25rem)] w-[min(100vw,460px)] max-w-full flex-col"
              style={{ background: isDark ? '#060607' : '#ffffff', boxShadow: '-12px 0 48px rgba(0,0,0,0.35)' }}
            >
              <SectionStudio
                isDark={isDark}
                schema={currentSchema}
                onSchemaChange={handleSchemaChange}
                selectedIndex={selectedSectionIndex}
                onSelectIndex={setSelectedSectionIndex}
                onClose={() => setShowSectionStudio(false)}
                className="border-0 shadow-none"
              />
            </div>
          </>
        ) : null}
      </div>

      {showExportMenu ? (
        <div className="fixed inset-0 z-[36]" aria-hidden onClick={() => setShowExportMenu(false)} />
      ) : null}
    </div>
  );
}
