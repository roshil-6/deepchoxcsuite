'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search, RefreshCw, Clock, ArrowRight,
  Zap, FlaskConical, Rocket, Leaf, Shield,
  Layers, Battery, Wifi, Globe, Cpu,
} from 'lucide-react';
import type { ResearchResult } from '@/app/api/research/route';

// ── Research fields ───────────────────────────────────────────────────────────

const FIELDS = [
  { id: 'ai-ml', label: 'AI & ML', icon: Zap, query: 'artificial intelligence machine learning LLM research 2025' },
  { id: 'robotics', label: 'Robotics', icon: Cpu, query: 'robotics automation humanoid robot 2025' },
  { id: 'space', label: 'Space', icon: Rocket, query: 'space aerospace SpaceX NASA rocket 2025' },
  { id: 'quantum', label: 'Quantum', icon: Zap, query: 'quantum computing research IBM Google 2025' },
  { id: 'biotech', label: 'Biotech', icon: FlaskConical, query: 'biotechnology health CRISPR medical 2025' },
  { id: 'climate', label: 'Climate', icon: Leaf, query: 'climate clean energy solar battery carbon 2025' },
  { id: 'web3', label: 'Web3', icon: Globe, query: 'web3 blockchain crypto DeFi 2025' },
  { id: 'security', label: 'Security', icon: Shield, query: 'cybersecurity threats AI security 2025' },
  { id: 'chips', label: 'Semiconductors', icon: Layers, query: 'semiconductor chip TSMC NVIDIA Intel 2025' },
  { id: 'ev', label: 'EV & Energy', icon: Battery, query: 'electric vehicle battery solid state 2025' },
  { id: 'iot', label: 'IoT', icon: Wifi, query: 'IoT edge computing smart devices 2025' },
] as const;

type FieldId = typeof FIELDS[number]['id'];

interface FieldState {
  results: ResearchResult[];
  answer: string | null;
  loading: boolean;
  error: boolean;
  updatedAt: number | null;
}

const EMPTY: FieldState = { results: [], answer: null, loading: false, error: false, updatedAt: null };

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function timeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// Map domains to relevant images
const DOMAIN_IMAGES: Record<string, string> = {
  'techcrunch.com': 'photo-1519389950473-47ba0277781c',
  'theverge.com': 'photo-1516321318423-f06f85e504b3',
  'wired.com': 'photo-1518770660439-4636190af475',
  'arstechnica.com': 'photo-1550751827-4bd374c3f58b',
  'mit.edu': 'photo-1635070041078-e363dbe005cb',
  'nature.com': 'photo-1532187863486-abf9dbad1b69',
  'github.com': 'photo-1618401471353-b98afee0b2eb',
  'arxiv.org': 'photo-1635070041078-e363dbe005cb',
};

const DEFAULT_IMAGES = [
  'photo-1519389950473-47ba0277781c', 'photo-1498050108023-c5249f4df085',
  'photo-1516321318423-f06f85e504b3', 'photo-1505740420928-5e560c06d30e',
  'photo-1550751827-4bd374c3f58b', 'photo-1518770660439-4636190af475',
  'photo-1558618666-fcd25c85cd64', 'photo-1635070041078-e363dbe005cb',
];

function getImage(url: string, idx: number): string {
  const domain = getDomain(url);
  for (const [d, img] of Object.entries(DOMAIN_IMAGES)) {
    if (domain.includes(d)) return `https://images.unsplash.com/${img}?w=400&h=250&fit=crop&q=60`;
  }
  return `https://images.unsplash.com/${DEFAULT_IMAGES[idx % DEFAULT_IMAGES.length]}?w=400&h=250&fit=crop&q=60`;
}

function relevanceDots(score: number) {
  const n = Math.max(1, Math.min(5, Math.round(score * 5)));
  return (
    <div className="flex items-center gap-0.5" title={`Relevance ${Math.round(score * 100)}%`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1 w-1 rounded-full ${i <= n ? 'bg-teal-500' : 'bg-slate-200'}`}
        />
      ))}
    </div>
  );
}

// ── Article card ───────────────────────────────────────────────────────────────

function ArticleCard({ item, index }: { item: ResearchResult; index: number }) {
  const [loaded, setLoaded] = useState(false);
  const image = getImage(item.url, index);
  const domain = getDomain(item.url);
  const pct = Math.round(item.score * 100);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_-6px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300/50 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.12)]"
    >
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
        <img
          src={image}
          alt=""
          className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400">
            …
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-transparent to-transparent" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold tracking-tight text-slate-700 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm">
          {domain}
        </span>
      </div>
      <div className="p-3.5">
        <h3 className="mb-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 group-hover:text-teal-800">
          {item.title}
        </h3>
        {item.snippet && (
          <p className="mb-3 line-clamp-2 text-[12px] leading-relaxed text-slate-500">
            {item.snippet}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
          {item.publishedDate ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <Clock className="h-3 w-3 shrink-0" />
              {new Date(item.publishedDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
          ) : <span />}
          <div className="flex items-center gap-2">
            {relevanceDots(item.score)}
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
              {pct}%
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="h-36 animate-pulse bg-slate-100" />
      <div className="space-y-2 p-3.5">
        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded-lg bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

// ── Field section ─────────────────────────────────────────────────────────────

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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/90">
            <Icon className="h-4 w-4 text-teal-600" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">{field.label}</h2>
            <p className="text-[11px] text-slate-500">
              {state.results.length} articles
              {state.updatedAt && <> · Updated {timeAgo(state.updatedAt)}</>}
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={state.loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 shadow-sm transition-colors hover:border-teal-200 hover:text-teal-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${state.loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      {state.answer && (
        <div className="mb-4 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm ring-1 ring-white/80">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700/80">What we found</p>
          <p className="text-[13px] leading-relaxed text-slate-700">{state.answer}</p>
        </div>
      )}

      {/* Error */}
      {state.error && !state.loading && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-[13px] text-red-800">
          Something went wrong. Try refreshing.
        </div>
      )}

      {/* Loading */}
      {state.loading && state.results.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Results */}
      {state.results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {state.results.map((item, i) => <ArticleCard key={i} item={item} index={i} />)}
        </div>
      )}
    </section>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const REFRESH_MS = 5 * 60 * 1000;
const DEFAULT_FIELDS: FieldId[] = ['ai-ml', 'space'];

export function ResearchHub() {
  const [selected, setSelected] = useState<Set<FieldId>>(new Set(DEFAULT_FIELDS));
  const [states, setStates] = useState<Record<string, FieldState>>({});
  const [query, setQuery] = useState('');
  const [customResults, setCustomResults] = useState<ResearchResult[]>([]);
  const [customLoading, setCustomLoading] = useState(false);
  const [customSummary, setCustomSummary] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const search = useCallback(async (id: string, q: string) => {
    setStates(p => ({ ...p, [id]: { ...(p[id] ?? EMPTY), loading: true, error: false } }));
    try {
      const r = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, maxResults: 8 }),
      });
      if (!r.ok) throw new Error('fail');
      const d = await r.json() as { results: ResearchResult[]; answer: string | null };
      setStates(p => ({ ...p, [id]: { results: d.results, answer: d.answer, loading: false, error: false, updatedAt: Date.now() } }));
    } catch {
      setStates(p => ({ ...p, [id]: { ...(p[id] ?? EMPTY), loading: false, error: true } }));
    }
  }, []);

  const toggle = useCallback((id: FieldId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        const f = FIELDS.find(x => x.id === id);
        if (f) void search(id, f.query);
      }
      return next;
    });
  }, [search]);

  useEffect(() => {
    selected.forEach(id => {
      const f = FIELDS.find(x => x.id === id);
      if (f && !states[id]?.updatedAt) void search(id, f.query);
    });
    timerRef.current = setInterval(() => {
      selected.forEach(id => {
        const f = FIELDS.find(x => x.id === id);
        if (f) void search(id, f.query);
      });
    }, REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doCustomSearch = useCallback(async () => {
    if (!query.trim()) return;
    setCustomLoading(true);
    setCustomResults([]);
    setCustomSummary(null);
    try {
      const r = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), maxResults: 8 }),
      });
      if (!r.ok) throw new Error('fail');
      const d = await r.json() as { results: ResearchResult[]; answer: string | null };
      setCustomResults(d.results);
      setCustomSummary(d.answer);
    } catch { /* ignore */ } finally { setCustomLoading(false); }
  }, [query]);

  const refreshAll = useCallback(() => {
    selected.forEach(id => {
      const f = FIELDS.find(x => x.id === id);
      if (f) void search(id, f.query);
    });
  }, [selected, search]);

  const active = FIELDS.filter(f => selected.has(f.id));

  return (
    <div className="flex h-full flex-col bg-[#e8e9ed] text-slate-800">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200/90 bg-[#e8e9ed]/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-900">Research</h1>
              <p className="mt-0.5 max-w-lg text-[12px] leading-relaxed text-slate-600">
                Like a prompt-to-brief studio: pick lanes or describe what you want to ship — we pull clean sources and refresh every few minutes.
              </p>
            </div>
            <button
              onClick={refreshAll}
              className="text-[12px] font-semibold text-teal-700 underline decoration-teal-300/70 underline-offset-4 hover:text-teal-900"
            >
              Refresh all
            </button>
          </div>

          {/* Search */}
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void doCustomSearch(); }}
              placeholder="Ask in plain language — markets, tech, competitors…"
              className="flex-1 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20"
            />
            <button
              onClick={doCustomSearch}
              disabled={!query.trim() || customLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-40"
            >
              {customLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Search
            </button>
          </div>

          {/* Topic buttons */}
          <div className="flex flex-wrap gap-1.5">
            {FIELDS.map(f => {
              const isActive = selected.has(f.id);
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(f.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold transition ${
                    isActive
                      ? 'border-teal-300/80 bg-white text-teal-900 shadow-sm ring-1 ring-teal-200/60'
                      : 'border-transparent bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-6xl">
          {/* Custom search results */}
          {(customResults.length > 0 || customLoading) && (
            <div className="mb-10">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Search className="h-4 w-4 text-teal-600" />
                <span className="text-[14px] font-semibold text-slate-900">Results for &ldquo;{query}&rdquo;</span>
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {customResults.length}
                </span>
              </div>

              {customSummary && (
                <div className="mb-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <p className="text-[13px] leading-relaxed text-slate-700">{customSummary}</p>
                </div>
              )}

              {customLoading && customResults.length === 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              )}

              {customResults.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {customResults.map((item, i) => <ArticleCard key={i} item={item} index={i} />)}
                </div>
              )}

              <div className="my-8 border-b border-slate-200/80" />
            </div>
          )}

          {/* Empty state */}
          {active.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/50 py-16 text-center">
              <p className="text-[14px] font-medium text-slate-600">Choose a topic above to open a live lane</p>
              <p className="mt-1 text-[12px] text-slate-500">11 curated tracks · additive — mix as many as you like</p>
            </div>
          )}

          {/* Sections */}
          {active.map(f => (
            <FieldSection
              key={f.id}
              field={f}
              state={states[f.id] ?? EMPTY}
              onRefresh={() => void search(f.id, f.query)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
