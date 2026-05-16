'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bell, Bot, Gift, Home, Plus, X } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
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
  generateId,
} from '@/lib/builderStorage';
import { useTheme } from '@/lib/ThemeContext';
import { useUpgradeModal } from '@/components/tokens';
import { AgentChatPanel, type ThreadMessage } from './builder/AgentChatPanel';
import { HistorySidebar } from './builder/HistorySidebar';
import { PreviewPane } from './builder/PreviewPane';
import { SectionStudio } from './builder/SectionStudio';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const THREAD_INTRO_BODY = `Describe the site or screen you want once: audience, sections, tone, and CTAs.\nTell me exactly how you imagine the rhythm of the hero, trust rows, FAQs, pricing, whatever matters. Tap enter with Ctrl/Cmd to send whenever you describe the vibe.`;

function tabSlugFromSchema(schema: UISchema | null) {
  if (!schema?.name.trim()) return 'new-draft';
  const slug = schema.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 26);
  return slug || 'draft';
}

export function BuilderView() {
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === 'dark';

  const { open: openUpgrade, UpgradeModal } = useUpgradeModal();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSchema, setCurrentSchema] = useState<UISchema | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<BuilderHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [iterationPrompt, setIterationPrompt] = useState('');
  const [showIteration, setShowIteration] = useState(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [showSectionStudio, setShowSectionStudio] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

  const [messages, setMessages] = useState<ThreadMessage[]>(() => [
    { id: 'intro', role: 'assistant', body: THREAD_INTRO_BODY },
  ]);

  const buildAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const abortGeneration = useCallback(() => {
    buildAbortRef.current?.abort();
  }, []);

  const resetStudioSession = useCallback(() => {
    buildAbortRef.current?.abort();
    setCurrentSchema(null);
    setSuggestions([]);
    setPrompt('');
    setIterationPrompt('');
    setShowIteration(false);
    setSelectedSectionIndex(0);
    setMessages([{ id: uid(), role: 'assistant', body: THREAD_INTRO_BODY }]);
  }, []);

  const generateUI = useCallback(async (userPrompt: string, previousSchema?: UISchema) => {
    const normalizedPrevious = previousSchema ? sanitizeSchemaForUi(previousSchema) : undefined;
    setIsGenerating(true);

    buildAbortRef.current?.abort();
    const ac = new AbortController();
    buildAbortRef.current = ac;

    const userLine: ThreadMessage = { id: uid(), role: 'user', body: userPrompt };
    setMessages((prev) => [...prev, userLine]);

    try {
      const res = await fetch('/api/build-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          previousSchema: normalizedPrevious,
          iteration: !!normalizedPrevious,
        }),
        signal: ac.signal,
      });

      const data = await res.json() as BuildUIResponse;

      if (!res.ok) {
        const msg = (data as unknown as { error?: string }).error || 'Failed to generate UI';
        throw new Error(msg);
      }

      const safe = sanitizeSchemaForUi(data.schema);
      setCurrentSchema(safe);
      setSelectedSectionIndex(0);
      setSuggestions(data.suggestions || []);
      setPrompt('');
      setIterationPrompt('');
      setShowIteration(false);

      const assistantLine: ThreadMessage = {
        id: uid(),
        role: 'assistant',
        body: normalizedPrevious
          ? `Applied your tweaks. Updated "${safe.name}" (${safe.sections.length} sections).`
          : `Canvas ready: "${safe.name}" (${safe.sections.length} sections).`,
      };
      setMessages((prev) => [...prev, assistantLine]);

      const historyItem = createHistoryItem(safe.name, userPrompt, safe);
      saveToHistory(historyItem);
      setHistory(loadHistory());
    } catch (err) {
      const aborted =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError');
      if (aborted) {
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', body: 'Generation stopped.' }]);
        return;
      }
      const assistantLine: ThreadMessage = {
        id: uid(),
        role: 'assistant',
        body: err instanceof Error ? err.message : 'Something went wrong',
      };
      setMessages((prev) => [...prev, assistantLine]);
    } finally {
      if (buildAbortRef.current === ac) buildAbortRef.current = null;
      setIsGenerating(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    generateUI(prompt, currentSchema ?? undefined);
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
    setShowHistory(false);
    setShowIteration(false);
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'assistant', body: `Loaded "${item.schema.name}" from history.` },
    ]);
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

  const handleToolbarSave = useCallback(() => {
    if (currentSchema) {
      downloadSchemaAsJSON(currentSchema);
      return;
    }
    if (prompt.trim()) {
      navigator.clipboard.writeText(prompt.trim());
    }
  }, [currentSchema, prompt]);

  const handleToolbarFork = useCallback(() => {
    if (!currentSchema) return;
    const safe = sanitizeSchemaForUi(currentSchema);
    const forked: UISchema = {
      ...safe,
      id: generateId(),
      name: `${safe.name} (fork)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setCurrentSchema(forked);
    saveToHistory(createHistoryItem(forked.name, 'Fork inside builder', forked));
    setHistory(loadHistory());
    setMessages((prev) => [...prev, { id: uid(), role: 'assistant', body: `Forked workspace as "${forked.name}".` }]);
  }, [currentSchema]);

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
  const headerBg = isDark ? 'rgba(8,8,10,0.97)' : 'rgba(255,255,255,0.94)';
  const slug = tabSlugFromSchema(currentSchema);
  const tabPulse = isGenerating ? 'animate-pulse' : '';

  return (
    <div
      className="relative flex min-h-0 h-full w-full flex-col overflow-hidden"
      style={{ background: isDark ? '#030303' : '#eef0f4' }}
    >
      <header
        className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3"
        style={{ borderColor: border, background: headerBg, backdropFilter: 'blur(14px)' }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 sm:px-4"
            style={{
              borderColor: isDark ? 'rgba(63,63,70,0.55)' : '#e4e4e7',
              background: isDark ? '#141416' : '#ffffff',
              boxShadow: isDark ? '0 22px 50px rgba(0,0,0,0.35)' : '0 14px 32px rgba(15,23,42,0.08)',
              color: isDark ? '#fafafa' : '#18181b',
            }}
          >
            <Bot className="h-5 w-5 shrink-0 text-teal-300" aria-hidden strokeWidth={1.6} />
            <span className="hidden text-[13px] font-semibold tracking-tight sm:inline">App builder</span>
          </div>
          {currentSchema ? (
            <button
              type="button"
              onClick={() => toggleSectionStudio()}
              className="h-10 rounded-xl border px-3 text-[12px] font-semibold uppercase tracking-[0.12em]"
              style={{
                borderColor: showSectionStudio ? 'rgba(45,212,191,0.45)' : isDark ? '#3f3f46' : '#e4e4e7',
                background: showSectionStudio ? (isDark ? 'rgba(6,78,72,0.35)' : 'rgba(236,253,245,1)') : isDark ? '#101012' : '#fafafa',
                color: showSectionStudio ? (isDark ? '#5eead4' : '#0f766e') : isDark ? '#d4d4d8' : '#52525b',
              }}
            >
              Structure
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openHistory()}
            className="h-10 rounded-xl border px-3 text-[12px] font-semibold uppercase tracking-[0.12em]"
            style={{
              borderColor: isDark ? '#3f3f46' : '#e4e4e7',
              background: isDark ? '#101012' : '#fafafa',
              color: isDark ? '#e4e4e7' : '#3f3f46',
            }}
          >
            Hist <span className="tabular-nums">{history.length}</span>
          </button>
        </div>

        <div
          className="flex shrink-0 items-center gap-1 rounded-[1.15rem] border p-1"
          style={{
            borderColor: isDark ? 'rgba(82,82,91,0.45)' : 'rgba(226,232,240,1)',
            background: isDark ? '#0c0c0f' : '#f8fafc',
            boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
          }}
        >
          <button
            type="button"
            title="Show preview pane"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent hover:border-white/10"
            style={{ color: isDark ? '#a1a1aa' : '#64748b' }}
            onClick={() => setPreviewOpen(true)}
          >
            <Home className="h-[18px] w-[18px]" strokeWidth={1.65} />
          </button>
          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-1.5 sm:px-4"
            style={{
              borderColor: isDark ? 'rgba(45,212,191,0.35)' : 'rgba(20,184,166,0.35)',
              background: isDark ? 'rgba(6,78,72,0.22)' : 'rgba(236,253,245,0.9)',
            }}
          >
            <span
              className={`h-[7px] w-[7px] rounded-full bg-emerald-400 ${tabPulse}`}
              style={{ boxShadow: isGenerating ? '0 0 0 6px rgba(74,222,128,0.12)' : 'none' }}
              aria-hidden
            />
            <span
              className="max-w-[88px] truncate text-[12px] font-semibold uppercase tracking-[0.12em] sm:max-w-[160px]"
              style={{ color: isDark ? '#ccfbf1' : '#134e4a' }}
              title={slug}
            >
              {slug}
            </span>
            <button
              type="button"
              aria-label="Reset session tab"
              className="rounded-lg p-1 transition-colors hover:bg-black/15"
              style={{ color: isDark ? '#d4d4d8' : '#334155' }}
              onClick={resetStudioSession}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          <button
            type="button"
            aria-label="New session"
            title="New session"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent hover:border-white/10"
            style={{ color: isDark ? '#fafafa' : '#18181b' }}
            onClick={resetStudioSession}
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => openUpgrade()}
            className="rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] sm:inline-flex sm:px-4 sm:py-2.5 sm:text-[12px]"
            style={{
              background: 'linear-gradient(130deg,#fbbf24,#f97316)',
              color: '#1c1410',
              boxShadow: '0 14px 32px rgba(249,115,22,0.35)',
              border: '1px solid rgba(253,224,71,0.35)',
            }}
          >
            Buy Credits
          </button>
          <button
            type="button"
            title="Rewards"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border lg:flex"
            style={{
              borderColor: isDark ? 'rgba(63,63,70,0.45)' : 'rgba(226,232,240,1)',
              background: isDark ? '#121214' : '#ffffff',
              color: isDark ? '#d4d4d8' : '#475569',
            }}
          >
            <Gift className="h-[18px] w-[18px]" aria-hidden strokeWidth={1.5} />
          </button>
          <button
            type="button"
            title="Notifications"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border md:flex"
            style={{
              borderColor: isDark ? 'rgba(63,63,70,0.45)' : 'rgba(226,232,240,1)',
              background: isDark ? '#121214' : '#ffffff',
              color: isDark ? '#d4d4d8' : '#475569',
            }}
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden strokeWidth={1.5} />
          </button>
          <div className="flex shrink-0 items-center pl-1">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-9 w-9 border border-white/15 shadow-xl',
                  userButtonPopoverCard: isDark ? 'border border-white/12' : undefined,
                },
              }}
            />
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-5 md:flex-row md:gap-5">
        <aside
          className={`relative flex min-h-[min(520px,54dvh)] w-full shrink-0 flex-col overflow-hidden rounded-[1.75rem] border md:min-h-0 ${
            previewOpen ? 'md:max-w-[min(460px,44vw)]' : 'md:flex-1'
          }`}
          style={{
            borderColor: border,
            background: isDark ? '#040405' : '#ffffff',
            boxShadow: isDark ? '0 40px 80px rgba(0,0,0,0.35)' : '0 38px 80px rgba(15,23,42,0.12)',
          }}
        >
          <AgentChatPanel
            isDark={isDark}
            messages={messages}
            currentSchema={currentSchema}
            suggestions={suggestions}
            suggestionHint={suggestions.length > 0 ? 'Ideas below come from your last reply.' : null}
            prompt={prompt}
            setPrompt={setPrompt}
            iterationPrompt={iterationPrompt}
            setIterationPrompt={setIterationPrompt}
            showIteration={showIteration}
            setShowIteration={setShowIteration}
            isGenerating={isGenerating}
            onSubmit={handleSubmit}
            onIterate={handleIterate}
            onApplySuggestion={applySuggestion}
            submitLabel={currentSchema ? 'Send' : 'Generate'}
            onAbort={abortGeneration}
            onToolbarSave={handleToolbarSave}
            onToolbarFork={handleToolbarFork}
          />
        </aside>

        {previewOpen ? (
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
            onDismiss={() => setPreviewOpen(false)}
            ambientGenerating={Boolean(isGenerating && !currentSchema && activeTab === 'preview')}
          />
        ) : (
          <div
            className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-6 rounded-[1.75rem] border px-8 py-14 text-center md:items-center"
            style={{
              borderColor: border,
              background: isDark ? 'rgba(13,13,14,0.94)' : 'rgba(255,255,255,0.94)',
              color: isDark ? '#fafafa' : '#0f172a',
            }}
          >
            <p className="max-w-[20rem] text-[14px]" style={{ color: isDark ? '#a1a1aa' : '#64748b' }}>
              Preview is hidden — bring it back to watch the Canvas + Schema inspectors.
            </p>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-full border px-6 py-2.5 text-[13px] font-semibold uppercase tracking-[0.18em]"
              style={{
                borderColor: 'rgba(45,212,191,0.45)',
                background: 'linear-gradient(155deg,#0f766f,#0891b2)',
                color: '#ecfeff',
              }}
            >
              Open App Preview
            </button>
          </div>
        )}
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
            <div className="fixed bottom-0 right-0 top-[4.75rem] z-[54] flex h-[calc(100dvh-4.75rem)] max-h-[calc(100dvh-4.75rem)] w-[min(100vw,460px)] max-w-full flex-col"
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

      <UpgradeModal />
    </div>
  );
}
