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

// ── Article card ───────────────────────────────────────────────────────────────

function ArticleCard({ item, index }: { item: ResearchResult; index: number }) {
  const [loaded, setLoaded] = useState(false);
  const image = getImage(item.url, index);
  const domain = getDomain(item.url);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded border border-gray-800 bg-gray-900 hover:border-gray-700"
    >
      <div className="relative h-40 overflow-hidden bg-gray-950">
        <img
          src={image}
          alt=""
          className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
        {!loaded && <div className="absolute inset-0 flex items-center justify-center text-gray-800">Loading...</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-gray-300">
          {domain}
        </span>
      </div>
      <div className="p-3">
        <h3 className="mb-2 line-clamp-2 text-[13px] font-medium text-gray-200 group-hover:text-white">
          {item.title}
        </h3>
        {item.snippet && (
          <p className="mb-3 line-clamp-2 text-[12px] text-gray-500">
            {item.snippet}
          </p>
        )}
        <div className="flex items-center justify-between text-[11px] text-gray-600">
          {item.publishedDate && (
            <span>{new Date(item.publishedDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
          )}
          <div className="flex items-center gap-1">
            <div className="h-1 w-10 rounded-full bg-gray-800">
              <div className="h-full rounded-full bg-gray-500" style={{ width: `${Math.round(item.score * 100)}%` }} />
            </div>
            <span>{Math.round(item.score * 100)}%</span>
          </div>
        </div>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded border border-gray-800 bg-gray-900">
      <div className="h-40 animate-pulse bg-gray-950" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-800" />
        <div className="h-3 w-full animate-pulse rounded bg-gray-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-800" />
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
    <section className="mb-8">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-800">
            <Icon className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <h2 className="text-[15px] font-medium text-gray-200">{field.label}</h2>
            <p className="text-[11px] text-gray-500">
              {state.results.length} articles
              {state.updatedAt && <> · Updated {timeAgo(state.updatedAt)}</>}
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={state.loading}
          className="rounded bg-gray-800 px-3 py-1.5 text-[12px] text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`inline h-3 w-3 ${state.loading ? 'animate-spin' : ''}`} />
          <span className="ml-1">Refresh</span>
        </button>
      </div>

      {/* Summary */}
      {state.answer && (
        <div className="mb-4 rounded border border-gray-800 bg-gray-900 p-3">
          <p className="mb-1 text-[11px] text-gray-500">What we found</p>
          <p className="text-[13px] leading-relaxed text-gray-300">{state.answer}</p>
        </div>
      )}

      {/* Error */}
      {state.error && !state.loading && (
        <div className="mb-4 rounded border border-red-900/50 bg-red-950/20 p-3 text-[13px] text-red-400">
          Something went wrong. Try refreshing.
        </div>
      )}

      {/* Loading */}
      {state.loading && state.results.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Results */}
      {state.results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
    <div className="flex h-full flex-col bg-[#0a0a0b] text-gray-300">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-base font-medium text-gray-100">Research</h1>
              <p className="text-[12px] text-gray-500">Track news across tech. Updates every 5 minutes.</p>
            </div>
            <button
              onClick={refreshAll}
              className="text-[12px] text-gray-500 hover:text-gray-300"
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
              placeholder="Search anything..."
              className="flex-1 rounded border border-gray-800 bg-gray-900 px-3 py-2 text-[14px] text-gray-200 placeholder:text-gray-600 outline-none focus:border-gray-700"
            />
            <button
              onClick={doCustomSearch}
              disabled={!query.trim() || customLoading}
              className="flex items-center gap-1 rounded bg-gray-200 px-3 py-2 text-[13px] font-medium text-black hover:bg-white disabled:opacity-40"
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
                  className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[12px] transition ${
                    isActive
                      ? 'border-gray-600 bg-gray-800 text-gray-200'
                      : 'border-gray-800 bg-transparent text-gray-500 hover:border-gray-700 hover:text-gray-400'
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
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-6xl">
          {/* Custom search results */}
          {(customResults.length > 0 || customLoading) && (
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <span className="text-[14px] text-gray-200">Results for "{query}"</span>
                <span className="text-[12px] text-gray-600">({customResults.length})</span>
              </div>

              {customSummary && (
                <div className="mb-4 rounded border border-gray-800 bg-gray-900 p-3">
                  <p className="text-[13px] leading-relaxed text-gray-300">{customSummary}</p>
                </div>
              )}

              {customLoading && customResults.length === 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              )}

              {customResults.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {customResults.map((item, i) => <ArticleCard key={i} item={item} index={i} />)}
                </div>
              )}

              <div className="my-6 border-b border-gray-800" />
            </div>
          )}

          {/* Empty state */}
          {active.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[14px] text-gray-500">Pick a topic above to see the latest news</p>
              <p className="mt-1 text-[12px] text-gray-600">11 topics available</p>
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
