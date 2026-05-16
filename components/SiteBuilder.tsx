'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
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

  const [prompt, setPrompt] = useState('');
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
            <nav
              className="hidden gap-3 text-[12px] sm:flex sm:items-center"
              aria-label="Modes"
            >
              <span style={{ color: dark ? '#a1a1aa' : '#64748b' }}>Agent</span>
              <span style={{ color: dark ? '#52525b' : '#94a3b8' }}>Preview</span>
            </nav>
          </div>
          <p className={`truncate text-[11px] ${muted}`}>
            Structured HTML from your prompt. Pick a tone in the composer, then generate.
          </p>
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
                <p className="mb-3 text-[12px] font-medium" style={{ color: muted }}>
                  Agent
                </p>
                <p className="text-[15px] font-normal leading-relaxed" style={{ color: dark ? '#e4e4e7' : '#334155' }}>
                  Describe the landing page once. Tone and presets sit in the composer so this column stays readable.
                </p>
                <p className="mt-4 text-[13px]" style={{ color: muted }}>
                  Current output:{' '}
                  <span className="font-medium" style={{ color: dark ? '#fafafa' : '#0f172a' }}>
                    {payload.title || 'Default shell'}
                  </span>
                </p>
              </div>

              {history.length > 0 ? (
                <div>
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium" style={{ color: muted }}>
                      Recent (this browser)
                    </p>
                    <button
                      type="button"
                      onClick={clearHistory}
                      className={`text-[12px] font-medium underline-offset-2 hover:underline ${dark ? 'text-red-400' : 'text-red-600'}`}
                    >
                      Clear all
                    </button>
                  </div>
                  <ul className="space-y-0">
                    {history.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => setPayload(h.payload)}
                          className={`flex w-full rounded-lg px-2 py-2.5 text-left text-[14px] transition-colors ${
                            dark ? 'text-zinc-200 hover:bg-white/[0.04]' : 'text-zinc-800 hover:bg-zinc-100/90'
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">{h.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
              className="mx-auto max-w-[440px] overflow-hidden rounded-xl border shadow-sm"
              style={{
                borderColor: dark ? 'rgba(63,63,70,0.38)' : 'rgba(226,232,240,0.95)',
                background: dark ? '#101014' : '#ffffff',
                boxShadow: dark ? '0 14px 40px rgba(0,0,0,0.35)' : '0 10px 28px rgba(15,23,42,0.06)',
              }}
            >
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: `1px solid ${dark ? 'rgba(39,39,42,0.75)' : 'rgba(241,245,249,1)'}` }}
              >
                <span className="text-[13px]" style={{ color: loading ? '#34d399' : muted }}>
                  {loading ? 'Building' : 'Ready'}
                </span>
              </div>
              <div className="space-y-4 border-b px-4 py-4" style={{ borderColor: dark ? 'rgba(39,39,42,0.75)' : 'rgba(241,245,249,1)' }}>
                <div>
                  <p className="mb-2.5 text-[12px]" style={{ color: muted }}>
                    Tone
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPreset(p.id)}
                        className={`rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                          preset === p.id
                            ? dark
                              ? 'bg-zinc-100 text-zinc-950'
                              : 'bg-zinc-900 text-white'
                            : dark
                              ? 'border border-white/10 bg-transparent text-zinc-300 hover:bg-white/[0.05]'
                              : 'border border-zinc-200/90 bg-transparent text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
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
                  placeholder="Describe the site (audience, offer, sections, and what the visitor should do next)."
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
                    className="rounded-xl px-5 py-3 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35"
                    style={{
                      background: dark ? '#f8fafc' : '#0f172a',
                      color: dark ? '#020617' : '#f8fafc',
                    }}
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        Please wait
                      </span>
                    ) : (
                      'Generate'
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
            className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border ${
              dark ? 'border-white/10 bg-[rgba(11,11,13,0.98)] shadow-[0_18px_50px_rgba(0,0,0,0.45)]' : 'border-zinc-200/90 bg-white/95 shadow-[0_14px_36px_rgba(15,23,42,0.06)]'
            }`}
          >
            <div className={`flex shrink-0 flex-wrap items-center justify-between gap-4 border-b px-4 py-3 sm:px-5 ${dark ? 'border-white/[0.08]' : 'border-zinc-200/90'}`}>
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
            <iframe
              title="Generated site preview"
              className="min-h-0 w-full flex-1 bg-neutral-950/20"
              sandbox=""
              srcDoc={html}
            />
            <div className={`border-t px-4 py-2.5 ${dark ? 'border-white/[0.08] bg-[#0c0c0e]' : 'border-zinc-200/90 bg-zinc-50/60'}`}>
              <p className="text-center text-[12px] font-normal leading-snug" style={{ color: dark ? '#71717a' : '#64748b' }}>
                {loading ? 'Rendering the latest draft in this frame.' : 'This iframe reflects your last generated HTML.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
