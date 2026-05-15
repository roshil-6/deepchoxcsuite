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
import { History, Layers, Wand2 } from 'lucide-react';
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
        className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-5"
        style={{ borderColor: border, background: headerBg, backdropFilter: 'blur(14px)' }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: isDark ? '#7456ff28' : '#7456ff16' }}
          >
            <Wand2 size={18} strokeWidth={2} style={{ color: '#b6a5ff' }} />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="truncate text-sm font-semibold tracking-tight" style={{ color: isDark ? '#fafafa' : '#18181b' }}>
                App builder
              </span>
              {currentSchema ? (
                <span className="inline-flex items-center gap-1.5 truncate text-[12px]" style={{ color: isDark ? '#a1a1aa' : '#52525b' }}>
                  <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                  <span className="truncate">{currentSchema.name}</span>
                </span>
              ) : null}
            </div>
            <p className="truncate text-[11px]" style={{ color: isDark ? '#71717a' : '#71717a' }}>
              Prompt on the left - full-width preview on the right.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {currentSchema ? (
            <button
              type="button"
              onClick={() => toggleSectionStudio()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors"
              style={{
                border: showSectionStudio ? undefined : `1px solid ${isDark ? '#3f3f46' : '#e4e4e7'}`,
                background: showSectionStudio ? (isDark ? 'rgba(52,211,153,0.12)' : 'rgba(236,253,245,1)') : (isDark ? '#18181b' : '#ffffff'),
                color: showSectionStudio ? (isDark ? '#6ee7b7' : '#0f766e') : (isDark ? '#d4d4d8' : '#3f3f46'),
              }}
            >
              <Layers size={15} strokeWidth={2} />
              Sections
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openHistory()}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors"
            style={{
              borderColor: isDark ? '#3f3f46' : '#e4e4e7',
              background: isDark ? '#141416' : '#ffffff',
              color: isDark ? '#d4d4d8' : '#52525b',
            }}
          >
            <History size={15} strokeWidth={2} />
            History ({history.length})
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside
          className="flex min-h-0 w-full shrink-0 flex-col border-zinc-200 lg:h-full lg:max-w-[min(520px,44vw)] lg:w-[min(520px,44vw)] lg:border-r lg:border-b-0 border-b"
          style={{
            background: isDark ? '#09090b' : '#fafafa',
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
          onApplySuggestion={applySuggestion}
          selectedSectionIndex={selectedSectionIndex}
          onSelectSection={setSelectedSectionIndex}
        />

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
            <div className="fixed bottom-0 right-0 top-14 z-[54] flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-[min(100vw,460px)] max-w-full flex-col"
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
