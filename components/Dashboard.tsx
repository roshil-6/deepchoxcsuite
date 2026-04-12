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
    FileText,
    LayoutGrid,
    LayoutDashboard,
    ChevronUp,
    Compass,
    SunMedium,
    Bell,
    CalendarRange,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import { RESEARCH_STAFF, type ResearchStaffRole } from '@/lib/researchStaffLabels';
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
import { StaffFocusChecklist } from '@/components/office/StaffFocusChecklist';
import { OfficeBriefPanel } from '@/components/office/OfficeBriefPanel';

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

/** Tinted outlines for dashboard “message” blocks — each section reads as a generated insight, not a collapsible drawer. */
const DASH_OUTLINE = {
    goal: 'border-teal-500/35 bg-gradient-to-br from-teal-500/[0.07] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    staff: 'border-violet-500/35 bg-gradient-to-br from-violet-500/[0.08] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    focus: 'border-amber-500/40 bg-gradient-to-br from-amber-950/35 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    snapshot: 'border-cyan-500/35 bg-gradient-to-br from-cyan-500/[0.07] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    signal: 'border-sky-500/35 bg-gradient-to-br from-sky-500/[0.07] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    desks: 'border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/[0.06] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    next: 'border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.07] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    portfolio: 'border-zinc-500/30 bg-zinc-900/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
} as const;

type DashOutlineKey = keyof typeof DASH_OUTLINE;

function DashMessageSection({
    id,
    outline,
    icon,
    eyebrow,
    title,
    subtitle,
    children,
    className = '',
}: {
    id?: string;
    outline: DashOutlineKey;
    icon: React.ReactNode;
    eyebrow?: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section
            id={id}
            className={`scroll-mt-6 rounded-2xl border px-4 py-4 sm:px-5 sm:py-5 ${DASH_OUTLINE[outline]} ${className}`}
        >
            <header className="mb-4 flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black/20 ring-1 ring-white/[0.08]">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    {eyebrow ? (
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{eyebrow}</p>
                    ) : null}
                    <h2 className={`text-sm font-semibold tracking-tight text-brand-text ${eyebrow ? 'mt-1' : ''}`}>{title}</h2>
                    {subtitle ? <p className="mt-1 text-[11px] leading-snug text-brand-muted">{subtitle}</p> : null}
                </div>
            </header>
            <div className="text-[13px] leading-relaxed text-brand-text/95">{children}</div>
        </section>
    );
}

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
        markStaffFocusLineDone,
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
        }, 200);
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
            { label: 'Research strategy', pct: activeProject?.strategy?.trim() ? 100 : 0, fill: DASH.desk.ceo },
            { label: 'Research market', pct: activeProject?.marketInsights?.trim() ? 100 : 0, fill: DASH.desk.scout },
            { label: 'Research fund', pct: activeProject?.budget?.trim() ? 100 : 0, fill: DASH.desk.finance },
            { label: 'Research product', pct: activeProject?.productPlan?.trim() ? 100 : 0, fill: DASH.desk.pm },
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
            <div className="w-full min-w-0 bg-brand-bg">
                <div className="dash-thread flex w-full flex-col px-4 py-8 sm:px-6 sm:py-10">
                    <header className="mb-10 flex flex-col gap-6 pb-2 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <p className="dash-section-label">Office · Portfolio</p>
                            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">Executive overview</h1>
                            <p className="mt-2 max-w-lg text-sm leading-relaxed text-brand-muted">
                                Select a venture or create one. Chat stays pinned below.
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
                                className={`flex min-w-0 flex-1 flex-col items-start gap-4 rounded-2xl border p-5 text-left transition-all sm:min-w-[14rem] ${
                                    portfolioDashExpanded
                                        ? 'border-white/[0.12] bg-white/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.07)]'
                                        : 'border-white/[0.08] bg-white/[0.025] shadow-[0_2px_8px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/[0.13] hover:bg-white/[0.04]'
                                }`}
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05]">
                                    <LayoutDashboard className="h-4.5 w-4.5 text-brand-muted" aria-hidden />
                                </div>
                                <div className="flex w-full items-end justify-between gap-2">
                                    <div>
                                        <h2 className="text-sm font-semibold text-brand-text">Dashboard</h2>
                                        <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">
                                            KPIs, portfolio mix, and cadence.
                                        </p>
                                    </div>
                                    {portfolioDashExpanded && <ChevronUp className="h-4 w-4 shrink-0 text-brand-muted/60" aria-hidden />}
                                </div>
                            </button>
                            {onNewVenture && (
                                <button
                                    type="button"
                                    onClick={onNewVenture}
                                    className="flex min-w-0 flex-1 flex-col items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all hover:border-white/[0.13] hover:bg-white/[0.04] sm:min-w-[14rem]"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05]">
                                        <Target className="h-4.5 w-4.5 text-brand-muted" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-brand-text">New venture</h2>
                                        <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">
                                            Describe your idea — the assistant builds your record.
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
                            <div className="space-y-5 p-4 sm:p-5">
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
                                        <p className="text-[10px] font-medium text-brand-muted/90">Research areas</p>
                                        <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-brand-text">5</p>
                                    </div>
                                </div>

                    <section className="flex flex-col gap-5" aria-label="Portfolio charts">
                        <div className="dash-msg">
                            <h3 className="text-[11px] font-medium text-brand-muted/90">Portfolio mix</h3>
                            <p className="mt-1 text-[10px] text-brand-muted">
                                <span className="text-zinc-300">Strategy</span> on file vs{' '}
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
                                    ? 'Open one to continue in this workspace — chat stays below.'
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
                                        className="group relative flex w-full items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all hover:border-white/[0.13] hover:bg-white/[0.04] sm:p-5"
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05]">
                                            <Briefcase className="h-4.5 w-4.5 text-brand-muted" aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-sm font-semibold text-brand-text">{project.name}</h3>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-brand-muted">
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
                                        <ChevronRight className="h-4 w-4 shrink-0 text-brand-muted/50 transition group-hover:translate-x-0.5 group-hover:text-brand-muted" aria-hidden />
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

                    <DashMessageSection
                        outline="portfolio"
                        icon={<LayoutGrid className="h-4 w-4 text-zinc-400" aria-hidden />}
                        eyebrow="Portfolio"
                        title="Research desks"
                        subtitle="What each area saves in your venture"
                        className="mt-8"
                    >
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {(['ceo', 'accountant', 'pm', 'cmo', 'scout'] as const satisfies readonly ResearchStaffRole[]).map((role) => {
                                const row = RESEARCH_STAFF[role];
                                return (
                                    <li
                                        key={role}
                                        className="flex flex-col gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.04]"
                                    >
                                        <span className="text-[11px] font-medium leading-snug text-brand-text">{row.navTitle}</span>
                                        <span className="min-w-0 text-[10px] leading-snug text-brand-muted">{row.navHint}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </DashMessageSection>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 bg-brand-bg px-4 py-6 pb-14 font-sans sm:px-5 sm:py-8">
            <div className="dash-thread space-y-6 pb-4 animate-in fade-in duration-500">
                        <header className="flex flex-col gap-5 pb-1 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2.5">
                                    <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${systemState.networkStatus === 'secure' ? 'bg-zinc-400' : 'bg-brand-muted/60'}`}
                                        aria-hidden
                                    />
                                    <span className="dash-section-label !mb-0">Executive overview</span>
                                </div>
                                <h1 className="text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">{activeProject.name}</h1>
                                <p className="mt-2 max-w-xl text-[13px] leading-snug text-brand-muted">
                                    Office brief below · open <span className="text-brand-text/85">Dashboard</span> for charts and staff output.
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
                                <WorkspaceAiButton label="Research across desks (assistant)" />
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

                        <section id="exec-goal-advancement" className="scroll-mt-6 space-y-3" aria-label="Office brief">
                            <header className="pb-0.5">
                                <p className="dash-section-label mb-1">Office brief</p>
                                <p className="max-w-xl text-[12px] leading-snug text-brand-muted">
                                    Tap any row to expand.
                                </p>
                            </header>
                            {livingOffice ? (
                                <div className="flex flex-col gap-3">
                                    <OfficeBriefPanel
                                        tone="teal"
                                        icon={<Target className="h-4 w-4 text-teal-300/90" aria-hidden />}
                                        title="Goal advancement"
                                        teaser={`${livingOffice.progress.percentage}% toward horizon · risk ${livingOffice.progress.risk} · score, horizon, and where to update`}
                                    >
                                        <GoalAdvanceCard
                                            detailOnly
                                            progress={livingOffice.progress}
                                            suggestedFocus={livingOffice.brief.suggestedFocus}
                                        />
                                    </OfficeBriefPanel>

                                    {(() => {
                                        const b = livingOffice.brief;
                                        if (!b) return null;
                                        const hasMorning =
                                            Boolean(b.greeting?.trim()) ||
                                            b.priorities.length > 0 ||
                                            b.criticalAlerts.length > 0 ||
                                            Boolean(b.suggestedFocus?.trim());
                                        if (!hasMorning) return null;
                                        const teaserLine =
                                            b.greeting?.trim() ||
                                            b.suggestedFocus?.trim() ||
                                            b.priorities[0] ||
                                            (b.criticalAlerts[0] ?? 'Priorities and alerts on the desk');
                                        return (
                                            <OfficeBriefPanel
                                                tone="amber"
                                                icon={<SunMedium className="h-4 w-4 text-amber-200/90" aria-hidden />}
                                                eyebrow="Today"
                                                title="Morning brief"
                                                teaser={<span className="line-clamp-2">{teaserLine}</span>}
                                            >
                                                <MorningBriefCard brief={b} detailOnly />
                                            </OfficeBriefPanel>
                                        );
                                    })()}

                                    {livingOffice.suggestedActions.length > 0 ? (
                                        <OfficeBriefPanel
                                            tone="sky"
                                            icon={<Compass className="h-4 w-4 text-sky-300/90" aria-hidden />}
                                            title="Leadership hints"
                                            teaser={`${livingOffice.suggestedActions.length} heuristic nudges — open for summary, desks, and steps`}
                                        >
                                            <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-3 sm:p-4 ring-1 ring-white/[0.05]">
                                                <p className="text-[10px] leading-snug text-brand-muted">
                                                    Use Personal Assistant to turn these into a concrete plan.
                                                </p>
                                                <ul className="mt-3 space-y-2">
                                                    {livingOffice.suggestedActions.map((a, idx) => (
                                                        <li
                                                            key={`${a.intent}-${idx}`}
                                                            className="rounded-lg border border-white/[0.08] bg-black/25 px-2.5 py-2"
                                                        >
                                                            <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                                                                {a.intent.replace(/_/g, ' ')} · {a.targetDesks.join(', ')}
                                                            </p>
                                                            <p className="mt-0.5 text-[12px] leading-snug text-brand-text/95">{a.summary}</p>
                                                            {a.proposedSteps.length > 0 ? (
                                                                <ul className="mt-1.5 space-y-0.5 border-t border-white/[0.04] pt-1.5 text-[10px] leading-snug text-brand-muted">
                                                                    {a.proposedSteps.map((s, i) => (
                                                                        <li
                                                                            key={i}
                                                                            className="flex gap-1.5 text-[10px] leading-snug text-brand-muted"
                                                                        >
                                                                            <span className="shrink-0 text-brand-muted/45">·</span>
                                                                            <span>{s}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : null}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </OfficeBriefPanel>
                                    ) : null}

                                    {livingOffice.notifications.length > 0 ? (
                                        <OfficeBriefPanel
                                            tone="zinc"
                                            icon={<Bell className="h-4 w-4 text-zinc-400" aria-hidden />}
                                            title="Office pulse"
                                            teaser={
                                                <span className="line-clamp-2">
                                                    {livingOffice.notifications[0].desk} · {livingOffice.notifications[0].message}
                                                </span>
                                            }
                                        >
                                            <AmbientNotificationTray
                                                items={livingOffice.notifications}
                                                detailOnly
                                                maxVisible={8}
                                            />
                                        </OfficeBriefPanel>
                                    ) : null}

                                    {livingOffice.weeklyReview ? (
                                        <OfficeBriefPanel
                                            tone="emerald"
                                            icon={<CalendarRange className="h-4 w-4 text-emerald-300/80" aria-hidden />}
                                            eyebrow="Weekly"
                                            title="Weekly office review"
                                            teaser={`${livingOffice.weeklyReview.completedTasks} tasks (7d) · intel ${livingOffice.weeklyReview.growthChange > 0 ? '+' : ''}${livingOffice.weeklyReview.growthChange} · churn ${livingOffice.weeklyReview.churnRisk}`}
                                        >
                                            <WeeklyReviewCard review={livingOffice.weeklyReview} detailOnly />
                                        </OfficeBriefPanel>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-teal-500/25 bg-teal-500/[0.04] px-5 py-8 text-center">
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
                                title="Opens Dashboard panel and expands latest staff research"
                                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left text-sm font-medium text-brand-text transition hover:bg-white/[0.07]"
                            >
                                <span className="flex min-w-0 items-center gap-2.5">
                                    <Sparkles className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                    <span className="truncate">Latest staff research</span>
                                </span>
                                <span className="shrink-0 text-xs text-brand-muted">Open →</span>
                            </button>
                        )}

                        <section aria-labelledby="exec-hub-tiles">
                            <h2 id="exec-hub-tiles" className="dash-section-label">
                                Surfaces
                            </h2>
                            <p className="mb-3 text-[12px] leading-snug text-brand-muted">
                                Quick navigation across desks and views.
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDashboardExpanded((open) => !open);
                                        setPendingScrollId(null);
                                    }}
                                    className={`flex items-center gap-2 rounded-xl border border-white/[0.06] px-3 py-2.5 text-left text-xs font-semibold transition ${
                                        dashboardExpanded ? 'bg-zinc-800/55 text-brand-text' : 'bg-white/[0.04] text-brand-text hover:bg-white/[0.07]'
                                    }`}
                                    aria-expanded={dashboardExpanded}
                                    title="Snapshot, score, charts, staff output, activity, desks — outlined insight blocks"
                                >
                                    <LayoutDashboard className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                    <span className="min-w-0 truncate">Dashboard</span>
                                    {dashboardExpanded ? <ChevronUp className="ml-auto h-3.5 w-3.5 shrink-0 text-brand-muted" aria-hidden /> : null}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        document.getElementById('exec-goal-advancement')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-left text-xs font-semibold text-brand-text transition hover:bg-white/[0.07]"
                                    title="Scroll to goal advancement brief"
                                >
                                    <Target className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                    <span className="min-w-0 truncate">Goals</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openDashboard('dash-signal')}
                                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-left text-xs font-semibold text-brand-text transition hover:bg-white/[0.07]"
                                    title="Opens Dashboard panel to activity charts and log"
                                >
                                    <Activity className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                    <span className="min-w-0 truncate">Signal</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openDashboard('dash-desks')}
                                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-left text-xs font-semibold text-brand-text transition hover:bg-white/[0.07]"
                                    title="Opens Dashboard panel to desk shortcuts"
                                >
                                    <LayoutGrid className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                    <span className="min-w-0 truncate">Desks</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchRoom('reports')}
                                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-left text-xs font-semibold text-brand-text transition hover:bg-white/[0.07]"
                                    title="Reports and saved artifacts"
                                >
                                    <FileText className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                    <span className="min-w-0 truncate">Knowledge</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchRoom('calendar')}
                                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-left text-xs font-semibold text-brand-text transition hover:bg-white/[0.07]"
                                    title="Milestones and events"
                                >
                                    <Calendar className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                    <span className="min-w-0 truncate">Calendar</span>
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
                                <div className="space-y-2 px-3 py-4 sm:px-4 sm:py-5">
                        {activeProject.agentStaffSnapshot && (
                            <DashMessageSection
                                id="dash-staff-snapshot"
                                outline="staff"
                                icon={<Sparkles className="h-4 w-4 text-violet-300/90" aria-hidden />}
                                eyebrow="Staff sync"
                                title="Latest AI staff research"
                                subtitle={new Date(activeProject.agentStaffSnapshot.at).toLocaleString()}
                            >
                                <p className="rounded-xl bg-black/15 px-3 py-2.5 text-sm leading-relaxed text-brand-text/95 ring-1 ring-white/[0.06]">
                                    {activeProject.agentStaffSnapshot.summary}
                                </p>
                                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                    {(
                                        [
                                            ['Strategy', activeProject.agentStaffSnapshot.desks.ceo, DASH.desk.ceo],
                                            ['Product', activeProject.agentStaffSnapshot.desks.pm, DASH.desk.pm],
                                            ['Finance', activeProject.agentStaffSnapshot.desks.accountant, DASH.desk.finance],
                                            ['Market', activeProject.agentStaffSnapshot.desks.scout, DASH.desk.scout],
                                            ['Growth', activeProject.agentStaffSnapshot.desks.cmo, '#f472b6'],
                                        ] as const
                                    ).map(([label, text, color]) =>
                                        text?.trim() ? (
                                            <div
                                                key={label}
                                                className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/20 p-3.5 sm:min-w-[11rem]"
                                                style={{ borderLeftWidth: 3, borderLeftColor: color }}
                                            >
                                                <p className="text-[10px] font-medium text-brand-muted/90">{label}</p>
                                                <p className="mt-2 text-[11px] leading-snug text-brand-text/90 whitespace-pre-wrap">
                                                    {text}
                                                </p>
                                            </div>
                                        ) : null
                                    )}
                                </div>
                            </DashMessageSection>
                        )}

                        {activeProject.staffFocusToday && activeProject.staffFocusToday.length > 0 && (
                            <DashMessageSection
                                id="dash-focus-today"
                                outline="focus"
                                icon={<Zap className="h-4 w-4 text-amber-300/90" aria-hidden />}
                                eyebrow="Today"
                                title="Focus from staff sync"
                                subtitle={`${activeProject.staffFocusToday.length} line${activeProject.staffFocusToday.length === 1 ? '' : 's'} · check off below`}
                            >
                                <p className="mb-3 text-[10px] leading-snug text-amber-100/70">
                                    Check off or add a note — saved to journal.
                                </p>
                                <StaffFocusChecklist
                                    lines={activeProject.staffFocusToday}
                                    completedLines={activeProject.staffFocusCompletedLines || []}
                                    onMarkDone={(line, note) => markStaffFocusLineDone(line, note)}
                                />
                            </DashMessageSection>
                        )}

                <DashMessageSection
                    id="dash-snapshot"
                    outline="snapshot"
                    icon={<LayoutDashboard className="h-4 w-4 text-cyan-300/90" aria-hidden />}
                    eyebrow="Venture"
                    title="Execution snapshot"
                    subtitle={`${executionScore}% execution index · strategy line, drivers, and charts`}
                    className="mb-2"
                >
                    <div className="flex flex-col gap-6">
                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-3.5 sm:p-4">
                            <p className="text-[10px] font-medium text-brand-muted/90">Strategic line</p>
                            <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-brand-text">
                                {intentPreview || 'Set your strategic intent in the CEO desk to populate this.'}
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
                        <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.03] p-3.5 sm:p-4">
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

                    <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:flex-wrap">
                        <div className="min-w-0 flex-1 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-3.5 lg:min-w-[18rem]">
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
                        <div className="min-w-0 flex-1 rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-3.5 lg:min-w-[18rem]">
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
                        <div className="min-w-0 flex-1 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3.5 lg:min-w-[18rem]">
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
                    </div>
                </DashMessageSection>

                <DashMessageSection
                    id="dash-signal"
                    outline="signal"
                    icon={<Activity className="h-4 w-4 text-sky-300/90" aria-hidden />}
                    eyebrow="Telemetry"
                    title="Signal & activity"
                    subtitle="Charts and live log stream"
                    className="mb-2"
                >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-3.5">
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

                        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-indigo-500/25 bg-indigo-500/[0.05] p-3.5 lg:min-h-[12rem]">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-medium text-brand-text">
                                    <Activity className="h-4 w-4 text-indigo-300/80" aria-hidden />
                                    Activity log
                                </h3>
                                <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400/50" aria-hidden />
                            </div>
                            <div className="space-y-2.5">
                                {systemLogs.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-brand-muted">No activity yet.</div>
                                ) : (
                                    systemLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 ring-1 ring-white/[0.03]"
                                        >
                                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-brand-muted">
                                                    {log.source}
                                                </span>
                                                <span className="font-mono text-[10px] text-brand-muted">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-[13px] leading-relaxed text-brand-text/95">{log.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </DashMessageSection>

                <DashMessageSection
                    id="dash-desks"
                    outline="desks"
                    icon={<LayoutGrid className="h-4 w-4 text-fuchsia-300/90" aria-hidden />}
                    eyebrow="Navigation"
                    title="Operational desks"
                    subtitle="Jump to strategy, product, finance, market"
                    className="mb-2"
                >
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
                </DashMessageSection>

                <DashMessageSection
                    id="dash-next"
                    outline="next"
                    icon={<Compass className="h-4 w-4 text-emerald-300/90" aria-hidden />}
                    eyebrow="Suggested next"
                    title="Where to steer next"
                    subtitle="One line + shortcuts"
                    className="mb-2"
                >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-prose rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4 md:p-5">
                            <p className="font-serif text-xl leading-snug text-brand-text md:text-2xl">
                                {phaseActive > 0
                                    ? `Active phase in progress — ${phaseDone} of ${phaseTotal} phases complete.`
                                    : activeProject.strategy
                                      ? 'Strategy in motion — tune phases and priorities in the CEO desk.'
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
                        <WorkspaceAiButton label="Ask across desks" />
                    </div>
                </DashMessageSection>
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
                        className={`h-2 w-2 shrink-0 rounded-full ${status === 'active' ? 'bg-zinc-400' : 'bg-brand-muted/60'}`}
                        aria-hidden
                    />
                    <span className="text-[11px] font-medium capitalize text-brand-muted">{status}</span>
                </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-brand-muted transition group-hover:translate-x-0.5 group-hover:text-brand-muted" aria-hidden />
            {activeRoom === agent.role && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-white/20" />
            )}
        </button>
    );
}
