'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Globe2, Sparkles, Copy, Download, Trash2, History, ChevronRight, Loader2,
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { buildStandaloneHtml, defaultSitePayload, type SitePayload } from '@/lib/siteFromPrompt';

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
  } catch { /* ignore */ }
}

const PRESETS = [
  { id: 'startup', label: 'Startup' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'saas', label: 'SaaS' },
  { id: 'agency', label: 'Agency' },
] as const;

export function SiteBuilder() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [prompt, setPrompt] = useState(
    'A landing page for an AI compliance copilot for EU startups. Audience: solo founders. CTA: join waitlist.',
  );
  const [preset, setPreset] = useState<string>('startup');
  const [payload, setPayload] = useState<SitePayload>(() => defaultSitePayload());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

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

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/site-from-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, preset }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Request failed');
      }
      const p = data.payload as SitePayload;
      setPayload(p);
      pushHistory(p, prompt, data.preset ?? preset);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
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

  const shell = dark ? 'border-[#262626] bg-[#0a0a0a] text-neutral-200' : 'border-neutral-200 bg-[#fafafa] text-neutral-900';
  const muted = dark ? 'text-neutral-500' : 'text-neutral-500';
  const field = dark
    ? 'border-[#262626] bg-[#141414] text-neutral-100 placeholder:text-neutral-600'
    : 'border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400';

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${dark ? 'bg-[#030303]' : 'bg-[#eef0f4]'}`}>
      <header
        className={`flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6 ${
          dark ? 'border-[#27272a] bg-[rgba(10,10,12,0.95)]' : 'border-neutral-200 bg-[rgba(255,255,255,0.92)]'
        }`}
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${dark ? 'bg-emerald-500/10' : 'bg-emerald-600/10'}`}
          >
            <Globe2 className={`h-5 w-5 ${dark ? 'text-emerald-400' : 'text-emerald-700'}`} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={`truncate text-sm font-semibold tracking-tight sm:text-[15px] ${dark ? 'text-white' : 'text-neutral-900'}`}>
                Sites workspace
              </h1>
              <span
                className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] sm:inline-flex ${dark ? 'border-emerald-500/35 text-emerald-300' : 'border-emerald-600/35 text-teal-800'}`}
              >
                Live preview
              </span>
            </div>
            <p className={`truncate text-[11px] ${muted}`}>
              Prompt on the left - preview uses the rest of your screen.
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div
          className={`flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-zinc-200 p-5 lg:max-w-[min(520px,44vw)] lg:w-[min(520px,44vw)] lg:border-r lg:pb-10 ${dark ? '' : ''}`}
          style={{ borderColor: dark ? '#27272a' : '#e5e7eb' }}
        >
          <section className={`rounded-2xl border p-5 ${shell}`}>
            <label htmlFor="site-prompt" className={`mb-2 block text-[11px] font-semibold uppercase tracking-wider ${muted}`}>
              Prompt
            </label>
            <textarea
              id="site-prompt"
              rows={8}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Who is this for, what is the offer, tone, CTAs..."
              className={`w-full resize-y rounded-xl border px-3 py-3 text-[13px] outline-none ring-0 transition-shadow focus:border-neutral-400 ${field}`}
            />

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className={`mb-1.5 block text-[10px] font-semibold uppercase tracking-wider ${muted}`}>Style</span>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value)}
                  className={`w-full rounded-lg border px-2 py-2.5 text-[13px] ${field}`}
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={loading || prompt.trim().length < 8}
                  onClick={() => void generate()}
                  className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    dark ? 'bg-neutral-100 text-neutral-900 hover:bg-white' : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? 'Building…' : 'Generate'}
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                {error}
              </p>
            )}
          </section>

          <section className={`rounded-2xl border p-5 ${shell}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${muted}`}>
                <History className="h-3.5 w-3.5" />
                Recent
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${dark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className={`text-[13px] ${muted}`}>Generations appear here - stored locally in this browser.</p>
            ) : (
              <ul className="max-h-[min(40vh,320px)] space-y-1 overflow-y-auto [scrollbar-width:thin]">
                {history.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => setPayload(h.payload)}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] transition-colors ${
                        dark ? 'border-[#262626] hover:bg-[#141414]' : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <span className="min-w-0 flex-1 truncate font-medium">{h.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-5 pt-4 lg:p-6 lg:pl-6 ${dark ? '' : ''}`}
        >
          <div className={`flex min-h-[min(60dvh,720px)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border ${shell}`}>
            <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${dark ? 'border-[#262626]' : 'border-neutral-200'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${muted}`}>App preview</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                    dark ? 'border-emerald-500/30 text-emerald-300' : 'border-teal-600/35 text-teal-800'
                  }`}
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyHtml()}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium ${
                    dark ? 'border-[#333] hover:bg-[#141414]' : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy HTML'}
                </button>
                <button
                  type="button"
                  onClick={downloadHtml}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium ${
                    dark ? 'border-[#333] hover:bg-[#141414]' : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <Download className="h-3.5 w-3.5" /> Download .html
                </button>
              </div>
            </div>
            <iframe
              title="Generated site preview"
              className="min-h-0 w-full flex-1 bg-neutral-900/5"
              sandbox=""
              srcDoc={html}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
