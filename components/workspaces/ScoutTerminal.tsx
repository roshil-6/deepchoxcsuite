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
    Scale,
    Landmark,
    Cpu,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import { DeskShell, DeskEmpty } from '@/components/workspaces/DeskShell';
import { deskHeadline, deskHelpText } from '@/lib/researchStaffLabels';
import {
    DeskMsgUser,
    DeskMsgAssistant,
    DeskHubRow,
    DeskFocusToolbar,
} from '@/components/workspaces/DeskBlockFocusUI';
import type { MarketIntelLens, MarketIntelTimeWindow, MarketResearchTopic } from '@/lib/marketIntelQuery';
import { useTokens } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';

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
        label: 'Research market lens',
        scanHint: 'Research sector, landscape, and sizing signals for your venture plus strategy keywords.',
        briefHint: 'Define segment, ideal customer profile, and how you frame the market in the intelligence brief.',
        icon: <Globe className="h-5 w-5 shrink-0 text-brand-muted" aria-hidden />,
    },
    {
        id: 'competition',
        label: 'Research competition',
        scanHint: 'Research rivals, comparisons, share, and competitive moves tied to your name and context.',
        briefHint: 'Name competitors and differentiation in the brief after you verify sources.',
        icon: <Users className="h-5 w-5 shrink-0 text-brand-muted" aria-hidden />,
    },
    {
        id: 'momentum',
        label: 'Research momentum',
        scanHint: 'Research growth, demand, adoption, and expansion headlines.',
        briefHint: 'Track what is accelerating — log verified signals in the brief.',
        icon: <Activity className="h-5 w-5 shrink-0 text-brand-muted" aria-hidden />,
    },
    {
        id: 'opportunity',
        label: 'Research opportunity',
        scanHint: 'Research whitespace, emerging markets, disruption, and unmet-need stories.',
        briefHint: 'Turn hypotheses into brief bullets with sources you trust.',
        icon: <Target className="h-5 w-5 shrink-0 text-brand-muted" aria-hidden />,
    },
];

const LENS_OPTIONS: { id: MarketIntelLens; label: string; hint: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Research all signals', hint: 'Broad scan', icon: <Rss className="h-3.5 w-3.5" aria-hidden /> },
    { id: 'industry', label: 'Research industry and market', hint: 'Sector context', icon: <Globe className="h-3.5 w-3.5" aria-hidden /> },
    { id: 'funding', label: 'Research funding and deals', hint: 'Capital moves', icon: <Landmark className="h-3.5 w-3.5" aria-hidden /> },
    { id: 'policy', label: 'Research policy and legal', hint: 'Regulation', icon: <Scale className="h-3.5 w-3.5" aria-hidden /> },
    { id: 'technology', label: 'Research technology', hint: 'Product and engineering', icon: <Cpu className="h-3.5 w-3.5" aria-hidden /> },
];

const TOPIC_LABEL: Record<string, string> = {
    funding: 'Funding / capital',
    legal: 'Policy / legal',
    market: 'Markets',
    tech: 'Technology',
    general: 'General',
};

type ScoutFocusKey = 'context' | 'frames' | 'controls' | 'headlines' | 'brief';

const SCOUT_FOCUS_META: Record<
    ScoutFocusKey,
    { title: string; question: string; prompt: string; hubSub: string }
> = {
    context: {
        title: 'Research context',
        question: 'What venture and strategy signals should tune this scan?',
        prompt:
            'User is reviewing venture name, research strategy field, and notes that tune automated market scans. Emphasize verification and scan tuning.',
        hubSub: 'Venture, strategy snippet, and notes feeding the scan.',
    },
    frames: {
        title: 'Research scan frames',
        question: 'Which research frame should we run next — lens, competition, momentum, or opportunity?',
        prompt:
            'User selects a research frame to run focused intel queries. Remind them headlines are pointers and need source checks.',
        hubSub: 'Tap a frame to narrow what the scan emphasizes.',
    },
    controls: {
        title: 'Scan controls',
        question: 'How should we lens, time-window, or query this scan?',
        prompt:
            'User adjusts lens, time window, custom search, and refresh. Custom search clears frame mode; emphasize source verification.',
        hubSub: 'Lenses, window, custom query, and run controls.',
    },
    headlines: {
        title: 'Headlines & sources',
        question: 'What are the latest headlines and how should we verify them?',
        prompt:
            'User reads automated headlines — stress verify sources; not advice. Queries used may appear in a disclosure.',
        hubSub: 'Newest first when timestamps exist; open external links.',
    },
    brief: {
        title: 'Intelligence brief',
        question: 'What verified synthesis should we save for the venture record?',
        prompt:
            'User edits the verified market intelligence brief saved on the venture for fund intelligence, strategy, and staff sync.',
        hubSub: 'Capture verified takeaways after reviewing headlines.',
    },
};

export function ScoutTerminal() {
    const { activeProject, updateMarketInsights, setDeskSectionFocus } = useOffice();
    /** `spend` is stable; never depend on the whole `useTokens()` object (new ref every render → infinite effects). */
    const { spend: spendTokens } = useTokens();
    const [scoutFocus, setScoutFocus] = useState<ScoutFocusKey | null>(null);
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
        const paid = spendTokens(TOKEN_COSTS.CHAT_MESSAGE, 'Scout intel');
        if (!paid.success) {
            setNewsItems([]);
            setIntelMeta({
                error: true,
                disclaimer:
                    paid.message ??
                    'Daily AI credits are used up. Upgrade to Pro for unlimited usage, or try again after the daily reset.',
            });
            setIsLoading(false);
            return;
        }
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
    }, [activeProject?.name, csoFrame, lens, strategicSnippet, timeWindow, userNotesSnippet, spendTokens]);

    const fetchCustomIntel = useCallback(
        async (q: string) => {
            if (!q.trim()) {
                await fetchVentureIntel();
                return;
            }
            setCsoFrame(null);
            setIsLoading(true);
            setIntelMeta(null);
            const paid = spendTokens(TOKEN_COSTS.CHAT_MESSAGE, 'Scout intel query');
            if (!paid.success) {
                setNewsItems([]);
                setIntelMeta({
                    error: true,
                    disclaimer:
                        paid.message ??
                        'Daily AI credits are used up. Upgrade to Pro for unlimited usage, or try again after the daily reset.',
                });
                setIsLoading(false);
                return;
            }
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
        [fetchVentureIntel, timeWindow, spendTokens]
    );

    useEffect(() => {
        if (activeProject?.name) {
            void fetchVentureIntel();
        }
    }, [activeProject?.name, fetchVentureIntel]);

    useEffect(() => {
        setScoutFocus(null);
        setDeskSectionFocus(null);
    }, [activeProject?.id, setDeskSectionFocus]);

    const openScoutSection = (k: ScoutFocusKey) => {
        if (!activeProject) return;
        const m = SCOUT_FOCUS_META[k];
        setDeskSectionFocus({ room: 'scout', sectionId: k, title: m.title, prompt: m.prompt });
        setScoutFocus(k);
    };

    const goScoutHub = () => {
        setDeskSectionFocus(null);
        setScoutFocus(null);
    };

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
        return <DeskEmpty>Select a venture to open Research market and landscape.</DeskEmpty>;
    }

    const activeScanDescription = csoFrame
        ? CSO_RESEARCH_FRAMES.find((f) => f.id === csoFrame)?.scanHint ?? 'Research frame scan.'
        : `Lens: ${LENS_OPTIONS.find((l) => l.id === lens)?.label ?? 'Research all signals'}.`;

    const scoutDisclaimer = (
        <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-950/15 px-3 py-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200/75" aria-hidden />
            <p className="min-w-0 text-[10px] leading-snug text-amber-100/80">
                <span className="font-semibold text-amber-100/90">Pointers only.</span> Headlines are automated; verify sources. Not advice.
            </p>
        </div>
    );

    const renderScoutFocusBody = (key: ScoutFocusKey) => {
        switch (key) {
            case 'context':
                return (
                    <>
                        {scoutDisclaimer}
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-md border border-brand-border/50 bg-brand-bg/35 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">Venture</p>
                                <p className="mt-0.5 text-[13px] font-medium leading-snug text-brand-text">{activeProject.name}</p>
                            </div>
                            <div className="rounded-md border border-brand-border/50 bg-brand-bg/35 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">Research strategy field</p>
                                {strategicSnippet ? (
                                    <p className="mt-0.5 text-[11px] leading-snug text-brand-text/95">{strategicSnippet}</p>
                                ) : (
                                    <p className="mt-0.5 text-[11px] text-brand-muted">Add intent or vision under Research strategy and direction.</p>
                                )}
                            </div>
                        </div>
                        {userNotesSnippet ? (
                            <div className="mt-2 rounded-md border border-brand-border/50 bg-brand-bg/25 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">Notes</p>
                                <p className="mt-0.5 text-[11px] leading-snug text-brand-text/95">{userNotesSnippet}</p>
                            </div>
                        ) : null}
                    </>
                );
            case 'frames':
                return (
                    <>
                        {scoutDisclaimer}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {CSO_RESEARCH_FRAMES.map((f) => {
                                const active = csoFrame === f.id;
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        title={`${f.scanHint} — Brief: ${f.briefHint}`}
                                        onClick={() => {
                                            setCsoFrame(f.id);
                                            setLens('all');
                                            setSearchQuery('');
                                        }}
                                        className={`flex w-full touch-manipulation flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left text-[11px] transition ${
                                            active
                                                ? 'border-brand-teal/45 bg-brand-input'
                                                : 'border-brand-border/70 bg-brand-panel/40 hover:bg-brand-input/60'
                                        }`}
                                    >
                                        <span className="flex w-full items-start gap-2">
                                            <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{f.icon}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[12px] font-semibold text-brand-text">{f.label}</span>
                                                <span className="mt-0.5 block leading-snug text-brand-muted">{f.scanHint}</span>
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {csoFrame ? (
                            <p className="mt-2 text-[10px] text-brand-muted">
                                Active:{' '}
                                <span className="font-semibold text-brand-text">
                                    {CSO_RESEARCH_FRAMES.find((x) => x.id === csoFrame)?.label}
                                </span>
                                . Use lens row or custom search to exit frame mode.
                            </p>
                        ) : null}
                    </>
                );
            case 'controls':
                return (
                    <>
                        {scoutDisclaimer}
                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {LENS_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        setCsoFrame(null);
                                        setLens(opt.id);
                                    }}
                                    className={`inline-flex min-h-[40px] touch-manipulation items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-[10px] font-medium transition sm:min-h-0 ${
                                        csoFrame === null && lens === opt.id
                                            ? 'border-brand-teal/40 bg-brand-input text-brand-text'
                                            : 'border-brand-border/80 bg-brand-bg/50 text-brand-muted hover:text-brand-text'
                                    } ${csoFrame !== null ? 'opacity-55' : ''}`}
                                >
                                    {opt.icon}
                                    <span>
                                        <span className="block leading-tight">{opt.label}</span>
                                        <span className="block text-[9px] font-normal opacity-75">{opt.hint}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">Window</span>
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
                                    className={`min-h-[40px] touch-manipulation rounded-md border px-3 py-1.5 text-[10px] font-medium transition sm:min-h-0 sm:py-1 ${
                                        timeWindow === tw.id
                                            ? 'border-brand-teal/35 bg-brand-input text-brand-text'
                                            : 'border-brand-border/80 text-brand-muted hover:text-brand-text'
                                    }`}
                                >
                                    {tw.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-muted" />
                                <input
                                    className="min-h-[44px] w-full rounded-md border border-brand-border bg-brand-input py-2 pl-9 pr-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-teal/35 sm:min-h-0"
                                    placeholder="Custom search — Enter to run"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKey}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={onRunClick}
                                disabled={isLoading}
                                className="inline-flex min-h-[44px] shrink-0 touch-manipulation items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-card px-4 py-2 text-[11px] font-semibold text-brand-text transition hover:bg-brand-input disabled:opacity-50 sm:min-h-0"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                                {searchQuery.trim() ? 'Run search' : 'Refresh'}
                            </button>
                        </div>
                        {intelMeta?.heuristicNote ? (
                            <p className="mt-2 text-[10px] leading-snug text-brand-muted/90">{intelMeta.heuristicNote}</p>
                        ) : null}
                    </>
                );
            case 'headlines':
                return (
                    <>
                        {scoutDisclaimer}
                        <p className="text-[11px] text-brand-muted">{activeScanDescription} Newest first when timestamps exist.</p>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-7 w-7 animate-spin text-brand-muted" aria-hidden />
                            </div>
                        ) : newsItems.length === 0 ? (
                            <p className="py-6 text-center text-[13px] text-brand-muted">
                                No articles. Try another frame, lens, last 7 days window, or Research strategy context.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                                {newsItems.map((item, i) => (
                                    <a
                                        key={`${item.link}-${i}`}
                                        href={item.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex gap-2.5 rounded-md border border-brand-border/80 bg-brand-panel/25 p-3 transition hover:border-brand-border hover:bg-brand-panel/40"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-[13px] font-medium leading-snug text-brand-text">{item.title}</h4>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-brand-muted">
                                                <span className="font-medium text-brand-text/80">{item.source}</span>
                                                <span aria-hidden>·</span>
                                                <span>{item.time}</span>
                                                {item.type ? (
                                                    <>
                                                        <span aria-hidden>·</span>
                                                        <span className="rounded border border-brand-border/60 bg-brand-bg/50 px-1.5 py-0 text-[9px]">
                                                            {TOPIC_LABEL[item.type] || item.type}
                                                        </span>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                        <ExternalLink className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                    </a>
                                ))}
                            </div>
                        )}
                        {intelMeta?.queriesUsed && intelMeta.queriesUsed.length > 0 ? (
                            <details className="mt-3 rounded-md border border-brand-border/50 bg-brand-bg/30 px-2.5 py-1.5">
                                <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-brand-muted">
                                    Queries used
                                </summary>
                                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[10px] text-brand-muted">
                                    {intelMeta.queriesUsed.map((q, idx) => (
                                        <li key={idx} className="break-all">
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}
                    </>
                );
            case 'brief':
                return (
                    <div className="space-y-2">
                        <p className="text-[11px] leading-snug text-brand-muted">
                            Verified synthesis — saved on the venture for Research fund intelligence, Research strategy and direction, and staff
                            sync.
                        </p>
                        <textarea
                            value={brief}
                            onChange={(e) => setBrief(e.target.value)}
                            placeholder={`After reviewing headlines, capture what you verified:\n• Segment and ideal customer profile\n• Competitors and differentiation (with sources you trust)\n• Risks and unknowns\n• Signals to watch next\n`}
                            rows={20}
                            className="w-full max-w-4xl rounded-md border border-brand-border bg-brand-input p-3 text-[14px] leading-relaxed text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-teal/35"
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    const SCOUT_HUB_ORDER: ScoutFocusKey[] = ['context', 'frames', 'controls', 'headlines', 'brief'];

    const scoutHubIcon = (k: ScoutFocusKey) => {
        const wrap = (node: React.ReactNode) => (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-brand-muted sm:h-9 sm:w-9">{node}</span>
        );
        switch (k) {
            case 'context':
                return wrap(<Globe className="h-4 w-4" aria-hidden />);
            case 'frames':
                return wrap(<Target className="h-4 w-4" aria-hidden />);
            case 'controls':
                return wrap(<Search className="h-4 w-4" aria-hidden />);
            case 'headlines':
                return wrap(<Rss className="h-4 w-4" aria-hidden />);
            case 'brief':
                return wrap(<BookOpen className="h-4 w-4" aria-hidden />);
            default:
                return null;
        }
    };

    const focusMeta = scoutFocus ? SCOUT_FOCUS_META[scoutFocus] : null;

    return (
        <DeskShell
            className="min-h-0 flex-1"
            title={deskHeadline(activeProject.name, 'scout')}
            description={scoutFocus ? undefined : deskHelpText('scout')}
            bodyFlush={Boolean(scoutFocus)}
            bodyClassName={scoutFocus ? 'flex min-h-0 flex-1 flex-col px-4 pb-28 pt-0 sm:px-5 sm:pb-32' : undefined}
        >
            {scoutFocus && focusMeta ? (
                <>
                    <DeskFocusToolbar
                        onBack={goScoutHub}
                        title={focusMeta.title}
                        onSave={scoutFocus === 'brief' ? saveBrief : undefined}
                        saving={saving}
                        saveLabel="Save brief"
                    />
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto py-3">
                            <DeskMsgUser>
                                <p className="text-[13px] font-semibold text-zinc-50">{focusMeta.title}</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-zinc-300">{focusMeta.question}</p>
                            </DeskMsgUser>
                            <DeskMsgAssistant>
                                <div className="flex flex-col gap-3">{renderScoutFocusBody(scoutFocus)}</div>
                            </DeskMsgAssistant>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-2 pb-8">
                    <p className="text-[10px] leading-snug text-brand-muted">
                        Tap a block — other sections hide. Chat below stays on that block until you press Back.
                    </p>
                    {scoutDisclaimer}
                    <div className="space-y-1.5 sm:space-y-2">
                        {SCOUT_HUB_ORDER.map((k) => (
                            <DeskHubRow
                                key={k}
                                title={SCOUT_FOCUS_META[k].title}
                                subtitle={SCOUT_FOCUS_META[k].hubSub}
                                onOpen={() => openScoutSection(k)}
                                right={scoutHubIcon(k)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </DeskShell>
    );
}
