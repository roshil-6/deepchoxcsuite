'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import { ExecutiveLoop } from '@/lib/orchestrator/ExecutiveLoop';
import type { ExecutiveLoopState, ExecutiveRole, AnyAgentResponse, ConflictReport } from '@/lib/orchestrator/types';
import {
    Play,
    RotateCcw,
    AlertTriangle,
    Activity,
    ChevronRight,
    Gavel,
    Target,
    Calculator,
    Megaphone,
    Cpu,
    ScanSearch,
    CheckCircle2,
    Building2,
    Clipboard,
    Sparkles,
    ExternalLink,
    X,
} from 'lucide-react';

const BOARDROOM_HISTORY_KEY = 'deepchox-boardroom-sessions-v1';
const MAX_HISTORY = 10;

const QUICK_DIRECTIVES: string[] = [
    'Should we prioritize revenue growth or profitability for the next two quarters?',
    'Are we ready to expand into a second geography — what gates must we pass first?',
    'Is our current burn and runway compatible with the product roadmap?',
    'What is the top competitive risk and how should the board respond?',
    'Do we have enough GTM focus, or are we spread too thin?',
];

const ROLE_ORDER: ExecutiveRole[] = ['CEO', 'CFO', 'CTO', 'CMO', 'CSO'];

const ROLE_META: Record<
    ExecutiveRole,
    { title: string; subtitle: string; icon: React.ReactNode }
> = {
    CEO: {
        title: 'CEO',
        subtitle: 'Decision & reasoning',
        icon: <Target className="h-4 w-4 text-brand-teal" aria-hidden />,
    },
    CFO: {
        title: 'CFO',
        subtitle: 'Scenarios & runway',
        icon: <Calculator className="h-4 w-4 text-brand-teal" aria-hidden />,
    },
    CTO: {
        title: 'CTO',
        subtitle: 'Architecture & feasibility',
        icon: <Cpu className="h-4 w-4 text-brand-teal" aria-hidden />,
    },
    CMO: {
        title: 'CMO',
        subtitle: 'GTM & messaging',
        icon: <Megaphone className="h-4 w-4 text-brand-teal" aria-hidden />,
    },
    CSO: {
        title: 'CSO',
        subtitle: 'Competitive posture',
        icon: <ScanSearch className="h-4 w-4 text-brand-teal" aria-hidden />,
    },
};

type LogLine = { at: number; message: string };

function threatBadge(level: string) {
    const l = level.toLowerCase();
    const map: Record<string, string> = {
        critical: 'bg-rose-500/15 text-rose-200 border-rose-500/35',
        high: 'bg-amber-500/12 text-amber-100 border-amber-500/30',
        medium: 'bg-brand-teal/10 text-brand-teal border-brand-teal/25',
        low: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/25',
    };
    return map[l] ?? 'bg-brand-input text-brand-muted border-brand-border';
}

function ResponseBody({ role, r }: { role: ExecutiveRole; r: AnyAgentResponse }) {
    if (role === 'CEO' && 'decision' in r) {
        return (
            <div className="space-y-3 text-[13px] leading-relaxed">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Decision</p>
                    <p className="mt-1 text-brand-text">{r.decision}</p>
                </div>
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Reasoning</p>
                    <p className="mt-1 text-brand-muted">{r.reasoning}</p>
                </div>
            </div>
        );
    }
    if (role === 'CFO' && 'numbers_summary' in r) {
        return (
            <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-brand-text">{r.numbers_summary}</p>
                <div className="overflow-x-auto rounded-lg border border-brand-border/60">
                    <table className="w-full min-w-[260px] text-left text-[11px]">
                        <thead>
                            <tr className="border-b border-brand-border/60 bg-brand-input/40">
                                <th className="px-2 py-2 font-semibold text-brand-muted">Scenario</th>
                                <th className="px-2 py-2 font-semibold text-brand-muted">Metrics</th>
                            </tr>
                        </thead>
                        <tbody>
                            {r.scenario_table?.map((row) => (
                                <tr key={row.scenario} className="border-b border-brand-border/40 last:border-0">
                                    <td className="align-top px-2 py-2 font-medium text-brand-text">{row.scenario}</td>
                                    <td className="px-2 py-2 text-brand-muted">
                                        {Object.entries(row.metrics || {})
                                            .map(([k, v]) => `${k}: ${v}`)
                                            .join(' · ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px]">
                    <span
                        className={`rounded-md border px-2 py-0.5 font-medium ${
                            r.budget_feasibility ? 'border-emerald-500/30 text-emerald-200/90' : 'border-amber-500/35 text-amber-100'
                        }`}
                    >
                        Budget {r.budget_feasibility ? 'feasible' : 'under pressure'}
                    </span>
                    {r.burn_rate_warning && (
                        <span className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-0.5 font-medium text-rose-100">
                            Burn warning
                        </span>
                    )}
                </div>
            </div>
        );
    }
    if (role === 'CMO' && 'gtm_plan' in r) {
        return (
            <div className="space-y-3 text-[13px] leading-relaxed">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">GTM plan</p>
                    <p className="mt-1 text-brand-text">{r.gtm_plan}</p>
                </div>
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Messaging</p>
                    <p className="mt-1 text-brand-muted">{r.messaging_framework}</p>
                </div>
            </div>
        );
    }
    if (role === 'CTO' && 'architecture_recommendation' in r) {
        return (
            <div className="space-y-3 text-[13px] leading-relaxed">
                <p className="text-brand-text">{r.architecture_recommendation}</p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="rounded-md border border-brand-border px-2 py-0.5 text-brand-muted">
                        Feasibility: {r.tech_feasibility ? 'Yes' : 'Review'}
                    </span>
                    <span className="rounded-md border border-brand-border px-2 py-0.5 text-brand-muted">
                        Complexity {r.complexity_score}/100
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 font-medium ${threatBadge(r.tech_debt_risk)}`}>
                        Tech debt: {r.tech_debt_risk}
                    </span>
                </div>
            </div>
        );
    }
    if (role === 'CSO' && 'competitive_map' in r) {
        return (
            <div className="space-y-2 text-[13px] leading-relaxed">
                <p className="text-brand-text">{r.competitive_map}</p>
                <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${threatBadge(r.threat_level)}`}
                >
                    Threat: {r.threat_level}
                </span>
            </div>
        );
    }
    return <p className="text-[12px] text-brand-muted">No structured output.</p>;
}

type BoardHistoryItem = {
    id: string;
    at: number;
    directive: string;
    consensus?: string;
    conflict: boolean;
};

function loadBoardHistory(): BoardHistoryItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(BOARDROOM_HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as BoardHistoryItem[];
        return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
    } catch {
        return [];
    }
}

function saveBoardHistory(items: BoardHistoryItem[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(BOARDROOM_HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
    } catch {
        /* ignore quota */
    }
}

function textFromResponse(role: ExecutiveRole, r: AnyAgentResponse): string {
    if (role === 'CEO' && 'decision' in r) return `${r.decision}\n${r.reasoning}`;
    if (role === 'CFO' && 'numbers_summary' in r) return r.numbers_summary;
    if (role === 'CMO' && 'gtm_plan' in r) return `${r.gtm_plan}\n${r.messaging_framework}`;
    if (role === 'CTO' && 'architecture_recommendation' in r) return r.architecture_recommendation;
    if (role === 'CSO' && 'competitive_map' in r) return r.competitive_map;
    return '';
}

function buildBoardMarkdown(
    ventureName: string,
    directive: string,
    state: ExecutiveLoopState | null
): string {
    if (!state) return '';
    const lines: string[] = [
        `# Boardroom pack — ${ventureName}`,
        ``,
        `**Directive:** ${directive}`,
        ``,
    ];
    if (state.finalOutput) {
        lines.push(`## Outcome`, state.finalOutput, ``);
    }
    if (state.conflicts?.length) {
        const c = state.conflicts[state.conflicts.length - 1];
        lines.push(`## Conflict note`, c.reason || '', c.suggestion ? `\n*Suggested path:* ${c.suggestion}` : '', ``);
    }
    for (const role of ROLE_ORDER) {
        const r = state.responses[role];
        if (!r) continue;
        lines.push(`## ${role}`, textFromResponse(role, r), ``);
    }
    if (state.recommendedDeskRoute?.length) {
        lines.push(`## Suggested desks`, state.recommendedDeskRoute.join(', '));
    }
    return lines.join('\n');
}

function ConflictPanel({ report }: { report: ConflictReport }) {
    if (!report.reason) return null;
    return (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/25 bg-amber-950/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200/95">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                Board conflict
                {report.blockingAgent && (
                    <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] normal-case text-amber-100">
                        Lead: {report.blockingAgent}
                    </span>
                )}
            </div>
            <p className="text-sm leading-relaxed text-amber-100/95">{report.reason}</p>
            {report.suggestion && (
                <p className="mt-3 border-t border-amber-500/20 pt-3 text-sm text-amber-200/80">
                    <span className="font-medium text-amber-100/90">Suggested path: </span>
                    {report.suggestion}
                </p>
            )}
        </div>
    );
}

export function ExecutiveView() {
    const { activeProject, switchRoom, livingOffice } = useOffice();
    const [query, setQuery] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [loopState, setLoopState] = useState<ExecutiveLoopState | null>(null);
    const [logs, setLogs] = useState<LogLine[]>([]);
    const [showLog, setShowLog] = useState(true);
    const [history, setHistory] = useState<BoardHistoryItem[]>([]);
    const [copyDone, setCopyDone] = useState(false);

    useEffect(() => {
        setHistory(loadBoardHistory());
    }, []);

    const pushLog = useCallback((message: string) => {
        setLogs((prev) => [{ at: Date.now(), message }, ...prev].slice(0, 80));
    }, []);

    const ventureSnapshot = useMemo(() => {
        if (!activeProject?.id) return null;
        const doc = parseStrategy(activeProject.strategy || '');
        const intent =
            doc.strategicIntent?.trim() ||
            doc.vision?.trim() ||
            doc.content?.split('\n').find((l) => l.trim())?.trim() ||
            '';
        const kanban = activeProject.kanban || [];
        const openBoard = kanban.filter((t) => t && t.status !== 'completed').length;
        return {
            intentExcerpt: intent ? `${intent.slice(0, 200)}${intent.length > 200 ? '…' : ''}` : 'No strategy narrative yet — fill in on the CEO desk.',
            events: (activeProject.events || []).length,
            openBoard,
            hasBudget: Boolean(activeProject.budget?.trim()),
            hasMarket: Boolean(activeProject.marketInsights?.trim()),
            hasProduct: Boolean(activeProject.productPlan?.trim()),
        };
    }, [activeProject]);

    const runEngine = async () => {
        const q = query.trim();
        if (!activeProject?.id || !q || isRunning) return;

        setIsRunning(true);
        setLoopState(null);
        pushLog(`Session started — directive: “${q.slice(0, 120)}${q.length > 120 ? '…' : ''}”`);

        const engine = new ExecutiveLoop(activeProject, q);

        await new Promise((r) => setTimeout(r, 320));
        await engine.runStep();
        setLoopState({ ...engine.getState() });
        pushLog('Round 1: executive responses recorded.');

        if (engine.getState().conflicts.length > 0) {
            await new Promise((r) => setTimeout(r, 500));
            pushLog('Conflict flagged — second pass requested.');
            await engine.runStep();
            setLoopState({ ...engine.getState() });
            pushLog('Round 2: recalibration complete.');
        }

        const final = engine.getState();
        if (final.finalOutput) {
            pushLog(final.finalized ? `Outcome: ${final.finalOutput}` : `Update: ${final.finalOutput}`);
        }

        const entry: BoardHistoryItem = {
            id: `${Date.now()}`,
            at: Date.now(),
            directive: q,
            consensus: final.finalOutput,
            conflict: (final.conflicts?.length ?? 0) > 0,
        };
        setHistory((prev) => {
            const nextHist = [entry, ...prev.filter((h) => h.directive !== q)].slice(0, MAX_HISTORY);
            saveBoardHistory(nextHist);
            return nextHist;
        });

        setIsRunning(false);
    };

    const copyBoardPack = useCallback(async () => {
        if (!activeProject?.name || !loopState) return;
        const md = buildBoardMarkdown(activeProject.name, query.trim() || loopState.query, loopState);
        try {
            await navigator.clipboard.writeText(md);
            setCopyDone(true);
            window.setTimeout(() => setCopyDone(false), 2000);
        } catch {
            /* ignore */
        }
    }, [activeProject?.name, loopState, query]);

    const clearSession = useCallback(() => {
        setLoopState(null);
        setLogs([]);
    }, []);

    const hasVenture = Boolean(activeProject?.id);
    const canRun = hasVenture && query.trim().length > 0 && !isRunning;

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-brand-bg font-sans">
            <div className="mx-auto flex h-full w-full max-w-[1600px] min-h-0 flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-5 sm:py-5">
                {!hasVenture && (
                    <div className="shrink-0 rounded-xl border border-brand-border/60 bg-brand-panel/50 px-4 py-3 sm:px-5">
                        <p className="text-[13px] leading-relaxed text-brand-muted">
                            <span className="font-medium text-brand-text">Select a venture</span> in the sidebar to run a
                            boardroom alignment pass. The engine uses your venture&apos;s strategy, product, finance, and
                            market context.
                        </p>
                    </div>
                )}

                <header className="flex shrink-0 flex-col gap-3 border-b border-brand-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-panel">
                            <Gavel className="h-5 w-5 text-brand-teal" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold tracking-tight text-brand-text sm:text-xl">Boardroom</h1>
                            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-brand-muted sm:text-[13px]">
                                Multi-exec alignment: CEO, CFO, CTO, CMO, and CSO respond in parallel, then conflicts are
                                surfaced with a suggested path. Outputs are simulated from your venture context.
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-panel px-3 py-2">
                            <span
                                className={`h-2 w-2 shrink-0 rounded-full ${
                                    isRunning ? 'animate-pulse bg-brand-teal' : 'bg-brand-muted/60'
                                }`}
                                aria-hidden
                            />
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
                                {isRunning ? 'Running' : 'Ready'}
                            </span>
                        </div>
                    </div>
                </header>

                {hasVenture && ventureSnapshot && (
                    <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-brand-border/60 bg-brand-panel/40 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Strategy line</p>
                            <p className="mt-1 text-[12px] leading-relaxed text-brand-text">{ventureSnapshot.intentExcerpt}</p>
                        </div>
                        <div className="rounded-xl border border-brand-border/60 bg-brand-panel/40 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Execution board</p>
                            <p className="mt-1 font-mono text-sm tabular-nums text-brand-text">{ventureSnapshot.openBoard} open tasks</p>
                            <p className="mt-0.5 text-[10px] text-brand-muted">{ventureSnapshot.events} calendar events</p>
                        </div>
                        <div className="rounded-xl border border-brand-border/60 bg-brand-panel/40 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Desk artifacts</p>
                            <ul className="mt-1 space-y-0.5 text-[11px] text-brand-muted">
                                <li>Product plan: {ventureSnapshot.hasProduct ? 'Yes' : '—'}</li>
                                <li>Budget: {ventureSnapshot.hasBudget ? 'Yes' : '—'}</li>
                                <li>Market intel: {ventureSnapshot.hasMarket ? 'Yes' : '—'}</li>
                            </ul>
                        </div>
                        <div className="rounded-xl border border-brand-border/60 bg-brand-panel/40 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Office pulse</p>
                            <p className="mt-1 text-[12px] leading-relaxed text-brand-muted">
                                {livingOffice?.brief?.greeting?.trim()
                                    ? livingOffice.brief.greeting.trim().slice(0, 160) +
                                      (livingOffice.brief.greeting.length > 160 ? '…' : '')
                                    : 'Open the dashboard to load the daily brief — context still uses your saved venture fields.'}
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex shrink-0 items-start gap-2 rounded-xl border border-brand-teal/20 bg-brand-teal/[0.06] px-4 py-3 text-[11px] leading-relaxed text-brand-muted">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                    <span>
                        <span className="font-medium text-brand-text/90">Live board:</span> each officer calls the server with your venture
                        context. With <code className="rounded bg-brand-input px-1 text-[10px]">GROQ_API_KEY</code> set, answers are generated by
                        Groq; otherwise the suite falls back to an offline simulation (conflict detection still runs).
                    </span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-5">
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-brand-border bg-brand-panel/40">
                        <div className="shrink-0 border-b border-brand-border/60 bg-brand-bg/40 px-4 py-3 sm:px-5">
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Directive</h2>
                            <p className="mt-0.5 text-[11px] text-brand-muted/90">
                                Ask a strategic question — all five executives answer in parallel, then conflicts are resolved in a second pass
                                when needed. <span className="text-brand-muted">Ctrl+Enter</span> to run.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {QUICK_DIRECTIVES.map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        title={d}
                                        disabled={!hasVenture || isRunning}
                                        onClick={() => setQuery(d)}
                                        className="max-w-[220px] truncate rounded-full border border-brand-border/80 bg-brand-bg/60 px-3 py-1.5 text-left text-[10px] font-medium text-brand-muted transition hover:border-brand-teal/30 hover:text-brand-text disabled:opacity-40"
                                    >
                                        {d.length > 42 ? `${d.slice(0, 40)}…` : d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="shrink-0 space-y-3 p-4 sm:p-5">
                            <div className="flex flex-col gap-2 rounded-xl border border-brand-border bg-brand-bg/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:flex-row sm:items-end">
                                <textarea
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                            e.preventDefault();
                                            if (canRun) void runEngine();
                                        }
                                    }}
                                    placeholder={
                                        hasVenture
                                            ? 'e.g. Should we expand into APAC before Series B? What gates do we need?'
                                            : 'Select a venture first…'
                                    }
                                    disabled={!hasVenture || isRunning}
                                    rows={3}
                                    className="min-h-[5rem] flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm leading-relaxed text-brand-text placeholder:text-brand-muted/70 focus:outline-none focus:ring-0 disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => void runEngine()}
                                    disabled={!canRun}
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-brand-teal/40 bg-brand-teal/15 px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-brand-text transition hover:bg-brand-teal/25 disabled:cursor-not-allowed disabled:opacity-40 sm:self-stretch"
                                >
                                    {isRunning ? (
                                        <RotateCcw className="h-4 w-4 animate-spin" aria-hidden />
                                    ) : (
                                        <Play className="h-4 w-4" aria-hidden />
                                    )}
                                    Run board
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Jump to desk</span>
                                {(
                                    [
                                        ['CEO', 'ceo'],
                                        ['CFO', 'accountant'],
                                        ['CTO', 'pm'],
                                        ['CMO', 'cmo'],
                                        ['CSO', 'scout'],
                                    ] as const
                                ).map(([label, room]) => (
                                    <button
                                        key={room}
                                        type="button"
                                        onClick={() => switchRoom(room)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-brand-border/80 bg-brand-bg/50 px-2.5 py-1 text-[10px] font-semibold text-brand-muted transition hover:border-brand-teal/35 hover:text-brand-text"
                                    >
                                        {label}
                                        <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
                                    </button>
                                ))}
                            </div>
                            {loopState && (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void copyBoardPack()}
                                        className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-[11px] font-semibold text-brand-text hover:bg-brand-input"
                                    >
                                        <Clipboard className="h-3.5 w-3.5" aria-hidden />
                                        {copyDone ? 'Copied' : 'Copy board pack (Markdown)'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearSession}
                                        className="inline-flex items-center gap-2 rounded-lg border border-brand-border/60 px-3 py-2 text-[11px] font-semibold text-brand-muted hover:bg-brand-input hover:text-brand-text"
                                    >
                                        <X className="h-3.5 w-3.5" aria-hidden />
                                        Clear session
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-4 pb-5 sm:px-5">
                            {isRunning && !loopState && (
                                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {ROLE_ORDER.map((role) => (
                                        <div
                                            key={role}
                                            className="flex min-h-[140px] animate-pulse flex-col rounded-xl border border-brand-border/40 bg-brand-bg/40 p-4"
                                        >
                                            <div className="mb-3 h-4 w-24 rounded bg-brand-border/50" />
                                            <div className="flex flex-1 flex-col justify-center space-y-2">
                                                <div className="h-3 w-full rounded bg-brand-border/35" />
                                                <div className="h-3 w-[92%] rounded bg-brand-border/30" />
                                                <div className="h-3 w-[70%] rounded bg-brand-border/25" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {loopState?.finalized && loopState.finalOutput && (
                                <div className="mb-5 flex gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/95">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                                    <div>
                                        <p className="font-medium text-emerald-50">Consensus</p>
                                        <p className="mt-1 leading-relaxed text-emerald-100/90">{loopState.finalOutput}</p>
                                    </div>
                                </div>
                            )}

                            {loopState && (loopState.conflicts?.length ?? 0) > 0 && (
                                <div className="mb-5">
                                    <ConflictPanel report={loopState.conflicts[loopState.conflicts.length - 1]} />
                                </div>
                            )}

                            {loopState?.recommendedDeskRoute && loopState.recommendedDeskRoute.length > 0 && (
                                <div className="mb-5 rounded-xl border border-brand-border/50 bg-brand-bg/50 px-4 py-3 text-[12px] text-brand-muted">
                                    <span className="font-medium text-brand-text">Impact desk route: </span>
                                    {loopState.recommendedDeskRoute.join(', ')}
                                </div>
                            )}

                            {loopState ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {ROLE_ORDER.map((role) => {
                                        const response = loopState.responses[role];
                                        const meta = ROLE_META[role];
                                        const filled = Boolean(response);
                                        return (
                                            <div
                                                key={role}
                                                className={`flex flex-col rounded-xl border p-4 transition-colors sm:p-5 ${
                                                    filled
                                                        ? 'border-brand-border/60 bg-brand-bg/90'
                                                        : 'border-brand-border/40 bg-brand-bg/30 opacity-60'
                                                }`}
                                            >
                                                <div className="mb-3 flex items-start justify-between gap-2">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-panel">
                                                            {meta.icon}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-semibold text-brand-text">{meta.title}</p>
                                                            <p className="text-[10px] text-brand-muted">{meta.subtitle}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="min-h-[120px] flex-1">
                                                    {response ? (
                                                        <ResponseBody role={role} r={response} />
                                                    ) : (
                                                        <div className="flex h-full min-h-[100px] items-center justify-center rounded-lg border border-dashed border-brand-border/50 bg-brand-bg/50">
                                                            <span className="text-[11px] text-brand-muted">Awaiting</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-brand-border/60 bg-brand-bg/60 px-6 py-16 text-center">
                                    <Building2 className="mb-4 h-12 w-12 text-brand-muted/50" aria-hidden />
                                    <p className="text-base font-medium text-brand-text">No session yet</p>
                                    <p className="mt-2 max-w-md text-sm leading-relaxed text-brand-muted">
                                        Enter a directive and run the board to see parallel executive responses and any
                                        conflict analysis.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        className={`flex min-h-0 shrink-0 flex-col transition-[width] duration-300 ease-out ${showLog ? 'w-full lg:w-[22rem]' : 'w-12'}`}
                    >
                        <div
                            className={`flex min-h-0 min-h-[12rem] flex-1 flex-col overflow-hidden rounded-xl border border-brand-border bg-brand-panel/40 lg:max-h-[min(70vh,40rem)] ${!showLog ? 'items-center' : ''}`}
                        >
                            <div
                                className={`flex shrink-0 items-center border-b border-brand-border/60 px-3 py-2.5 ${showLog ? 'justify-between' : 'justify-center'}`}
                            >
                                {showLog && (
                                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
                                        <Activity className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                                        Activity &amp; history
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowLog(!showLog)}
                                    className="rounded-md p-1.5 text-brand-muted transition hover:bg-brand-input hover:text-brand-text"
                                    aria-label={showLog ? 'Collapse log' : 'Expand log'}
                                >
                                    <ChevronRight className={`h-4 w-4 transition-transform ${showLog ? '' : 'rotate-180'}`} />
                                </button>
                            </div>
                            {showLog && (
                                <>
                                    <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed sm:p-4">
                                        {logs.length === 0 ? (
                                            <p className="text-brand-muted/80">No events yet.</p>
                                        ) : (
                                            logs.map((line, i) => (
                                                <div
                                                    key={`${line.at}-${i}`}
                                                    className="border-l-2 border-brand-border/40 pl-3 text-brand-muted"
                                                >
                                                    <span className="text-brand-teal/90">
                                                        [{new Date(line.at).toLocaleTimeString([], { hour12: false })}]
                                                    </span>{' '}
                                                    <span className="text-brand-text/90">{line.message}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {history.length > 0 ? (
                                        <div className="shrink-0 border-t border-brand-border/50 bg-brand-bg/30">
                                            <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
                                                Recent directives
                                            </p>
                                            <ul className="custom-scrollbar max-h-36 space-y-1 overflow-y-auto px-2 py-2">
                                                {history.map((h) => (
                                                    <li key={h.id}>
                                                        <button
                                                            type="button"
                                                            disabled={isRunning}
                                                            onClick={() => setQuery(h.directive)}
                                                            className="w-full rounded-lg border border-transparent px-2 py-1.5 text-left text-[10px] leading-snug text-brand-muted transition hover:border-brand-border/60 hover:bg-brand-input hover:text-brand-text disabled:opacity-40"
                                                        >
                                                            <span className="line-clamp-2 text-brand-text/90">{h.directive}</span>
                                                            <span className="mt-0.5 block font-mono text-[9px] text-brand-muted/80">
                                                                {new Date(h.at).toLocaleString([], {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                                {h.conflict ? ' · had conflict' : ''}
                                                            </span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
