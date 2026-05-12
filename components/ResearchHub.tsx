'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search, RefreshCw, ExternalLink, Cpu, Globe,
  Zap, FlaskConical, Rocket, Leaf, Shield,
  Layers, Battery, Wifi, Clock, ArrowRight,
  Newspaper, Sparkles, X, ChevronRight, Bookmark
} from 'lucide-react';
import type { ResearchResult } from '@/app/api/research/route';

// ── Field definitions ──────────────────────────────────────────────────────────

const FIELDS = [
  {
    id:    'ai-ml',
    label: 'AI & Machine Learning',
    icon:  Sparkles,
    color: '#a78bfa',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=70&auto=format&fit=crop',
    query: 'artificial intelligence machine learning large language models research breakthrough 2025',
  },
  {
    id:    'robotics',
    label: 'Robotics & Automation',
    icon:  Cpu,
    color: '#34d399',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=900&q=70&auto=format&fit=crop',
    query: 'robotics automation engineering humanoid robot latest developments 2025',
  },
  {
    id:    'space',
    label: 'Space & Aerospace',
    icon:  Rocket,
    color: '#60a5fa',
    image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=900&q=70&auto=format&fit=crop',
    query: 'space technology aerospace SpaceX NASA Starship rocket launch 2025',
  },
  {
    id:    'quantum',
    label: 'Quantum Computing',
    icon:  Zap,
    color: '#f472b6',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=900&q=70&auto=format&fit=crop',
    query: 'quantum computing research IBM Google error correction breakthroughs 2025',
  },
  {
    id:    'biotech',
    label: 'Biotech & Health',
    icon:  FlaskConical,
    color: '#4ade80',
    image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=900&q=70&auto=format&fit=crop',
    query: 'biotechnology health tech medical innovation CRISPR clinical trials 2025',
  },
  {
    id:    'climate',
    label: 'Climate Tech',
    icon:  Leaf,
    color: '#86efac',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=900&q=70&auto=format&fit=crop',
    query: 'climate technology clean energy solar wind battery storage carbon capture 2025',
  },
  {
    id:    'web3',
    label: 'Web3 & Blockchain',
    icon:  Globe,
    color: '#c084fc',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=900&q=70&auto=format&fit=crop',
    query: 'web3 blockchain cryptocurrency DeFi decentralized technology 2025',
  },
  {
    id:    'cybersecurity',
    label: 'Cybersecurity',
    icon:  Shield,
    color: '#f87171',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=900&q=70&auto=format&fit=crop',
    query: 'cybersecurity vulnerabilities zero-day threats AI security research 2025',
  },
  {
    id:    'semiconductors',
    label: 'Semiconductors',
    icon:  Layers,
    color: '#fbbf24',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=70&auto=format&fit=crop',
    query: 'semiconductor chip TSMC NVIDIA Intel AMD fab technology 2nm 2025',
  },
  {
    id:    'ev-energy',
    label: 'EVs & Energy',
    icon:  Battery,
    color: '#2dd4bf',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&q=70&auto=format&fit=crop',
    query: 'electric vehicle battery energy storage solid state grid technology 2025',
  },
  {
    id:    'iot',
    label: 'IoT & Edge',
    icon:  Wifi,
    color: '#38bdf8',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=70&auto=format&fit=crop',
    query: 'internet of things edge computing embedded systems smart devices 2025',
  },
] as const;

type FieldId = typeof FIELDS[number]['id'];
type Field   = typeof FIELDS[number];

// ── Per-field state ────────────────────────────────────────────────────────────

interface FieldState {
  results:   ResearchResult[];
  answer:    string | null;
  loading:   boolean;
  error:     boolean;
  updatedAt: number | null;
}

const EMPTY_FIELD: FieldState = { results: [], answer: null, loading: false, error: false, updatedAt: null };

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\\./, ''); } catch { return url; }
}

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ── Article Image Helper ───────────────────────────────────────────────────────
// Extract image from URL or use a default
function getArticleImage(url: string, index: number): string {
  // Try to extract domain and use a relevant tech image based on index
  const domain = getDomain(url).toLowerCase();
  
  // Map common domains to relevant Unsplash images
  const domainImages: Record<string, string[]> = {
    'techcrunch.com': ['photo-1519389950473-47ba0277781c', 'photo-1498050108023-c5249f4df085'],
    'theverge.com': ['photo-1516321318423-f06f85e504b3', 'photo-1505740420928-5e560c06d30e'],
    'wired.com': ['photo-1518770660439-4636190af475', 'photo-1550751827-4bd374c3f58b'],
    'arstechnica.com': ['photo-1518770660439-4636190af475', 'photo-1558618666-fcd25c85cd64'],
    'mit.edu': ['photo-1635070041078-e363dbe005cb', 'photo-1677442135703-1787eea5ce01'],
    'nature.com': ['photo-1576086213369-97a306d36557', 'photo-1532187863486-abf9dbad1b69'],
    'arxiv.org': ['photo-1635070041078-e363dbe005cb', 'photo-1677442135703-1787eea5ce01'],
    'github.com': ['photo-1618401471353-b98afee0b2eb', 'photo-1555066931-4365d14bab8c'],
  };
  
  // Find matching domain or use tech category images
  for (const [dom, images] of Object.entries(domainImages)) {
    if (domain.includes(dom)) {
      return `https://images.unsplash.com/${images[index % images.length]}?w=400&h=300&fit=crop&q=60`;
    }
  }
  
  // Default tech images rotation
  const defaultImages = [
    'photo-1519389950473-47ba0277781c',
    'photo-1498050108023-c5249f4df085',
    'photo-1516321318423-f06f85e504b3',
    'photo-1505740420928-5e560c06d30e',
    'photo-1550751827-4bd374c3f58b',
    'photo-1518770660439-4636190af475',
    'photo-1558618666-fcd25c85cd64',
    'photo-1635070041078-e363dbe005cb',
  ];
  
  return `https://images.unsplash.com/${defaultImages[index % defaultImages.length]}?w=400&h=300&fit=crop&q=60`;
}

// ── Result card with image ─────────────────────────────────────────────────────

function ResultCard({ item, index }: { item: ResearchResult; index: number }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imageUrl = getArticleImage(item.url, index);
  const domain = getDomain(item.url);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f0f11] transition-all duration-200 hover:border-white/[0.12] hover:bg-[#131316]"
    >
      {/* Article Image */}
      <div className="relative h-32 w-full overflow-hidden bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          loading="lazy"
        />
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <Newspaper className="h-8 w-8 text-zinc-800" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f11] via-transparent to-transparent" />
        
        {/* Domain badge */}
        <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-medium text-white/70 backdrop-blur-sm">
          {domain}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-[14px] font-semibold leading-snug text-white/90 group-hover:text-white">
          {item.title}
        </h3>

        {/* Snippet */}
        {item.snippet && (
          <p className="mb-3 line-clamp-2 text-[12px] leading-relaxed text-white/40">
            {item.snippet}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-white/30">
            {item.publishedDate && (
              <span>{new Date(item.publishedDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-teal-500/70"
                style={{ width: `${Math.round(item.score * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-white/25">{Math.round(item.score * 100)}%</span>
          </div>
        </div>
      </div>
    </a>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex h-64 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f0f11]">
      <div className="h-32 w-full animate-pulse bg-zinc-900" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.04]" />
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.03]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.03]" />
        <div className="mt-auto flex justify-between">
          <div className="h-3 w-16 animate-pulse rounded bg-white/[0.03]" />
          <div className="h-3 w-12 animate-pulse rounded bg-white/[0.03]" />
        </div>
      </div>
    </div>
  );
}

// ── Field section ──────────────────────────────────────────────────────────────

function FieldSection({ field, state, onRefresh }: { field: Field; state: FieldState; onRefresh: () => void }) {
  const Icon = field.icon;

  return (
    <section className="mb-10">
      {/* Section Header with Image Banner */}
      <div className="relative mb-5 h-40 overflow-hidden rounded-xl">
        {/* Background photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={field.image}
          alt={field.label}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl border backdrop-blur-sm"
              style={{ borderColor: `${field.color}40`, background: `${field.color}15` }}
            >
              <Icon className="h-6 w-6" style={{ color: field.color }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{field.label}</h2>
              <div className="mt-0.5 flex items-center gap-2 text-[12px] text-white/40">
                {state.results.length > 0 && <span>{state.results.length} articles</span>}
                {state.updatedAt && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relativeTime(state.updatedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={state.loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* AI Summary */}
      {state.answer && (
        <div className="mb-5 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-teal-400/80">
            <Sparkles className="h-3.5 w-3.5" />
            Key Takeaways
          </div>
          <p className="text-[13px] leading-relaxed text-white/70">
            {state.answer}
          </p>
        </div>
      )}

      {/* Error */}
      {state.error && !state.loading && (
        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-[13px] text-red-400">Could not fetch results. Check your connection and try again.</p>
        </div>
      )}

      {/* Loading skeletons */}
      {state.loading && state.results.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Results grid */}
      {state.results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {state.results.map((item, i) => <ResultCard key={i} item={item} index={i} />)}
        </div>
      )}
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const DEFAULT_FIELDS: FieldId[] = ['ai-ml', 'robotics'];

export function ResearchHub() {
  const [selectedFields, setSelectedFields] = useState<Set<FieldId>>(new Set(DEFAULT_FIELDS));
  const [fieldState, setFieldState]         = useState<Record<string, FieldState>>({});
  const [customQuery, setCustomQuery]       = useState('');
  const [customResults, setCustomResults]   = useState<ResearchResult[]>([]);
  const [customLoading, setCustomLoading]   = useState(false);
  const [customAnswer, setCustomAnswer]     = useState<string | null>(null);
  const [searchFocused, setSearchFocused]   = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Search helper ──────────────────────────────────────────────────────────

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

  // ── Toggle field ───────────────────────────────────────────────────────────

  const toggleField = useCallback((id: FieldId) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        const field = FIELDS.find((f) => f.id === id);
        if (field) void searchField(id, field.query);
      }
      return next;
    });
  }, [searchField]);

  // ── Mount + auto-refresh ───────────────────────────────────────────────────

  useEffect(() => {
    selectedFields.forEach((id) => {
      const field = FIELDS.find((f) => f.id === id);
      if (field && !fieldState[id]?.updatedAt) void searchField(id, field.query);
    });
    autoRefreshRef.current = setInterval(() => {
      selectedFields.forEach((id) => {
        const field = FIELDS.find((f) => f.id === id);
        if (field) void searchField(id, field.query);
      });
    }, AUTO_REFRESH_MS);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Custom search ──────────────────────────────────────────────────────────

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
    } catch { /* noop */ } finally {
      setCustomLoading(false);
    }
  }, [customQuery]);

  const refreshAll = useCallback(() => {
    selectedFields.forEach((id) => {
      const field = FIELDS.find((f) => f.id === id);
      if (field) void searchField(id, field.query);
    });
  }, [selectedFields, searchField]);

  const activeFields = FIELDS.filter((f) => selectedFields.has(f.id));

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0a0c]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0a0a0c]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-7xl">
          {/* Title */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-[15px] font-semibold text-white">Research Hub</h1>
              <p className="mt-0.5 text-[12px] text-white/35">Track what's happening across tech — auto-refreshes every 5 minutes</p>
            </div>
            <button
              onClick={refreshAll}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-medium text-white/50 transition-all hover:border-white/20 hover:text-white/70"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh all
            </button>
          </div>

          {/* Search */}
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl border bg-white/[0.03] px-3 py-2.5 transition-all ${
              searchFocused ? 'border-teal-500/40 shadow-[0_0_0_2px_rgba(20,184,166,0.1)]' : 'border-white/[0.08]'
            }`}
          >
            <Search className={`h-4 w-4 ${searchFocused ? 'text-teal-400' : 'text-white/25'}`} />
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') void runCustomSearch(); }}
              placeholder="Search any topic..."
              className="flex-1 bg-transparent text-[14px] text-white/80 placeholder:text-white/25 outline-none"
            />
            <button
              onClick={runCustomSearch}
              disabled={!customQuery.trim() || customLoading}
              className="flex items-center gap-1.5 rounded-lg bg-teal-500/15 px-3 py-1.5 text-[12px] font-medium text-teal-400 transition-all hover:bg-teal-500/25 disabled:opacity-40"
            >
              {customLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Search
            </button>
          </div>

          {/* Topic selectors */}
          <div className="flex flex-wrap gap-2">
            {FIELDS.map((f) => {
              const active = selectedFields.has(f.id);
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => toggleField(f.id)}
                  className={`group flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] transition-all ${
                    active
                      ? 'border-zinc-700 bg-zinc-800 text-white'
                      : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/10 hover:text-white/60'
                  }`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${active ? 'bg-zinc-700' : 'bg-zinc-900'}`}>
                    <Icon className="h-3.5 w-3.5" style={{ color: active ? f.color : 'rgba(255,255,255,0.3)' }} />
                  </div>
                  <span className="font-medium">{f.label}</span>
                  {active && <X className="h-3 w-3 text-white/40" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-5 py-6">
          {/* Custom results */}
          {(customResults.length > 0 || customLoading) && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <Search className="h-4 w-4 text-white/40" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-white">Search results</h2>
                  <p className="text-[11px] text-white/30">{customResults.length} sources</p>
                </div>
              </div>

              {customAnswer && (
                <div className="mb-4 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
                  <p className="mb-1 text-[11px] font-medium text-teal-400">Summary</p>
                  <p className="text-[13px] leading-relaxed text-white/70">{customAnswer}</p>
                </div>
              )}

              {customLoading && customResults.length === 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              )}

              {customResults.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {customResults.map((item, i) => <ResultCard key={i} item={item} index={i} />)}
                </div>
              )}

              <div className="mt-8 border-b border-white/[0.05]" />
            </section>
          )}

          {/* Empty state */}
          {activeFields.length === 0 && (
            <div className="flex flex-col items-center py-20">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <Bookmark className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-[14px] font-medium text-white/40">Select a topic to get started</p>
              <p className="mt-1 text-[12px] text-white/25">Choose from 11 research fields above</p>
            </div>
          )}

          {/* Field sections */}
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
