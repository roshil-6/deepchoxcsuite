'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    ExternalLink,
    Loader2,
    Globe,
    Users,
    Activity,
    Target,
    Save,
    BookOpen,
    Rss,
    RefreshCw,
    Info,
    Sparkles,
    Scale,
    Landmark,
    Cpu,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import { DeskShell, DeskTabButton, DeskEmpty } from '@/components/workspaces/DeskShell';
import { DeskRevealSection } from '@/components/workspaces/DeskRevealSection';
import type { MarketIntelLens, MarketIntelTimeWindow, MarketResearchTopic } from '@/lib/marketIntelQuery';

type IntelItem = {
    title: string;
    source: string;
    time: string;
    link: string;
    type?: string;
};

type IntelMeta = {
    source?: string;
    queriesUsed?: string[];
    researchTopic?: MarketResearchTopic | null;
    fetchedAt?: string;
    disclaimer?: string;
    heuristicNote?: string;
    error?: boolean;
};

const CSO_RESEARCH_FRAMES: {
    id: MarketResearchTopic;
    label: string;
    scanHint: string;
    briefHint: string;
    icon: React.ReactNode;
}[] = [
    {
        id: 'market_lens',
        label: 'Market lens',
        scanHint: 'Sector, landscape & sizing signals for your venture + strategy keywords.',
        briefHint: 'Define segment, ICP, and how you frame the market in the Intelligence brief.',
        icon: <Globe className="h-5 w-5 shrink-0 text-brand-muted" aria-hidden />,
    },
    {
        id: 'competition',
        label: 'Competition',
        scanHint: 'Rivals, “vs”, share, and competitive moves tied to your name and context.',
        briefHint: 'Name competitors and differentiation in the brief after you verify sources.',
        icon: <Users className="h-5 w-5 shrink-0 text-brand-muted" aria-hidden />,
    },
    {
        id: 'momentum',
        label: 'Momentum',
        scanHint: 'Growth, demand, adoption, and expansion headlines.',
        briefHint: 'Track what’s accelerating — log verified signals in the brief.',
        icon: <Activity className="h-5 w-5 shrink-0 text-brand-muted" aria-hidden />,
    },
    {
        id: 'opportunity',
        label: 'Opportunity',
        scanHint: 'Whitespace, emerging markets, disruption, and unmet-need stories.',
        briefHint: 'Turn hypotheses into brief bullets with sources you trust.',
        icon: <Target className="h-5 w-5 shrink-0 text-brand-muted" aria-hidden />,
    },
];

const LENS_OPTIONS: { id: MarketIntelLens; label: string; hint: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All signals', hint: 'Broad scan', icon: <Rss className="h-3.5 w-3.5" aria-hidden /> },
    { id: 'industry', label: 'Industry & market', hint: 'Sector context', icon: <Globe className="h-3.5 w-3.5" aria-hidden /> },
    { id: 'funding', label: 'Funding & deals', hint: 'Capital moves', icon: <Landmark className="h-3.5 w-3.5" aria-hidden /> },
    { id: 'policy', label: 'Policy & legal', hint: 'Regulation', icon: <Scale className="h-3.5 w-3.5" aria-hidden /> },
    { id: 'technology', label: 'Technology', hint: 'Product & tech', icon: <Cpu className="h-3.5 w-3.5" aria-hidden /> },
];

const TOPIC_LABEL: Record<string, string> = {
    funding: 'Funding / capital',
    legal: 'Policy / legal',
    market: 'Markets',
    tech: 'Technology',
    general: 'General',
};

export function ScoutTerminal() {
    const { activeProject, updateMarketInsights } = useOffice();
    const [tab, setTab] = useState<'feed' | 'brief'>('feed');
    const [newsItems, setNewsItems] = useState<IntelItem[]>([]);
    const [intelMeta, setIntelMeta] = useState<IntelMeta | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [brief, setBrief] = useState('');
    const [saving, setSaving] = useState(false);
    const [lens, setLens] = useState<MarketIntelLens>('all');
    const [timeWindow, setTimeWindow] = useState<MarketIntelTimeWindow>('7d');
    /** When set, API runs topic-specific queries (overrides lens until cleared). */
    const [csoFrame, setCsoFrame] = useState<MarketResearchTopic | null>(null);

    const strategyDoc = useMemo(
        () => (activeProject ? parseStrategy(activeProject.strategy || '') : null),
        [activeProject?.strategy]
    );

    const strategicSnippet = useMemo(() => {
        const s = strategyDoc?.strategicIntent?.trim() || strategyDoc?.vision?.trim() || '';
        return s.length > 280 ? `${s.slice(0, 280)}…` : s;
    }, [strategyDoc]);

    const userNotesSnippet = useMemo(() => {
        const n = (activeProject?.userNotes || '').trim();
        return n.length > 400 ? `${n.slice(0, 400)}…` : n;
    }, [activeProject?.userNotes]);

    useEffect(() => {
        setBrief(activeProject?.marketInsights || '');
    }, [activeProject?.marketInsights]);

    const applyIntelResponse = (data: { items?: IntelItem[]; meta?: IntelMeta }) => {
        if (Array.isArray(data.items)) {
            setNewsItems(data.items);
        } else {
            setNewsItems([]);
        }
        if (data.meta && typeof data.meta === 'object') {
            setIntelMeta(data.meta);
        } else {
            setIntelMeta(null);
        }
    };

    const fetchVentureIntel = useCallback(async () => {
        if (!activeProject?.name) return;
        setIsLoading(true);
        setIntelMeta(null);
        try {
            const res = await fetch('/api/intel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ventureName: activeProject.name,
                    strategicIntent: strategicSnippet || undefined,
                    userNotes: userNotesSnippet || undefined,
                    lens,
                    timeWindow,
                    ...(csoFrame ? { researchTopic: csoFrame } : {}),
                }),
            });
            const data = await res.json();
            applyIntelResponse(data);
        } catch (e) {
            console.error(e);
            setNewsItems([]);
            setIntelMeta({ error: true });
        } finally {
            setIsLoading(false);
        }
    }, [activeProject?.name, csoFrame, lens, strategicSnippet, timeWindow, userNotesSnippet]);

    const fetchCustomIntel = useCallback(
        async (q: string) => {
            if (!q.trim()) {
                await fetchVentureIntel();
                return;
            }
            setCsoFrame(null);
            setIsLoading(true);
            setIntelMeta(null);
            try {
                const res = await fetch('/api/intel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: q.trim(), timeWindow }),
                });
                const data = await res.json();
                applyIntelResponse(data);
            } catch (e) {
                console.error(e);
                setNewsItems([]);
                setIntelMeta({ error: true });
            } finally {
                setIsLoading(false);
            }
        },
        [fetchVentureIntel, timeWindow]
    );

    useEffect(() => {
        if (activeProject?.name) {
            void fetchVentureIntel();
        }
    }, [activeProject?.name, fetchVentureIntel]);

    const handleSearchKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') void fetchCustomIntel(searchQuery);
    };

    const onRunClick = () => {
        if (searchQuery.trim()) void fetchCustomIntel(searchQuery);
        else void fetchVentureIntel();
    };

    const saveBrief = () => {
        setSaving(true);
        updateMarketInsights(brief);
        setTimeout(() => setSaving(false), 500);
    };

    if (!activeProject) {
        return <DeskEmpty>Select a venture to open the CSO desk.</DeskEmpty>;
    }

    const activeScanDescription = csoFrame
        ? CSO_RESEARCH_FRAMES.find((f) => f.id === csoFrame)?.scanHint ?? 'CSO frame scan.'
        : `Lens: ${LENS_OPTIONS.find((l) => l.id === lens)?.label ?? 'All signals'}.`;

    return (
        <DeskShell
            eyebrow="CSO · Market intelligence"
            title="Chief Strategy Officer"
            description="Venture-scoped news scan from public RSS (Google News). Results are pointers to third-party articles — not verified facts. Read sources, cross-check, and record your conclusions in the intelligence brief."
            tabs={
                <>
                    <DeskTabButton active={tab === 'feed'} onClick={() => setTab('feed')} icon={<Rss className="h-4 w-4" aria-hidden />}>
                        Market research
                    </DeskTabButton>
                    <DeskTabButton active={tab === 'brief'} onClick={() => setTab('brief')} icon={<BookOpen className="h-4 w-4" aria-hidden />}>
                        Intelligence brief
                    </DeskTabButton>
                </>
            }
        >
            {tab === 'feed' && (
                <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 sm:px-5">
                        <div className="flex gap-2">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/80" aria-hidden />
                            <div className="min-w-0 text-[11px] leading-relaxed text-amber-100/85">
                                <p className="font-semibold text-amber-100/95">Accuracy & decisions</p>
                                <p className="mt-1 text-amber-100/75">
                                    Headlines are automated search results. Publishers may be wrong, biased, or out of date. Open each link,
                                    verify claims, and treat this desk as a <span className="font-medium text-amber-100/90">starting point</span>{' '}
                                    for your own research — not financial or legal advice.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DeskRevealSection
                        variant="brand"
                        defaultOpen
                        title="Research context"
                        subtitle="Pulled from your selected venture — used to tune search queries."
                        badge={
                            <span className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-bg px-2 py-0.5 text-[10px] font-medium text-brand-muted">
                                <Sparkles className="h-3 w-3" aria-hidden />
                                {activeProject.name}
                            </span>
                        }
                    >
                        <div className="space-y-3 text-[12px] leading-relaxed text-brand-muted">
                            <p>
                                <span className="font-medium text-brand-text">Venture:</span> {activeProject.name}
                            </p>
                            {strategicSnippet ? (
                                <div className="rounded-lg border border-brand-border/80 bg-brand-bg/60 p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted/90">From strategy (CEO desk)</p>
                                    <p className="mt-1.5 text-brand-text/95">{strategicSnippet}</p>
                                </div>
                            ) : (
                                <p className="text-brand-muted">
                                    No strategic intent or vision in the CEO strategy yet — add a line there to sharpen market search terms.
                                </p>
                            )}
                            {userNotesSnippet ? (
                                <div className="rounded-lg border border-brand-border/80 bg-brand-bg/60 p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted/90">From venture notes</p>
                                    <p className="mt-1.5 text-brand-text/95">{userNotesSnippet}</p>
                                </div>
                            ) : null}
                        </div>
                    </DeskRevealSection>

                    <DeskRevealSection
                        variant="brand"
                        defaultOpen
                        title="Research by CSO frame"
                        subtitle="Each button runs a different headline search for this venture. Capture takeaways in Intelligence brief. Large tap targets on mobile."
                    >
                        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 min-[900px]:grid-cols-4 sm:gap-3">
                            {CSO_RESEARCH_FRAMES.map((f) => {
                                const active = csoFrame === f.id;
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => {
                                            setCsoFrame(f.id);
                                            setLens('all');
                                            setSearchQuery('');
                                        }}
                                        className={`flex min-h-[48px] w-full touch-manipulation flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition active:scale-[0.99] sm:min-h-[52px] sm:px-4 sm:py-3.5 ${
                                            active
                                                ? 'border-brand-teal/45 bg-brand-input shadow-sm ring-1 ring-brand-teal/30'
                                                : 'border-brand-border bg-brand-bg hover:border-brand-teal/20 hover:bg-brand-panel/50'
                                        }`}
                                    >
                                        <span className="flex w-full items-start gap-2.5">
                                            {f.icon}
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-semibold text-brand-text">{f.label}</span>
                                                <span className="mt-0.5 block text-[11px] leading-snug text-brand-muted">{f.scanHint}</span>
                                            </span>
                                        </span>
                                        <span className="w-full border-t border-brand-border/50 pt-2 text-[10px] leading-snug text-brand-muted/90">
                                            Brief: {f.briefHint}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {csoFrame ? (
                            <p className="mt-3 text-[11px] text-brand-muted">
                                Active frame:{' '}
                                <span className="font-semibold text-brand-text">
                                    {CSO_RESEARCH_FRAMES.find((x) => x.id === csoFrame)?.label}
                                </span>
                                . Pick a lens below or run a custom search to leave frame mode.
                            </p>
                        ) : null}
                    </DeskRevealSection>

                    <DeskRevealSection
                        variant="brand"
                        defaultOpen
                        title="Scan controls"
                        subtitle="Lenses apply when no CSO frame is active. Custom search clears the frame."
                    >
                        <div className="mb-4 flex flex-wrap gap-2">
                            {LENS_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        setCsoFrame(null);
                                        setLens(opt.id);
                                    }}
                                    className={`inline-flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg border px-3 py-2 text-left text-[11px] font-medium transition sm:min-h-0 ${
                                        csoFrame === null && lens === opt.id
                                            ? 'border-brand-teal/40 bg-brand-input text-brand-text'
                                            : 'border-brand-border bg-brand-bg text-brand-muted hover:border-brand-border hover:text-brand-text'
                                    } ${csoFrame !== null ? 'opacity-60' : ''}`}
                                >
                                    {opt.icon}
                                    <span>
                                        <span className="block">{opt.label}</span>
                                        <span className="block text-[10px] font-normal opacity-80">{opt.hint}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Time window</span>
                            {(
                                [
                                    { id: '1d' as const, label: 'Last 24 hours' },
                                    { id: '7d' as const, label: 'Last 7 days' },
                                ] as const
                            ).map((tw) => (
                                <button
                                    key={tw.id}
                                    type="button"
                                    onClick={() => setTimeWindow(tw.id)}
                                    className={`min-h-[44px] touch-manipulation rounded-md border px-4 py-2 text-[11px] font-medium transition sm:min-h-0 sm:px-3 sm:py-1.5 ${
                                        timeWindow === tw.id
                                            ? 'border-brand-teal/35 bg-brand-input text-brand-text'
                                            : 'border-brand-border text-brand-muted hover:text-brand-text'
                                    }`}
                                >
                                    {tw.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                            <div className="relative min-h-[48px] min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                <input
                                    className="min-h-[48px] w-full rounded-lg border border-zinc-600 bg-zinc-900 py-3 pl-10 pr-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 sm:min-h-0 sm:py-2.5 sm:text-sm"
                                    placeholder="Custom search — clears CSO frame. Enter to run…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKey}
                                />
                            </div>
                            <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:items-stretch">
                                <button
                                    type="button"
                                    onClick={onRunClick}
                                    disabled={isLoading}
                                    className="inline-flex min-h-[48px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-card px-4 py-3 text-xs font-semibold text-brand-text transition hover:bg-brand-input disabled:opacity-50 sm:min-h-0 sm:flex-none sm:py-2.5"
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                                    {searchQuery.trim() ? 'Run custom search' : 'Refresh scan'}
                                </button>
                            </div>
                        </div>
                        {intelMeta?.heuristicNote ? (
                            <p className="mt-3 text-[10px] leading-relaxed text-brand-muted/90">{intelMeta.heuristicNote}</p>
                        ) : null}
                    </DeskRevealSection>

                    <DeskRevealSection
                        variant="brand"
                        defaultOpen
                        title="Headlines & sources"
                        subtitle={`${activeScanDescription} Newest first when timestamps exist. Topic tags are from headline wording only.`}
                    >
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-zinc-600" aria-hidden />
                            </div>
                        ) : newsItems.length === 0 ? (
                            <p className="py-8 text-center text-sm text-brand-muted">
                                No articles returned. Try another CSO frame above, a different lens, widen to 7 days, add CEO strategy context, or
                                use a custom search.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                {newsItems.map((item, i) => (
                                    <a
                                        key={`${item.link}-${i}`}
                                        href={item.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-4 transition hover:border-zinc-600"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-medium leading-snug text-zinc-200">{item.title}</h4>
                                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-500">
                                                <span className="font-medium text-zinc-400">{item.source}</span>
                                                <span aria-hidden>·</span>
                                                <span>{item.time}</span>
                                                {item.type ? (
                                                    <>
                                                        <span aria-hidden>·</span>
                                                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-500">
                                                            {TOPIC_LABEL[item.type] || item.type}
                                                        </span>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                        <ExternalLink className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
                                    </a>
                                ))}
                            </div>
                        )}
                        {intelMeta?.queriesUsed && intelMeta.queriesUsed.length > 0 ? (
                            <details className="mt-4 rounded-lg border border-brand-border/60 bg-brand-bg/40 px-3 py-2">
                                <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                                    Queries used (transparency)
                                </summary>
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-brand-muted">
                                    {intelMeta.queriesUsed.map((q, idx) => (
                                        <li key={idx} className="break-all">
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}
                    </DeskRevealSection>

                </div>
            )}

            {tab === 'brief' && (
                <section className="mx-auto max-w-4xl">
                    <DeskRevealSection
                        variant="brand"
                        defaultOpen
                        title="Intelligence brief"
                        subtitle="Your verified synthesis — what you believe after reading sources. This is saved on the venture for CFO, CEO, and sync."
                    >
                        <div className="mb-3 flex justify-end">
                            <button
                                type="button"
                                onClick={saveBrief}
                                className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
                            >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />}
                                Save brief
                            </button>
                        </div>
                        <textarea
                            value={brief}
                            onChange={(e) => setBrief(e.target.value)}
                            placeholder={`After reviewing headlines, capture what you verified:\n• Segment & ICP\n• Competitors and differentiation (with sources you trust)\n• Risks and unknowns\n• Signals to watch next\n`}
                            rows={22}
                            className="w-full rounded-lg border border-brand-border bg-brand-input p-4 text-[15px] leading-relaxed text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                        />
                    </DeskRevealSection>
                </section>
            )}
        </DeskShell>
    );
}
