'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search, RefreshCw, ExternalLink, Cpu, Globe,
  Zap, FlaskConical, Rocket, Leaf, Shield,
  Layers, Battery, Brain, Wifi, ChevronRight,
  AlertCircle, Clock,
} from 'lucide-react';
import type { ResearchResult } from '@/app/api/research/route';

// ── Field definitions ──────────────────────────────────────────────────────────

const FIELDS = [
  { id: 'ai-ml',         label: 'AI & Machine Learning',  icon: Brain,       query: 'artificial intelligence machine learning research breakthrough 2025' },
  { id: 'robotics',      label: 'Robotics & Automation',  icon: Cpu,         query: 'robotics automation engineering latest developments 2025' },
  { id: 'space',         label: 'Space & Aerospace',      icon: Rocket,      query: 'space technology aerospace engineering SpaceX NASA news 2025' },
  { id: 'quantum',       label: 'Quantum Computing',      icon: Zap,         query: 'quantum computing research IBM Google breakthroughs 2025' },
  { id: 'biotech',       label: 'Biotech & Health',       icon: FlaskConical,query: 'biotechnology health tech medical innovation clinical trials 2025' },
  { id: 'climate',       label: 'Climate Tech',           icon: Leaf,        query: 'climate technology clean energy solar wind battery storage 2025' },
  { id: 'web3',          label: 'Web3 & Blockchain',      icon: Globe,       query: 'web3 blockchain cryptocurrency decentralized technology 2025' },
  { id: 'cybersecurity', label: 'Cybersecurity',          icon: Shield,      query: 'cybersecurity vulnerabilities threats zero-day research 2025' },
  { id: 'semiconductors',label: 'Semiconductors',         icon: Layers,      query: 'semiconductor chip TSMC NVIDIA Intel fab technology 2025' },
  { id: 'ev-energy',     label: 'EVs & Energy',           icon: Battery,     query: 'electric vehicle battery energy storage grid technology 2025' },
  { id: 'iot',           label: 'IoT & Edge',             icon: Wifi,        query: 'internet of things edge computing embedded systems 2025' },
] as const;

type FieldId = typeof FIELDS[number]['id'];

// ── Per-field result state ─────────────────────────────────────────────────────

interface FieldState {
  results: ResearchResult[];
  answer: string | null;
  loading: boolean;
  error: boolean;
  updatedAt: number | null;
}

const EMPTY_FIELD: FieldState = { results: [], answer: null, loading: false, error: false, updatedAt: null };

// ── Helpers ────────────────────────────────────────────────────────────────────

function domain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ── Result card ────────────────────────────────────────────────────────────────

function ResultCard({ item }: { item: ResearchResult }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border p-4 transition-all duration-150 hover:bg-white/[0.04] hover:border-white/[0.14]"
      style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
    >
      {/* Title */}
      <p
        className="mb-1.5 line-clamp-2 text-[13px] font-medium leading-snug group-hover:text-white transition-colors"
        style={{ color: 'rgba(255,255,255,0.82)' }}
      >
        {item.title}
      </p>

      {/* Snippet */}
      {item.snippet && (
        <p
          className="mb-3 line-clamp-2 text-xs leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.42)' }}
        >
          {item.snippet}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2">
        <span
          className="truncate text-[10px] font-medium"
          style={{ color: 'rgba(255,255,255,0.28)' }}
        >
          {domain(item.url)}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Relevance bar */}
          <div
            className="h-1 w-10 overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(item.score * 100)}%`,
                background: item.score > 0.7 ? '#14B8A6' : item.score > 0.4 ? '#F59E0B' : 'rgba(255,255,255,0.3)',
              }}
            />
          </div>
          <ExternalLink
            className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          />
        </div>
      </div>
    </a>
  );
}

// ── Field section ──────────────────────────────────────────────────────────────

function FieldSection({
  field,
  state,
  onRefresh,
}: {
  field: typeof FIELDS[number];
  state: FieldState;
  onRefresh: () => void;
}) {
  const Icon = field.icon;

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: 'rgba(20,184,166,0.10)' }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: 'rgba(20,184,166,0.80)' }} />
          </span>
          <h2 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.80)' }}>
            {field.label}
          </h2>
          {state.results.length > 0 && (
            <span
              className="rounded-full px-1.5 py-px text-[9px] font-bold"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}
            >
              {state.results.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {state.updatedAt && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
              <Clock className="h-2.5 w-2.5" />
              {relativeTime(state.updatedAt)}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={state.loading}
            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06] disabled:opacity-40"
            style={{ color: 'rgba(255,255,255,0.30)' }}
            title="Refresh"
          >
            <RefreshCw className={`h-3 w-3 ${state.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* AI answer pill */}
      {state.answer && (
        <div
          className="mb-4 rounded-xl border px-4 py-3"
          style={{ borderColor: 'rgba(20,184,166,0.15)', background: 'rgba(20,184,166,0.05)' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {state.answer}
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {state.loading && state.results.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {state.error && !state.loading && (
        <div className="flex items-center gap-2 rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.04)' }}>
          <AlertCircle className="h-4 w-4 shrink-0" style={{ color: 'rgba(239,68,68,0.60)' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Search failed. Check your Tavily API key or try again.
          </p>
        </div>
      )}

      {/* Results grid */}
      {state.results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {state.results.map((item, i) => (
            <ResultCard key={i} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_FIELDS: FieldId[] = ['ai-ml', 'robotics'];

export function ResearchHub() {
  const [selectedFields, setSelectedFields] = useState<Set<FieldId>>(new Set(DEFAULT_FIELDS));
  const [fieldState, setFieldState] = useState<Record<string, FieldState>>({});
  const [customQuery, setCustomQuery] = useState('');
  const [customResults, setCustomResults] = useState<ResearchResult[]>([]);
  const [customLoading, setCustomLoading] = useState(false);
  const [customAnswer, setCustomAnswer] = useState<string | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Search helper ────────────────────────────────────────────────────────────

  const searchField = useCallback(async (fieldId: string, query: string) => {
    setFieldState((prev) => ({
      ...prev,
      [fieldId]: { ...(prev[fieldId] ?? EMPTY_FIELD), loading: true, error: false },
    }));

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults: 8 }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json() as { results: ResearchResult[]; answer: string | null };
      setFieldState((prev) => ({
        ...prev,
        [fieldId]: { results: data.results, answer: data.answer, loading: false, error: false, updatedAt: Date.now() },
      }));
    } catch {
      setFieldState((prev) => ({
        ...prev,
        [fieldId]: { ...(prev[fieldId] ?? EMPTY_FIELD), loading: false, error: true },
      }));
    }
  }, []);

  // ── Toggle field ─────────────────────────────────────────────────────────────

  const toggleField = useCallback((id: FieldId) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Kick off search immediately
        const field = FIELDS.find((f) => f.id === id);
        if (field) void searchField(id, field.query);
      }
      return next;
    });
  }, [searchField]);

  // ── Initial load + auto-refresh ──────────────────────────────────────────────

  useEffect(() => {
    // Search all default fields on mount
    selectedFields.forEach((id) => {
      const field = FIELDS.find((f) => f.id === id);
      if (field && !fieldState[id]?.updatedAt) {
        void searchField(id, field.query);
      }
    });

    // Auto-refresh every 5 min
    autoRefreshRef.current = setInterval(() => {
      selectedFields.forEach((id) => {
        const field = FIELDS.find((f) => f.id === id);
        if (field) void searchField(id, field.query);
      });
    }, AUTO_REFRESH_MS);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Custom search ────────────────────────────────────────────────────────────

  const runCustomSearch = useCallback(async () => {
    if (!customQuery.trim()) return;
    setCustomLoading(true);
    setCustomResults([]);
    setCustomAnswer(null);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: customQuery.trim(), maxResults: 8 }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json() as { results: ResearchResult[]; answer: string | null };
      setCustomResults(data.results);
      setCustomAnswer(data.answer);
    } catch {
      /* noop */
    } finally {
      setCustomLoading(false);
    }
  }, [customQuery]);

  // ── Refresh all selected ─────────────────────────────────────────────────────

  const refreshAll = useCallback(() => {
    selectedFields.forEach((id) => {
      const field = FIELDS.find((f) => f.id === id);
      if (field) void searchField(id, field.query);
    });
  }, [selectedFields, searchField]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const activeFields = FIELDS.filter((f) => selectedFields.has(f.id));

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: '#0d0d0d' }}>
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 shrink-0 border-b px-6 py-4"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0d0d0d' }}
      >
        <div className="mx-auto max-w-6xl">
          {/* Title row */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Research Hub
              </h1>
              <p className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                Live web intelligence &middot; powered by Tavily &middot; auto-refreshes every 5 min
              </p>
            </div>
            <button
              type="button"
              onClick={refreshAll}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all hover:bg-white/[0.04]"
              style={{ borderColor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.40)' }}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh all
            </button>
          </div>

          {/* Custom search bar */}
          <div
            className="mb-4 flex items-center gap-2 overflow-hidden rounded-xl border"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            <Search className="ml-4 h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void runCustomSearch(); }}
              placeholder="Search any topic — AI safety, fusion energy, quantum error correction..."
              className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-white/20"
              style={{ color: 'rgba(255,255,255,0.80)' }}
            />
            <button
              type="button"
              onClick={runCustomSearch}
              disabled={!customQuery.trim() || customLoading}
              className="mr-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.70)' }}
            >
              {customLoading
                ? <RefreshCw className="h-3 w-3 animate-spin" />
                : <ChevronRight className="h-3 w-3" />
              }
              Search
            </button>
          </div>

          {/* Field selector chips */}
          <div className="flex flex-wrap gap-1.5">
            {FIELDS.map((f) => {
              const active = selectedFields.has(f.id);
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleField(f.id)}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all duration-150"
                  style={{
                    borderColor: active ? 'rgba(20,184,166,0.40)' : 'rgba(255,255,255,0.07)',
                    background:   active ? 'rgba(20,184,166,0.10)' : 'transparent',
                    color:        active ? 'rgba(20,184,166,0.90)' : 'rgba(255,255,255,0.38)',
                  }}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">

          {/* Custom search results */}
          {(customResults.length > 0 || customLoading) && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <Search className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.40)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.80)' }}>
                  Results for &ldquo;{customQuery}&rdquo;
                </h2>
              </div>
              {customAnswer && (
                <div
                  className="mb-4 rounded-xl border px-4 py-3"
                  style={{ borderColor: 'rgba(20,184,166,0.15)', background: 'rgba(20,184,166,0.05)' }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {customAnswer}
                  </p>
                </div>
              )}
              {customLoading && customResults.length === 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 animate-pulse rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }} />
                  ))}
                </div>
              )}
              {customResults.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {customResults.map((item, i) => <ResultCard key={i} item={item} />)}
                </div>
              )}
              <div className="mt-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            </section>
          )}

          {/* Selected field sections */}
          {activeFields.length === 0 && (
            <div className="flex flex-col items-center py-24 text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <Globe className="h-6 w-6" style={{ color: 'rgba(255,255,255,0.18)' }} />
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Select topics above to start receiving live intelligence.
              </p>
              <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.20)' }}>
                Results auto-refresh every 5 minutes.
              </p>
            </div>
          )}

          {activeFields.map((field) => (
            <FieldSection
              key={field.id}
              field={field}
              state={fieldState[field.id] ?? EMPTY_FIELD}
              onRefresh={() => void searchField(field.id, field.query)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
