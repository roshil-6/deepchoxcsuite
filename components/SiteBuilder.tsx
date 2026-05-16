'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Globe2, Copy, Download, ChevronRight, Loader2,
  ArrowUp,
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

  const muted = dark ? 'text-zinc-500' : 'text-zinc-500';

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${dark ? 'bg-[#070708]' : 'bg-[#eef0f4]'}`}>
      <header
        className={`flex h-[52px] shrink-0 items-center gap-4 border-b px-4 sm:px-6 ${
          dark ? 'border-[#27272a] bg-[rgba(10,10,12,0.96)]' : 'border-neutral-200 bg-[rgba(255,255,255,0.95)]'
        }`}
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
            dark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-600/35 bg-emerald-50'
          }`}
        >
          <Globe2 className={`h-5 w-5 ${dark ? 'text-emerald-400' : 'text-emerald-700'}`} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={`truncate text-sm font-semibold tracking-tight sm:text-[15px] ${dark ? 'text-white' : 'text-neutral-900'}`}>
              Sites workspace
            </h1>
            <nav
              className={`hidden rounded-xl p-[3px] sm:flex ${dark ? 'bg-zinc-900' : 'bg-indigo-50'}`}
              aria-label="Modes"
            >
              <span
                className="rounded-[10px] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{
                  background: dark ? '#27272a' : '#fff',
                  color: dark ? '#fafafa' : '#3730a3',
                  boxShadow: !dark ? '0 1px 3px rgba(79,70,229,0.1)' : 'none',
                }}
              >
                Agent
              </span>
              <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${dark ? 'text-zinc-500' : 'text-indigo-400'}`}>
                Preview
              </span>
            </nav>
          </div>
          <p className={`truncate text-[11px] ${muted}`}>Describe once - structured HTML renders in the live frame.</p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left rail */}
        <div
          className="flex min-h-0 w-full shrink-0 flex-col border-zinc-300/20 lg:max-w-[min(536px,44vw)] lg:w-[min(536px,44vw)] lg:border-r"
          style={{
            borderColor: dark ? '#27272a' : '#e5e7eb',
            background: dark ? 'linear-gradient(180deg,#09090c,#070708)' : 'linear-gradient(180deg,#fafafa,#f4f4f5)',
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-7 sm:py-10">
            <div className="mx-auto max-w-[440px] space-y-10">
              <div>
                <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: muted }}>
                  <span className="h-1 w-1 rounded-full bg-emerald-400" aria-hidden />
                  Agent
                </p>
                <p className="text-[15px] font-medium leading-relaxed" style={{ color: dark ? '#e4e4e7' : '#334155' }}>
                  Pick a style, then describe the page. One HTML file ships from here.
                </p>
                <p className="mt-3 text-[13px]" style={{ color: muted }}>
                  Current: <span className="font-medium" style={{ color: dark ? '#fafafa' : '#0f172a' }}>{payload.title || 'Default shell'}</span>
                </p>
              </div>

              <div>
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: muted }}>
                  Visual tone
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreset(p.id)}
                      className={`rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors ${
                        preset === p.id
                          ? dark
                            ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/35'
                            : 'bg-teal-100 text-teal-900 ring-1 ring-teal-300'
                          : dark
                            ? 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                            : 'bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/80 hover:bg-zinc-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: muted }}>
                    Recent
                  </p>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className={`text-[11px] font-semibold ${dark ? 'text-red-400 hover:underline' : 'text-red-600 hover:underline'}`}
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="text-[13px] leading-relaxed" style={{ color: muted }}>
                    Saved runs show up here - local to this browser only.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {history.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => setPayload(h.payload)}
                          className={`group flex w-full items-center gap-3 rounded-xl py-2.5 pl-1 pr-2 text-left text-[14px] transition-colors ${
                            dark ? 'text-zinc-200 hover:bg-white/[0.04]' : 'text-zinc-800 hover:bg-zinc-100/80'
                          }`}
                        >
                          <ChevronRight className="h-4 w-4 shrink-0 opacity-30 group-hover:opacity-60" />
                          <span className="min-w-0 flex-1 truncate font-medium">{h.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Bottom composer */}
          <div
            className="shrink-0 border-t px-5 pb-6 pt-5 sm:px-7"
            style={{
              borderColor: dark ? '#27272a' : '#e5e7eb',
              background: dark ? 'rgba(6,6,8,0.92)' : 'rgba(248,250,252,0.98)',
            }}
          >
            <div
              className={`mx-auto max-w-[440px] overflow-hidden rounded-[22px] border ${dark ? 'shadow-[0_24px_80px_rgba(0,0,0,0.55)]' : 'shadow-[0_20px_50px_rgba(15,23,42,0.07)]'}`}
              style={{
                borderColor: dark ? 'rgba(63,63,70,0.55)' : 'rgba(226,232,240,1)',
                background: dark ? '#101014' : '#ffffff',
              }}
            >
              <div
                className="flex items-center justify-between gap-3 px-4 py-3"
                style={{ borderBottom: `1px solid ${dark ? 'rgba(39,39,42,0.9)' : 'rgba(241,245,249,1)'}` }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    {loading ? (
                      <>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/45" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </>
                    ) : (
                      <span className="inline-flex h-2 w-2 rounded-full bg-zinc-500" />
                    )}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: loading ? '#34d399' : muted }}>
                    {loading ? 'Building' : 'Ready'}
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <label htmlFor="site-prompt" className="sr-only">
                  Site prompt
                </label>
                <textarea
                  id="site-prompt"
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Message the agent - audience, offer, tone, sections..."
                  className="mb-4 w-full resize-none rounded-xl border-0 bg-transparent px-0.5 py-1 text-[15px] leading-relaxed outline-none placeholder:text-zinc-500"
                  style={{ color: dark ? '#fafafa' : '#0f172a' }}
                />
                {error ? (
                  <p className="mb-4 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">{error}</p>
                ) : null}
                <div className="flex items-end justify-end gap-3">
                  <button
                    type="button"
                    disabled={loading || prompt.trim().length < 8}
                    onClick={() => void generate()}
                    className="inline-flex h-12 min-w-[11rem] items-center justify-center gap-2 rounded-2xl px-5 text-[14px] font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: dark ? '#f8fafc' : '#0f172a',
                      color: dark ? '#020617' : '#f8fafc',
                      boxShadow: dark ? '0 12px 36px rgba(0,0,0,0.4)' : '0 12px 32px rgba(15,23,42,0.15)',
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Wait
                      </>
                    ) : (
                      <>
                        Generate
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${dark ? 'bg-black/10' : 'bg-white/15'}`}>
                          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview shell */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4 lg:p-5" style={{ background: dark ? 'linear-gradient(165deg,#080808,#050505)' : 'linear-gradient(165deg,#f1f5f9,#e8edf3)' }}>
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border ${
              dark ? 'border-zinc-700/60 bg-[rgba(12,12,14,0.96)] shadow-[0_28px_80px_rgba(0,0,0,0.55)]' : 'border-zinc-200 bg-white/95 shadow-[0_22px_50px_rgba(15,23,42,0.08)]'
            }`}
          >
            <div className={`flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 ${dark ? 'border-zinc-700/55' : 'border-zinc-200'}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[13px] font-semibold ${dark ? 'text-white' : 'text-zinc-900'}`}>App preview</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                      dark ? 'border-emerald-500/40 text-emerald-300' : 'border-teal-600/35 text-teal-800'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Live
                  </span>
                </div>
                <p className={`mt-0.5 text-[11px] ${muted}`}>{payload.title || 'Structured landing output'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyHtml()}
                  className={`flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[12px] font-semibold ${
                    dark ? 'border-zinc-600/50 bg-zinc-900/40 text-zinc-200 hover:bg-zinc-800/50' : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy HTML'}
                </button>
                <button
                  type="button"
                  onClick={downloadHtml}
                  className={`flex h-10 items-center gap-2 rounded-xl px-5 text-[12px] font-bold ${
                    dark ? 'bg-zinc-100 text-zinc-950 hover:bg-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  <Download className="h-3.5 w-3.5" /> Download .html
                </button>
              </div>
            </div>
            <iframe
              title="Generated site preview"
              className="min-h-0 w-full flex-1 bg-neutral-950/20"
              sandbox=""
              srcDoc={html}
            />
            <div className={`border-t px-4 py-2.5 ${dark ? 'border-zinc-800 bg-emerald-950/25' : 'border-zinc-200 bg-teal-50/80'}`}>
              <p className={`text-center text-[11px] font-bold uppercase tracking-[0.12em] ${dark ? 'text-emerald-400' : 'text-teal-800'}`}>
                {loading ? 'Synthesizing copy and layout tokens' : 'Preview mirrors your prompt and style chips'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
