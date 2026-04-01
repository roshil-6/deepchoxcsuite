'use client';

import React, { useState, useMemo, useId, useEffect } from 'react';
import {
    Activity,
    BarChart3,
    Briefcase,
    ChevronRight,
    Zap,
    Target,
    Shield,
    Clock,
    RefreshCw,
    Sparkles,
    Calendar,
    Building2,
    FileText,
    LayoutGrid,
    LayoutDashboard,
    ChevronUp,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import { EXEC_OUTPUT_ROLES } from '@/lib/execOutputFormats';
import { WorkspaceAiButton } from '@/components/workspace/WorkspaceAiButton';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

/**
 * Recharts Tooltip defaults omit cursor.fill, so the hover rectangle uses a light gray/white band
 * that floods the plot on dark UI — set an explicit dark fill on every chart Tooltip.
 */
const CHART_CURSOR_DARK = {
    fill: 'rgba(24, 24, 27, 0.5)',
    stroke: '#52525b',
    strokeWidth: 1,
    strokeDasharray: '4 4',
} as const;

const CHART_TOOLTIP = {
    contentStyle: {
        background: '#1e1e1e',
        border: '1px solid #3f3f46',
        borderRadius: '8px',
        fontSize: '11px',
    },
    labelStyle: { color: '#a1a1aa' },
    itemStyle: { color: '#e4e4e7' },
    cursor: CHART_CURSOR_DARK,
    wrapperStyle: { outline: 'none' as const },
};

/**
 * Semantic chart colors — each hue maps to a meaning so the dashboard reads consistently.
 * Score drivers: intent (direction), narrative (story), phases (timeline), priorities (execution).
 * Phases: done → in-progress → planned. Priority: complete vs open. Desks: role-colored.
 */
const DASH = {
    score: {
        intent: '#a78bfa',
        narrative: '#22d3ee',
        phases: '#fbbf24',
        priorities: '#34d399',
    },
    phase: {
        done: '#34d399',
        inProgress: '#fbbf24',
        planned: '#64748b',
    },
    priority: {
        complete: '#34d399',
        open: '#fb7185',
    },
    desk: {
        ceo: '#a78bfa',
        scout: '#38bdf8',
        finance: '#34d399',
        pm: '#f59e0b',
    },
    portfolio: {
        strategy: '#2dd4bf',
        draft: '#94a3b8',
    },
    /** Distinct series in activity / monthly bars (cycles if many categories) */
    activity: ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#818cf8', '#2dd4bf', '#f472b6', '#c084fc'],
} as const;

export function Dashboard({ onNewVenture }: { onNewVenture?: () => void }) {
    const {
        activeRoom,
        switchRoom,
        agents,
        activeProject,
        systemLogs,
        systemState,
        allProjects,
        setActiveProject,
        runAgentStaffSync,
        agentSyncRunning,
    } = useOffice();
    /** Inline dashboard panel (AI playground): tiles stay visible; metrics expand below — same column as chat bar */
    const [dashboardExpanded, setDashboardExpanded] = useState(false);
    /** Portfolio (no venture selected): collapse dense KPI/charts into a Dashboard tile */
    const [portfolioDashExpanded, setPortfolioDashExpanded] = useState(false);
    const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);

    useEffect(() => {
        setDashboardExpanded(false);
        setPortfolioDashExpanded(false);
    }, [activeProject?.id]);

    useEffect(() => {
        if (!dashboardExpanded || !pendingScrollId) return;
        const t = window.setTimeout(() => {
            document.getElementById(pendingScrollId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setPendingScrollId(null);
        }, 150);
        return () => clearTimeout(t);
    }, [dashboardExpanded, pendingScrollId]);

    const openDashboard = (scrollId?: string) => {
        setDashboardExpanded(true);
        if (scrollId) setPendingScrollId(scrollId);
    };

    const strategyDoc = useMemo(() => parseStrategy(activeProject?.strategy || ''), [activeProject?.strategy]);
    const phases = strategyDoc.phases || [];
    const priorities = strategyDoc.priorities || [];
    const phaseDone = phases.filter((p) => p.status === 'done').length;
    const phaseTotal = phases.length;
    const phaseActive = phases.filter((p) => p.status === 'in_progress').length;
    const priDone = priorities.filter((p) => p.done).length;
    const priTotal = priorities.length;
    const hasIntent = !!(strategyDoc.strategicIntent?.trim() || strategyDoc.vision?.trim());
    const narrativeRich = (strategyDoc.content || '').trim().length > 80;

    const executionScore = useMemo(() => {
        const intentW = hasIntent ? 1 : 0;
        const narW = narrativeRich ? 1 : 0;
        const phaseW = phaseTotal ? phaseDone / phaseTotal : 0;
        const priW = priTotal ? priDone / priTotal : 0;
        const raw = (intentW + narW + phaseW + priW) / 4;
        return Math.round(raw * 1000) / 10;
    }, [hasIntent, narrativeRich, phaseDone, phaseTotal, priDone, priTotal]);

    /** Same inputs as execution score — shown as bars (snapshot, not a time series). */
    const executionBreakdown = useMemo(
        () => [
            { label: 'Strategic intent', value: hasIntent ? 100 : 0, fill: DASH.score.intent },
            { label: 'Narrative depth', value: narrativeRich ? 100 : 0, fill: DASH.score.narrative },
            {
                label: 'Phases',
                value: phaseTotal ? Math.round((100 * phaseDone) / phaseTotal) : 0,
                fill: DASH.score.phases,
            },
            {
                label: 'Priorities',
                value: priTotal ? Math.round((100 * priDone) / priTotal) : 0,
                fill: DASH.score.priorities,
            },
        ],
        [hasIntent, narrativeRich, phaseTotal, phaseDone, priTotal, priDone]
    );

    const phasePieData = useMemo(() => {
        const planned = phases.filter((p) => p.status === 'planned').length;
        const progress = phases.filter((p) => p.status === 'in_progress').length;
        const done = phases.filter((p) => p.status === 'done').length;
        return [
            { name: 'Done', value: done, fill: DASH.phase.done },
            { name: 'In progress', value: progress, fill: DASH.phase.inProgress },
            { name: 'Planned', value: planned, fill: DASH.phase.planned },
        ].filter((d) => d.value > 0);
    }, [phases]);

    const priorityPieData = useMemo(() => {
        if (!priTotal) return [];
        const open = Math.max(0, priTotal - priDone);
        return [
            { name: 'Complete', value: priDone, fill: DASH.priority.complete },
            { name: 'Open', value: open, fill: DASH.priority.open },
        ].filter((d) => d.value > 0);
    }, [priTotal, priDone]);

    const activityBySource = useMemo(() => {
        const m = new Map<string, number>();
        for (const log of systemLogs) {
            const k = (log.source && String(log.source).trim()) || 'Office';
            m.set(k, (m.get(k) || 0) + 1);
        }
        return Array.from(m.entries())
            .map(([name, count]) => ({
                name: name.length > 20 ? `${name.slice(0, 18)}…` : name,
                count,
            }))
            .sort((a, b) => b.count - a.count)
            .map((row, i) => ({
                ...row,
                fill: DASH.activity[i % DASH.activity.length],
            }));
    }, [systemLogs]);

    const deskCoverage = useMemo(
        () => [
            { label: 'CEO · Strategy', pct: activeProject?.strategy?.trim() ? 100 : 0, fill: DASH.desk.ceo },
            { label: 'Scout · Intel', pct: activeProject?.marketInsights?.trim() ? 100 : 0, fill: DASH.desk.scout },
            { label: 'Finance · Budget', pct: activeProject?.budget?.trim() ? 100 : 0, fill: DASH.desk.finance },
            { label: 'PM · Product', pct: activeProject?.productPlan?.trim() ? 100 : 0, fill: DASH.desk.pm },
        ],
        [activeProject]
    );

    const portfolioComposition = useMemo(() => {
        const withStrategy = allProjects.filter((p) => p.strategy?.trim()).length;
        const draft = Math.max(0, allProjects.length - withStrategy);
        return [
            { name: 'Strategy on file', value: withStrategy, fill: DASH.portfolio.strategy },
            { name: 'Draft', value: draft, fill: DASH.portfolio.draft },
        ].filter((d) => d.value > 0);
    }, [allProjects]);

    const venturesByMonth = useMemo(() => {
        const bucket = new Map<string, number>();
        for (const p of allProjects) {
            const d = new Date(p.timestamp);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            bucket.set(key, (bucket.get(key) || 0) + 1);
        }
        return Array.from(bucket.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, count], i) => {
                const [y, mo] = key.split('-').map(Number);
                const name = new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                const fill = DASH.activity[i % DASH.activity.length];
                return { name, count, fill };
            });
    }, [allProjects]);

    const chartUid = useId().replace(/:/g, '');

    const intentPreview =
        strategyDoc.strategicIntent?.trim() ||
        strategyDoc.vision?.trim() ||
        (strategyDoc.content || '').split('\n')[0]?.trim() ||
        '';

    if (!activeProject) {
        const ventureCount = allProjects.length;
        const gridVentureClass =
            ventureCount <= 1
                ? 'mx-auto max-w-xl grid-cols-1'
                : 'mx-auto max-w-4xl grid-cols-1 sm:grid-cols-2';

        return (
            <div className="h-full min-h-0 overflow-y-auto custom-scrollbar bg-brand-bg">
                <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-5 sm:px-6 sm:py-7">
                    <header className="mb-6 flex flex-col gap-4 border-b border-brand-border/70 pb-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="section-heading text-brand-muted">Office · Portfolio</p>
                            <h1 className="mt-1 text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">Executive overview</h1>
                            <p className="mt-2 max-w-lg text-sm leading-relaxed text-brand-muted">
                                Pick a tile — analytics stay folded until you want them. The Chief of Staff bar below is the main control surface.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-panel/90 px-3 py-2 text-[11px] text-brand-muted">
                                <Shield className="h-3.5 w-3.5 text-brand-muted" aria-hidden />
                                {systemState.networkStatus === 'secure' ? 'Secure' : 'Review'}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-panel/90 px-3 py-2 text-[11px] text-brand-muted">
                                <Clock className="h-3.5 w-3.5 text-brand-muted" aria-hidden />
                                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </header>

                    <section aria-label="Shortcuts" className="mb-6">
                        <p className="mb-4 text-[11px] font-medium text-brand-muted/90">Surfaces</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => setPortfolioDashExpanded((o) => !o)}
                                className={`flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition ${
                                    portfolioDashExpanded
                                        ? 'border-brand-teal/35 bg-brand-teal/10 ring-1 ring-brand-teal/20'
                                        : 'border-brand-border bg-brand-panel/50 hover:border-brand-border'
                                }`}
                            >
                                <div className="flex w-full items-center justify-between gap-2">
                                    <LayoutDashboard className="h-6 w-6 text-brand-muted" aria-hidden />
                                    {portfolioDashExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-brand-teal" aria-hidden />
                                    ) : null}
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-brand-text">Dashboard</h2>
                                    <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
                                        KPIs, portfolio mix, and venture cadence — opens here, not as a separate wall of charts.
                                    </p>
                                </div>
                            </button>
                            {onNewVenture && (
                                <button
                                    type="button"
                                    onClick={onNewVenture}
                                    className="flex flex-col items-start gap-3 rounded-2xl border border-brand-border bg-brand-panel/50 p-5 text-left transition hover:border-brand-border hover:bg-brand-panel"
                                >
                                    <Target className="h-6 w-6 text-brand-muted" aria-hidden />
                                    <div>
                                        <h2 className="text-base font-semibold text-brand-text">New venture</h2>
                                        <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
                                            Opens Personal Assistant — describe your idea in chat; the assistant asks follow-ups
                                            (tap-to-answer) and updates your venture record as you go.
                                        </p>
                                    </div>
                                </button>
                            )}
                        </div>
                        {ventureCount > 0 && (
                            <button
                                type="button"
                                onClick={() => document.getElementById('portfolio-ventures')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                className="mt-4 w-full rounded-xl border border-dashed border-brand-border bg-brand-panel/25 py-3 text-sm font-medium text-brand-muted transition hover:border-brand-border hover:bg-brand-panel/50 hover:text-brand-text"
                            >
                                Jump to saved ventures ({ventureCount})
                            </button>
                        )}
                    </section>

                    {portfolioDashExpanded && (
                        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden rounded-2xl border border-brand-border bg-brand-panel/30">
                            <div className="flex items-center justify-between border-b border-brand-border/90 bg-brand-panel/90 px-4 py-3">
                                <p className="text-sm font-semibold text-brand-text">Portfolio analytics</p>
                                <button
                                    type="button"
                                    onClick={() => setPortfolioDashExpanded(false)}
                                    className="text-xs font-semibold text-brand-muted hover:text-brand-text"
                                >
                                    Collapse
                                </button>
                            </div>
                            <div className="space-y-6 p-4 sm:p-5">
                                <div
                                    className="grid gap-3 sm:grid-cols-3"
                                    aria-label="Portfolio summary"
                                >
                                    <div className="rounded-xl border border-brand-border bg-brand-panel/70 px-4 py-3">
                                        <p className="text-[10px] font-medium text-brand-muted/90">Ventures</p>
                                        <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-brand-text">{ventureCount}</p>
                                    </div>
                                    <div className="rounded-xl border border-brand-border bg-brand-panel/70 px-4 py-3">
                                        <p className="text-[10px] font-medium text-brand-muted/90">Office sync</p>
                                        <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-brand-text">
                                            {Math.max(0, Math.floor((Date.now() - systemState.lastSync) / 60000))}m
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-brand-border bg-brand-panel/70 px-4 py-3">
                                        <p className="text-[10px] font-medium text-brand-muted/90">Exec roles</p>
                                        <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-brand-text">{EXEC_OUTPUT_ROLES.length}</p>
                                    </div>
                                </div>

                    <section className="grid gap-4 lg:grid-cols-2" aria-label="Portfolio charts">
                        <div className="rounded-xl border border-brand-border bg-brand-panel/70 p-4 sm:p-5">
                            <h3 className="text-[11px] font-medium text-brand-muted/90">Portfolio mix</h3>
                            <p className="mt-1 text-[10px] text-brand-muted">
                                <span className="text-brand-teal">Strategy</span> on file vs{' '}
                                <span className="text-slate-400">draft</span> records
                            </p>
                            {portfolioComposition.length > 0 ? (
                                <div className="mt-3 h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={portfolioComposition}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={44}
                                                outerRadius={68}
                                                paddingAngle={2}
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                {portfolioComposition.map((entry, i) => (
                                                    <Cell key={`${chartUid}-pf-${i}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                {...CHART_TOOLTIP}
                                                formatter={(value: number | undefined, name: string | undefined) => {
                                                    const v = value ?? 0;
                                                    const total = portfolioComposition.reduce((s, d) => s + d.value, 0);
                                                    const pct = total ? Math.round((v / total) * 100) : 0;
                                                    return [`${v} ventures (${pct}% of ${total})`, name ?? ''];
                                                }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="mt-10 py-6 text-center text-sm text-brand-muted">Add a venture to see composition.</p>
                            )}
                        </div>
                        <div className="rounded-xl border border-brand-border bg-brand-panel/70 p-4 sm:p-5">
                            <h3 className="text-[11px] font-medium text-brand-muted/90">New ventures by month</h3>
                            <p className="mt-1 text-[10px] text-brand-muted">
                                Count of ventures per calendar month (by created date) · colors rotate for contrast only
                            </p>
                            {venturesByMonth.length > 0 ? (
                                <div className="mt-3 h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={venturesByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#71717a' }} interval={0} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} width={32} />
                                            <Tooltip {...CHART_TOOLTIP} formatter={(v: number | undefined) => [v ?? 0, 'Ventures']} />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                                {venturesByMonth.map((e, i) => (
                                                    <Cell key={`${chartUid}-vm-${i}`} fill={e.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="mt-10 py-6 text-center text-sm text-brand-muted">No venture timestamps yet.</p>
                            )}
                        </div>
                    </section>
                            </div>
                        </div>
                    )}

                    <section id="portfolio-ventures" className="scroll-mt-6">
                        <div className="mb-4">
                            <h2 className="text-[11px] font-medium text-brand-muted/90">
                                {ventureCount > 0 ? 'Your ventures' : 'No ventures yet'}
                            </h2>
                            <p className="mt-1 text-sm text-brand-muted">
                                {ventureCount > 0
                                    ? 'Open one to continue in this workspace — Chief of Staff stays below.'
                                    : 'Use New venture (card or sidebar) — chat-first setup in Personal Assistant.'}
                            </p>
                        </div>

                        {ventureCount > 0 ? (
                            <div className={`grid gap-4 text-left ${gridVentureClass}`}>
                                {allProjects.map((project) => (
                                    <button
                                        key={project.id}
                                        type="button"
                                        onClick={() => setActiveProject(project)}
                                        className="group relative flex w-full items-start gap-4 rounded-xl border border-brand-border/90 bg-brand-panel/50 p-4 text-left transition-all hover:border-brand-border hover:bg-brand-panel sm:p-5"
                                    >
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-bg">
                                            <Briefcase className="h-5 w-5 text-brand-muted" aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate font-semibold text-brand-text group-hover:text-brand-text">{project.name}</h3>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-muted">
                                                <span>{new Date(project.timestamp).toLocaleDateString()}</span>
                                                <span
                                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${
                                                        project.strategy
                                                            ? 'border border-violet-900/50 bg-violet-950/30 text-violet-400/90'
                                                            : 'border border-brand-border bg-brand-input/90 text-brand-muted'
                                                    }`}
                                                >
                                                    {project.strategy ? 'Active' : 'Draft'}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-brand-muted transition group-hover:translate-x-0.5 group-hover:text-brand-muted" aria-hidden />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-brand-border bg-brand-panel/25 px-6 py-10 text-center">
                                <p className="mx-auto max-w-sm text-sm leading-relaxed text-brand-muted">
                                    No ventures yet — use <span className="text-brand-muted">New venture</span> on the left or the
                                    card above (opens Personal Assistant).
                                </p>
                            </div>
                        )}
                    </section>

                    <div className="mt-8 rounded-xl border border-brand-border/80 bg-brand-panel/30 p-5">
                        <h3 className="text-[11px] font-medium text-brand-muted/90">Executive desks</h3>
                        <p className="mt-1 text-xs text-brand-muted">Each role produces a fixed artifact once a venture is active.</p>
                        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                            {EXEC_OUTPUT_ROLES.map((role) => (
                                <li
                                    key={role.id}
                                    className="flex items-start gap-2 rounded-lg border border-brand-border/80 bg-brand-panel/40 px-3 py-2"
                                >
                                    <span className="shrink-0 font-mono text-[10px] font-bold text-brand-muted">{role.shortTitle}</span>
                                    <span className="min-w-0 text-[11px] leading-snug text-brand-muted">{role.execOutput}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-brand-bg px-0 py-5 pb-8 font-sans sm:py-6">
            <div className="mx-auto w-full max-w-[1200px]">
                    <div className="space-y-10 pb-12 animate-in fade-in duration-500">
                        <header className="flex flex-col gap-6 border-b border-brand-border/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2.5">
                                    <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${systemState.networkStatus === 'secure' ? 'bg-brand-teal/80' : 'bg-brand-muted/60'}`}
                                        aria-hidden
                                    />
                                    <span className="section-heading !text-brand-muted">Executive overview</span>
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-brand-text sm:text-3xl">{activeProject.name}</h1>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted">
                                    Start from the tiles below — open <span className="text-brand-muted">Dashboard</span> to expand venture metrics in
                                    this same workspace. The Chief of Staff bar stays fixed underneath; nothing lives in a separate chat page.
                                </p>
                            </div>
                            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => runAgentStaffSync()}
                                    disabled={agentSyncRunning}
                                    title="Run all AI desks: research + merge into market intel, finance notes, directives, kanban, calendar"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-teal/40 bg-teal-500/15 px-3 py-2 text-xs font-semibold text-brand-teal transition hover:bg-brand-teal/20 disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${agentSyncRunning ? 'animate-spin' : ''}`} aria-hidden />
                                    {agentSyncRunning ? 'Staff syncing…' : 'Sync AI staff'}
                                </button>
                                <WorkspaceAiButton label="Dexo AI" />
                                <div
                                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-brand-muted ${systemState.networkStatus === 'secure' ? 'border-brand-border bg-brand-input' : 'border-brand-border bg-brand-input/90'}`}
                                >
                                    <Shield className="h-3.5 w-3.5 text-brand-muted" aria-hidden />
                                    {systemState.networkStatus === 'secure' ? 'Secure' : 'Review'}
                                </div>
                                <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-input px-3 py-2 text-xs font-medium text-brand-muted">
                                    <Clock className="h-3.5 w-3.5 text-brand-muted" aria-hidden />
                                    {(() => {
                                        const m = Math.floor((Date.now() - systemState.lastSync) / 60000);
                                        if (m < 1) return 'Staff sync just now';
                                        if (m < 120) return `${m}m since staff sync`;
                                        const h = Math.floor(m / 60);
                                        return `${h}h since staff sync`;
                                    })()}
                                </div>
                            </div>
                        </header>

                        {activeProject.agentStaffSnapshot && (
                            <button
                                type="button"
                                onClick={() => openDashboard('dash-staff-snapshot')}
                                className="group flex w-full flex-col gap-3 rounded-2xl border border-brand-teal/25 bg-brand-teal/12 p-6 text-left transition hover:border-brand-teal/40 hover:bg-brand-teal/15 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-teal/30 bg-teal-950/40">
                                        <Sparkles className="h-5 w-5 text-teal-400" aria-hidden />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-brand-teal/90">Featured</p>
                                        <h2 className="mt-1 text-base font-semibold text-brand-text">Latest AI staff research</h2>
                                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-brand-muted">
                                            {activeProject.agentStaffSnapshot.summary}
                                        </p>
                                    </div>
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-brand-teal/90 group-hover:text-teal-100">
                                    Open in dashboard →
                                </span>
                            </button>
                        )}

                        <section aria-labelledby="exec-hub-tiles">
                            <h2 id="exec-hub-tiles" className="mb-1 text-[11px] font-medium text-brand-muted/90">
                                Surfaces
                            </h2>
                            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-brand-muted">
                                Tiles are shortcuts; expanding <span className="text-brand-muted">Dashboard</span> reveals charts and desks in-line,
                                above the AI bar — like a playground canvas.
                            </p>
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDashboardExpanded((open) => !open);
                                        setPendingScrollId(null);
                                    }}
                                    className={`flex flex-col items-start gap-4 rounded-2xl border p-6 text-left transition ${
                                        dashboardExpanded
                                            ? 'border-brand-teal/40 bg-brand-teal/12 ring-1 ring-brand-teal/25'
                                            : 'border-brand-border bg-brand-panel/60 hover:border-brand-border hover:bg-brand-panel'
                                    }`}
                                    aria-expanded={dashboardExpanded}
                                >
                                    <div className="flex w-full items-start justify-between gap-2">
                                        <LayoutDashboard className="h-6 w-6 text-brand-muted" aria-hidden />
                                        {dashboardExpanded ? (
                                            <ChevronUp className="h-5 w-5 shrink-0 text-brand-teal" aria-hidden />
                                        ) : null}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-brand-text">Dashboard</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                                            Venture snapshot, execution score, charts, staff research, signal, desks — expands here; not a
                                            separate section.
                                        </p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openDashboard('dash-signal')}
                                    className="flex flex-col items-start gap-4 rounded-2xl border border-brand-border bg-brand-panel/60 p-6 text-left transition hover:border-brand-border hover:bg-brand-panel"
                                >
                                    <Activity className="h-6 w-6 text-brand-muted" aria-hidden />
                                    <div>
                                        <h3 className="text-base font-semibold text-brand-text">Signal &amp; activity</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                                            Opens the dashboard panel and scrolls to signal &amp; activity.
                                        </p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openDashboard('dash-desks')}
                                    className="flex flex-col items-start gap-4 rounded-2xl border border-brand-border bg-brand-panel/60 p-6 text-left transition hover:border-brand-border hover:bg-brand-panel"
                                >
                                    <LayoutGrid className="h-6 w-6 text-brand-muted" aria-hidden />
                                    <div>
                                        <h3 className="text-base font-semibold text-brand-text">Operational desks</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                                            Opens the dashboard panel and scrolls to operational desks.
                                        </p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchRoom('reports')}
                                    className="flex flex-col items-start gap-4 rounded-2xl border border-brand-border bg-brand-panel/60 p-6 text-left transition hover:border-brand-border hover:bg-brand-panel"
                                >
                                    <FileText className="h-6 w-6 text-brand-muted" aria-hidden />
                                    <div>
                                        <h3 className="text-base font-semibold text-brand-text">Knowledge base</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                                            Reports library and saved artifacts for this venture.
                                        </p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchRoom('calendar')}
                                    className="flex flex-col items-start gap-4 rounded-2xl border border-brand-border bg-brand-panel/60 p-6 text-left transition hover:border-brand-border hover:bg-brand-panel"
                                >
                                    <Calendar className="h-6 w-6 text-brand-muted" aria-hidden />
                                    <div>
                                        <h3 className="text-base font-semibold text-brand-text">Calendar</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                                            Milestones, events, and critical dates on one timeline.
                                        </p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchRoom('boardroom')}
                                    className="flex flex-col items-start gap-4 rounded-2xl border border-brand-border bg-brand-panel/60 p-6 text-left transition hover:border-brand-border hover:bg-brand-panel"
                                >
                                    <Building2 className="h-6 w-6 text-brand-muted" aria-hidden />
                                    <div>
                                        <h3 className="text-base font-semibold text-brand-text">Boardroom</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                                            Board review, narrative, and exec-ready readouts.
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </section>

                        {dashboardExpanded && (
                            <div
                                id="exec-dashboard-panel"
                                className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden rounded-2xl border border-brand-border bg-brand-panel/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                            >
                                <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/90 bg-brand-panel/95 px-4 py-3 backdrop-blur-sm sm:px-5">
                                    <div>
                                        <p className="text-[10px] font-medium text-brand-muted/90">Workspace canvas</p>
                                        <p className="text-sm font-semibold text-brand-text">Dashboard</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDashboardExpanded(false);
                                            setPendingScrollId(null);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-input px-3 py-2 text-xs font-semibold text-brand-text transition hover:border-brand-teal/40 hover:bg-brand-card"
                                    >
                                        <ChevronUp className="h-4 w-4" aria-hidden />
                                        Collapse
                                    </button>
                                </div>
                                <div className="space-y-8 px-4 py-6 sm:px-6 sm:py-8">
                        {activeProject.agentStaffSnapshot && (
                    <section
                        id="dash-staff-snapshot"
                        className="mb-8 rounded-xl border border-brand-teal/25 bg-brand-teal/12 p-5 sm:p-6"
                        aria-labelledby="dash-staff-snapshot-title"
                    >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Sparkles className="h-4 w-4 text-teal-400" aria-hidden />
                            <h2 id="dash-staff-snapshot-title" className="text-sm font-medium text-brand-text">
                                Latest AI staff research
                            </h2>
                            <span className="font-mono text-[10px] text-brand-muted">
                                {new Date(activeProject.agentStaffSnapshot.at).toLocaleString()}
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-brand-text">{activeProject.agentStaffSnapshot.summary}</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {(
                                [
                                    ['CEO', activeProject.agentStaffSnapshot.desks.ceo],
                                    ['CTO / PM', activeProject.agentStaffSnapshot.desks.pm],
                                    ['CFO', activeProject.agentStaffSnapshot.desks.accountant],
                                    ['CSO', activeProject.agentStaffSnapshot.desks.scout],
                                    ['CMO', activeProject.agentStaffSnapshot.desks.cmo],
                                ] as const
                            ).map(([label, text]) =>
                                text?.trim() ? (
                                    <div key={label} className="rounded-lg border border-brand-border/80 bg-brand-panel/50 p-3">
                                        <p className="text-[10px] font-medium text-brand-muted/90">{label}</p>
                                        <p className="mt-2 max-h-28 overflow-y-auto text-[11px] leading-snug text-brand-muted custom-scrollbar whitespace-pre-wrap">
                                            {text}
                                        </p>
                                    </div>
                                ) : null
                            )}
                        </div>
                    </section>
                )}

                {activeProject.staffFocusToday && activeProject.staffFocusToday.length > 0 && (
                    <section
                        className="mb-8 rounded-xl border border-amber-500/20 bg-amber-950/15 p-5 sm:p-6"
                        aria-labelledby="dash-focus-today"
                    >
                        <h2 id="dash-focus-today" className="mb-3 text-sm font-medium text-amber-100/95">
                            Today’s focus — from latest staff sync
                        </h2>
                        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-brand-text">
                            {activeProject.staffFocusToday.map((line, i) => (
                                <li key={i} className="pl-1 marker:text-amber-400/90">
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <section className="mb-10" aria-labelledby="dash-snapshot">
                    <h2 id="dash-snapshot" className="mb-3 text-[11px] font-medium text-brand-muted/90">
                        Venture snapshot
                    </h2>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-xl border border-brand-border bg-brand-input/60 p-5 sm:p-6">
                            <p className="text-[10px] font-medium text-brand-muted/90">Strategic line</p>
                            <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-brand-text">
                                {intentPreview || 'Pin strategic intent and narrative on the CEO desk to populate this summary.'}
                            </p>
                            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-brand-border/80 pt-5 sm:grid-cols-3">
                                <div>
                                    <p className="text-[10px] font-medium text-brand-muted/90">Phases</p>
                                    <p className="mt-1 font-mono text-sm text-brand-text">
                                        {phaseTotal ? `${phaseDone}/${phaseTotal}` : '—'}
                                        {phaseActive > 0 ? (
                                            <span className="text-brand-muted"> · {phaseActive} active</span>
                                        ) : null}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-brand-muted/90">Priorities</p>
                                    <p className="mt-1 font-mono text-sm text-brand-text">
                                        {priTotal ? `${priDone}/${priTotal}` : '—'}
                                    </p>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-medium text-brand-muted/90">Execution score</p>
                                    <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-brand-text">{executionScore}%</p>
                                    <p className="mt-1 text-[10px] leading-snug text-brand-muted">
                                        Heuristic checklist index (0–100), not revenue or financial performance.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-brand-border bg-brand-input/60 p-5 sm:p-6">
                            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                                <h3 className="text-sm font-medium text-brand-text">Score drivers</h3>
                                <span className="text-[10px] text-brand-muted">Current snapshot · not a time series</span>
                            </div>
                            <p className="mb-4 text-[11px] leading-snug text-brand-muted">
                                Each bar uses the same inputs as the composite score (binary checks + phase/priority completion).
                            </p>
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={executionBreakdown}
                                        layout="vertical"
                                        margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#71717a' }} />
                                        <YAxis
                                            type="category"
                                            dataKey="label"
                                            width={108}
                                            tick={{ fontSize: 10, fill: '#a1a1aa' }}
                                        />
                                        <Tooltip
                                            {...CHART_TOOLTIP}
                                            formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Driver index (snapshot)']}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                                            {executionBreakdown.map((e, i) => (
                                                <Cell key={`${chartUid}-drv-${i}`} fill={e.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                               <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-brand-border/60 pt-3 text-[10px] text-brand-muted">
                                <li className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-sm" style={{ background: DASH.score.intent }} aria-hidden />
                                    Direction
                                </li>
                                <li className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-sm" style={{ background: DASH.score.narrative }} aria-hidden />
                                    Story
                                </li>
                                <li className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-sm" style={{ background: DASH.score.phases }} aria-hidden />
                                    Timeline
                                </li>
                                <li className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-sm" style={{ background: DASH.score.priorities }} aria-hidden />
                                    Checklist
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-5 lg:grid-cols-3">
                        <div className="rounded-xl border border-brand-border bg-brand-input/50 p-4 sm:p-5">
                            <h3 className="text-sm font-medium text-brand-text">Phase status</h3>
                            <p className="mt-0.5 text-[10px] text-brand-muted">
                                Timeline ·{' '}
                                <span className="text-violet-400/90">done</span> ·{' '}
                                <span className="text-amber-400/90">active</span> ·{' '}
                                <span className="text-slate-400">planned</span>
                            </p>
                            {phasePieData.length > 0 ? (
                                <div className="mt-2 h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={phasePieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={46}
                                                outerRadius={72}
                                                paddingAngle={2}
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                {phasePieData.map((entry, i) => (
                                                    <Cell key={`${chartUid}-ph-${i}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                {...CHART_TOOLTIP}
                                                formatter={(value: number | undefined, name: string | undefined) => {
                                                    const v = value ?? 0;
                                                    const total = phasePieData.reduce((s, d) => s + d.value, 0);
                                                    const pct = total ? Math.round((v / total) * 100) : 0;
                                                    return [`${v} phase${v === 1 ? '' : 's'} (${pct}% of ${total})`, name ?? ''];
                                                }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="mt-8 py-6 text-center text-sm text-brand-muted">No phases defined yet.</p>
                            )}
                        </div>
                        <div className="rounded-xl border border-brand-border bg-brand-input/50 p-4 sm:p-5">
                            <h3 className="text-sm font-medium text-brand-text">Priority completion</h3>
                            <p className="mt-0.5 text-[10px] text-brand-muted">
                                <span className="text-violet-400/90">Complete</span> vs{' '}
                                <span className="text-rose-400/90">open</span> items
                            </p>
                            {priorityPieData.length > 0 ? (
                                <div className="mt-2 h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={priorityPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={46}
                                                outerRadius={72}
                                                paddingAngle={2}
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                {priorityPieData.map((entry, i) => (
                                                    <Cell key={`${chartUid}-pr-${i}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                {...CHART_TOOLTIP}
                                                formatter={(value: number | undefined, name: string | undefined) => {
                                                    const v = value ?? 0;
                                                    const total = priorityPieData.reduce((s, d) => s + d.value, 0);
                                                    const pct = total ? Math.round((v / total) * 100) : 0;
                                                    return [`${v} priority item${v === 1 ? '' : 's'} (${pct}% of ${total})`, name ?? ''];
                                                }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="mt-8 py-6 text-center text-sm text-brand-muted">No priorities listed yet.</p>
                            )}
                        </div>
                        <div className="rounded-xl border border-brand-border bg-brand-input/50 p-4 sm:p-5">
                            <h3 className="text-sm font-medium text-brand-text">Desk artifact coverage</h3>
                            <p className="mt-0.5 text-[10px] text-brand-muted">
                                One color per desk role · 100% = artifact saved
                            </p>
                            <div className="mt-3 h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={deskCoverage}
                                        layout="vertical"
                                        margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#71717a' }} />
                                        <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                                        <Tooltip
                                            {...CHART_TOOLTIP}
                                            formatter={(v: number | undefined) => [
                                                `${v ?? 0}% · non-empty field only (not quality or completeness)`,
                                                'Artifact present',
                                            ]}
                                        />
                                        <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={18}>
                                            {deskCoverage.map((e, i) => (
                                                <Cell key={`${chartUid}-desk-${i}`} fill={e.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-10" aria-labelledby="dash-ping">
                    <h2 id="dash-ping" className="mb-3 text-[11px] font-medium text-brand-muted/90">
                        Office chat
                    </h2>
                    <div className="rounded-xl border border-brand-border/80 bg-brand-panel/50 p-4 sm:p-5">
                        <p className="text-sm leading-relaxed text-brand-muted">
                            Use the <span className="font-semibold text-brand-text">Chief of Staff</span> bar fixed at the bottom of this screen to
                            message the office — same intelligence thread, without a separate chat column.
                        </p>
                    </div>
                </section>

                <section className="mb-10" aria-labelledby="dash-signal">
                    <h2 id="dash-signal" className="mb-3 text-[11px] font-medium text-brand-muted/90">
                        Signal &amp; activity
                    </h2>
                    <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
                        <div className="surface-flow flex min-h-[300px] flex-col overflow-hidden p-6">
                            <div className="mb-1 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-medium text-brand-text">Activity by source</h3>
                                    <p className="mt-0.5 text-[11px] text-brand-muted">
                                        Log volume by emitter · colors distinguish sources (not severity)
                                    </p>
                                </div>
                                <BarChart3 className="h-5 w-5 shrink-0 text-brand-muted" aria-hidden />
                            </div>
                            {activityBySource.length > 0 ? (
                                <div className="mt-4 min-h-[200px] flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={activityBySource} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 9, fill: '#71717a' }}
                                                interval={0}
                                                angle={-28}
                                                textAnchor="end"
                                                height={56}
                                            />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} width={40} />
                                            <Tooltip {...CHART_TOOLTIP} formatter={(v: number | undefined) => [v ?? 0, 'Entries']} />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                                {activityBySource.map((e, i) => (
                                                    <Cell key={`${chartUid}-act-${i}`} fill={e.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="mt-8 flex flex-1 items-center justify-center py-12 text-center text-sm text-brand-muted">
                                    No activity yet — system events will appear here.
                                </p>
                            )}
                        </div>

                        <div className="surface-wave relative flex min-h-[280px] flex-col overflow-hidden p-6 lg:min-h-[320px]">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-medium text-brand-text">
                                    <Activity className="h-4 w-4 text-brand-muted" aria-hidden />
                                    Activity
                                </h3>
                                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-muted" aria-hidden />
                            </div>
                            <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
                                {systemLogs.length === 0 ? (
                                    <div className="py-10 text-center text-sm text-brand-muted">No activity yet.</div>
                                ) : (
                                    systemLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="border-l-2 border-brand-border bg-brand-panel/70 py-3 pl-3"
                                            style={{ borderRadius: '0 0.5rem 0.5rem 0' }}
                                        >
                                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                                <span className="rounded bg-brand-input px-2 py-0.5 text-[10px] font-medium text-brand-muted">
                                                    {log.source}
                                                </span>
                                                <span className="font-mono text-[10px] text-brand-muted">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm leading-relaxed text-brand-text">{log.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-brand-card to-transparent" />
                        </div>
                    </div>
                </section>

                <section className="mb-10" aria-labelledby="dash-desks">
                    <h2 id="dash-desks" className="mb-3 text-[11px] font-medium text-brand-muted/90">
                        Operational desks
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <AgentCard
                            agent={agents.ceo}
                            activeRoom={activeRoom}
                            onClick={() => switchRoom('ceo')}
                            status={!!activeProject.strategy ? 'active' : 'pending'}
                        />
                        <AgentCard
                            agent={agents.scout}
                            activeRoom={activeRoom}
                            onClick={() => switchRoom('scout')}
                            status={!!activeProject.marketInsights ? 'active' : 'idle'}
                        />
                        <AgentCard
                            agent={agents.accountant}
                            activeRoom={activeRoom}
                            onClick={() => switchRoom('accountant')}
                            status={!!activeProject.budget ? 'active' : 'pending'}
                        />
                        <AgentCard
                            agent={agents.pm}
                            activeRoom={activeRoom}
                            onClick={() => switchRoom('pm')}
                            status={!!activeProject.productPlan ? 'active' : 'idle'}
                        />
                    </div>
                </section>

                <section className="mb-6" aria-labelledby="dash-next">
                    <h2 id="dash-next" className="mb-3 text-[11px] font-medium text-brand-muted/90">
                        Next focus
                    </h2>
                    <div className="flex flex-col gap-6 overflow-hidden rounded-xl border border-brand-border bg-brand-input/60 p-6 md:flex-row md:items-start md:justify-between md:p-8">
                        <div className="max-w-2xl">
                            <p className="font-serif text-xl leading-snug text-brand-text md:text-2xl">
                                {phaseActive > 0
                                    ? `Drive the active timeline phase — ${phaseDone} of ${phaseTotal} phases complete.`
                                    : activeProject.strategy
                                      ? 'Strategy record is in motion — tune phases and priorities on the CEO desk.'
                                      : 'Open the CEO desk to set intent, timeline phases, and priorities.'}
                            </p>
                        </div>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-panel">
                            <Zap className="h-5 w-5 text-brand-muted" aria-hidden />
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => switchRoom('ceo')}
                            className="rounded-lg border border-brand-border bg-brand-card px-4 py-2.5 text-xs font-semibold text-brand-text transition hover:bg-brand-input"
                        >
                            CEO desk
                        </button>
                        <button
                            type="button"
                            onClick={() => switchRoom('reports')}
                            className="rounded-lg border border-brand-border bg-brand-input px-4 py-2.5 text-xs font-semibold text-brand-text transition hover:border-brand-teal/40 hover:bg-brand-card"
                        >
                            Knowledge base
                        </button>
                        <WorkspaceAiButton label="Ask Dexo" />
                    </div>
                </section>
                                </div>
                            </div>
                        )}

                        <p className="rounded-2xl border border-brand-border/90 bg-brand-panel/40 px-5 py-4 text-center text-sm leading-relaxed text-brand-muted sm:text-left">
                            <span className="font-semibold text-brand-muted">Chief of Staff</span> lives in the workspace bar below — same intelligence
                            thread for every tile and the expanded dashboard.
                        </p>
                    </div>
            </div>
        </div>
    );
}

function AgentCard({ agent, activeRoom, onClick, status }: any) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative flex min-h-[5rem] w-full items-center gap-4 rounded-lg border border-brand-border bg-brand-input py-3 pl-3 pr-5 text-left transition-colors hover:border-brand-border"
        >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-panel text-brand-muted">
                {agent.icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-brand-text">{agent.title}</div>
                <div className="mt-1 flex items-center gap-2">
                    <span
                        className={`h-2 w-2 shrink-0 rounded-full ${status === 'active' ? 'bg-brand-teal/80' : 'bg-brand-muted/60'}`}
                        aria-hidden
                    />
                    <span className="text-[11px] font-medium capitalize text-brand-muted">{status}</span>
                </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-brand-muted transition group-hover:translate-x-0.5 group-hover:text-brand-muted" aria-hidden />
            {activeRoom === agent.role && (
                <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-brand-teal/35" />
            )}
        </button>
    );
}
