'use client';

import React, { useState, useMemo, useId, useEffect, useCallback } from 'react';
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
    Bell,
    CalendarRange,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    ArrowUpRight,
    ArrowRight,
    AlertTriangle,
    ListTodo,
    Mic,
    MessageSquare,
    PieChart,
    BarChart2,
    Layers,
    Cpu,
    Globe,
    Wallet,
    Lightbulb,
    ChevronDown,
    Megaphone,
} from 'lucide-react';
import type { AgentRole } from '@/lib/OfficeContext';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import { RESEARCH_STAFF } from '@/lib/researchStaffLabels';
import {
    aggregatePortfolioDeskStats,
    firstProjectNeedingRole,
    MIN_VENTURE_FIELD_CHARS,
} from '@/lib/ventureKnowledgeGaps';
import { WorkspaceAiButton } from '@/components/workspace/WorkspaceAiButton';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart as RePieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { aggregateImpact, getAffectedDesks } from '@/lib/impact/impactEngine';
import { fromVenturePillarScores } from '@/lib/impact/adapters/dashboardAdapter';
import {
    computeStrategicCoverageScore,
    computeExecutionDeliveryScore,
    computeFinancialHealthScore,
} from '@/lib/ventureMetrics';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { GuideHint, ActionHint } from '@/components/ui/ContextualGuide';
import { InteractiveCard, QuickActionGrid } from '@/components/ui';
import { buildDexoStaffAttentionBootstrap } from '@/lib/dexoStaffAttentionPrompt';
import { buildDexoJarvisVentureContext } from '@/lib/dexoJarvisContext';
import { FocusBriefingPanel } from '@/components/FocusBriefingPanel';
import { DexoDailyBriefPanel } from '@/components/Dexo/DexoDailyBriefPanel';
import { DexoOpsPanel } from '@/components/Dexo/DexoOpsPanel';
import { PortfolioDailyIntelSection } from '@/components/Dexo/PortfolioDailyIntelSection';
import { useSubscription } from '@/hooks/useSubscription';
import { PlanGate } from '@/components/PlanGate';

// ============================================================================
// MODERN DASHBOARD THEME - No Glow, Clean Depth
// ============================================================================

const THEME = {
    bg: {
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        tertiary: 'var(--bg-tertiary)',
        elevated: 'var(--bg-elevated)',
    },
    text: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        muted: 'var(--text-muted)',
    },
    accent: {
        primary: 'var(--accent-violet)',
        secondary: 'var(--accent-violet)',
        tertiary: '#8b74ff',
        info: '#7456ff',
        warning: '#5f43df',
    },
    border: {
        subtle: 'rgba(255,255,255,0.08)',
        default: 'rgba(255,255,255,0.10)',
        strong: 'rgba(255,255,255,0.14)',
    },
    chart: {
        emerald: '#7456ff',
        violet: '#7456ff',
        amber: '#9d88ff',
        blue: '#8b74ff',
        rose: '#5f43df',
        cyan: '#a696ff',
        slate: '#94a3b8',
    },
} as const;

/** Map snapshot desk labels → research room for quick navigation from the overview card */
const SNAPSHOT_DESK_ROOMS: Record<string, AgentRole> = {
    Strategy: 'ceo',
    Market: 'scout',
    Finance: 'accountant',
    Product: 'pm',
    Growth: 'cmo',
};

// Chart tooltip configuration
const CHART_TOOLTIP = {
    contentStyle: {
        background: 'rgba(38,38,38,0.98)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        fontSize: '12px',
        padding: '12px',
        boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
    },
    labelStyle: { color: 'var(--text-tertiary)', fontSize: '11px', marginBottom: '4px' },
    itemStyle: { color: 'var(--text-primary)', fontSize: '12px' },
    cursor: { fill: 'rgba(255,255,255,0.06)' },
};

// ============================================================================
// INTERACTIVE HOOKS & UTILITIES
// ============================================================================

function useAnimatedNumber(target: number, duration = 800) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        const start = performance.now();
        const from = value;
        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(from + (target - from) * eased));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [target, duration]);
    return value;
}

function useHover() {
    const [isHovered, setIsHovered] = useState(false);
    return {
        isHovered,
        bind: {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
        },
    };
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

interface CardProps {
    children: React.ReactNode;
    className?: string;
    interactive?: boolean;
    onClick?: () => void;
    id?: string;
}

function Card({ children, className = '', interactive = false, onClick, id }: CardProps) {
    const { isHovered, bind } = useHover();
    return (
        <div
            {...(interactive ? bind : {})}
            onClick={onClick}
            id={id}
            className={`
                relative overflow-hidden rounded-2xl border
                ${interactive ? 'cursor-pointer' : ''}
                transition-all duration-300 ease-out
                ${isHovered && interactive ? 'translate-y-[-2px]' : ''}
                ${className}
            `}
            style={{
                background: `linear-gradient(180deg, ${THEME.bg.elevated} 0%, ${THEME.bg.tertiary} 100%)`,
                borderColor: isHovered && interactive ? THEME.border.strong : THEME.border.default,
                boxShadow: isHovered && interactive
                    ? '0 12px 32px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.2)'
                    : '0 4px 16px rgba(0,0,0,0.2)',
            }}
        >
            {children}
        </div>
    );
}

function MetricCard({
    label,
    value,
    trend,
    trendUp,
    icon: Icon,
    color = 'emerald',
    delay = 0,
}: {
    label: string;
    value: string | number;
    trend?: string;
    trendUp?: boolean;
    icon: React.ElementType;
    color?: 'emerald' | 'violet' | 'amber' | 'blue' | 'rose';
    delay?: number;
}) {
    const colorMap = {
        emerald: { bg: 'rgba(16,185,129,0.1)', text: '#10B981', glow: 'rgba(16,185,129,0.06)' },
        violet: { bg: 'rgba(139,92,246,0.1)', text: '#8B5CF6', glow: 'rgba(139,92,246,0.06)' },
        amber: { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', glow: 'rgba(245,158,11,0.06)' },
        blue: { bg: 'rgba(59,130,246,0.1)', text: '#3B82F6', glow: 'rgba(59,130,246,0.06)' },
        rose: { bg: 'rgba(244,63,94,0.1)', text: '#F43F5E', glow: 'rgba(244,63,94,0.06)' },
    };
    const c = colorMap[color];
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setEntered(true), 100 + delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            className="transition-all duration-500 ease-out"
            style={{
                opacity: entered ? 1 : 0,
                transform: entered ? 'translateY(0)' : 'translateY(12px)',
            }}
        >
            <Card interactive className="p-5 group/metric">
                <div className="flex items-start justify-between">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover/metric:scale-110"
                        style={{ background: c.bg }}
                    >
                        <Icon className="h-5 w-5" style={{ color: c.text }} />
                    </div>
                    {trend && (
                        <div
                            className="flex items-center gap-1 text-xs font-medium"
                            style={{ color: trendUp ? THEME.accent.primary : THEME.accent.warning }}
                        >
                            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                            {trend}
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <div className="text-2xl font-semibold tracking-tight transition-colors duration-200" style={{ color: THEME.text.primary }}>
                        {value}
                    </div>
                    <div className="mt-1 text-sm" style={{ color: THEME.text.secondary }}>
                        {label}
                    </div>
                </div>
            </Card>
        </div>
    );
}

function SectionHeader({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="mb-5 flex items-end justify-between">
            <div>
                <h2 className="text-lg font-semibold tracking-tight" style={{ color: THEME.text.primary }}>
                    {title}
                </h2>
                {subtitle && (
                    <p className="mt-1 text-sm" style={{ color: THEME.text.secondary }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}

function ProgressBar({
    value,
    max = 100,
    color = THEME.accent.primary,
    size = 'md',
    showLabel = true,
}: {
    value: number;
    max?: number;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}) {
    const percentage = Math.min((value / max) * 100, 100);
    const height = size === 'sm' ? 6 : size === 'md' ? 8 : 12;

    return (
        <div className="w-full">
            <div
                className="w-full overflow-hidden rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', height }}
            >
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, ${color}80 0%, ${color} 100%)`,
                    }}
                />
            </div>
            {showLabel && (
                <div className="mt-2 flex justify-between text-xs" style={{ color: THEME.text.secondary }}>
                    <span>{Math.round(percentage)}% complete</span>
                    <span>
                        {value}/{max}
                    </span>
                </div>
            )}
        </div>
    );
}

function StatusBadge({
    status,
    label,
}: {
    status: 'active' | 'pending' | 'idle' | 'warning';
    label?: string;
}) {
    const config = {
        active: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', dot: '#10B981' },
        pending: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', dot: '#F59E0B' },
        idle: { bg: 'rgba(100,116,139,0.15)', color: '#94A3B8', dot: '#64748B' },
        warning: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', dot: '#EF4444' },
    };
    const c = config[status];

    return (
        <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: c.bg, color: c.color }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
            {label || status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
    );
}

// ============================================================================
// CHART COMPONENTS
// ============================================================================

function MiniBarChart({ data, color }: { data: { name: string; value: number }[]; color: string }) {
    return (
        <div className="h-24 w-full min-h-[96px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={96} minWidth={0}>
                <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={32}>
                        {data.map((_, i) => (
                            <Cell key={i} fill={color} fillOpacity={0.3 + (i / data.length) * 0.7} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function CircularProgress({
    value,
    max = 100,
    size = 120,
    strokeWidth = 8,
    color = THEME.accent.primary,
    label,
}: {
    value: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    label?: string;
}) {
    const percentage = Math.min((value / max) * 100, 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold" style={{ color: THEME.text.primary }}>
                    {Math.round(percentage)}%
                </span>
                {label && <span className="text-xs" style={{ color: THEME.text.secondary }}>{label}</span>}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

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
        staffAttentionPending,
        setDexoBootstrap,
    } = useOffice();

    const { can } = useSubscription();
    const hasDailyBriefPlan = can('dexoDailyBriefReports');

    const [dashboardExpanded, setDashboardExpanded] = useState(false);
    const [portfolioDashExpanded, setPortfolioDashExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'activity' | 'dexo_daily'>('overview');

    const dashboardTabs = [
        { id: 'overview' as const, label: 'Overview' },
        { id: 'dexo_daily' as const, label: 'Daily brief' },
        { id: 'analytics' as const, label: 'Analytics' },
        { id: 'activity' as const, label: 'Activity' },
    ];
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
        if (activeRoom !== 'dashboard' || !activeProject?.id || !hasDailyBriefPlan) return;
        const key = `deepchox-dexo-pulse:${activeProject.id}:${new Date().toISOString().slice(0, 10)}`;
        try {
            if (typeof window !== 'undefined' && localStorage.getItem(key)) return;
        } catch {
            // ignore storage errors; pulse call below still works
        }
        const context = buildDexoJarvisVentureContext(activeProject);
        void fetch('/api/dexo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'dailyPulse',
                payload: {
                    ventureId: activeProject.id,
                    context,
                    sparseContext: isVentureFoundationSparse(activeProject),
                    force: false,
                },
            }),
        })
            .then((r) => r.json())
            .then((data: { ok?: boolean }) => {
                if (!data.ok) return;
                try {
                    if (typeof window !== 'undefined') localStorage.setItem(key, '1');
                } catch {
                    // ignore storage errors
                }
            })
            .catch(() => {
                // non-blocking dashboard warmup
            });
    }, [activeRoom, activeProject, hasDailyBriefPlan]);

    // Parse strategy data
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

    // Animated execution score
    const executionScore = useMemo(() => {
        const intentW = hasIntent ? 1 : 0;
        const narW = narrativeRich ? 1 : 0;
        const phaseW = phaseTotal ? phaseDone / phaseTotal : 0;
        const priW = priTotal ? priDone / priTotal : 0;
        const raw = (intentW + narW + phaseW + priW) / 4;
        return Math.round(raw * 100);
    }, [hasIntent, narrativeRich, phaseDone, phaseTotal, priDone, priTotal]);
    const animatedScore = useAnimatedNumber(executionScore);

    // Business impact
    const businessImpact = useMemo(() => {
        const strategic = computeStrategicCoverageScore(activeProject?.strategy, activeProject ?? undefined);
        const executionPillar = computeExecutionDeliveryScore(activeProject?.strategy);
        const financial = computeFinancialHealthScore(activeProject?.budget);
        return aggregateImpact([fromVenturePillarScores({ strategic, financial, execution: executionPillar })]);
    }, [activeProject?.strategy, activeProject?.budget]);

    const foundationSparse = useMemo(
        () => isVentureFoundationSparse(activeProject ?? undefined),
        [activeProject]
    );

    const chartUid = useId().replace(/:/g, '');

    // Data preparations
    const phasePieData = useMemo(() => {
        const planned = phases.filter((p) => p.status === 'planned').length;
        const progress = phases.filter((p) => p.status === 'in_progress').length;
        const done = phases.filter((p) => p.status === 'done').length;
        return [
            { name: 'Done', value: done, fill: THEME.chart.emerald },
            { name: 'In Progress', value: progress, fill: THEME.chart.amber },
            { name: 'Planned', value: planned, fill: THEME.chart.slate },
        ].filter((d) => d.value > 0);
    }, [phases]);

    const priorityPieData = useMemo(() => {
        if (!priTotal) return [];
        const open = Math.max(0, priTotal - priDone);
        return [
            { name: 'Complete', value: priDone, fill: THEME.chart.emerald },
            { name: 'Open', value: open, fill: THEME.chart.rose },
        ].filter((d) => d.value > 0);
    }, [priTotal, priDone]);

    const deskCoverage = useMemo(() => {
        const p = activeProject;
        const snap = p?.agentStaffSnapshot?.desks;
        const pct = (s?: string) => ((s?.trim().length || 0) >= MIN_VENTURE_FIELD_CHARS ? 100 : 0);
        const clip = (t?: string) => {
            const x = t?.trim();
            if (!x) return null;
            return x.length > 96 ? `${x.slice(0, 93)}…` : x;
        };
        const growthPct =
            (snap?.cmo?.trim().length || 0) >= MIN_VENTURE_FIELD_CHARS ||
            (p?.teamDirectives?.trim().length || 0) >= MIN_VENTURE_FIELD_CHARS ||
            (p?.userNotes?.trim().length || 0) >= MIN_VENTURE_FIELD_CHARS * 2
                ? 100
                : 0;
        const strategyCoverage = Math.round(computeStrategicCoverageScore(p?.strategy, p ?? undefined));
        return [
            {
                label: 'Strategy',
                pct: strategyCoverage,
                fill: THEME.chart.violet,
                icon: Lightbulb,
                hint: clip(snap?.ceo) || 'Mission, phases, priorities',
            },
            {
                label: 'Market',
                pct: pct(p?.marketInsights),
                fill: THEME.chart.blue,
                icon: Globe,
                hint: clip(snap?.scout) || 'Competitors, signals, landscape',
            },
            {
                label: 'Finance',
                pct: pct(p?.budget),
                fill: THEME.chart.emerald,
                icon: Wallet,
                hint: clip(snap?.accountant) || 'Runway, burn, capital',
            },
            {
                label: 'Product',
                pct: pct(p?.productPlan),
                fill: THEME.chart.amber,
                icon: Layers,
                hint: clip(snap?.pm) || 'Roadmap, shipping cadence',
            },
            {
                label: 'Growth',
                pct: growthPct,
                fill: THEME.chart.rose,
                icon: Megaphone,
                hint: clip(snap?.cmo) || 'GTM, positioning, pitch',
            },
        ];
    }, [activeProject]);

    const staffFocusLines = activeProject?.staffFocusToday?.filter((s) => s?.trim()) ?? [];

    const kanbanTasks = useMemo(() => {
        const raw = activeProject?.kanban;
        if (!Array.isArray(raw)) return [] as { id: string; title: string; status: string }[];
        return raw.filter((t: { id?: unknown; title?: unknown }) => t && typeof t.id === 'string' && typeof t.title === 'string') as {
            id: string;
            title: string;
            status: string;
        }[];
    }, [activeProject?.kanban]);

    const kanbanCounts = useMemo(() => {
        const c = { todo: 0, in_progress: 0, next: 0, completed: 0 };
        for (const t of kanbanTasks) {
            const s = t.status as keyof typeof c;
            if (s in c) c[s] += 1;
        }
        return c;
    }, [kanbanTasks]);

    const upcomingEvents = useMemo(() => {
        const now = Date.now();
        return [...(activeProject?.events || [])]
            .filter((e) => e.date >= now - 24 * 60 * 60 * 1000)
            .sort((a, b) => a.date - b.date)
            .slice(0, 8);
    }, [activeProject?.events]);

    const strategicExcerpt = useMemo(() => {
        const intent = strategyDoc.strategicIntent?.trim();
        const vision = strategyDoc.vision?.trim();
        const content = (strategyDoc.content || '').trim();
        const pick = intent || vision || content.slice(0, 400);
        if (!pick) return null;
        return pick.length > 400 ? `${pick.slice(0, 397)}…` : pick;
    }, [strategyDoc]);

    const currentPhaseInfo = useMemo(() => {
        if (foundationSparse) return null;
        const ph = strategyDoc.phases || [];
        const inProg = ph.find((p) => p.status === 'in_progress');
        const planned = ph.find((p) => p.status === 'planned');
        if (inProg) return { title: inProg.title, sub: 'In progress', end: inProg.end };
        if (planned) return { title: planned.title, sub: 'Planned', end: planned.end };
        if (ph[0]) return { title: ph[0].title, sub: (ph[0].status ?? 'planned').replace(/_/g, ' '), end: ph[0].end };
        return null;
    }, [foundationSparse, strategyDoc.phases]);

    const staffSyncAt = activeProject?.agentStaffSnapshot?.at;
    const lastStaffSyncLabel = staffSyncAt
        ? new Date(staffSyncAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
        : null;
    const syncAgeMinutes = staffSyncAt
        ? Math.max(0, Math.floor((Date.now() - staffSyncAt) / 60000))
        : Math.max(0, Math.floor((Date.now() - systemState.lastSync) / 60000));

    const aiSummaryExcerpt = useMemo(() => {
        const s = activeProject?.agentStaffSnapshot?.summary?.trim();
        if (!s) return null;
        return s.length > 520 ? `${s.slice(0, 517)}…` : s;
    }, [activeProject?.agentStaffSnapshot?.summary]);

    // Portfolio view (no active project)
    if (!activeProject) {
        return <PortfolioView
            allProjects={allProjects}
            systemState={systemState}
            onNewVenture={onNewVenture}
            setActiveProject={setActiveProject}
            portfolioDashExpanded={portfolioDashExpanded}
            setPortfolioDashExpanded={setPortfolioDashExpanded}
            chartUid={chartUid}
            switchRoom={switchRoom}
        />;
    }

    return (
        <div
            className="min-h-screen w-full pb-24"
            style={{ background: THEME.bg.primary }}
        >
            {/* HEADER */}
            <header className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ background: 'rgba(30,30,30,0.88)', borderColor: THEME.border.subtle }}>
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                            style={{ background: 'rgba(116,86,255,0.10)' }}
                        >
                            <LayoutDashboard className="h-5 w-5" style={{ color: THEME.accent.secondary }} />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight" style={{ color: THEME.text.primary }}>
                                {activeProject.name}
                            </h1>
                            <div className="flex items-center gap-3 text-xs" style={{ color: THEME.text.tertiary }}>
                                <span className="flex items-center gap-1.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: THEME.accent.primary }} />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: THEME.accent.primary }} />
                                    </span>
                                    Executive overview
                                </span>
                                <span>·</span>
                                <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => runAgentStaffSync()}
                            disabled={agentSyncRunning}
                            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                            style={{
                                background: agentSyncRunning ? 'rgba(46,41,34,0.06)' : 'rgba(116,86,255,0.10)',
                                color: THEME.text.primary,
                                opacity: agentSyncRunning ? 0.6 : 1,
                            }}
                        >
                            <RefreshCw className={`h-4 w-4 ${agentSyncRunning ? 'animate-spin' : ''}`} />
                            {agentSyncRunning ? 'Syncing...' : 'Sync Staff'}
                        </button>
                        <WorkspaceAiButton />
                    </div>
                </div>

                {/* TAB NAVIGATION */}
                <div className="mx-auto max-w-7xl px-6">
                    <div className="flex gap-1">
                        {dashboardTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="relative px-4 py-3 text-sm font-medium transition-colors"
                                style={{ color: activeTab === tab.id ? THEME.text.primary : THEME.text.muted }}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-0.5"
                                        style={{ background: THEME.accent.primary }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="mx-auto max-w-7xl px-6 py-8">
                {/* CONTEXTUAL HINTS */}
                <div className="mb-8 space-y-3">
                    <GuideHint
                        id="dash-no-strategy"
                        when={!hasIntent && !narrativeRich}
                        variant="tip"
                        message="Your venture needs a strategic foundation. Open the CEO desk to define your vision and goals."
                        action="Open CEO Desk"
                        onAction={() => switchRoom('ceo')}
                    />
                    <GuideHint
                        id="dash-no-sync"
                        when={!activeProject?.agentStaffSnapshot && hasIntent}
                        variant="info"
                        message="Run Staff Sync to activate your AI team and populate all desks with insights."
                        action="Sync Now"
                        onAction={() => runAgentStaffSync()}
                    />
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* KEY METRICS */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <MetricCard
                                label={foundationSparse ? 'Venture setup' : 'Execution score (strategy + delivery)'}
                                value={foundationSparse ? 'Needed' : `${animatedScore}%`}
                                icon={Target}
                                color="emerald"
                                delay={0}
                            />
                            <MetricCard
                                label={foundationSparse ? 'Phase progress' : 'Phases complete'}
                                value={foundationSparse ? 'Pending' : `${phaseDone}/${phaseTotal || 0}`}
                                icon={Layers}
                                color="violet"
                                delay={80}
                            />
                            <MetricCard
                                label={foundationSparse ? 'Founder priorities' : 'Executive priorities done'}
                                value={foundationSparse ? 'Pending' : `${priDone}/${priTotal || 0}`}
                                icon={CheckCircle2}
                                color="amber"
                                delay={160}
                            />
                            <MetricCard
                                label={staffSyncAt ? 'Time since AI staff research sync' : 'Time since last office refresh'}
                                value={syncAgeMinutes < 180 ? `${syncAgeMinutes}m` : `${Math.floor(syncAgeMinutes / 60)}h ${syncAgeMinutes % 60}m`}
                                icon={Clock}
                                color="blue"
                                delay={240}
                            />
                        </div>

                        {/* Venture intelligence — derived from your records + living office engine */}
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="p-6 lg:col-span-2">
                                <SectionHeader
                                    title="Strategy depth & venture snapshot"
                                    subtitle={
                                        foundationSparse
                                            ? 'Waiting for your actual venture thesis and setup details — default templates are not treated as real company context.'
                                            : 'Grounded in your saved strategy, calendar, and last staff sync — not generic filler.'
                                    }
                                />
                                {/*
                                  Two-column layout: wide “snapshot” (Direction + Staff) + fixed-proportion sidebar (Focus / attention).
                                  A single lg:grid-cols-3 row lets long “Needs attention” copy set a huge min-content width and squeeze
                                  the first columns to nothing — looks like an empty void on the left.
                                */}
                                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)] lg:items-start">
                                    <div className="min-w-0 space-y-6">
                                        <div className="grid min-w-0 gap-6 sm:grid-cols-2 sm:items-start">
                                            <div className="min-w-0 space-y-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>
                                                    Direction
                                                </p>
                                                {strategicExcerpt ? (
                                                    <p className="break-words text-sm leading-relaxed" style={{ color: THEME.text.secondary }}>
                                                        {strategicExcerpt}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm" style={{ color: THEME.text.muted }}>
                                                        No strategic intent or narrative yet. Add one in the CEO desk so every downstream desk aligns.
                                                    </p>
                                                )}
                                                {currentPhaseInfo ? (
                                                    <div
                                                        className="rounded-xl border px-3 py-2.5"
                                                        style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.03)' }}
                                                    >
                                                        <p className="text-[10px] uppercase tracking-wider" style={{ color: THEME.text.muted }}>
                                                            Phase focus
                                                        </p>
                                                        <p className="mt-1 text-sm font-medium" style={{ color: THEME.text.primary }}>
                                                            {currentPhaseInfo.title}
                                                        </p>
                                                        <p className="mt-0.5 text-xs capitalize" style={{ color: THEME.text.tertiary }}>
                                                            {currentPhaseInfo.sub}
                                                            {currentPhaseInfo.end ? ` · ${currentPhaseInfo.end}` : ''}
                                                        </p>
                                                    </div>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => switchRoom('ceo')}
                                                    className="text-left text-xs font-medium underline-offset-2 transition hover:underline"
                                                    style={{ color: THEME.accent.secondary }}
                                                >
                                                    Open strategy desk →
                                                </button>
                                            </div>
                                            <div className="min-w-0 space-y-3 sm:border-l sm:pl-6" style={{ borderColor: THEME.border.subtle }}>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>
                                                    AI staff research
                                                </p>
                                                {lastStaffSyncLabel ? (
                                                    <p className="break-words text-sm" style={{ color: THEME.text.secondary }}>
                                                        Last sync:{' '}
                                                        <span style={{ color: THEME.text.primary }}>{lastStaffSyncLabel}</span>
                                                    </p>
                                                ) : (
                                                    <p className="text-sm" style={{ color: THEME.text.muted }}>
                                                        No staff sync yet — run Sync Staff to merge Groq research into each desk snapshot.
                                                    </p>
                                                )}
                                                {aiSummaryExcerpt ? (
                                                    <p className="break-words text-sm leading-relaxed" style={{ color: THEME.text.secondary }}>
                                                        {aiSummaryExcerpt}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs" style={{ color: THEME.text.muted }}>
                                                        Summary appears after the first successful multi-desk sync.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            className="rounded-xl border px-4 py-4 sm:px-5 sm:py-5"
                                            style={{
                                                borderColor: THEME.border.default,
                                                background: 'linear-gradient(165deg, rgba(116,86,255,0.14) 0%, rgba(42,42,42,0.95) 45%, rgba(157,136,255,0.12) 100%)',
                                            }}
                                        >
                                            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                                                <div>
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>
                                                        Coverage & rhythm
                                                    </p>
                                                    <p className="mt-1 text-sm font-medium" style={{ color: THEME.text.primary }}>
                                                        What’s on the venture record
                                                    </p>
                                                    <p className="mt-0.5 text-xs" style={{ color: THEME.text.tertiary }}>
                                                        {foundationSparse
                                                            ? 'Bars estimate real founder content — default templates alone don’t count as “complete.” Start in Dexo with your story, then each desk.'
                                                            : 'Tap a desk to add detail, or open Dexo for cross-desk chat and analysis. Bars reflect saved fields and staff snapshots.'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
                                                {deskCoverage.map((desk) => {
                                                    const room = SNAPSHOT_DESK_ROOMS[desk.label];
                                                    return (
                                                        <button
                                                            key={desk.label}
                                                            type="button"
                                                            onClick={() => room && switchRoom(room)}
                                                            className="group rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-2.5 py-2.5 text-left transition hover:bg-[rgba(255,255,255,0.09)]"
                                                            style={{ borderColor: THEME.border.subtle }}
                                                        >
                                                            <div className="flex items-center gap-1.5">
                                                                <div
                                                                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                                                                    style={{ background: `${desk.fill}18` }}
                                                                >
                                                                    <desk.icon className="h-3.5 w-3.5" style={{ color: desk.fill }} aria-hidden />
                                                                </div>
                                                                <span className="text-[11px] font-semibold" style={{ color: THEME.text.primary }}>
                                                                    {desk.label}
                                                                </span>
                                                            </div>
                                                            <div
                                                                className="mt-2 h-1 overflow-hidden rounded-full"
                                                                style={{ background: 'rgba(46,41,34,0.08)' }}
                                                            >
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-500"
                                                                    style={{
                                                                        width: `${desk.pct}%`,
                                                                        background: `linear-gradient(90deg, ${desk.fill}, ${desk.fill}CC)`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug" style={{ color: THEME.text.muted }}>
                                                                {desk.pct === 100 ? 'Documented' : 'Needs detail'} · {desk.hint}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                                <button
                                                    type="button"
                                                    onClick={() => switchRoom('dexo')}
                                                    className="group rounded-xl border bg-[rgba(116,86,255,0.12)] px-2.5 py-2.5 text-left ring-1 ring-violet-500/25 transition hover:bg-[rgba(116,86,255,0.18)]"
                                                    style={{ borderColor: THEME.border.subtle }}
                                                    aria-label="Open Dexo command center"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <div
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                                                            style={{ background: `${THEME.accent.info}28` }}
                                                        >
                                                            <Sparkles className="h-3.5 w-3.5" style={{ color: THEME.accent.info }} aria-hidden />
                                                        </div>
                                                        <span className="text-[11px] font-semibold" style={{ color: THEME.text.primary }}>
                                                            Dexo
                                                        </span>
                                                    </div>
                                                    <div
                                                        className="mt-2 h-1 overflow-hidden rounded-full"
                                                        style={{ background: 'rgba(46,41,34,0.08)' }}
                                                    >
                                                        <div
                                                            className="h-full w-full rounded-full transition-all duration-500"
                                                            style={{
                                                                background: `linear-gradient(90deg, ${THEME.accent.info}, ${THEME.accent.tertiary})`,
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug" style={{ color: THEME.text.muted }}>
                                                        Command center · full venture context, voice and chat
                                                    </p>
                                                </button>
                                            </div>

                                            <div className="mt-5 grid gap-5 border-t pt-5" style={{ borderColor: THEME.border.subtle }}>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>
                                                        Coming up
                                                    </p>
                                                    {upcomingEvents.length > 0 ? (
                                                        <ul className="mt-2 space-y-2.5">
                                                            {upcomingEvents.slice(0, 4).map((ev, idx) => (
                                                                <li key={`${ev.date}-${idx}-${ev.title}`} className="flex gap-2.5">
                                                                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/85" aria-hidden />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-medium leading-snug" style={{ color: THEME.text.primary }}>
                                                                            {ev.title}
                                                                        </p>
                                                                        <p className="text-[11px]" style={{ color: THEME.text.muted }}>
                                                                            {new Date(ev.date).toLocaleString(undefined, {
                                                                                weekday: 'short',
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: 'numeric',
                                                                                minute: '2-digit',
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="mt-2 text-xs leading-relaxed" style={{ color: THEME.text.muted }}>
                                                            No upcoming events on the calendar. Add milestones or meetings from the office calendar so they surface here.
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>
                                                        Executive priorities
                                                    </p>
                                                    {priorities.length > 0 ? (
                                                        <ul className="mt-2 space-y-2">
                                                            {priorities.slice(0, 5).map((pr) => (
                                                                <li key={pr.id} className="flex gap-2 text-xs leading-snug">
                                                                    {pr.done ? (
                                                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/90" aria-hidden />
                                                                    ) : (
                                                                        <span
                                                                            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border"
                                                                            style={{ borderColor: THEME.border.strong }}
                                                                            aria-hidden
                                                                        />
                                                                    )}
                                                                    <span
                                                                        className={`min-w-0 break-words ${pr.done ? 'line-through' : ''}`}
                                                                        style={{ color: pr.done ? undefined : THEME.text.secondary }}
                                                                    >
                                                                        {pr.title}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="mt-2 text-xs leading-relaxed" style={{ color: THEME.text.muted }}>
                                                            No priorities in your strategy doc yet. Open the CEO desk and add a short list so execution stays visible here.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: THEME.border.subtle }}>
                                                <span
                                                    className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.07)',
                                                        color: THEME.text.secondary,
                                                    }}
                                                >
                                                    {phaseTotal ? (
                                                        <>
                                                            Phases: {phaseDone}/{phaseTotal} done
                                                            {phaseActive ? ` · ${phaseActive} active` : ''}
                                                        </>
                                                    ) : (
                                                        'Phases: add a timeline in strategy'
                                                    )}
                                                </span>
                                                <span
                                                    className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.07)',
                                                        color: THEME.text.secondary,
                                                    }}
                                                >
                                                    {priTotal ? (
                                                        <>
                                                            Priorities: {priDone}/{priTotal} checked off
                                                        </>
                                                    ) : (
                                                        'Priorities: none saved'
                                                    )}
                                                </span>
                                                <span
                                                    className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.07)',
                                                        color: THEME.text.secondary,
                                                    }}
                                                >
                                                    Board: {kanbanCounts.todo + kanbanCounts.in_progress + kanbanCounts.next + kanbanCounts.completed}{' '}
                                                    cards · {kanbanCounts.in_progress} in progress
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="min-w-0 space-y-3 lg:border-l lg:pl-8" style={{ borderColor: THEME.border.subtle }}>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>
                                            Focus today
                                        </p>
                                        {staffFocusLines.length > 0 ? (
                                            <ul className="space-y-2">
                                                {staffFocusLines.slice(0, 6).map((line, i) => (
                                                    <li
                                                        key={`${i}-${line.slice(0, 24)}`}
                                                        className="flex gap-2 text-sm leading-snug"
                                                        style={{ color: THEME.text.secondary }}
                                                    >
                                                        <span className="shrink-0" style={{ color: THEME.accent.primary }}>
                                                            •
                                                        </span>
                                                        <span className="min-w-0 break-words">{line}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm" style={{ color: THEME.text.muted }}>
                                                No staff “focus today” list yet. It appears after a Staff Sync when the model proposes priorities.
                                            </p>
                                        )}
                                        {staffAttentionPending.length > 0 ? (
                                            <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'rgba(116,86,255,0.18)', background: 'rgba(116,86,255,0.08)' }}>
                                                <p className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: THEME.accent.primary }}>
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                    Needs attention ({staffAttentionPending.length})
                                                </p>
                                                <ul className="mt-2 space-y-2">
                                                    {staffAttentionPending.slice(0, 4).map((a) => (
                                                        <li
                                                            key={a.id}
                                                            className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-2.5 py-2 sm:flex-row sm:items-start sm:justify-between"
                                                            style={{ borderColor: 'rgba(116,86,255,0.12)' }}
                                                        >
                                                            <p className="min-w-0 max-w-full flex-1 break-words text-[12px] leading-snug" style={{ color: THEME.text.secondary }}>
                                                                <span className="font-medium" style={{ color: THEME.text.primary }}>{a.title}</span>
                                                                <span style={{ color: THEME.text.tertiary }}> — {a.message}</span>
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setDexoBootstrap(buildDexoStaffAttentionBootstrap(a));
                                                                    switchRoom('dexo');
                                                                }}
                                                                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition"
                                                                style={{ borderColor: 'rgba(116,86,255,0.22)', background: 'rgba(116,86,255,0.12)', color: THEME.accent.primary }}
                                                            >
                                                                <Sparkles className="h-3 w-3" aria-hidden />
                                                                Set up in Dexo
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <FocusBriefingPanel
                                    ventureName={activeProject.name}
                                    livingOffice={livingOffice}
                                    staffFocusLines={staffFocusLines}
                                    staffAttentionPending={staffAttentionPending}
                                    aiSummaryExcerpt={aiSummaryExcerpt}
                                    strategicExcerpt={strategicExcerpt}
                                    theme={{
                                        text: THEME.text,
                                        border: THEME.border,
                                        accent: THEME.accent,
                                    }}
                                />
                            </Card>
                        </div>

                        {livingOffice && livingOffice.brief.greeting !== 'No venture selected.' && (
                            <Card className="p-6">
                                <SectionHeader
                                    title="Operational intelligence"
                                    subtitle="Living office engine: morning brief, goal model, tasks, and ambient signals from your venture data."
                                />
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="space-y-3 lg:border-r lg:pr-6" style={{ borderColor: THEME.border.subtle }}>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>
                                            Daily brief
                                        </p>
                                        <p className="text-sm leading-relaxed" style={{ color: THEME.text.secondary }}>
                                            {livingOffice.brief.greeting}
                                        </p>
                                        <div
                                            className="rounded-xl border px-3 py-2.5"
                                            style={{ borderColor: THEME.border.default, background: 'rgba(116,86,255,0.08)' }}
                                        >
                                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.accent.primary }}>Suggested focus</p>
                                            <p className="mt-1 text-sm font-medium" style={{ color: THEME.text.primary }}>
                                                {livingOffice.brief.suggestedFocus}
                                            </p>
                                        </div>
                                        {livingOffice.brief.priorities.length > 0 ? (
                                            <div>
                                                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.text.muted }}>
                                                    Priorities in play
                                                </p>
                                                <ul className="space-y-1.5">
                                                    {livingOffice.brief.priorities.map((p, i) => (
                                                        <li key={i} className="flex gap-2 text-sm" style={{ color: THEME.text.secondary }}>
                                                            <ListTodo className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: THEME.text.muted }} aria-hidden />
                                                            <span>{p}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}
                                        {livingOffice.brief.criticalAlerts.length > 0 ? (
                                            <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'rgba(95,67,223,0.22)', background: 'rgba(95,67,223,0.08)' }}>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#5f43df' }}>
                                                    Critical alerts
                                                </p>
                                                <ul className="mt-2 space-y-1.5">
                                                    {livingOffice.brief.criticalAlerts.map((a, i) => (
                                                        <li key={i} className="text-[12px] leading-snug" style={{ color: THEME.text.primary }}>
                                                            {a}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="space-y-4 lg:border-r lg:pr-6" style={{ borderColor: THEME.border.subtle }}>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>
                                            Goal & pace model
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <span
                                                className="rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums"
                                                style={{ background: 'rgba(116,86,255,0.12)', color: THEME.accent.primary }}
                                            >
                                                {livingOffice.progress.percentage}% blended progress
                                            </span>
                                            <span
                                                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                                                style={{ background: 'rgba(255,255,255,0.07)', color: THEME.text.secondary }}
                                            >
                                                Risk: {livingOffice.progress.risk}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-relaxed" style={{ color: THEME.text.secondary }}>
                                            ~{livingOffice.progress.projectedDaysRemaining} days to horizon at current phase pacing. Velocity index:{' '}
                                            {Math.round(livingOffice.progress.paceScore * 100)}% — based on tasks completed in the last 14 days vs open
                                            work.
                                        </p>
                                        <div className="rounded-xl border p-3" style={{ background: 'rgba(255,255,255,0.06)', borderColor: THEME.border.subtle }}>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.text.muted }}>
                                                Weekly review
                                            </p>
                                            <p className="mt-2 text-sm" style={{ color: THEME.text.secondary }}>
                                                Tasks completed:{' '}
                                                <span className="font-medium" style={{ color: THEME.text.primary }}>{livingOffice.weeklyReview.completedTasks}</span> · Churn
                                                risk: {livingOffice.weeklyReview.churnRisk} · Next week: {livingOffice.weeklyReview.nextWeekFocus}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>
                                            Tasks & routing
                                        </p>
                                        {livingOffice.taskFindings.length > 0 ? (
                                            <ul className="space-y-2">
                                                {livingOffice.taskFindings.slice(0, 6).map((f, i) => (
                                                    <li
                                                        key={`${f.taskId}-${i}`}
                                                        className="rounded-lg border px-2.5 py-2 text-[12px] leading-snug"
                                                        style={{
                                                            borderColor:
                                                                f.severity === 'critical'
                                                                    ? 'rgba(239,68,68,0.35)'
                                                                    : f.severity === 'warning'
                                                                      ? 'rgba(245,158,11,0.3)'
                                                                      : THEME.border.subtle,
                                                            color: THEME.text.secondary,
                                                        }}
                                                    >
                                                        <span className="font-medium" style={{ color: THEME.text.primary }}>{f.title}</span>
                                                        <span style={{ color: THEME.text.muted }}> · {f.detail}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm" style={{ color: THEME.text.muted }}>
                                                No task intelligence flags — board is clear or tasks are not yet modeled.
                                            </p>
                                        )}
                                        {livingOffice.notifications.length > 0 ? (
                                            <div>
                                                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.text.muted }}>
                                                    Ambient signals
                                                </p>
                                                <ul className="space-y-1.5">
                                                    {livingOffice.notifications.slice(0, 5).map((n, i) => (
                                                        <li key={i} className="text-[12px] leading-snug" style={{ color: THEME.text.tertiary }}>
                                                            <span style={{ color: THEME.text.muted }}>[{n.desk}]</span> {n.message}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}
                                        {livingOffice.suggestedActions.length > 0 ? (
                                            <div>
                                                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.text.muted }}>
                                                    Routed actions
                                                </p>
                                                <ul className="space-y-2">
                                                    {livingOffice.suggestedActions.slice(0, 4).map((a, i) => (
                                                        <li key={i} className="text-[12px]" style={{ color: THEME.text.secondary }}>
                                                            <span className="font-medium" style={{ color: THEME.text.primary }}>{a.intent}</span> →{' '}
                                                            {a.targetDesks.join(', ')}: {a.summary}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </Card>
                        )}

                        {(upcomingEvents.length > 0 || kanbanTasks.length > 0) && (
                            <div className="grid gap-6 lg:grid-cols-2">
                                {upcomingEvents.length > 0 ? (
                                    <Card className="p-6">
                                        <SectionHeader
                                            title="Upcoming & recent milestones"
                                            subtitle="From your venture calendar (deadlines, launches, meetings)."
                                        />
                                        <ul className="space-y-2">
                                            {upcomingEvents.map((ev) => (
                                                <li
                                                    key={ev.id}
                                                    className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-2.5"
                                                    style={{ borderColor: THEME.border.subtle }}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium" style={{ color: THEME.text.primary }}>
                                                            {ev.title}
                                                        </p>
                                                        <p className="mt-0.5 text-[11px]" style={{ color: THEME.text.tertiary }}>
                                                            {new Date(ev.date).toLocaleString(undefined, {
                                                                dateStyle: 'medium',
                                                                timeStyle: 'short',
                                                            })}{' '}
                                                            · {ev.type}
                                                        </p>
                                                    </div>
                                                    <Calendar className="h-4 w-4 shrink-0" style={{ color: THEME.text.muted }} aria-hidden />
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            type="button"
                                            onClick={() => switchRoom('calendar')}
                                            className="mt-4 text-xs font-medium underline-offset-2 transition hover:underline"
                                            style={{ color: THEME.accent.info }}
                                        >
                                            Open calendar →
                                        </button>
                                    </Card>
                                ) : null}
                                {kanbanTasks.length > 0 ? (
                                    <Card className="p-6">
                                        <SectionHeader
                                            title="Delivery board"
                                            subtitle="Kanban snapshot for this venture."
                                        />
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                            {(
                                                [
                                                    ['To do', kanbanCounts.todo],
                                                    ['In progress', kanbanCounts.in_progress],
                                                    ['Next', kanbanCounts.next],
                                                    ['Done', kanbanCounts.completed],
                                                ] as const
                                            ).map(([label, n]) => (
                                                <div
                                                    key={label}
                                                    className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.06)] px-3 py-3 text-center"
                                                    style={{ borderColor: THEME.border.subtle }}
                                                >
                                                    <p className="text-2xl font-semibold tabular-nums" style={{ color: THEME.text.primary }}>
                                                        {n}
                                                    </p>
                                                    <p className="mt-1 text-[10px]" style={{ color: THEME.text.muted }}>{label}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => switchRoom('pm')}
                                            className="mt-4 text-xs font-medium underline-offset-2 transition hover:underline"
                                            style={{ color: THEME.accent.tertiary }}
                                        >
                                            Open product desk →
                                        </button>
                                    </Card>
                                ) : null}
                            </div>
                        )}

                        {/* MAIN DASHBOARD GRID */}
                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* LEFT COLUMN - PROGRESS & STATUS */}
                            <div className="space-y-6 lg:col-span-2">
                                {/* EXECUTION PROGRESS */}
                                <Card className="p-6">
                                    <SectionHeader
                                        title="Execution Progress"
                                        subtitle="Track your venture's strategic milestones"
                                    />
                                    <div className="space-y-6">
                                        <div>
                                            <div className="mb-2 flex items-center justify-between text-sm">
                                                <span style={{ color: THEME.text.secondary }}>Phase Completion</span>
                                                <span style={{ color: THEME.text.primary }}>
                                                    {phaseDone}/{phaseTotal}
                                                </span>
                                            </div>
                                            <ProgressBar value={phaseDone} max={phaseTotal || 1} color={THEME.chart.violet} />
                                        </div>
                                        <div>
                                            <div className="mb-2 flex items-center justify-between text-sm">
                                                <span style={{ color: THEME.text.secondary }}>Priority Completion</span>
                                                <span style={{ color: THEME.text.primary }}>
                                                    {priDone}/{priTotal}
                                                </span>
                                            </div>
                                            <ProgressBar value={priDone} max={priTotal || 1} color={THEME.chart.emerald} />
                                        </div>
                                    </div>
                                </Card>

                                {/* QUICK ACTIONS - Interactive Grid */}
                                <InteractiveCard className="p-6" glowColor="rgba(139,92,246,0.3)">
                                    <SectionHeader
                                        title="Quick Actions"
                                        subtitle="Navigate to key workspaces"
                                    />
                                    <QuickActionGrid
                                        columns={3}
                                        actions={[
                                            {
                                                id: 'ceo',
                                                label: 'CEO Desk',
                                                description: 'Strategy & vision',
                                                icon: <Lightbulb className="h-4 w-4" />,
                                                color: THEME.chart.violet,
                                                onClick: () => switchRoom('ceo'),
                                            },
                                            {
                                                id: 'scout',
                                                label: 'Scout Desk',
                                                description: 'Market intelligence',
                                                icon: <Globe className="h-4 w-4" />,
                                                color: THEME.chart.blue,
                                                onClick: () => switchRoom('scout'),
                                            },
                                            {
                                                id: 'finance',
                                                label: 'Finance Desk',
                                                description: 'Budget & metrics',
                                                icon: <Wallet className="h-4 w-4" />,
                                                color: THEME.chart.emerald,
                                                onClick: () => switchRoom('accountant'),
                                            },
                                            {
                                                id: 'product',
                                                label: 'Product Desk',
                                                description: 'Roadmap & features',
                                                icon: <Layers className="h-4 w-4" />,
                                                color: THEME.chart.amber,
                                                onClick: () => switchRoom('pm'),
                                            },
                                            {
                                                id: 'pa',
                                                label: 'Assistant',
                                                description: 'Executive support',
                                                icon: <MessageSquare className="h-4 w-4" />,
                                                color: THEME.chart.cyan,
                                                onClick: () => switchRoom('personal_assistant'),
                                            },
                                            {
                                                id: 'dexo',
                                                label: 'Dexo AI',
                                                description: 'AI command center',
                                                icon: <Cpu className="h-4 w-4" />,
                                                color: THEME.accent.secondary,
                                                onClick: () => switchRoom('dexo'),
                                            },
                                        ]}
                                    />
                                </InteractiveCard>
                            </div>

                            {/* RIGHT COLUMN - STATUS & INSIGHTS */}
                            <div className="space-y-6">
                                {/* CIRCULAR SCORE */}
                                <Card className="p-6 text-center">
                                    <h3 className="mb-4 text-sm font-medium" style={{ color: THEME.text.secondary }}>
                                        Overall Health
                                    </h3>
                                    <div className="flex justify-center">
                                        <CircularProgress
                                            value={executionScore}
                                            color={executionScore > 70 ? THEME.accent.primary : executionScore > 40 ? THEME.accent.tertiary : THEME.accent.warning}
                                            label="Score"
                                        />
                                    </div>
                                    <p className="mt-4 text-xs" style={{ color: THEME.text.tertiary }}>
                                        Based on strategy completeness, phases, and priorities
                                    </p>
                                </Card>

                                {/* DESK COVERAGE */}
                                <Card className="p-6">
                                    <h3 className="mb-4 text-sm font-medium" style={{ color: THEME.text.secondary }}>
                                        Desk & Dexo
                                    </h3>
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => switchRoom('dexo')}
                                            className="group/dexo -mx-1.5 flex w-full cursor-pointer items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/[0.07] p-1.5 text-left ring-1 ring-violet-500/15 transition-all duration-200 hover:bg-violet-500/12"
                                        >
                                            <div
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/dexo:scale-110"
                                                style={{ background: `${THEME.accent.info}22` }}
                                            >
                                                <Sparkles className="h-4 w-4" style={{ color: THEME.accent.info }} aria-hidden />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 text-sm">
                                                    <span style={{ color: THEME.text.primary }}>Dexo</span>
                                                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium" style={{ color: THEME.accent.primary }}>
                                                        Open
                                                        <ChevronRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
                                                    </span>
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-[11px] leading-snug" style={{ color: THEME.text.secondary }}>
                                                    AI co-founder — strategy, product, and delivery in one conversation
                                                </p>
                                            </div>
                                        </button>
                                        {deskCoverage.map((desk) => (
                                            <div
                                                key={desk.label}
                                                className="group/desk -mx-1.5 flex cursor-default items-center gap-3 rounded-lg p-1.5 transition-all duration-200 hover:bg-[rgba(255,255,255,0.07)]"
                                            >
                                                <div
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover/desk:scale-110"
                                                    style={{ background: `${desk.fill}15` }}
                                                >
                                                    <desk.icon className="h-4 w-4" style={{ color: desk.fill }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 text-sm">
                                                        <span style={{ color: THEME.text.primary }}>{desk.label}</span>
                                                        <span
                                                            className="flex shrink-0 items-center gap-1.5 text-xs font-medium"
                                                        style={{ color: desk.pct === 100 ? THEME.accent.primary : THEME.text.secondary }}
                                                        >
                                                            {desk.pct === 100 && (
                                                                <span className="relative flex h-1.5 w-1.5">
                                                                    <span className="absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: THEME.accent.primary, animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }} />
                                                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: THEME.accent.primary }} />
                                                                </span>
                                                            )}
                                                            {desk.pct === 100 ? 'Documented' : 'Needs detail'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug" style={{ color: THEME.text.secondary }}>
                                                        {desk.hint}
                                                    </p>
                                                    <div
                                                        className="mt-1.5 h-1 overflow-hidden rounded-full"
                                                        style={{ background: 'rgba(46,41,34,0.08)' }}
                                                    >
                                                        <div
                                                            className="h-full rounded-full transition-all duration-700 ease-out"
                                                            style={{
                                                                width: `${desk.pct}%`,
                                                                background: `linear-gradient(90deg, ${desk.fill}, ${desk.fill}CC)`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* RECENT ACTIVITY */}
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-medium" style={{ color: THEME.text.secondary }}>
                                            Recent Activity
                                        </h3>
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ background: THEME.accent.primary }} />
                                            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: THEME.accent.primary }} />
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {systemLogs.slice(0, 5).map((log, i) => (
                                            <div
                                                key={log.id}
                                                className="group/activity flex cursor-default items-start gap-3 rounded-lg p-2 transition-all duration-200 hover:bg-[rgba(255,255,255,0.07)]"
                                                style={{
                                                    animationDelay: `${i * 60}ms`,
                                                }}
                                            >
                                                <div
                                                    className="mt-0.5 h-2 w-2 rounded-full shrink-0 transition-transform duration-200 group-hover/activity:scale-125"
                                                    style={{
                                                        background:
                                                            i === 0
                                                                ? THEME.accent.primary
                                                                : i === 1
                                                                    ? THEME.accent.secondary
                                                                    : THEME.text.muted,
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate text-xs transition-colors duration-200 group-hover/activity:text-[var(--text-primary)]" style={{ color: THEME.text.secondary }}>
                                                        {log.message}
                                                    </p>
                                                    <p className="mt-0.5 text-[10px]" style={{ color: THEME.text.tertiary }}>
                                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <ArrowRight className="h-3 w-3 shrink-0 mt-0.5 opacity-0 transition-all duration-200 group-hover/activity:opacity-50 group-hover/activity:translate-x-0.5" style={{ color: THEME.text.tertiary }} />
                                            </div>
                                        ))}
                                        {systemLogs.length === 0 && (
                                            <div className="py-6 text-center">
                                                <p className="text-xs" style={{ color: THEME.text.tertiary }}>
                                                    No recent activity
                                                </p>
                                                <p className="mt-1 text-[10px]" style={{ color: THEME.text.muted }}>
                                                    Run Staff Sync to generate insights
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === 'analytics' && (
                    <AnalyticsTab
                        phasePieData={phasePieData}
                        priorityPieData={priorityPieData}
                        executionScore={executionScore}
                        businessImpact={businessImpact}
                        chartUid={chartUid}
                        activeProject={activeProject}
                        agents={agents}
                        activeRoom={activeRoom}
                        switchRoom={switchRoom}
                    />
                )}

                {/* ACTIVITY TAB */}
                {activeTab === 'activity' && (
                    <ActivityTab
                        systemLogs={systemLogs}
                        chartUid={chartUid}
                    />
                )}

                {activeTab === 'dexo_daily' && (
                    <PlanGate feature="dexoDailyBriefReports">
                        <div className="space-y-6">
                            <DexoOpsPanel activeProject={activeProject} />
                            <DexoDailyBriefPanel activeProject={activeProject} autoRunPulse />
                        </div>
                    </PlanGate>
                )}
            </main>

        </div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const PORTFOLIO_DESK_ACCENTS: Record<'ceo' | 'accountant' | 'pm' | 'cmo' | 'scout', string> = {
    ceo: THEME.chart.violet,
    accountant: THEME.chart.emerald,
    pm: THEME.chart.amber,
    cmo: THEME.chart.rose,
    scout: THEME.chart.blue,
};

function PortfolioView({
    allProjects,
    systemState,
    onNewVenture,
    setActiveProject,
    portfolioDashExpanded,
    setPortfolioDashExpanded,
    chartUid,
    switchRoom,
}: any) {
    const { can } = useSubscription();
    const ventureCount = allProjects.length;
    const withStrategy = allProjects.filter((p: any) => p.strategy?.trim()).length;
    const draft = Math.max(0, allProjects.length - withStrategy);

    const deskStats = useMemo(() => aggregatePortfolioDeskStats(allProjects), [allProjects]);

    const portfolioComposition = [
        { name: 'Active', value: withStrategy, fill: THEME.chart.emerald },
        { name: 'Draft', value: draft, fill: THEME.chart.slate },
    ].filter((d) => d.value > 0);

    return (
        <div className="min-h-screen w-full pb-24" style={{ background: THEME.bg.primary }}>
            <header className="border-b px-6 py-8" style={{ borderColor: THEME.border.subtle }}>
                <div className="mx-auto max-w-7xl">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{ background: 'rgba(139,92,246,0.1)' }}
                        >
                            <LayoutDashboard className="h-6 w-6" style={{ color: THEME.accent.secondary }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: THEME.text.primary }}>
                                Executive Overview
                            </h1>
                            <p className="mt-1 text-sm" style={{ color: THEME.text.secondary }}>
                                Portfolio dashboard · {ventureCount} ventures
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                {/* WELCOME CARD */}
                <Card className="mb-8 p-8">
                    <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-xl font-semibold" style={{ color: THEME.text.primary }}>
                                Welcome to your portfolio
                            </h2>
                            <p className="mt-2 max-w-xl" style={{ color: THEME.text.secondary }}>
                                Manage all your ventures from one place. Select a venture to view detailed analytics,
                                or create a new one to get started.
                            </p>
                        </div>
                        {onNewVenture && (
                            <button
                                onClick={onNewVenture}
                                className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all hover:opacity-90"
                                style={{ background: THEME.accent.primary, color: '#000' }}
                            >
                                <Sparkles className="h-4 w-4" />
                                New Venture
                            </button>
                        )}
                    </div>
                </Card>

                {/* PORTFOLIO METRICS */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard label="Total Ventures" value={ventureCount} icon={Briefcase} color="violet" />
                    <MetricCard label="Active Records" value={withStrategy} icon={CheckCircle2} color="emerald" />
                    <MetricCard label="Drafts" value={draft} icon={FileText} color="amber" />
                    <MetricCard
                        label="Last Sync"
                        value={`${Math.max(0, Math.floor((Date.now() - systemState.lastSync) / 60000))}m`}
                        icon={Clock}
                        color="blue"
                    />
                </div>

                {/* PORTFOLIO COMPOSITION */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="p-6">
                        <SectionHeader title="Portfolio Composition" />
                        {portfolioComposition.length > 0 ? (
                            <div className="h-64 min-h-[256px] min-w-0">
                                <ResponsiveContainer width="100%" height="100%" minHeight={256} minWidth={0}>
                                    <RePieChart>
                                        <Pie
                                            data={portfolioComposition}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {portfolioComposition.map((entry: any, i: number) => (
                                                <Cell key={`cell-${i}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip {...CHART_TOOLTIP} />
                                        <Legend />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="py-12 text-center text-sm" style={{ color: THEME.text.tertiary }}>
                                No ventures yet
                            </p>
                        )}
                    </Card>

                    <Card className="p-6">
                        <SectionHeader
                            title="Research Desks"
                            subtitle="Coverage across ventures updates as you add detail or run Staff Sync."
                        />
                        <div className="space-y-3">
                            {(['ceo', 'accountant', 'pm', 'cmo', 'scout'] as const).map((role) => {
                                const row = RESEARCH_STAFF[role];
                                const stat = deskStats[role];
                                const accent = PORTFOLIO_DESK_ACCENTS[role];
                                const pct = stat.total === 0 ? 0 : Math.round(stat.coverage * 100);
                                const subtitle =
                                    stat.total === 0
                                        ? row.navHint
                                        : `${stat.documented}/${stat.total} ventures documented${
                                              stat.snapshotSnippet
                                                  ? ` · ${stat.snapshotSnippet}`
                                                  : ` · ${row.navHint}`
                                          }`;
                                return (
                                    <button
                                        type="button"
                                        key={role}
                                        onClick={() => {
                                            const target = firstProjectNeedingRole(allProjects, role);
                                            if (target) {
                                                setActiveProject(target);
                                                switchRoom(role);
                                            }
                                        }}
                                        className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.06)] p-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.09)]"
                                        style={{ borderColor: THEME.border.subtle }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium" style={{ color: THEME.text.primary }}>
                                                    {row.navTitle}
                                                </p>
                                                <span
                                                    className="rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums"
                                                    style={{
                                                        background: `${accent}18`,
                                                        color: accent,
                                                    }}
                                                >
                                                    {stat.total === 0 ? '—' : `${pct}%`}
                                                </span>
                                            </div>
                                            <p
                                                className="mt-1 line-clamp-2 text-xs leading-snug"
                                                style={{ color: THEME.text.secondary }}
                                            >
                                                {subtitle}
                                            </p>
                                            {stat.total > 0 && (
                                                <div
                                                    className="mt-2 h-1 w-full overflow-hidden rounded-full"
                                                    style={{ background: 'rgba(255,255,255,0.08)' }}
                                                >
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${pct}%`,
                                                            background: `linear-gradient(90deg, ${accent}99, ${accent})`,
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <ArrowRight className="h-4 w-4 shrink-0" style={{ color: THEME.text.muted }} />
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {can('dexoDailyBriefReports') ? (
                    <PortfolioDailyIntelSection allProjects={allProjects} onOpenVenture={setActiveProject} />
                ) : (
                    <section className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-10 text-center">
                        <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]"
                                aria-hidden
                            >
                                <Globe className="h-5 w-5" style={{ color: THEME.text.tertiary }} />
                            </div>
                            <h2 className="text-base font-semibold tracking-tight" style={{ color: THEME.text.primary }}>
                                Live intel by venture
                            </h2>
                            <p className="text-sm leading-relaxed" style={{ color: THEME.text.secondary }}>
                                Dexo daily research reports (web-backed briefs and source links for each venture) are part of{' '}
                                <span className="font-medium text-[var(--text-primary)]">Co-Founder Pro</span>. Upgrade from the
                                workspace sidebar to unlock portfolio intel.
                            </p>
                        </div>
                    </section>
                )}

                {/* VENTURE LIST */}
                <div className="mt-8">
                    <SectionHeader title="Your Ventures" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {allProjects.map((project: any) => (
                            <Card
                                key={project.id}
                                interactive
                                onClick={() => setActiveProject(project)}
                                className="p-5"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                                            style={{ background: 'rgba(255,255,255,0.06)' }}
                                        >
                                            <Briefcase className="h-5 w-5" style={{ color: THEME.text.secondary }} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium" style={{ color: THEME.text.primary }}>
                                                {project.name}
                                            </h3>
                                            <p className="text-xs" style={{ color: THEME.text.tertiary }}>
                                                {new Date(project.timestamp).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <StatusBadge status={project.strategy ? 'active' : 'pending'} />
                                </div>
                            </Card>
                        ))}
                    </div>
                    {allProjects.length === 0 && (
                        <Card className="p-12 text-center">
                            <p style={{ color: THEME.text.secondary }}>
                                No ventures yet. Create your first venture to get started.
                            </p>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}

function AnalyticsTab({
    phasePieData,
    priorityPieData,
    executionScore,
    businessImpact,
    chartUid,
    activeProject,
    agents,
    activeRoom,
    switchRoom,
}: any) {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
                {/* PHASE STATUS */}
                <Card className="p-6">
                    <SectionHeader
                        title="Phase Status"
                        subtitle="Timeline distribution across phases"
                    />
                    {phasePieData.length > 0 ? (
                        <div className="h-72 min-h-[288px] min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minHeight={288} minWidth={0}>
                                <RePieChart>
                                    <Pie
                                        data={phasePieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {phasePieData.map((entry: any, i: number) => (
                                            <Cell key={`${chartUid}-ph-${i}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip {...CHART_TOOLTIP} />
                                        <Legend />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-72 flex-col items-center justify-center">
                                <Layers className="h-12 w-12 opacity-20" style={{ color: THEME.text.muted }} />
                            <p className="mt-4 text-sm" style={{ color: THEME.text.tertiary }}>
                                No phases defined yet
                            </p>
                        </div>
                    )}
                </Card>

                {/* PRIORITY COMPLETION */}
                <Card className="p-6">
                    <SectionHeader
                        title="Priority Completion"
                        subtitle="Open vs completed priorities"
                    />
                    {priorityPieData.length > 0 ? (
                        <div className="h-72 min-h-[288px] min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minHeight={288} minWidth={0}>
                                <RePieChart>
                                    <Pie
                                        data={priorityPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {priorityPieData.map((entry: any, i: number) => (
                                            <Cell key={`${chartUid}-pr-${i}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip {...CHART_TOOLTIP} />
                                        <Legend />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-72 flex-col items-center justify-center">
                                <Target className="h-12 w-12 opacity-20" style={{ color: THEME.text.muted }} />
                            <p className="mt-4 text-sm" style={{ color: THEME.text.tertiary }}>
                                No priorities listed yet
                            </p>
                        </div>
                    )}
                </Card>
            </div>

            {/* STAFF SNAPSHOT */}
            {activeProject.agentStaffSnapshot && (
                <Card className="p-6">
                    <SectionHeader
                        title="AI Staff Research"
                        subtitle={`Last synced: ${new Date(activeProject.agentStaffSnapshot.at).toLocaleString()}`}
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            ['Strategy', activeProject.agentStaffSnapshot.desks.ceo, THEME.chart.violet],
                            ['Product', activeProject.agentStaffSnapshot.desks.pm, THEME.chart.amber],
                            ['Finance', activeProject.agentStaffSnapshot.desks.accountant, THEME.chart.emerald],
                            ['Market', activeProject.agentStaffSnapshot.desks.scout, THEME.chart.blue],
                            ['Growth', activeProject.agentStaffSnapshot.desks.cmo, THEME.chart.rose],
                        ].map(([label, text, color]) =>
                            text?.trim() ? (
                                <div
                                    key={label as string}
                                    className="rounded-xl p-4"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        borderLeft: `3px solid ${color}`,
                                    }}
                                >
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: THEME.text.muted }}>
                                        {label as string}
                                    </p>
                                    <p className="text-sm leading-relaxed" style={{ color: THEME.text.secondary }}>
                                        {text as string}
                                    </p>
                                </div>
                            ) : null
                        )}
                    </div>
                </Card>
            )}

            {/* DESK NAVIGATION */}
            <Card className="p-6">
                <SectionHeader title="Operational Desks" />
                <div className="grid gap-3 sm:grid-cols-2">
                    {[
                        { agent: agents.ceo, room: 'ceo', status: activeProject.strategy ? 'active' : 'pending', accent: THEME.chart.violet },
                        { agent: agents.scout, room: 'scout', status: activeProject.marketInsights ? 'active' : 'idle', accent: THEME.chart.blue },
                        { agent: agents.accountant, room: 'accountant', status: activeProject.budget ? 'active' : 'pending', accent: THEME.chart.emerald },
                        { agent: agents.pm, room: 'pm', status: activeProject.productPlan ? 'active' : 'idle', accent: THEME.chart.amber },
                    ].map(({ agent, room, status, accent }) => (
                        <button
                            key={room}
                            onClick={() => switchRoom(room)}
                            className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.06)] p-4 text-left transition-all hover:bg-[rgba(255,255,255,0.09)]"
                            style={{ borderColor: THEME.border.subtle }}
                        >
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-xl"
                                style={{ background: `${accent}15` }}
                            >
                                {agent.icon}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium" style={{ color: THEME.text.primary }}>
                                    {agent.title}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: status === 'active' ? accent : THEME.text.muted }}
                                    />
                                    <span className="text-xs capitalize" style={{ color: THEME.text.secondary }}>
                                        {status}
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5" style={{ color: THEME.text.muted }} />
                        </button>
                    ))}
                </div>
            </Card>
        </div>
    );
}

function ActivityTab({ systemLogs, chartUid }: any) {
    const activityBySource = useMemo(() => {
        const m = new Map<string, number>();
        for (const log of systemLogs) {
            const k = (log.source && String(log.source).trim()) || 'Office';
            m.set(k, (m.get(k) || 0) + 1);
        }
        return Array.from(m.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [systemLogs]);

    return (
        <div className="space-y-6">
            {/* ACTIVITY CHART */}
            <Card className="p-6">
                <SectionHeader title="Activity by Source" />
                {activityBySource.length > 0 ? (
                    <div className="h-80 min-h-[320px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={0}>
                            <BarChart data={activityBySource} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={THEME.border.subtle} vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11, fill: THEME.text.tertiary }}
                                    interval={0}
                                    angle={-20}
                                    textAnchor="end"
                                />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: THEME.text.tertiary }} />
                                <Tooltip {...CHART_TOOLTIP} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                    {activityBySource.map((_, i) => (
                                        <Cell
                                            key={i}
                                            fill={[
                                                THEME.chart.emerald,
                                                THEME.chart.violet,
                                                THEME.chart.blue,
                                                THEME.chart.amber,
                                                THEME.chart.rose,
                                                THEME.chart.cyan,
                                            ][i % 6]}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex h-80 flex-col items-center justify-center">
                        <Activity className="h-12 w-12 opacity-20" style={{ color: THEME.text.muted }} />
                        <p className="mt-4 text-sm" style={{ color: THEME.text.tertiary }}>
                            No activity data yet
                        </p>
                    </div>
                )}
            </Card>

            {/* ACTIVITY LOG */}
            <Card className="p-6">
                <SectionHeader title="Activity Log" />
                <div className="space-y-3">
                    {systemLogs.length === 0 ? (
                        <p className="py-8 text-center text-sm" style={{ color: THEME.text.tertiary }}>
                            No activity recorded yet
                        </p>
                    ) : (
                        systemLogs.map((log: any) => (
                            <div
                                key={log.id}
                                className="flex items-start gap-4 rounded-xl border p-4"
                                style={{ borderColor: THEME.border.subtle }}
                            >
                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: 'rgba(255,255,255,0.06)' }}
                                >
                                    <Activity className="h-4 w-4" style={{ color: THEME.text.tertiary }} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                                            style={{ background: 'rgba(255,255,255,0.08)', color: THEME.text.secondary }}
                                        >
                                            {log.source}
                                        </span>
                                        <span className="text-xs" style={{ color: THEME.text.tertiary }}>
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm" style={{ color: THEME.text.primary }}>
                                        {log.message}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
}

// ============================================================================
// LEGACY SUPPORT - DashMessageSection for compatibility
// ============================================================================

const DASH_OUTLINE = {
    goal: '',
    staff: '',
    focus: '',
    snapshot: '',
    signal: '',
    desks: '',
    next: '',
    portfolio: '',
};

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
        <Card id={id} className={`p-6 ${className}`}>
            <SectionHeader
                title={title}
                subtitle={subtitle}
            />
            {children}
        </Card>
    );
}

export default Dashboard;
