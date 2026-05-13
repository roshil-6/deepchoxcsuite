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
import { ChevronRight, History, Wand2 } from 'lucide-react';
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

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Panel - Controls */}
      <div
        className={`w-80 flex-shrink-0 border-r flex flex-col ${showHistory ? 'hidden lg:flex' : ''}`}
        style={{
          background: isDark ? '#0c0c0e' : '#ffffff',
          borderColor: isDark ? '#27272a' : '#e4e4e7',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: isDark ? '#7456ff20' : '#7456ff10' }}
            >
              <Wand2 size={18} style={{ color: '#7456ff' }} />
            </div>
            <h2 className="font-semibold" style={{ color: isDark ? '#ffffff' : '#18181b' }}>
              UI Builder
            </h2>
          </div>
          <p className="text-xs" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
            Describe your interface in words
          </p>
        </div>

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

        {/* Error */}
        {error && (
          <div
            className="p-3 m-4 rounded-lg text-xs"
            style={{
              background: '#ef444420',
              color: '#ef4444',
              border: '1px solid #ef444440',
            }}
          >
            {error}
          </div>
        )}

        {/* History Toggle */}
        <div
          className="p-4 border-t flex items-center justify-between cursor-pointer"
          style={{
            borderColor: isDark ? '#27272a' : '#e4e4e7',
            background: isDark ? '#18181b' : '#fafafa',
          }}
          onClick={() => setShowHistory(true)}
        >
          <div className="flex items-center gap-2">
            <History size={18} style={{ color: isDark ? '#a1a1aa' : '#71717a' }} />
            <span className="text-sm" style={{ color: isDark ? '#d4d4d8' : '#52525b' }}>
              History ({history.length})
            </span>
          </div>
          <ChevronRight size={18} style={{ color: isDark ? '#a1a1aa' : '#71717a' }} />
        </div>
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

      <SectionStudio
        isDark={isDark}
        schema={currentSchema}
        onSchemaChange={handleSchemaChange}
        selectedIndex={selectedSectionIndex}
        onSelectIndex={setSelectedSectionIndex}
      />

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
      )}
    </div>
  );
}
