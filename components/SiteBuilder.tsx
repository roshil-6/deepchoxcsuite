'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { buildStandaloneHtml, defaultSitePayload, type SitePayload } from '@/lib/siteFromPrompt';
import { FloatingAgentDock } from '@/components/builder/FloatingAgentDock';
import { AgentChatPanel, type ThreadMessage } from '@/components/builder/AgentChatPanel';

const HISTORY_KEY = 'deepchox-sites-history';
const MAX_HISTORY = 12;

type HistoryItem = {
  id: string;
  title: string;
  prompt: string;
  preset: string;
  payload: SitePayload;
  createdAt: number;
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {
    /* ignore */
  }
}

const PRESETS = [
  { id: 'startup', label: 'Startup' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'saas', label: 'SaaS' },
  { id: 'agency', label: 'Agency' },
] as const;

const SITES_THREAD_INTRO = `Describe one landing page: audience, offer, sections, and what the visitor should do next. Pick Tone below before you send.\nThis thread expands and minimizes so you can focus on the full-width preview frame.`;

export function SiteBuilder() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [prompt, setPrompt] = useState('');
  const [preset, setPreset] = useState<string>('startup');
  const [payload, setPayload] = useState<SitePayload>(() => defaultSitePayload());
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  const [threadOpen, setThreadOpen] = useState(true);
  const [threadExpanded, setThreadExpanded] = useState(true);

  const [iterationPrompt, setIterationPrompt] = useState('');
  const [showIteration, setShowIteration] = useState(false);

  const [messages, setMessages] = useState<ThreadMessage[]>(() => [
    { id: 'sites-intro', role: 'assistant', body: SITES_THREAD_INTRO },
  ]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const html = useMemo(() => buildStandaloneHtml(payload), [payload]);

  const pushHistory = useCallback((p: SitePayload, userPrompt: string, pr: string) => {
    const item: HistoryItem = {
      id: String(Date.now()),
      title: p.title,
      prompt: userPrompt.slice(0, 500),
      preset: pr,
      payload: p,
      createdAt: Date.now(),
    };
    setHistory((prev) => {
      const next = [item, ...prev.filter((x) => x.prompt !== item.prompt)].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const runGenerate = useCallback(async (body: string) => {
    if (!body.trim() || body.trim().length < 8) return;
    setLoading(true);
    setMessages((prev) => [...prev, { id: uid(), role: 'user', body }]);
    try {
      const res = await fetch('/api/site-from-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: body, preset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      const p = data.payload as SitePayload;
      setPayload(p);
      pushHistory(p, body, data.preset ?? preset);
      setPrompt('');
      const label = PRESETS.find((x) => x.id === preset)?.label ?? preset;
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          body: `HTML ready for "${p.title}" (${label} tone). Copy or download from the toolbar above the preview.`,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', body: e instanceof Error ? e.message : 'Generation failed' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [preset, pushHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runGenerate(prompt);
  };

  const handleIterateNoop = (e: React.FormEvent) => e.preventDefault();

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const downloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(payload.title || 'site').replace(/[^\w\s-]/g, '').slice(0, 40) || 'deepchox-site'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    saveHistory([]);
    setHistory([]);
  };

  const muted = dark ? 'text-zinc-500' : 'text-zinc-500';
  const mutedStyle = dark ? '#a1a1aa' : '#64748b';

  const toneSlot = (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: mutedStyle }}>
        Tone
      </p>
      <div
        className="inline-flex flex-wrap gap-1 rounded-lg p-1"
        style={{ background: dark ? 'rgba(24,24,27,0.55)' : 'rgba(241,245,249,1)' }}
        role="group"
        aria-label="Tone"
      >
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              preset === p.id
                ? dark
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'bg-white text-zinc-900 shadow-sm'
                : dark
                  ? 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
                  : 'text-zinc-600 hover:bg-white/90'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {history.length > 0 ? (
        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium" style={{ color: mutedStyle }}>
              Recent
            </span>
            <button
              type="button"
              onClick={clearHistory}
              className={`text-[11px] font-medium underline-offset-2 hover:underline ${dark ? 'text-red-400' : 'text-red-600'}`}
            >
              Clear
            </button>
          </div>
          <ul className="max-h-[112px] space-y-0.5 overflow-y-auto">
            {history.slice(0, 6).map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setPayload(h.payload)}
                  className={`flex w-full rounded-lg px-2 py-2 text-left text-[13px] ${dark ? 'text-zinc-200 hover:bg-white/[0.04]' : 'text-zinc-800 hover:bg-zinc-100/90'}`}
                >
                  <span className="truncate font-medium">{h.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${dark ? 'bg-[#070708]' : 'bg-[#eef0f4]'}`}>
      <header
        className={`flex min-h-[52px] shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6 ${
          dark ? 'border-[#27272a] bg-[rgba(10,10,12,0.96)]' : 'border-neutral-200 bg-[rgba(255,255,255,0.95)]'
        }`}
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className={`truncate text-sm font-semibold tracking-tight sm:text-[15px] ${dark ? 'text-white' : 'text-neutral-900'}`}>
              Sites workspace
            </h1>
          </div>
          <p className={`truncate text-[11px] ${muted}`}>
            Full preview · expandable agent thread bottom-left controls tone and prompts
          </p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border"
          style={{
            borderColor: dark ? 'rgba(82,82,91,0.5)' : 'rgba(203,213,225,0.9)',
            background: dark ? 'rgba(11,11,13,0.94)' : 'rgba(255,255,255,0.96)',
            boxShadow: dark
              ? '0 22px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.045) inset'
              : '0 20px 50px rgba(15,23,42,0.1), 0 0 0 1px rgba(255,255,255,0.85) inset',
            backdropFilter: 'blur(14px)',
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              className={`flex shrink-0 flex-wrap items-center justify-between gap-4 border-b px-4 py-3 sm:px-5 ${dark ? 'border-white/[0.08]' : 'border-zinc-200/90'}`}
              style={{ background: dark ? 'rgba(5,5,6,0.25)' : 'rgba(249,250,251,0.65)' }}
            >
              <div className="min-w-0">
                <span className={`text-[13px] font-medium ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>App preview</span>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-[12px]" style={{ color: dark ? '#71717a' : '#64748b' }}>
                    {loading ? 'Updating' : 'Idle'}
                  </span>
                  <span className="text-[12px]" style={{ color: dark ? '#a1a1aa' : '#64748b' }}>
                    &middot; {payload.title || 'Structured landing output'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => void copyHtml()}
                  className={`text-[13px] font-medium underline-offset-4 hover:underline ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}
                >
                  {copied ? 'Copied' : 'Copy HTML'}
                </button>
                <button
                  type="button"
                  onClick={downloadHtml}
                  className={`text-[13px] font-medium underline-offset-4 hover:underline ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}
                >
                  Download .html
                </button>
              </div>
            </div>
            <iframe title="Generated site preview" className="min-h-0 w-full flex-1 bg-neutral-950/15" sandbox="" srcDoc={html} />
            <div className={`border-t px-4 py-2.5 ${dark ? 'border-white/[0.08]' : 'border-zinc-200/90'}`} style={{ background: dark ? 'rgba(5,5,6,0.35)' : 'rgba(249,250,251,0.8)' }}>
              <p className="text-center text-[12px] font-normal leading-snug" style={{ color: dark ? '#71717a' : '#64748b' }}>
                {loading ? 'Rendering the latest draft in this frame.' : 'Iframe mirrors the latest generated HTML.'}
              </p>
            </div>
          </div>
        </div>

        <FloatingAgentDock
          isDark={dark}
          open={threadOpen}
          expanded={threadExpanded}
          busy={loading}
          onOpen={() => setThreadOpen(true)}
          onClose={() => setThreadOpen(false)}
          onToggleExpand={() => setThreadExpanded((e) => !e)}
          title="Sites agent"
          subtitle={threadExpanded ? 'Expanded · Close to widen the iframe' : 'Compact · Expand for transcript'}
        >
          <AgentChatPanel
            isDark={dark}
            messages={messages}
            currentSchema={null}
            suggestions={[]}
            suggestionHint={null}
            prompt={prompt}
            setPrompt={setPrompt}
            iterationPrompt={iterationPrompt}
            setIterationPrompt={setIterationPrompt}
            showIteration={showIteration}
            setShowIteration={setShowIteration}
            isGenerating={loading}
            onSubmit={handleSubmit}
            onIterate={handleIterateNoop}
            onApplySuggestion={() => {}}
            slotAboveComposer={toneSlot}
            submitLabel="Generate"
          />
        </FloatingAgentDock>
      </div>
    </div>
  );
}
