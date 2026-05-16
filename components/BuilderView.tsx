'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bell, Bot, Gift, Home, Plus, Settings, X } from 'lucide-react';
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

  const border = isDark ? 'rgba(39,39,42,0.85)' : '#e4e4e7';
  const headerBg = isDark ? 'rgba(8,8,10,0.97)' : 'rgba(255,255,255,0.94)';
  const slug = tabSlugFromSchema(currentSchema);
  const tabPulse = isGenerating ? 'animate-pulse' : '';

  return (
    <div
      className="relative flex min-h-0 h-full w-full flex-col overflow-hidden"
      style={{ background: isDark ? '#050506' : '#eef0f4' }}
    >
      <header
        className="flex shrink-0 flex-col gap-2 border-b px-3 py-2 sm:gap-3 sm:px-4 min-h-[56px] md:min-h-[60px] md:flex-row md:items-center md:gap-4 md:px-5 md:py-3"
        style={{ borderColor: border, background: headerBg, backdropFilter: 'blur(14px)' }}
      >
        <div className="flex w-full min-w-0 items-center justify-between gap-2 md:contents">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:min-w-0 md:flex-nowrap">
            <div
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border px-2.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2 md:px-4"
              style={{
                borderColor: isDark ? 'rgba(63,63,70,0.55)' : '#e4e4e7',
                background: isDark ? '#141416' : '#ffffff',
                boxShadow: isDark ? '0 22px 50px rgba(0,0,0,0.35)' : '0 14px 32px rgba(15,23,42,0.08)',
                color: isDark ? '#fafafa' : '#18181b',
              }}
            >
              <Bot className="h-[18px] w-[18px] shrink-0 text-teal-300 sm:h-5 sm:w-5" aria-hidden strokeWidth={1.6} />
              <span className="hidden md:inline md:text-[13px] md:font-semibold md:tracking-tight">App builder</span>
            </div>
          {currentSchema ? (
            <button
              type="button"
              onClick={() => toggleSectionStudio()}
              className="h-9 shrink-0 rounded-lg border px-2.5 text-[11px] font-medium tracking-normal sm:h-10 sm:rounded-xl sm:px-3 sm:text-[12px]"
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
            className="h-9 shrink-0 rounded-lg border px-2.5 text-[11px] font-medium tracking-normal sm:h-10 sm:rounded-xl sm:px-3 sm:text-[12px]"
            style={{
              borderColor: isDark ? '#3f3f46' : '#e4e4e7',
              background: isDark ? '#101012' : '#fafafa',
              color: isDark ? '#e4e4e7' : '#3f3f46',
            }}
          >
            Hist <span className="tabular-nums">{history.length}</span>
          </button>
        </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3 md:order-3 md:gap-3">
          <button
            type="button"
            onClick={() => openUpgrade()}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] sm:rounded-xl sm:px-3 sm:py-2 sm:text-[11px] md:inline-flex md:px-4 md:py-2.5 md:text-[12px] md:tracking-[0.16em]"
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
          <button
            type="button"
            title="Studio menu"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border sm:flex"
            style={{
              borderColor: isDark ? 'rgba(63,63,70,0.45)' : 'rgba(226,232,240,1)',
              background: isDark ? '#121214' : '#ffffff',
              color: isDark ? '#d4d4d8' : '#475569',
            }}
          >
            <Settings className="h-[18px] w-[18px]" aria-hidden strokeWidth={1.5} />
          </button>
          <div className="flex shrink-0 items-center pl-0.5 md:pl-1">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-8 w-8 border border-white/15 shadow-xl sm:h-9 sm:w-9',
                  userButtonPopoverCard: isDark ? 'border border-white/12' : undefined,
                },
              }}
            />
          </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 justify-center px-1 overflow-x-auto md:order-2 md:w-auto md:px-0 md:justify-self-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div
            className="flex w-[min(100%,520px)] max-w-[100vw] shrink-0 items-center gap-1 rounded-[1rem] border p-1 sm:rounded-[1.15rem] md:w-auto md:max-w-none"
          style={{
            borderColor: isDark ? 'rgba(82,82,91,0.45)' : 'rgba(226,232,240,1)',
            background: isDark ? '#0c0c0f' : '#f8fafc',
            boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
          }}
        >
          <button
            type="button"
            title="Show preview pane"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent hover:border-white/10 sm:h-10 sm:w-10 sm:rounded-xl"
            style={{ color: isDark ? '#a1a1aa' : '#64748b' }}
            onClick={() => setPreviewOpen(true)}
          >
            <Home className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.65} />
          </button>
          <div
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-1 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-1.5 md:flex-initial md:px-4"
            style={{
              borderColor: isDark ? 'rgba(45,212,191,0.35)' : 'rgba(20,184,166,0.35)',
              background: isDark ? 'rgba(6,78,72,0.22)' : 'rgba(236,253,245,0.9)',
            }}
          >
            <span
              className={`h-[6px] w-[6px] shrink-0 rounded-full bg-emerald-400 sm:h-[7px] sm:w-[7px] ${tabPulse}`}
              style={{ boxShadow: isGenerating ? '0 0 0 6px rgba(74,222,128,0.12)' : 'none' }}
              aria-hidden
            />
            <span
              className="min-w-0 flex-1 truncate text-center text-[12px] font-medium normal-case tracking-tight sm:text-left sm:text-[13px] md:max-w-[220px]"
              style={{ color: isDark ? '#ecfdf9' : '#134e4a' }}
              title={slug}
            >
              {slug}
            </span>
            <button
              type="button"
              aria-label="Reset session tab"
              className="shrink-0 rounded-lg p-1 transition-colors hover:bg-black/15"
              style={{ color: isDark ? '#d4d4d8' : '#334155' }}
              onClick={resetStudioSession}
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.75} />
            </button>
          </div>
          <button
            type="button"
            aria-label="New session"
            title="New session"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent hover:border-white/10 sm:h-10 sm:w-10 sm:rounded-xl"
            style={{ color: isDark ? '#fafafa' : '#18181b' }}
            onClick={resetStudioSession}
          >
            <Plus className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
          </button>
        </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pb-2 pt-1 sm:p-5 md:flex-row md:gap-5 md:overflow-hidden md:p-5">
        <aside
          className={`relative flex min-h-[min(220px,38dvh)] w-full flex-1 flex-col overflow-hidden rounded-[1.05rem] border sm:min-h-[min(240px,40dvh)] sm:rounded-[1.25rem] md:min-h-0 ${
            previewOpen ? 'md:w-[420px] md:max-w-[420px] md:flex-none' : 'md:max-w-none md:flex-1'
          }`}
          style={{
            borderColor: border,
            background: isDark ? '#080809' : '#ffffff',
            boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.4)' : '0 38px 80px rgba(15,23,42,0.12)',
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
            className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-6 rounded-[1.25rem] border px-8 py-14 text-center md:items-center"
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
