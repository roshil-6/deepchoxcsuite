'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search, RefreshCw, Clock, ArrowRight,
  Zap, FlaskConical, Rocket, Leaf, Shield,
  Layers, Battery, Wifi, Globe, Cpu,
} from 'lucide-react';
import type { ResearchResult } from '@/app/api/research/route';
import { useTheme } from '@/lib/ThemeContext';

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
  errorMessage?: string;
  updatedAt: number | null;
}

const EMPTY: FieldState = { results: [], answer: null, loading: false, error: false, updatedAt: null };

// Debug API issues
async function debugFetch(url: string, options: RequestInit) {
  console.log('Fetching:', url, options);
  try {
    const res = await fetch(url, options);
    console.log('Response status:', res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      console.error('Error response:', text);
    }
    return res;
  } catch (err) {
    console.error('Fetch error:', err);
    throw err;
  }
}

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

function ArticleCard({ item, index, dark }: { item: ResearchResult; index: number; dark: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const image = getImage(item.url, index);
  const domain = getDomain(item.url);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className={`group block overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${
        dark
          ? 'border-[#262626] bg-[#141414] hover:border-[#333]'
          : 'border-neutral-200 bg-white hover:border-neutral-300'
      }`}
    >
      <div className={`relative h-32 overflow-hidden ${dark ? 'bg-[#1a1a1a]' : 'bg-neutral-100'}`}>
        <img
          src={image}
          alt=""
          className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
        {!loaded && (
          <div className={`absolute inset-0 flex items-center justify-center text-xs ${dark ? 'text-neutral-600' : 'text-neutral-400'}`}>
            …
          </div>
        )}
        <div className={`absolute inset-0 bg-gradient-to-t ${dark ? 'from-[#141414]' : 'from-white'} via-transparent to-transparent`} />
        <span className={`absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[10px] font-medium shadow-sm ${dark ? 'bg-[#1a1a1a]/90 text-neutral-400' : 'bg-white/90 text-neutral-600'}`}>
          {domain}
        </span>
      </div>
      <div className="p-3">
        <h3 className={`mb-1 line-clamp-2 text-[13px] font-medium leading-snug ${dark ? 'text-neutral-200' : 'text-neutral-900'}`}>
          {item.title}
        </h3>
        {item.snippet && (
          <p className={`mb-2 line-clamp-2 text-[12px] leading-relaxed ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
            {item.snippet}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          {item.publishedDate ? (
            <span className={`flex items-center gap-1 text-[11px] ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              <Clock className="h-3 w-3" />
              {new Date(item.publishedDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
          ) : <span />}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${dark ? 'bg-[#1a1a1a] text-neutral-500' : 'bg-neutral-100 text-neutral-500'}`}>
            {Math.round(item.score * 100)}%
          </span>
        </div>
      </div>
    </a>
  );
}

function SkeletonCard({ dark }: { dark?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-xl border ${dark ? 'border-[#262626]' : 'border-neutral-200'}`}>
      <div className={`h-32 ${dark ? 'bg-[#1a1a1a]' : 'bg-neutral-100'}`} />
      <div className="space-y-2 p-3">
        <div className={`h-4 w-3/4 rounded ${dark ? 'bg-[#1a1a1a]' : 'bg-neutral-100'}`} />
        <div className={`h-3 w-full rounded ${dark ? 'bg-[#1a1a1a]' : 'bg-neutral-100'}`} />
      </div>
    </div>
  );
}

// ── Field section ─────────────────────────────────────────────────────────────

function FieldSection({
  field,
  state,
  onRefresh,
  dark,
}: {
  field: typeof FIELDS[number];
  state: FieldState;
  onRefresh: () => void;
  dark: boolean;
}) {
  const Icon = field.icon;

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${dark ? 'bg-[#1a1a1a]' : 'bg-neutral-100'}`}>
            <Icon className={`h-4 w-4 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`} />
          </div>
          <div>
            <h2 className={`text-[15px] font-medium ${dark ? 'text-neutral-200' : 'text-neutral-900'}`}>{field.label}</h2>
            <p className={`text-[11px] ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
              {state.results.length} articles
              {state.updatedAt && <> · Updated {timeAgo(state.updatedAt)}</>}
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={state.loading}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
            dark
              ? 'border-[#333] bg-[#1a1a1a] text-neutral-400 hover:bg-[#262626]'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
          } disabled:opacity-50`}
        >
          <RefreshCw className={`h-3 w-3 ${state.loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      {state.answer && (
        <div className={`mb-4 rounded-xl border p-4 ${dark ? 'border-[#262626] bg-[#141414]' : 'border-neutral-200 bg-white'}`}>
          <p className={`mb-1 text-[10px] font-medium uppercase tracking-[0.1em] ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Summary</p>
          <p className={`text-[13px] leading-relaxed ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>{state.answer}</p>
        </div>
      )}

      {/* Error */}
      {state.error && !state.loading && (
        <div className={`mb-4 rounded-xl border p-3 text-[13px] ${dark ? 'border-red-900/30 bg-red-950/20 text-red-400' : 'border-red-200 bg-red-50 text-red-600'}`}>
          <p className="font-medium">Error: {state.errorMessage || 'Unknown error'}</p>
          <p className="text-xs mt-1 opacity-70">Check console for details. Try refreshing.</p>
        </div>
      )}

      {/* Loading */}
      {state.loading && state.results.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} dark={dark} />)}
        </div>
      )}

      {/* Results */}
      {state.results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {state.results.map((item, i) => <ArticleCard key={i} item={item} index={i} dark={dark} />)}
        </div>
      )}
    </section>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const REFRESH_MS = 5 * 60 * 1000;
const DEFAULT_FIELDS: FieldId[] = ['ai-ml', 'space'];

export function ResearchHub() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [selected, setSelected] = useState<Set<FieldId>>(new Set(DEFAULT_FIELDS));
  const [states, setStates] = useState<Record<string, FieldState>>({});
  const [query, setQuery] = useState('');
  const [customResults, setCustomResults] = useState<ResearchResult[]>([]);
  const [customLoading, setCustomLoading] = useState(false);
  const [customSummary, setCustomSummary] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const search = useCallback(async (id: string, q: string) => {
    setStates(p => ({ ...p, [id]: { ...(p[id] ?? EMPTY), loading: true, error: false, errorMessage: undefined } }));
    try {
      const r = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, maxResults: 8 }),
      });
      if (!r.ok) {
        const errorText = await r.text();
        console.error('API error:', r.status, errorText);
        throw new Error(`HTTP ${r.status}: ${errorText}`);
      }
      const d = await r.json() as { results: ResearchResult[]; answer: string | null };
      setStates(p => ({ ...p, [id]: { results: d.results, answer: d.answer, loading: false, error: false, updatedAt: Date.now() } }));
    } catch (err: any) {
      console.error('Search error:', err);
      setStates(p => ({ ...p, [id]: { ...(p[id] ?? EMPTY), loading: false, error: true, errorMessage: err.message } }));
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
    <div className={`flex h-full flex-col transition-colors duration-300 ${dark ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f7]'}`}>
      {/* Header */}
      <div className={`shrink-0 border-b px-5 py-4 backdrop-blur-md transition-colors duration-300 ${dark ? 'border-[#1a1a1a] bg-[#0a0a0a]/95' : 'border-neutral-200 bg-white/80'}`}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className={`text-lg font-medium ${dark ? 'text-neutral-200' : 'text-neutral-900'}`}>Research</h1>
              <p className={`mt-0.5 max-w-lg text-[13px] ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Track news across tech. Updates every 5 minutes.
              </p>
            </div>
            <button
              onClick={refreshAll}
              className={`text-[13px] font-medium transition-colors ${dark ? 'text-neutral-500 hover:text-neutral-400' : 'text-neutral-500 hover:text-neutral-700'}`}
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
              className={`flex-1 rounded-lg border px-4 py-2.5 text-[14px] outline-none transition-colors ${
                dark
                  ? 'border-[#262626] bg-[#141414] text-neutral-200 placeholder:text-neutral-600 focus:border-[#333]'
                  : 'border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300'
              }`}
            />
            <button
              onClick={doCustomSearch}
              disabled={!query.trim() || customLoading}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-40 ${
                dark
                  ? 'bg-neutral-200 text-neutral-900 hover:bg-white'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              {customLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Search
            </button>
          </div>

          {/* Topic buttons */}
          <div className="flex flex-wrap gap-2">
            {FIELDS.map(f => {
              const isActive = selected.has(f.id);
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(f.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? dark
                        ? 'border-[#333] bg-[#1a1a1a] text-neutral-200'
                        : 'border-neutral-300 bg-neutral-100 text-neutral-900'
                      : dark
                        ? 'border-[#262626] bg-transparent text-neutral-500 hover:border-[#333] hover:text-neutral-400'
                        : 'border-transparent bg-neutral-100/50 text-neutral-600 hover:bg-neutral-100'
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
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-6xl">
          {/* Custom search results */}
          {(customResults.length > 0 || customLoading) && (
            <div className="mb-10">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Search className={`h-4 w-4 ${dark ? 'text-neutral-500' : 'text-neutral-400'}`} />
                <span className={`text-[15px] font-medium ${dark ? 'text-neutral-200' : 'text-neutral-900'}`}>Results for &ldquo;{query}&rdquo;</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${dark ? 'bg-[#1a1a1a] text-neutral-500' : 'bg-neutral-100 text-neutral-600'}`}>
                  {customResults.length}
                </span>
              </div>

              {customSummary && (
                <div className={`mb-4 rounded-xl border p-4 ${dark ? 'border-[#262626] bg-[#141414]' : 'border-neutral-200 bg-white'}`}>
                  <p className={`text-[13px] leading-relaxed ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>{customSummary}</p>
                </div>
              )}

              {customLoading && customResults.length === 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => <SkeletonCard key={i} dark={dark} />)}
                </div>
              )}

              {customResults.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {customResults.map((item, i) => <ArticleCard key={i} item={item} index={i} dark={dark} />)}
                </div>
              )}

              <div className={`my-8 border-t ${dark ? 'border-[#1a1a1a]' : 'border-neutral-200'}`} />
            </div>
          )}

          {/* Empty state */}
          {active.length === 0 && (
            <div className={`rounded-xl border border-dashed py-16 text-center ${dark ? 'border-[#262626]' : 'border-neutral-300'}`}>
              <p className={`text-[14px] font-medium ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>Choose a topic to get started</p>
              <p className={`mt-1 text-[13px] ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>11 curated research lanes available</p>
            </div>
          )}

          {/* Sections */}
          {active.map(f => (
            <FieldSection
              key={f.id}
              field={f}
              state={states[f.id] ?? EMPTY}
              onRefresh={() => void search(f.id, f.query)}
              dark={dark}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
