'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Bot, Gift, Home, LayoutTemplate, Loader2, Plus, X } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useTheme } from '@/lib/ThemeContext';
import { useUpgradeModal } from '@/components/tokens';
import { buildStandaloneHtml, defaultSitePayload, type SitePayload } from '@/lib/siteFromPrompt';
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

const SITES_THREAD_INTRO = `Describe one landing page: audience, core offer, what must appear above the fold, and the ONE action you want the visitor to take.\nSet Tone underneath before you Generate—Save exports HTML instantly, Fork spins a remix title.`;

function siteSlug(p: SitePayload) {
  const s = (p.title || 'new-draft').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 26);
  return s || 'new-draft';
}

export function SiteBuilder() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const { open: openUpgrade, UpgradeModal } = useUpgradeModal();
  const sitesAbortRef = useRef<AbortController | null>(null);

  const [prompt, setPrompt] = useState('');
  const [preset, setPreset] = useState<string>('startup');
  const [payload, setPayload] = useState<SitePayload>(() => defaultSitePayload());
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

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
    sitesAbortRef.current?.abort();
    const ac = new AbortController();
    sitesAbortRef.current = ac;
    setLoading(true);
    setMessages((prev) => [...prev, { id: uid(), role: 'user', body }]);
    try {
      const res = await fetch('/api/site-from-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: body, preset }),
        signal: ac.signal,
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
          body: `HTML ready for "${p.title}" (${label} tone). Save / Fork shortcuts sit under the composer.`,
        },
      ]);
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === 'AbortError') ||
        (e instanceof Error && e.name === 'AbortError');
      if (aborted) {
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', body: 'Generation stopped.' }]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', body: e instanceof Error ? e.message : 'Generation failed' },
      ]);
    } finally {
      if (sitesAbortRef.current === ac) sitesAbortRef.current = null;
      setLoading(false);
    }
  }, [preset, pushHistory]);

  const abortGeneration = useCallback(() => {
    sitesAbortRef.current?.abort();
  }, []);

  const resetSitesStudio = useCallback(() => {
    sitesAbortRef.current?.abort();
    setPayload(defaultSitePayload());
    setPreset('startup');
    setPrompt('');
    setIterationPrompt('');
    setShowIteration(false);
    setMessages(() => [{ id: uid(), role: 'assistant', body: SITES_THREAD_INTRO }]);
  }, []);

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

  const forkSiteDraft = () => {
    let forkTitle = '';
    setPayload((prev) => {
      forkTitle = `${prev.title || 'Site'} (fork)`;
      return { ...prev, title: forkTitle };
    });
    setMessages((m) => [
      ...m,
      {
        id: uid(),
        role: 'assistant',
        body: `Forked landing narrative as "${forkTitle}". Regenerate when you want a fresh HTML bundle.`,
      },
    ]);
  };

  const toolbarSaveSites = () => {
    downloadHtml();
  };

  const clearHistory = () => {
    saveHistory([]);
    setHistory([]);
  };

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

  const border = dark ? '#27272a' : '#e4e4e7';
  const headerGlass = dark ? 'rgba(8,8,10,0.97)' : 'rgba(255,255,255,0.94)';
  const slug = siteSlug(payload);
  const busyPulse = loading ? 'animate-pulse' : '';
  const canvasStroke = dark ? 'rgba(82,82,91,0.5)' : 'rgba(203,213,225,0.9)';

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${dark ? 'bg-[#030303]' : 'bg-[#eef0f4]'}`}
    >
      <header
        className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3"
        style={{
          borderColor: border,
          background: headerGlass,
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 sm:px-4"
            style={{
              borderColor: dark ? 'rgba(63,63,70,0.55)' : '#e4e4e7',
              background: dark ? '#141416' : '#ffffff',
              boxShadow: dark ? '0 22px 50px rgba(0,0,0,0.35)' : '0 14px 32px rgba(15,23,42,0.08)',
              color: dark ? '#fafafa' : '#18181b',
            }}
          >
            <LayoutTemplate className="h-5 w-5 shrink-0 text-teal-300" aria-hidden strokeWidth={1.65} />
            <span className="hidden text-[13px] font-semibold tracking-tight sm:inline">Sites workspace</span>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-1 rounded-[1.15rem] border p-1"
          style={{
            borderColor: dark ? 'rgba(82,82,91,0.45)' : 'rgba(226,232,240,1)',
            background: dark ? '#0c0c0f' : '#f8fafc',
            boxShadow: dark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
          }}
        >
          <button
            type="button"
            title="Show preview pane"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent hover:border-white/10"
            style={{ color: dark ? '#a1a1aa' : '#64748b' }}
            onClick={() => setPreviewOpen(true)}
          >
            <Home className="h-[18px] w-[18px]" strokeWidth={1.65} />
          </button>
          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-1.5 sm:px-4"
            style={{
              borderColor: dark ? 'rgba(45,212,191,0.35)' : 'rgba(20,184,166,0.35)',
              background: dark ? 'rgba(6,78,72,0.22)' : 'rgba(236,253,245,0.9)',
            }}
          >
            <span
              className={`h-[7px] w-[7px] rounded-full bg-emerald-400 ${busyPulse}`}
              style={{ boxShadow: loading ? '0 0 0 6px rgba(74,222,128,0.12)' : 'none' }}
              aria-hidden
            />
            <span
              className="max-w-[140px] truncate text-[11px] font-semibold uppercase tracking-[0.12em] sm:max-w-[180px]"
              style={{ color: dark ? '#ccfbf1' : '#134e4a' }}
              title={slug}
            >
              {slug}
            </span>
            <button
              type="button"
              aria-label="Reset site session tab"
              className="rounded-lg p-1 text-zinc-200 transition-colors hover:bg-black/15"
              onClick={resetSitesStudio}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          <button
            type="button"
            aria-label="New site session"
            title="New site session"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent hover:border-white/10"
            style={{ color: dark ? '#fafafa' : '#18181b' }}
            onClick={resetSitesStudio}
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => openUpgrade()}
            className="rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] sm:px-4 sm:text-[12px]"
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
              borderColor: dark ? 'rgba(63,63,70,0.45)' : 'rgba(226,232,240,1)',
              background: dark ? '#121214' : '#ffffff',
              color: dark ? '#d4d4d8' : '#475569',
            }}
          >
            <Gift className="h-[18px] w-[18px]" aria-hidden strokeWidth={1.5} />
          </button>
          <button
            type="button"
            title="Alerts"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border md:flex"
            style={{
              borderColor: dark ? 'rgba(63,63,70,0.45)' : 'rgba(226,232,240,1)',
              background: dark ? '#121214' : '#ffffff',
              color: dark ? '#d4d4d8' : '#475569',
            }}
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden strokeWidth={1.5} />
          </button>
          <div className="pl-1">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-9 w-9 border border-white/15 shadow-xl',
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
            background: dark ? '#040405' : '#ffffff',
            boxShadow: dark ? '0 40px 80px rgba(0,0,0,0.35)' : '0 38px 80px rgba(15,23,42,0.12)',
          }}
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
            onAbort={abortGeneration}
            onToolbarSave={toolbarSaveSites}
            onToolbarFork={forkSiteDraft}
            allowToolbarForkWithoutSchema
          />
        </aside>

        {previewOpen ? (
          <div
            className="flex min-h-[min(360px,50dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border md:min-h-0"
            style={{
              borderColor: canvasStroke,
              background: dark ? 'rgba(11,11,13,0.94)' : 'rgba(255,255,255,0.96)',
              boxShadow: dark
                ? '0 22px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.045) inset'
                : '0 20px 50px rgba(15,23,42,0.1), 0 0 0 1px rgba(255,255,255,0.85) inset',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                className={`flex shrink-0 flex-wrap items-center gap-4 border-b px-4 py-3 sm:px-5 ${dark ? 'border-white/[0.08]' : 'border-zinc-200/90'}`}
                style={{ background: dark ? 'rgba(5,5,6,0.25)' : 'rgba(249,250,251,0.65)' }}
              >
                <div className="min-w-0 flex-1">
                  <span className={`text-[14px] font-medium ${dark ? 'text-zinc-50' : 'text-zinc-900'}`}>App Preview</span>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2 text-[13px]" style={{ color: dark ? '#71717a' : '#64748b' }}>
                    <span>{loading ? 'Updating' : 'Idle'}</span>
                    <span>·</span>
                    <span className="truncate">{payload.title || 'Structured landing output'}</span>
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
                <button
                  type="button"
                  aria-label="Hide preview pane"
                  className="flex h-9 w-9 items-center justify-center rounded-full border"
                  style={{
                    borderColor: canvasStroke,
                    background: dark ? 'rgba(24,24,27,0.75)' : '#ffffff',
                  }}
                  onClick={() => setPreviewOpen(false)}
                >
                  <X className="h-4 w-4" strokeWidth={1.65} />
                </button>
              </div>

              <div
                className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
                style={{
                  backgroundColor: dark ? '#050508' : '#f4f4f5',
                  backgroundImage: dark
                    ? 'radial-gradient(circle at 20% -10%,rgba(45,212,191,0.07),transparent 52%), radial-gradient(circle at 85% -5%,rgba(6,182,212,0.06),transparent 45%)'
                    : undefined,
                }}
              >
                <iframe
                  title="Generated site preview"
                  className="min-h-0 w-full flex-1 bg-neutral-950/15"
                  sandbox=""
                  srcDoc={html}
                />
                {loading ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-6">
                    <div
                      className="inline-flex items-center gap-3 rounded-full border px-7 py-3 text-[14px] font-semibold shadow-2xl"
                      style={{
                        borderColor: dark ? 'rgba(63,63,70,0.55)' : 'rgba(203,213,225,1)',
                        background: dark ? 'rgba(12,12,14,0.92)' : '#ffffff',
                        color: dark ? '#fafafa' : '#0f172a',
                      }}
                    >
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" aria-hidden />
                      Initializing agent..
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className={`border-t px-4 py-2.5 ${dark ? 'border-white/[0.08]' : 'border-zinc-200/90'}`}
                style={{ background: dark ? 'rgba(5,5,6,0.35)' : 'rgba(249,250,251,0.8)' }}
              >
                <p className="text-center text-[12px] font-normal leading-snug" style={{ color: dark ? '#71717a' : '#64748b' }}>
                  HTML preview stays live while you regenerate from the Sites agent thread.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-6 rounded-[1.75rem] border px-8 py-14 text-center"
            style={{
              borderColor: border,
              background: dark ? 'rgba(13,13,14,0.94)' : 'rgba(255,255,255,0.94)',
            }}
          >
            <Bot className="h-14 w-14 text-teal-300 opacity-85" aria-hidden strokeWidth={1.5} />
            <p className="max-w-[20rem] text-[14px]" style={{ color: mutedStyle }}>
              Preview minimized — reopen to watch iframe updates while the agent drafts copy.
            </p>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-full border px-6 py-2.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-teal-50"
              style={{
                borderColor: 'rgba(45,212,191,0.45)',
                background: 'linear-gradient(155deg,#0f766f,#0891b2)',
              }}
            >
              Open App Preview
            </button>
          </div>
        )}
      </div>

      <UpgradeModal />
    </div>
  );
}
