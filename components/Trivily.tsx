'use client';

/**
 * Trivily — Live Intelligence Feed
 *
 * Perplexity-style real-time news and market intelligence,
 * auto-tuned to the active venture's industry and interests.
 */

import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    FormEvent,
} from 'react';
import {
    Search,
    RefreshCw,
    ExternalLink,
    ChevronRight,
    Globe,
    TrendingUp,
    Zap,
    BookOpen,
    BarChart2,
    Cpu,
    DollarSign,
    Megaphone,
    Layers,
    Clock,
    AlertCircle,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import type { TrivilyArticle } from '@/app/api/trivily/route';

// ─── Interest extraction ──────────────────────────────────────────────────────

const DOMAIN_KEYWORDS: Record<string, string[]> = {
    fintech: ['fintech', 'payments', 'banking', 'neobank', 'lending', 'crypto', 'defi', 'wealthtech'],
    healthtech: ['healthtech', 'medtech', 'health', 'medical', 'clinical', 'biotech', 'pharma', 'telemedicine'],
    edtech: ['edtech', 'education', 'learning', 'tutoring', 'e-learning', 'courses'],
    saas: ['saas', 'software', 'platform', 'api', 'devtools', 'b2b software', 'enterprise software'],
    ecommerce: ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'direct to consumer', 'd2c'],
    ai: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'generative ai', 'nlp'],
    logistics: ['logistics', 'supply chain', 'fulfilment', 'fulfillment', 'delivery', 'shipping'],
    proptech: ['proptech', 'real estate', 'property', 'housing', 'construction tech'],
    cleantech: ['cleantech', 'climate', 'sustainability', 'renewable', 'energy', 'net zero', 'carbon'],
    legaltech: ['legaltech', 'legal tech', 'law', 'compliance', 'regtech'],
    hrtech: ['hr tech', 'hrtech', 'recruitment', 'talent', 'workforce', 'payroll'],
    cybersecurity: ['cybersecurity', 'security', 'infosec', 'data protection', 'privacy'],
    vc: ['venture capital', 'vc', 'fundraising', 'series a', 'seed round', 'angel investment'],
};

const TOPIC_ICONS: Record<string, React.ElementType> = {
    fintech: DollarSign,
    healthtech: Layers,
    edtech: BookOpen,
    saas: Cpu,
    ecommerce: BarChart2,
    ai: Zap,
    logistics: Globe,
    proptech: TrendingUp,
    cleantech: TrendingUp,
    legaltech: BookOpen,
    hrtech: Layers,
    cybersecurity: Zap,
    vc: DollarSign,
    default: Globe,
};

function detectInterests(project: { name?: string; marketInsights?: string; strategy?: string; userNotes?: string } | null): string[] {
    if (!project) return ['startup funding', 'tech industry', 'product innovation'];

    const text = [
        project.name ?? '',
        project.marketInsights ?? '',
        project.strategy ?? '',
        project.userNotes ?? '',
    ].join(' ').toLowerCase();

    const found: string[] = [];
    for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
        if (kws.some((kw) => text.includes(kw))) {
            found.push(domain);
        }
    }

    // Always include venture name as a topic signal
    if (project.name?.trim()) found.unshift(project.name.trim());

    // Fallback topics
    if (found.length < 2) found.push('startups', 'venture capital', 'tech trends');

    return [...new Set(found)].slice(0, 6);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FaviconDot({ domain }: { domain: string }) {
    const [loaded, setLoaded] = useState(true);
    return loaded ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={`https://www.google.com/s2/favicons?sz=32&domain=${domain}`}
            alt=""
            width={16}
            height={16}
            className="rounded-sm"
            onError={() => setLoaded(false)}
        />
    ) : (
        <Globe className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.28)' }} />
    );
}

function SkeletonLoader() {
    return (
        <div className="flex flex-col gap-0">
            {/* Synthesis skeleton */}
            <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="mb-3 flex items-center gap-2">
                    <div className="h-3 w-16 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div className="space-y-2">
                    <div className="h-3.5 w-full rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <div className="h-3.5 w-[92%] rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-3.5 w-[78%] rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
            </div>
            {/* Article skeletons */}
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="mt-0.5 h-4 w-4 shrink-0 rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-24 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-4 w-[85%] rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
                        <div className="h-3 w-full rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
                        <div className="h-3 w-[70%] rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ArticleRow({ article, index }: { article: TrivilyArticle; index: number }) {
    const [hovered, setHovered] = useState(false);

    return (
        <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex gap-4 px-6 py-5 transition-colors duration-100"
            style={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Index */}
            <span
                className="mt-0.5 shrink-0 w-5 text-right text-[11px] tabular-nums"
                style={{ color: 'rgba(255,255,255,0.20)' }}
            >
                {index + 1}
            </span>

            {/* Content */}
            <div className="min-w-0 flex-1">
                {/* Source row */}
                <div className="mb-1.5 flex items-center gap-1.5">
                    <FaviconDot domain={article.domain} />
                    <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {article.domain}
                    </span>
                    {article.publishedDate && (
                        <>
                            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                                {formatDate(article.publishedDate)}
                            </span>
                        </>
                    )}
                </div>

                {/* Title */}
                <p
                    className="mb-1.5 text-[14px] font-medium leading-snug transition-colors duration-100"
                    style={{ color: hovered ? '#f2f2f5' : 'rgba(255,255,255,0.82)' }}
                >
                    {article.title}
                </p>

                {/* Snippet */}
                {article.snippet && (
                    <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                        {article.snippet.slice(0, 180)}
                        {article.snippet.length > 180 && '…'}
                    </p>
                )}
            </div>

            {/* Arrow */}
            <div className="flex shrink-0 items-start pt-1">
                <ExternalLink
                    className="h-3.5 w-3.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                />
            </div>
        </a>
    );
}

function formatDate(raw: string): string {
    try {
        const d = new Date(raw);
        const now = Date.now();
        const diff = now - d.getTime();
        if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
        if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`;
        if (diff < 7 * 86400_000) return `${Math.round(diff / 86400_000)}d ago`;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Trivily() {
    const { activeProject } = useOffice();

    const [query, setQuery] = useState('');
    const [committed, setCommitted] = useState('');
    const [loading, setLoading] = useState(false);
    const [articles, setArticles] = useState<TrivilyArticle[]>([]);
    const [synthesis, setSynthesis] = useState('');
    const [relatedTopics, setRelatedTopics] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTopic, setActiveTopic] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    const interests = useMemo(
        () =>
            detectInterests(
                activeProject
                    ? {
                          name: activeProject.name,
                          marketInsights: activeProject.marketInsights ?? undefined,
                          strategy: activeProject.strategy ?? undefined,
                          userNotes: activeProject.userNotes ?? undefined,
                      }
                    : null,
            ),
        [activeProject],
    );

    const fetch_ = useCallback(
        async (opts: { query?: string; topic?: string } = {}) => {
            setLoading(true);
            setError(null);
            try {
                const topics = opts.topic
                    ? [opts.topic, ...interests.filter((i) => i !== opts.topic)]
                    : interests;

                const res = await fetch('/api/trivily', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topics: topics.slice(0, 4),
                        query: opts.query?.trim() || undefined,
                        ventureName: activeProject?.name,
                    }),
                });

                if (!res.ok) throw new Error('Failed to fetch intelligence');
                const data = await res.json();

                setArticles(data.articles ?? []);
                setSynthesis(data.synthesis ?? '');
                setRelatedTopics(data.relatedTopics ?? []);
                setLastFetched(new Date());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        },
        [interests, activeProject?.name],
    );

    // Auto-fetch on mount / venture change
    useEffect(() => {
        fetch_();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProject?.id]);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setCommitted(query.trim());
        setActiveTopic(null);
        fetch_({ query: query.trim() });
    };

    const handleTopicClick = (topic: string) => {
        setActiveTopic(topic);
        setCommitted('');
        setQuery('');
        fetch_({ topic });
    };

    const handleRefresh = () => {
        fetch_({ query: committed || undefined, topic: activeTopic || undefined });
    };

    return (
        <div
            className="flex h-full min-h-0 flex-col"
            style={{ background: '#0e0e10', color: '#f2f2f5' }}
        >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div
                className="shrink-0 px-6 pt-6 pb-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
                {/* Brand row */}
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <Zap className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.70)' }} />
                        </div>
                        <div>
                            <span className="text-[15px] font-semibold tracking-tight" style={{ color: '#f2f2f5' }}>
                                Trivily
                            </span>
                            <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                                Intelligence Feed
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {lastFetched && !loading && (
                            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                                <Clock className="h-3 w-3" />
                                {formatDate(lastFetched.toISOString())}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loading}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition hover:bg-white/[0.06] disabled:opacity-40"
                            style={{
                                color: 'rgba(255,255,255,0.45)',
                                border: '1px solid rgba(255,255,255,0.07)',
                            }}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Search bar */}
                <form onSubmit={handleSearch} className="relative">
                    <Search
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                        style={{ color: 'rgba(255,255,255,0.30)' }}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={
                            activeProject
                                ? `Search news about ${activeProject.name}…`
                                : 'Search industry news, trends, companies…'
                        }
                        className="w-full rounded-xl py-3 pl-11 pr-4 text-[14px] outline-none transition placeholder:opacity-40"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.09)',
                            color: '#f2f2f5',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                    />
                    {query && (
                        <button
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition hover:bg-white/[0.08]"
                            style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)' }}
                        >
                            Search
                        </button>
                    )}
                </form>

                {/* Topic chips */}
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => { setActiveTopic(null); setQuery(''); setCommitted(''); fetch_(); }}
                        className="rounded-full px-3 py-1 text-[11px] font-medium transition"
                        style={{
                            background: !activeTopic && !committed ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                            border: '1px solid ' + (!activeTopic && !committed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'),
                            color: !activeTopic && !committed ? '#f2f2f5' : 'rgba(255,255,255,0.40)',
                        }}
                    >
                        For you
                    </button>
                    {interests.map((topic) => {
                        const isActive = activeTopic === topic;
                        const Icon = TOPIC_ICONS[topic] ?? Globe;
                        return (
                            <button
                                key={topic}
                                type="button"
                                onClick={() => handleTopicClick(topic)}
                                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition"
                                style={{
                                    background: isActive ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                                    border: '1px solid ' + (isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'),
                                    color: isActive ? '#f2f2f5' : 'rgba(255,255,255,0.40)',
                                }}
                            >
                                <Icon className="h-3 w-3" />
                                {topic}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="flex min-h-0 flex-1 overflow-y-auto">
                <div className="w-full max-w-3xl">
                    {loading ? (
                        <SkeletonLoader />
                    ) : error ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                            <AlertCircle className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.20)' }} />
                            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{error}</p>
                            <button
                                type="button"
                                onClick={handleRefresh}
                                className="mt-1 text-[12px] font-medium transition hover:opacity-70"
                                style={{ color: 'rgba(255,255,255,0.50)' }}
                            >
                                Try again
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* AI Synthesis */}
                            {synthesis && (
                                <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p
                                        className="mb-3 text-[9px] font-bold uppercase tracking-[0.24em]"
                                        style={{ color: 'rgba(255,255,255,0.22)' }}
                                    >
                                        Intelligence Briefing
                                    </p>
                                    <p className="text-[14px] leading-[1.75]" style={{ color: 'rgba(255,255,255,0.78)' }}>
                                        {synthesis}
                                    </p>

                                    {/* Related topics suggestions */}
                                    {relatedTopics.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {relatedTopics.slice(0, 4).map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => { setQuery(t); setCommitted(t); fetch_({ query: t }); }}
                                                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition hover:opacity-80"
                                                    style={{
                                                        border: '1px solid rgba(255,255,255,0.07)',
                                                        color: 'rgba(255,255,255,0.35)',
                                                    }}
                                                >
                                                    <ChevronRight className="h-2.5 w-2.5" />
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Article count */}
                            {articles.length > 0 && (
                                <div
                                    className="flex items-center justify-between px-6 py-3"
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                >
                                    <p
                                        className="text-[9px] font-bold uppercase tracking-[0.24em]"
                                        style={{ color: 'rgba(255,255,255,0.22)' }}
                                    >
                                        {articles.length} Sources
                                    </p>
                                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                                        Live via Tavily
                                    </p>
                                </div>
                            )}

                            {/* Articles */}
                            {articles.length > 0 ? (
                                articles.map((a, i) => (
                                    <ArticleRow key={a.url} article={a} index={i} />
                                ))
                            ) : (
                                <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
                                    <Globe className="h-10 w-10" style={{ color: 'rgba(255,255,255,0.10)' }} />
                                    <div>
                                        <p className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                            No results found
                                        </p>
                                        <p className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                                            Try a different search query or topic
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
