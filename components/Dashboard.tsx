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
import { aggregateImpact, getAffectedDesks } from '@/lib/impact/impactEngine';
import { fromExecutionScore } from '@/lib/impact/adapters/dashboardAdapter';
import { MorningBriefCard } from '@/components/office/MorningBriefCard';
import { AmbientNotificationTray } from '@/components/office/AmbientNotificationTray';
import { WeeklyReviewCard } from '@/components/office/WeeklyReviewCard';
import { GoalAdvanceCard } from '@/components/office/GoalAdvanceCard';

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
        background: '#2d2d2d',
        border: '1px solid rgba(255,255,255,0.08)',
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
        livingOffice,
        refreshLivingOffice,
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
        if (activeRoom === 'dashboard' && activeProject?.id) {
            void refreshLivingOffice();
        }
    }, [activeRoom, activeProject?.id, refreshLivingOffice]);

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

    const businessImpact = useMemo(
        () => aggregateImpact([fromExecutionScore(executionScore)]),
        [executionScore]
    );
    const impactDeskRoute = useMemo(() => getAffectedDesks(businessImpact), [businessImpact]);

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
                <div className="dash-thread flex w-full flex-col px-4 py-8 sm:px-6 sm:py-10">
                    <header className="mb-10 flex flex-col gap-6 pb-2 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <p className="dash-section-label">Office · Portfolio</p>
                            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">Executive overview</h1>
                            <p className="mt-3 max-w-lg text-sm leading-relaxed text-brand-muted">
                                Pick a tile — analytics stay folded until you want them. The Chief of Staff bar below is the main control surface.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-brand-muted">
                            <span className="inline-flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 opacity-70" aria-hidden />
                                {systemState.networkStatus === 'secure' ? 'Secure' : 'Review'}
                            </span>
                            <span className="text-white/15" aria-hidden>
                                ·
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden />
                                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </header>

                    <section aria-label="Shortcuts" className="mb-10">
                        <p className="dash-section-label">Surfaces</p>
                        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                            <button
                                type="button"
                                onClick={() => setPortfolioDashExpanded((o) => !o)}
                                className={`dash-msg flex min-w-0 flex-1 flex-col items-start gap-3 text-left transition sm:min-w-[14rem] ${
                                    portfolioDashExpanded ? 'bg-zinc-800/55' : 'hover:bg-zinc-800/50'
                                }`}
                            >
                                <div className="flex w-full items-center justify-between gap-2">
                                    <LayoutDashboard className="h-6 w-6 text-brand-muted" aria-hidden />
                                    {portfolioDashExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-brand-muted" aria-hidden />
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
                                    className="dash-msg flex min-w-0 flex-1 flex-col items-start gap-3 text-left transition hover:bg-zinc-800/50 sm:min-w-[14rem]"
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
                                className="mt-6 w-full rounded-2xl py-3.5 text-sm font-medium text-brand-muted transition hover:bg-white/[0.04] hover:text-brand-text"
                            >
                                Jump to saved ventures ({ventureCount})
                            </button>
                        )}
                    </section>

                    {portfolioDashExpanded && (
                        <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden rounded-3xl bg-zinc-900/25 px-1 py-1 sm:px-2">
                            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4 sm:px-5">
                                <p className="text-sm font-semibold text-brand-text">Portfolio analytics</p>
                                <button
                                    type="button"
                                    onClick={() => setPortfolioDashExpanded(false)}
                                    className="text-xs font-semibold text-brand-muted hover:text-brand-text"
                                >
                                    Collapse
                                </button>
                            </div>
                            <div className="space-y-8 p-5 sm:p-6">
                                <div
                                    className="flex flex-col gap-4 sm:flex-row sm:flex-wrap"
                                    aria-label="Portfolio summary"
                                >
                                    <div className="dash-msg min-w-0 flex-1 sm:min-w-[8rem]">
                                        <p className="text-[10px] font-medium text-brand-muted/90">Ventures</p>
                                        <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-brand-text">{ventureCount}</p>
                                    </div>
                                    <div className="dash-msg min-w-0 flex-1 sm:min-w-[8rem]">
                                        <p className="text-[10px] font-medium text-brand-muted/90">Office sync</p>
                                        <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-brand-text">
                                            {Math.max(0, Math.floor((Date.now() - systemState.lastSync) / 60000))}m
                                        </p>
                                    </div>
                                    <div className="dash-msg min-w-0 flex-1 sm:min-w-[8rem]">
                                        <p className="text-[10px] font-medium text-brand-muted/90">Exec roles</p>
                                        <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-brand-text">{EXEC_OUTPUT_ROLES.length}</p>
                                    </div>
                                </div>

                    <section className="flex flex-col gap-8" aria-label="Portfolio charts">
                        <div className="dash-msg">
                            <h3 className="text-[11px] font-medium text-brand-muted/90">Portfolio mix</h3>
                            <p className="mt-1 text-[10px] text-brand-muted">
                                <span className="text-brand-teal">Strategy</span> on file vs{' '}
                                <span className="text-slate-400">draft</span> records
                            </p>
                            {portfolioComposition.length > 0 ? (
                                <div className="dash-chart-h mt-4 w-full">
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
                        <div className="dash-msg">
                            <h3 className="text-[11px] font-medium text-brand-muted/90">New ventures by month</h3>
                            <p className="mt-1 text-[10px] text-brand-muted">
                                Count of ventures per calendar month (by created date) · colors rotate for contrast only
                            </p>
                            {venturesByMonth.length > 0 ? (
                                <div className="dash-chart-h mt-4 w-full">
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

                    <section id="portfolio-ventures" className="scroll-mt-8">
                        <div className="mb-5">
                            <h2 className="dash-section-label">
                                {ventureCount > 0 ? 'Your ventures' : 'No ventures yet'}
                            </h2>
                            <p className="mt-1 text-sm text-brand-muted">
                                {ventureCount > 0
                                    ? 'Open one to continue in this workspace — Chief of Staff stays below.'
                                    : 'Use New venture (card or sidebar) — chat-first setup in Personal Assistant.'}
                            </p>
                        </div>

                        {ventureCount > 0 ? (
                            <div className={`grid gap-5 text-left ${gridVentureClass}`}>
                                {allProjects.map((project) => (
                                    <button
                                        key={project.id}
                                        type="button"
                                        onClick={() => setActiveProject(project)}
                                        className="group relative flex w-full items-start gap-4 rounded-2xl bg-zinc-800/35 p-5 text-left transition-all hover:bg-zinc-800/50 sm:p-6"
                                    >
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
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
                            <div className="dash-msg border border-dashed border-white/[0.08] px-6 py-12 text-center">
                                <p className="mx-auto max-w-sm text-sm leading-relaxed text-brand-muted">
                                    No ventures yet — use <span className="text-brand-muted">New venture</span> on the left or the
                                    card above (opens Personal Assistant).
                                </p>
                            </div>
                        )}
                    </section>

                    <div className="mt-12 dash-msg">
                        <h3 className="mb-2 text-sm font-medium text-brand-text">Executive desks</h3>
                        <p className="text-xs leading-relaxed text-brand-muted">Each role produces a fixed artifact once a venture is active.</p>
                        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                            {EXEC_OUTPUT_ROLES.map((role) => (
                                <li
                                    key={role.id}
                                    className="flex items-start gap-2 rounded-xl bg-white/[0.04] px-3 py-3"
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
        <div className="h-full overflow-y-auto custom-scrollbar bg-brand-bg px-4 py-8 pb-16 font-sans sm:px-6 sm:py-10">
            <div className="dash-thread space-y-14 pb-8 animate-in fade-in duration-500">
                        <header className="flex flex-col gap-8 pb-2 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2.5">
                                    <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${systemState.networkStatus === 'secure' ? 'bg-zinc-400' : 'bg-brand-muted/60'}`}
                                        aria-hidden
                                    />
                                    <span className="dash-section-label !mb-0">Executive overview</span>
                                </div>
                                <h1 className="text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">{activeProject.name}</h1>
                                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-muted">
                                    <span className="font-medium text-brand-text/90">Goal advancement</span> and the daily office brief are{' '}
                                    <span className="text-brand-text/80">below the header</span> on this page. Use{' '}
                                    <span className="text-brand-muted">Surfaces → Goal advancement</span> to jump there. Expand{' '}
                                    <span className="text-brand-muted">Dashboard</span> for charts; the Chief of Staff bar stays fixed at the bottom.
                                </p>
                            </div>
                            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => runAgentStaffSync()}
                                    disabled={agentSyncRunning}
                                    title="Run all AI desks: research + merge into market intel, finance notes, directives, kanban, calendar"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-xs font-medium text-brand-text transition hover:bg-white/[0.12] disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${agentSyncRunning ? 'animate-spin' : ''}`} aria-hidden />
                                    {agentSyncRunning ? 'Staff syncing…' : 'Sync AI staff'}
                                </button>
                                <WorkspaceAiButton label="Dexo AI" />
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-muted">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Shield className="h-3.5 w-3.5 opacity-70" aria-hidden />
                                        {systemState.networkStatus === 'secure' ? 'Secure' : 'Review'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden />
                                        {(() => {
                                            const m = Math.floor((Date.now() - systemState.lastSync) / 60000);
                                            if (m < 1) return 'Staff sync just now';
                                            if (m < 120) return `${m}m since staff sync`;
                                            const h = Math.floor(m / 60);
                                            return `${h}h since staff sync`;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </header>

                        <section id="exec-goal-advancement" className="scroll-mt-8 space-y-8" aria-labelledby="goal-advancement-heading">
                            <h2 id="goal-advancement-heading" className="sr-only">
                                Goal advancement dashboard
                            </h2>
                            {livingOffice ? (
                                <>
                                    <GoalAdvanceCard
                                        progress={livingOffice.progress}
                                        suggestedFocus={livingOffice.brief.suggestedFocus}
                                    />
                                    <section aria-label="Daily office" className="flex flex-col gap-8">
                                        <MorningBriefCard brief={livingOffice.brief} />
                                        <AmbientNotificationTray items={livingOffice.notifications} />
                                        <WeeklyReviewCard review={livingOffice.weeklyReview} />
                                    </section>
                                </>
                            ) : (
                                <div className="dash-msg border border-dashed border-white/[0.08] px-5 py-10 text-center">
                                    <p className="text-sm text-brand-muted">Office metrics have not loaded yet for this venture.</p>
                                    <button
                                        type="button"
                                        onClick={() => void refreshLivingOffice()}
                                        className="mt-4 inline-flex items-center justify-center rounded-full bg-white/[0.08] px-4 py-2 text-xs font-medium text-brand-text transition hover:bg-white/[0.12]"
                                    >
                                        Load goal advancement
                                    </button>
                                </div>
                            )}
                        </section>

                        {activeProject.agentStaffSnapshot && (
                            <button
                                type="button"
                                onClick={() => openDashboard('dash-staff-snapshot')}
                                className="group dash-msg flex w-full flex-col gap-4 text-left transition hover:bg-zinc-800/55 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]">
                                        <Sparkles className="h-5 w-5 text-brand-muted" aria-hidden />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-brand-muted">Featured</p>
                                        <h2 className="mt-1 text-base font-semibold text-brand-text">Latest AI staff research</h2>
                                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-brand-muted">
                                            {activeProject.agentStaffSnapshot.summary}
                                        </p>
                                    </div>
                                </div>
                                <span className="shrink-0 text-sm font-medium text-brand-muted group-hover:text-brand-text">
                                    Open in dashboard →
                                </span>
                            </button>
                        )}

                        <section aria-labelledby="exec-hub-tiles">
                            <h2 id="exec-hub-tiles" className="dash-section-label">
                                Surfaces
                            </h2>
                            <p className="mb-8 max-w-prose text-sm leading-relaxed text-brand-muted">
                                Shortcuts below; expanding <span className="text-brand-muted">Dashboard</span> opens charts and desks in one scrollable thread.
                                Use the <span className="font-medium text-brand-text/90">Chief of Staff</span> bar at the bottom for chat.
                            </p>
                            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDashboardExpanded((open) => !open);
                                        setPendingScrollId(null);
                                    }}
                                    className={`dash-msg flex min-w-0 flex-1 flex-col items-start gap-3 text-left transition sm:min-w-[14rem] ${
                                        dashboardExpanded ? 'bg-zinc-800/55' : 'hover:bg-zinc-800/50'
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
                                            Snapshot, score, charts, staff research, signal, desks — opens below as one flowing thread.
                                        </p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        document
                                            .getElementById('exec-goal-advancement')
                                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="dash-msg flex min-w-0 flex-1 flex-col items-start gap-3 text-left transition hover:bg-zinc-800/50 sm:min-w-[14rem]"
                                >
                                    <Target className="h-6 w-6 text-brand-muted" aria-hidden />
                                    <div>
                                        <h3 className="text-base font-semibold text-brand-text">Goal advancement</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                                            Scroll to progress bar, horizon estimate, risk, and the daily office brief on this page.
                                        </p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openDashboard('dash-signal')}
                                    className="dash-msg flex min-w-0 flex-1 flex-col items-start gap-3 text-left transition hover:bg-zinc-800/50 sm:min-w-[14rem]"
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
                                    className="dash-msg flex min-w-0 flex-1 flex-col items-start gap-3 text-left transition hover:bg-zinc-800/50 sm:min-w-[14rem]"
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
                                    className="dash-msg flex min-w-0 flex-1 flex-col items-start gap-3 text-left transition hover:bg-zinc-800/50 sm:min-w-[14rem]"
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
                                    className="dash-msg flex min-w-0 flex-1 flex-col items-start gap-3 text-left transition hover:bg-zinc-800/50 sm:min-w-[14rem]"
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
                                    className="dash-msg flex min-w-0 flex-1 flex-col items-start gap-3 text-left transition hover:bg-zinc-800/50 sm:min-w-[14rem]"
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
                                className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden rounded-3xl bg-zinc-900/30 px-1 py-1 sm:px-2"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-5">
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
                                        className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-2 text-xs font-semibold text-brand-text transition hover:bg-white/[0.12]"
                                    >
                                        <ChevronUp className="h-4 w-4" aria-hidden />
                                        Collapse
                                    </button>
                                </div>
                                <div className="space-y-12 px-4 py-8 sm:px-6 sm:py-10">
                        {activeProject.agentStaffSnapshot && (
                    <section
                        id="dash-staff-snapshot"
                        className="dash-msg mb-10 bg-teal-950/20"
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
                        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
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
                                    <div key={label} className="min-w-0 flex-1 rounded-2xl bg-white/[0.04] p-4 sm:min-w-[12rem]">
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
                        className="dash-msg mb-10 bg-amber-950/15"
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

                <section className="mb-12" aria-labelledby="dash-snapshot">
                    <h2 id="dash-snapshot" className="dash-section-label">
                        Venture snapshot
                    </h2>
                    <div className="flex flex-col gap-8">
                        <div className="dash-msg">
                            <p className="text-[10px] font-medium text-brand-muted/90">Strategic line</p>
                            <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-brand-text">
                                {intentPreview || 'Pin strategic intent and narrative on the CEO desk to populate this summary.'}
                            </p>
                            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-6 sm:grid-cols-3">
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
                                    <p className="mt-2 text-[10px] leading-snug text-brand-muted/90">
                                        Decision layer: severity{' '}
                                        <span className="font-medium text-brand-text/90">{businessImpact.severity}</span>
                                        {businessImpact.requiresEscalation ? (
                                            <span className="text-amber-400/90"> · escalation suggested</span>
                                        ) : null}
                                        {impactDeskRoute.length ? (
                                            <>
                                                {' '}
                                                · desks: {impactDeskRoute.join(', ')}
                                            </>
                                        ) : null}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="dash-msg">
                            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                                <h3 className="text-sm font-medium text-brand-text">Score drivers</h3>
                                <span className="text-[10px] text-brand-muted">Current snapshot · not a time series</span>
                            </div>
                            <p className="mb-4 text-[11px] leading-snug text-brand-muted">
                                Each bar uses the same inputs as the composite score (binary checks + phase/priority completion).
                            </p>
                            <div className="dash-chart-h w-full">
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

                    <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:flex-wrap">
                        <div className="dash-msg min-w-0 flex-1 lg:min-w-[18rem]">
                            <h3 className="text-sm font-medium text-brand-text">Phase status</h3>
                            <p className="mt-0.5 text-[10px] text-brand-muted">
                                Timeline ·{' '}
                                <span className="text-violet-400/90">done</span> ·{' '}
                                <span className="text-amber-400/90">active</span> ·{' '}
                                <span className="text-slate-400">planned</span>
                            </p>
                            {phasePieData.length > 0 ? (
                                <div className="dash-chart-h mt-3 w-full">
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
                        <div className="dash-msg min-w-0 flex-1 lg:min-w-[18rem]">
                            <h3 className="text-sm font-medium text-brand-text">Priority completion</h3>
                            <p className="mt-0.5 text-[10px] text-brand-muted">
                                <span className="text-violet-400/90">Complete</span> vs{' '}
                                <span className="text-rose-400/90">open</span> items
                            </p>
                            {priorityPieData.length > 0 ? (
                                <div className="dash-chart-h mt-3 w-full">
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
                        <div className="dash-msg min-w-0 flex-1 lg:min-w-[18rem]">
                            <h3 className="text-sm font-medium text-brand-text">Desk artifact coverage</h3>
                            <p className="mt-0.5 text-[10px] text-brand-muted">
                                One color per desk role · 100% = artifact saved
                            </p>
                            <div className="dash-chart-h mt-3 w-full">
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

                <section className="mb-12" aria-labelledby="dash-signal">
                    <h2 id="dash-signal" className="dash-section-label">
                        Signal &amp; activity
                    </h2>
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
                        <div className="dash-msg flex min-h-0 flex-1 flex-col">
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
                                <div className="dash-chart-h mt-5 w-full">
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

                        <div className="dash-msg flex min-h-[14rem] flex-1 flex-col lg:min-h-[16rem]">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-medium text-brand-text">
                                    <Activity className="h-4 w-4 text-brand-muted" aria-hidden />
                                    Activity
                                </h3>
                                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-muted" aria-hidden />
                            </div>
                            <div className="custom-scrollbar max-h-[min(50vh,22rem)] flex-1 space-y-4 overflow-y-auto pr-1">
                                {systemLogs.length === 0 ? (
                                    <div className="py-10 text-center text-sm text-brand-muted">No activity yet.</div>
                                ) : (
                                    systemLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="rounded-2xl bg-white/[0.04] px-4 py-3"
                                        >
                                            <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-brand-muted">
                                                    {log.source}
                                                </span>
                                                <span className="font-mono text-[10px] text-brand-muted">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-[15px] leading-relaxed text-brand-text">{log.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-12" aria-labelledby="dash-desks">
                    <h2 id="dash-desks" className="dash-section-label">
                        Operational desks
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
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

                <section className="mb-4" aria-labelledby="dash-next">
                    <h2 id="dash-next" className="dash-section-label">
                        Next focus
                    </h2>
                    <div className="dash-msg flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-prose">
                            <p className="font-serif text-xl leading-snug text-brand-text md:text-2xl">
                                {phaseActive > 0
                                    ? `Drive the active timeline phase — ${phaseDone} of ${phaseTotal} phases complete.`
                                    : activeProject.strategy
                                      ? 'Strategy record is in motion — tune phases and priorities on the CEO desk.'
                                      : 'Open the CEO desk to set intent, timeline phases, and priorities.'}
                            </p>
                        </div>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                            <Zap className="h-5 w-5 text-brand-muted" aria-hidden />
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => switchRoom('ceo')}
                            className="rounded-full bg-white/[0.08] px-4 py-2.5 text-xs font-semibold text-brand-text transition hover:bg-white/[0.12]"
                        >
                            CEO desk
                        </button>
                        <button
                            type="button"
                            onClick={() => switchRoom('reports')}
                            className="rounded-full bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-brand-text transition hover:bg-white/[0.1]"
                        >
                            Knowledge base
                        </button>
                        <WorkspaceAiButton label="Ask Dexo" />
                    </div>
                </section>
                                </div>
                            </div>
                        )}
            </div>
        </div>
    );
}

function AgentCard({ agent, activeRoom, onClick, status }: any) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative flex min-h-[4.5rem] w-full items-center gap-4 rounded-2xl bg-white/[0.04] py-4 pl-4 pr-5 text-left transition-colors hover:bg-white/[0.07]"
        >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-brand-muted">
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
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-brand-teal/35" />
            )}
        </button>
    );
}
