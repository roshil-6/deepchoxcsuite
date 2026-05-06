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
import { pickEnglishPlaybackVoice, resumeSpeechSynthIfNeeded } from '@/lib/voiceEngine';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';
import { buildDexoStaffAttentionBootstrap } from '@/lib/dexoStaffAttentionPrompt';
import { buildDexoJarvisVentureContext } from '@/lib/dexoJarvisContext';
import { readVenturePriority, getPriorityById } from '@/lib/venturePriority';
import { FocusBriefingPanel } from '@/components/FocusBriefingPanel';
import { DexoDailyBriefPanel } from '@/components/Dexo/DexoDailyBriefPanel';
import { DexoOpsPanel } from '@/components/Dexo/DexoOpsPanel';
import { PortfolioDailyIntelSection } from '@/components/Dexo/PortfolioDailyIntelSection';

// ============================================================================
// AI TOOL LOGO MARKS â€” inline SVG, no external deps
// ============================================================================

function ChatGPTLogo({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="#10A37F"/>
        </svg>
    );
}

function ClaudeLogo({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" fill="#CC785C"/>
        </svg>
    );
}

function GeminiLogo({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <defs>
                <linearGradient id="dash-gem-g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4285F4"/>
                    <stop offset="45%" stopColor="#8E75B2"/>
                    <stop offset="100%" stopColor="#D94F6B"/>
                </linearGradient>
            </defs>
            <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" fill="url(#dash-gem-g)"/>
        </svg>
    );
}

function GoogleLogo({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
    );
}

function PerplexityLogo({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z" fill="#20B2CD"/>
        </svg>
    );
}

const DASH_AI_TOOLS = [
    { label: 'ChatGPT',    desc: 'OpenAI',      url: 'https://chatgpt.com/',            Logo: ChatGPTLogo,    bg: 'rgba(16,163,127,0.08)',  border: 'rgba(16,163,127,0.25)',  color: '#10A37F' },
    { label: 'Claude',     desc: 'Anthropic',   url: 'https://claude.ai/',              Logo: ClaudeLogo,     bg: 'rgba(204,120,92,0.08)', border: 'rgba(204,120,92,0.25)', color: '#CC785C' },
    { label: 'Gemini',     desc: 'Google',      url: 'https://gemini.google.com/',      Logo: GeminiLogo,     bg: 'rgba(142,117,178,0.08)', border: 'rgba(142,117,178,0.25)', color: '#8E75B2' },
    { label: 'Google',     desc: 'Search',      url: 'https://www.google.com/',         Logo: GoogleLogo,     bg: 'rgba(66,133,244,0.06)', border: 'rgba(52,168,83,0.25)',  color: '#4285F4' },
    { label: 'Perplexity', desc: 'AI Search',   url: 'https://www.perplexity.ai/',      Logo: PerplexityLogo, bg: 'rgba(32,178,205,0.08)', border: 'rgba(32,178,205,0.25)', color: '#20B2CD' },
] as const;

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
        primary: 'rgba(255,255,255,0.75)',
        secondary: 'rgba(255,255,255,0.55)',
        tertiary: 'rgba(255,255,255,0.45)',
        info: 'rgba(255,255,255,0.35)',
        warning: 'rgba(255,255,255,0.25)',
    },
    border: {
        subtle: 'rgba(255,255,255,0.08)',
        default: 'rgba(255,255,255,0.10)',
        strong: 'rgba(255,255,255,0.14)',
    },
    chart: {
        emerald: '#34d399',
        violet: '#94a3b8',
        amber: '#fbbf24',
        blue: '#38bdf8',
        rose: '#f87171',
        cyan: '#67e8f9',
        slate: '#94a3b8',
    },
} as const;

/** Map snapshot desk labels â†’ research room for quick navigation from the overview card */
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
                relative overflow-hidden rounded-xl border
                ${interactive ? 'cursor-pointer' : ''}
                transition-colors duration-150
                ${className}
            `}
            style={{
                background: isHovered && interactive ? '#201f28' : '#1e1e22',
                borderColor: isHovered && interactive ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.07)',
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
        violet: { bg: 'rgba(255,255,255,0.05)', text: '#94a3b8', glow: 'rgba(255,255,255,0.03)' },
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
                transform: entered ? 'translateY(0)' : 'translateY(8px)',
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

    const [dashboardExpanded, setDashboardExpanded] = useState(false);
    const [portfolioDashExpanded, setPortfolioDashExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'activity' | 'dexo_daily'>('overview');
    const [openGuideKey, setOpenGuideKey] = useState<string | null>(null);
    const [showDexoWelcome, setShowDexoWelcome] = useState(false);
    const [dexoWelcomeStep, setDexoWelcomeStep] = useState(0);
    const [dexoSpeaking, setDexoSpeaking] = useState(false);

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

    // Auto-select most recently created venture when user enters Executive Overview
    // with no active project â€” so they always see a venture, not the empty portfolio view
    useEffect(() => {
        if (activeRoom !== 'dashboard' || activeProject || allProjects.length === 0) return;
        const sorted = [...allProjects].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
        const recent = sorted[0];
        if (recent) setActiveProject(recent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRoom, allProjects.length]);

    // Dexo welcome modal is available on-demand (triggered via header button), not auto-shown
    useEffect(() => {
        if (activeRoom !== 'dashboard' || !activeProject?.id) return;
        setDexoWelcomeStep(0);
        // setShowDexoWelcome(true); // disabled â€” too intrusive on every visit
    }, [activeRoom, activeProject?.id]);

    // Pre-load Dexo with a venture briefing whenever user enters Executive Overview
    // so clicking "Open Dexo Briefing" instantly delivers context without extra input
    useEffect(() => {
        if (activeRoom !== 'dashboard' || !activeProject?.agentStaffSnapshot) return;
        const summary = activeProject.agentStaffSnapshot.summary?.trim() ?? '';
        const focusLines = (activeProject.staffFocusToday ?? []).filter(Boolean).slice(0, 4).join('\nâ€¢ ');
        setDexoBootstrap({
            title: `Daily Briefing â€” ${activeProject.name}`,
            detail: summary,
            sourceRole: 'ceo',
            requiredInfo: [],
            userMessage: `You are my AI co-founder. Here is what has been researched for ${activeProject.name}.\n\nSummary:\n${summary.slice(0, 600)}\n\nFocus areas:\nâ€¢ ${focusLines}\n\nBrief me on:\n1. What are the most important findings right now?\n2. What should I focus on today?\n3. Do I need to change anything?\n4. Any risks or opportunities I should act on?\n\nBe direct and specific â€” no fluff.`,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRoom, activeProject?.id, activeProject?.agentStaffSnapshot?.at]);

    useEffect(() => {
        if (activeRoom !== 'dashboard' || !activeProject?.id) return;
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
    }, [activeRoom, activeProject]);

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
            return x.length > 96 ? `${x.slice(0, 93)}â€¦` : x;
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

    const activePriorityDef = useMemo(() => {
        const { priorityId } = readVenturePriority(activeProject);
        return priorityId ? getPriorityById(priorityId) : undefined;
    }, [activeProject]);

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
        return pick.length > 400 ? `${pick.slice(0, 397)}â€¦` : pick;
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
        return s.length > 520 ? `${s.slice(0, 517)}â€¦` : s;
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
            style={{ background: '#141416' }}
        >
            {/* â”€â”€ DEXO OVERVIEW GUIDE POP-UP â”€â”€ renders directly on the page */}
            {showDexoWelcome && (() => {
                const hasSnap = !!activeProject.agentStaffSnapshot;
                const summary = activeProject.agentStaffSnapshot?.summary?.trim() ?? '';
                const focusLines = (activeProject.staffFocusToday ?? []).filter(Boolean);
                const attn = staffAttentionPending.length;

                const STEPS: Array<{
                    color: string;
                    title: string;
                    subtitle: string;
                    body: string;
                    cta: string | null;
                    ctaAction: (() => void) | null;
                }> = [
                    {
                        color: '#94a3b8',
                        title: `Welcome back â€” ${activeProject.name}`,
                        subtitle: 'Your AI co-founder is ready',
                        body: hasSnap
                            ? `Your AI team has researched Strategy, Market Intelligence, Product, Finance, and Growth. Scroll down to see what was found and ask Dexo to explain anything or recommend next steps.`
                            : `This is your Executive Overview for ${activeProject.name}. Run a Staff Sync to activate your AI team â€” Dexo will research your venture across 5 desks and brief you daily.`,
                        cta: hasSnap ? null : 'Run Staff Sync now',
                        ctaAction: hasSnap ? null : () => { setShowDexoWelcome(false); runAgentStaffSync(); },
                    },
                    ...(hasSnap && summary ? [{
                        color: '#94a3b8',
                        title: 'Here is what your AI team found',
                        subtitle: 'Executive research summary',
                        body: summary.slice(0, 360) + (summary.length > 360 ? 'â€¦' : ''),
                        cta: 'Get full briefing from Dexo',
                        ctaAction: () => {
                            setDexoBootstrap({ title: `Full Briefing â€” ${activeProject.name}`, detail: summary, sourceRole: 'ceo' as const, requiredInfo: [], userMessage: `Give me a complete co-founder briefing for ${activeProject.name}. What did each desk find? What are the top 3 actions I should take right now?` });
                            setShowDexoWelcome(false);
                            switchRoom('dexo');
                        },
                    }] : []),
                    ...(focusLines.length > 0 ? [{
                        color: '#10b981',
                        title: 'What Dexo recommends you do today',
                        subtitle: 'Focus priorities from Staff Sync',
                        body: focusLines.slice(0, 3).map((l, i) => `${i + 1}. ${l}`).join('\n'),
                        cta: null,
                        ctaAction: null,
                    }] : []),
                    ...(attn > 0 ? [{
                        color: '#f59e0b',
                        title: `${attn} thing${attn > 1 ? 's' : ''} need${attn === 1 ? 's' : ''} your decision`,
                        subtitle: 'Flagged by your AI team',
                        body: staffAttentionPending.slice(0, 2).map(a => `â€¢ ${a.title}\n  ${a.message.slice(0, 90)}${a.message.length > 90 ? 'â€¦' : ''}`).join('\n\n'),
                        cta: 'Ask Dexo about these',
                        ctaAction: () => {
                            if (staffAttentionPending[0]) setDexoBootstrap(buildDexoStaffAttentionBootstrap(staffAttentionPending[0]));
                            setShowDexoWelcome(false);
                            switchRoom('dexo');
                        },
                    }] : []),
                    {
                        color: '#94a3b8',
                        title: 'Do you have anything specific in mind?',
                        subtitle: 'Dexo is ready to help',
                        body: 'Ask Dexo anything â€” what should I change, what are the risks, what should I build next? Dexo has your full venture context and will give you a direct, grounded answer.',
                        cta: 'Ask Dexo now',
                        ctaAction: () => { setShowDexoWelcome(false); switchRoom('dexo'); },
                    },
                ];

                const step = STEPS[Math.min(dexoWelcomeStep, STEPS.length - 1)];
                const isLast = dexoWelcomeStep >= STEPS.length - 1;

                const speakBody = () => {
                    try {
                        resumeSpeechSynthIfNeeded();
                        window.speechSynthesis.cancel();
                        const u = new SpeechSynthesisUtterance(step.body.replace(/\n/g, '. '));
                        const v = pickEnglishPlaybackVoice();
                        if (v) u.voice = v;
                        u.rate = 0.95;
                        u.onstart = () => setDexoSpeaking(true);
                        u.onend = () => setDexoSpeaking(false);
                        u.onerror = () => setDexoSpeaking(false);
                        window.speechSynthesis.speak(u);
                        setDexoSpeaking(true);
                    } catch { setDexoSpeaking(false); }
                };

                return (
                    <div
                        className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6"
                        style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(12px)' }}
                        onClick={() => { window.speechSynthesis?.cancel(); setDexoSpeaking(false); setShowDexoWelcome(false); }}
                    >
                        <div
                            className="relative w-full max-w-xl overflow-hidden rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
                            style={{ background: 'rgba(20,18,32,0.98)', border: `1px solid ${step.color}30` }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Gradient top accent */}
                            <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${step.color}, transparent)` }} />

                            {/* Avatar + header row */}
                            <div className="flex items-start gap-4 px-6 pt-6 pb-4">
                                <div className="relative shrink-0">
                                    <DexoAvatar size="lg" state={dexoSpeaking ? 'speaking' : 'idle'} pulse={dexoSpeaking} />
                                    {dexoSpeaking && (
                                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                                            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-300" />
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 pt-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: step.color }}>Dexo</span>
                                        <span
                                            className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                            style={{ background: `${step.color}20`, color: step.color }}
                                        >{step.subtitle}</span>
                                    </div>
                                    <h2 className="mt-1.5 text-[16px] font-semibold leading-snug" style={{ color: '#fff' }}>{step.title}</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { window.speechSynthesis?.cancel(); setDexoSpeaking(false); setShowDexoWelcome(false); }}
                                    className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-white/[0.08]"
                                    style={{ color: 'rgba(255,255,255,0.35)' }}
                                >âœ•</button>
                            </div>

                            {/* Body */}
                            <div
                                className="mx-6 mb-4 rounded-2xl border px-5 py-4"
                                style={{ borderColor: `${step.color}18`, background: `${step.color}0A` }}
                            >
                                <p className="whitespace-pre-line text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                    {step.body}
                                </p>
                                <button
                                    type="button"
                                    onClick={speakBody}
                                    className="mt-3 flex items-center gap-1.5 text-[11px] font-medium transition hover:opacity-70"
                                    style={{ color: step.color }}
                                >
                                    <Mic className="h-3.5 w-3.5" />
                                    {dexoSpeaking ? 'Dexo is speakingâ€¦' : 'Hear Dexo read this'}
                                </button>
                            </div>

                            {/* Step dots */}
                            <div className="flex items-center justify-center gap-2 pb-3">
                                {STEPS.map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => { window.speechSynthesis?.cancel(); setDexoSpeaking(false); setDexoWelcomeStep(i); }}
                                        className="rounded-full transition-all duration-200"
                                        style={{ height: '6px', width: i === dexoWelcomeStep ? '28px' : '6px', background: i === dexoWelcomeStep ? step.color : 'rgba(255,255,255,0.18)' }}
                                    />
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-5 pt-1">
                                <div className="flex items-center gap-2">
                                    {dexoWelcomeStep > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => { window.speechSynthesis?.cancel(); setDexoSpeaking(false); setDexoWelcomeStep(s => s - 1); }}
                                            className="rounded-xl border px-4 py-2 text-[12px] font-medium transition hover:bg-white/[0.06]"
                                            style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}
                                        >â† Back</button>
                                    )}
                                    {!isLast ? (
                                        <button
                                            type="button"
                                            onClick={() => { window.speechSynthesis?.cancel(); setDexoSpeaking(false); setDexoWelcomeStep(s => s + 1); }}
                                            className="rounded-xl px-5 py-2 text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                                            style={{ background: step.color, color: '#fff' }}
                                        >Next â†’</button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => { window.speechSynthesis?.cancel(); setDexoSpeaking(false); setShowDexoWelcome(false); }}
                                            className="rounded-xl px-5 py-2 text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                                            style={{ background: step.color, color: '#fff' }}
                                        >Got it â€” show me the overview</button>
                                    )}
                                </div>
                                {step.cta && step.ctaAction && (
                                    <button
                                        type="button"
                                        onClick={step.ctaAction}
                                        className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[12px] font-semibold transition-all hover:opacity-80 active:scale-[0.98]"
                                        style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.07)', color: '#f2f2f5' }}
                                    >
                                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                        {step.cta}
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => { window.speechSynthesis?.cancel(); setDexoSpeaking(false); setShowDexoWelcome(false); }}
                                className="block w-full pb-5 text-center text-[10px] transition hover:opacity-70"
                                style={{ color: 'rgba(255,255,255,0.22)' }}
                            >Skip â€” take me to the overview</button>
                        </div>
                    </div>
                );
            })()}

            {/* HEADER */}
            <header className="border-b" style={{ background: '#141416', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div
                            className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: 'rgba(116,86,255,0.10)' }}
                        >
                            <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: THEME.accent.secondary }} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-xl font-semibold tracking-tight truncate" style={{ color: THEME.text.primary }}>
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
                                <span>Â·</span>
                                <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => { setDexoWelcomeStep(0); setShowDexoWelcome(true); }}
                            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-medium transition-all"
                            style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)', color: '#f2f2f5' }}
                        >
                            <Sparkles className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden sm:inline">Dexo Guide</span>
                        </button>
                        <button
                            onClick={() => runAgentStaffSync()}
                            disabled={agentSyncRunning}
                            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-medium transition-all"
                            style={{
                                borderColor: THEME.border.subtle,
                                background: 'rgba(255,255,255,0.04)',
                                color: THEME.text.secondary,
                                opacity: agentSyncRunning ? 0.6 : 1,
                            }}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${agentSyncRunning ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{agentSyncRunning ? 'Syncingâ€¦' : 'Sync Staff'}</span>
                        </button>
                        <WorkspaceAiButton />
                    </div>
                </div>

                {/* TAB NAVIGATION */}
                <div className="mx-auto max-w-7xl px-3 sm:px-6">
                    <div className="flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {dashboardTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="relative shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-medium transition-colors"
                                style={{ color: activeTab === tab.id ? '#f2f2f5' : '#8c8c9e' }}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                                        style={{ background: '#f2f2f5' }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-5">
                {/* CONTEXTUAL HINTS */}
                <div className="mb-3 flex flex-col gap-2">
                    <GuideHint
                        id="dash-no-strategy"
                        when={!hasIntent && !narrativeRich}
                        variant="tip"
                        message="Add a strategic foundation in the CEO desk to unlock AI research."
                        action="Open CEO Desk"
                        onAction={() => switchRoom('ceo')}
                    />
                    <GuideHint
                        id="dash-no-sync"
                        when={!activeProject?.agentStaffSnapshot && hasIntent}
                        variant="info"
                        message="Run Staff Sync to activate your AI team across all desks."
                        action="Sync Now"
                        onAction={() => runAgentStaffSync()}
                    />
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="flex flex-col gap-4">

                        {/* â”€â”€ DEXO RESEARCH GUIDE â”€â”€ */}

                        {/* Popup guide overlay â€” renders on top of page via fixed positioning */}
                        {openGuideKey && activeProject.agentStaffSnapshot && (() => {
                            const DESK_DEFS = [
                                { key: 'ceo',        label: 'Strategic Direction', role: 'CEO',             covers: 'Vision, mission, and competitive positioning',        snap: activeProject.agentStaffSnapshot!.desks.ceo,        color: THEME.chart.violet,  room: 'ceo'        as const, icon: Lightbulb, guide: "Use this to set or challenge your strategy. It shapes every other decision â€” read it first when you're unsure about direction."                    },
                                { key: 'scout',      label: 'Market Intelligence', role: 'Scout',           covers: 'Competitor signals, trends, and market opportunities', snap: activeProject.agentStaffSnapshot!.desks.scout,      color: THEME.chart.blue,    room: 'scout'      as const, icon: Globe,     guide: 'Use this to spot threats before they hit and validate your market assumptions. Check it before any competitive or go-to-market decision.'             },
                                { key: 'pm',         label: 'Product Insights',    role: 'Product Manager', covers: 'Roadmap priorities, features, and user problems',      snap: activeProject.agentStaffSnapshot!.desks.pm,         color: THEME.chart.amber,   room: 'pm'         as const, icon: Layers,    guide: 'Use this to decide what to build next and what to cut. It directly informs your roadmap and sprint priorities.'                                      },
                                { key: 'accountant', label: 'Finance & Runway',    role: 'Accountant',      covers: 'Budget, burn rate, and revenue model signals',        snap: activeProject.agentStaffSnapshot!.desks.accountant, color: THEME.chart.emerald, room: 'accountant' as const, icon: Wallet,    guide: 'Read this before any spending or pricing decision. It shows your real financial constraints and revenue opportunities.'                               },
                                { key: 'cmo',        label: 'Growth & GTM',        role: 'CMO',             covers: 'Channels, acquisition, and marketing strategy',       snap: activeProject.agentStaffSnapshot!.desks.cmo,        color: THEME.chart.rose,    room: 'cmo'        as const, icon: Megaphone, guide: 'Use this to pick channels and craft messaging before investing in any marketing or sales motion.'                                                    },
                            ] as const;
                            const d = DESK_DEFS.find(x => x.key === openGuideKey);
                            if (!d) return null;
                            return (
                                <div
                                    className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
                                    style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)' }}
                                    onClick={() => setOpenGuideKey(null)}
                                >
                                    <div
                                        className="w-full max-w-md overflow-hidden rounded-2xl border"
                                        style={{ background: 'rgba(16,16,20,0.99)', borderColor: `${d.color}40`, boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${d.color}25` }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {/* Popup header */}
                                        <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: `${d.color}18`, background: `linear-gradient(135deg, ${d.color}12, ${d.color}06)` }}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <DexoAvatar size="sm" state="idle" pulse={false} />
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-semibold" style={{ color: THEME.text.primary }}>Dexo Co-Founder Guide</p>
                                                    <p className="text-[11px] font-medium" style={{ color: d.color }}>{d.label} Â· {d.role}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setOpenGuideKey(null)}
                                                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-[13px] font-bold transition hover:bg-white/10"
                                                style={{ color: THEME.text.muted }}
                                            >
                                                âœ•
                                            </button>
                                        </div>

                                        {/* Popup body */}
                                        <div className="space-y-3 px-5 py-4">
                                            {/* What this covers */}
                                            <div className="rounded-xl border px-4 py-3" style={{ borderColor: `${d.color}18`, background: `${d.color}08` }}>
                                                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: d.color }}>What this desk covers</p>
                                                <p className="text-[12px] leading-snug" style={{ color: THEME.text.secondary }}>{d.covers}</p>
                                            </div>

                                            {/* How to use */}
                                            <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                                                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>How to use this finding</p>
                                                <p className="text-[12px] leading-relaxed" style={{ color: THEME.text.secondary }}>{d.guide}</p>
                                            </div>

                                            {/* Ask Dexo CTA */}
                                            {d.snap?.trim() ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDexoBootstrap({
                                                            title: `${d.label} Finding â€” ${activeProject.name}`,
                                                            detail: d.snap!.trim(),
                                                            sourceRole: d.key as 'ceo'|'pm'|'accountant'|'cmo'|'scout',
                                                            requiredInfo: [],
                                                            userMessage: `I am reviewing the ${d.label} research from my last Staff Sync for ${activeProject.name}.\n\nFinding:\n"${d.snap!.trim().slice(0, 400)}"\n\nExplain what this means and tell me:\n1. What does this mean for my business right now?\n2. What is the single most important action to take?\n3. Any immediate risks or opportunities?\n\nBe specific and grounded in what is already saved in this venture.`,
                                                        });
                                                        setOpenGuideKey(null);
                                                        switchRoom('dexo');
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                                                    style={{ background: `linear-gradient(135deg, ${d.color}28, rgba(116,86,255,0.22))`, border: `1px solid ${d.color}35`, color: THEME.text.primary }}
                                                >
                                                    <Sparkles className="h-4 w-4 shrink-0" style={{ color: d.color }} />
                                                    Ask Dexo about this finding â†’
                                                </button>
                                            ) : (
                                                <p className="text-center text-[11px]" style={{ color: THEME.text.muted }}>
                                                    Run Staff Sync to generate a finding for this desk.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {activeProject.agentStaffSnapshot ? (
                            <div
                                className="overflow-hidden rounded-xl border"
                                style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#1e1e22' }}
                            >
                                {/* Section header */}
                                <div
                                    className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6"
                                    style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#222227' }}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                            style={{ background: 'rgba(116,86,255,0.22)', boxShadow: '0 0 0 1px rgba(116,86,255,0.28)' }}
                                        >
                                            <Cpu className="h-4 w-4" style={{ color: THEME.accent.primary }} />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-[13px] font-semibold" style={{ color: THEME.text.primary }}>Dexo Research Guide</h2>
                                            <p className="truncate text-[10px]" style={{ color: THEME.text.muted }}>
                                                AI co-founder briefing Â· 5 desks{lastStaffSyncLabel ? ` Â· ${lastStaffSyncLabel}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDexoBootstrap({
                                                    title: `Full Research Briefing â€” ${activeProject.name}`,
                                                    detail: activeProject.agentStaffSnapshot!.summary ?? '',
                                                    sourceRole: 'ceo',
                                                    requiredInfo: [],
                                                    userMessage: `Give me a complete briefing on all the latest Staff Sync research for ${activeProject.name}. Walk through each desk â€” Strategy, Market Intelligence, Product, Finance, Growth â€” and give me the top 3 actions I should take right now.`,
                                                });
                                                switchRoom('dexo');
                                            }}
                                            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all hover:opacity-80"
                                            style={{ borderColor: 'rgba(116,86,255,0.32)', background: 'rgba(116,86,255,0.14)', color: THEME.accent.primary }}
                                        >
                                            <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                            <span className="hidden sm:inline">Full briefing</span>
                                            <span className="sm:hidden">Brief</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => runAgentStaffSync()}
                                            disabled={agentSyncRunning}
                                            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-medium transition-all hover:opacity-70"
                                            style={{ borderColor: THEME.border.default, background: 'rgba(255,255,255,0.05)', color: THEME.text.muted, opacity: agentSyncRunning ? 0.5 : 1 }}
                                        >
                                            <RefreshCw className={`h-3 w-3 shrink-0 ${agentSyncRunning ? 'animate-spin' : ''}`} />
                                            <span className="hidden sm:inline">{agentSyncRunning ? 'Syncingâ€¦' : 'Refresh'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Desk cards â€” 1 col mobile, 2 col sm+ */}
                                <div className="grid gap-px sm:grid-cols-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    {([
                                        { key: 'ceo',        label: 'Strategic Direction', role: 'CEO',             sub: 'Vision Â· positioning Â· strategy',       snap: activeProject.agentStaffSnapshot.desks.ceo,        color: THEME.chart.violet,  room: 'ceo'        as const, icon: Lightbulb },
                                        { key: 'scout',      label: 'Market Intelligence', role: 'Scout',           sub: 'Competitors Â· trends Â· opportunities',  snap: activeProject.agentStaffSnapshot.desks.scout,      color: THEME.chart.blue,    room: 'scout'      as const, icon: Globe     },
                                        { key: 'pm',         label: 'Product Insights',    role: 'Product Manager', sub: 'Roadmap Â· features Â· user problems',    snap: activeProject.agentStaffSnapshot.desks.pm,         color: THEME.chart.amber,   room: 'pm'         as const, icon: Layers    },
                                        { key: 'accountant', label: 'Finance & Runway',    role: 'Accountant',      sub: 'Budget Â· burn Â· revenue signals',       snap: activeProject.agentStaffSnapshot.desks.accountant, color: THEME.chart.emerald, room: 'accountant' as const, icon: Wallet    },
                                        { key: 'cmo',        label: 'Growth & GTM',        role: 'CMO',             sub: 'Channels Â· marketing Â· acquisition',    snap: activeProject.agentStaffSnapshot.desks.cmo,        color: THEME.chart.rose,    room: 'cmo'        as const, icon: Megaphone },
                                    ] as const).map(({ key, label, role, sub, snap, color, room, icon: DeskIcon }) => {
                                        const hasSnap = !!snap?.trim();
                                        return (
                                            <div key={key} className="flex flex-col p-4 sm:p-5" style={{ background: '#1e1e22' }}>
                                                {/* Card header row */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <div
                                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                                                            style={{ background: `${color}16`, boxShadow: `0 0 0 1px ${color}20` }}
                                                        >
                                                            <DeskIcon className="h-3.5 w-3.5" style={{ color }} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-[12px] font-semibold" style={{ color: THEME.text.primary }}>{label}</p>
                                                            <p className="text-[10px] font-medium" style={{ color }}>{role}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => switchRoom(room)}
                                                        className="shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all hover:opacity-80"
                                                        style={{ borderColor: `${color}30`, background: `${color}0E`, color }}
                                                    >
                                                        Open â†’
                                                    </button>
                                                </div>

                                                {/* Desk sub-label */}
                                                <p className="mt-1.5 text-[10px]" style={{ color: THEME.text.muted }}>{sub}</p>

                                                {/* Research finding */}
                                                <div className="mt-3 flex-1">
                                                    {hasSnap ? (
                                                        <>
                                                            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color }}>Research Finding</p>
                                                            <p className="text-[12px] leading-relaxed" style={{ color: THEME.text.secondary }}>
                                                                {snap!.trim().length > 240 ? `${snap!.trim().slice(0, 237)}â€¦` : snap!.trim()}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <p className="text-[11px] italic" style={{ color: THEME.text.muted }}>
                                                            No research yet â€” run Staff Sync.
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Action row â€” wraps on narrow screens */}
                                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenGuideKey(key)}
                                                        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all hover:opacity-80"
                                                        style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)', color: THEME.text.secondary }}
                                                    >
                                                        <Cpu className="h-3 w-3 shrink-0" style={{ color: THEME.accent.primary }} />
                                                        Dexo Guide
                                                    </button>
                                                    {hasSnap && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setDexoBootstrap({
                                                                    title: `${label} Finding â€” ${activeProject.name}`,
                                                                    detail: snap!.trim(),
                                                                    sourceRole: key as 'ceo'|'pm'|'accountant'|'cmo'|'scout',
                                                                    requiredInfo: [],
                                                                    userMessage: `I am reviewing the ${label} research from my last Staff Sync for ${activeProject.name}.\n\nFinding:\n"${snap!.trim().slice(0, 400)}"\n\nExplain what this means and tell me:\n1. What does this mean for my business right now?\n2. What is the single most important action to take?\n3. Any immediate risks or opportunities?\n\nBe specific and grounded in what is already saved in this venture.`,
                                                                });
                                                                switchRoom('dexo');
                                                            }}
                                                            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all hover:opacity-80"
                                                            style={{ borderColor: 'rgba(116,86,255,0.28)', background: 'rgba(116,86,255,0.10)', color: THEME.accent.primary }}
                                                        >
                                                            <Sparkles className="h-3 w-3 shrink-0" />
                                                            Ask Dexo
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Executive Synthesis footer */}
                                {activeProject.agentStaffSnapshot.summary?.trim() && (
                                    <div
                                        className="border-t px-4 py-4 sm:px-6"
                                        style={{ borderColor: 'rgba(116,86,255,0.10)', background: 'rgba(116,86,255,0.06)' }}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: THEME.accent.primary }} />
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: THEME.accent.primary }}>Executive Synthesis</p>
                                                    </div>
                                                    <span className="text-[10px]" style={{ color: THEME.text.muted }}>Cross-desk summary by AI chief of staff</span>
                                                </div>
                                                <p className="text-[12px] leading-relaxed" style={{ color: THEME.text.secondary }}>
                                                    {activeProject.agentStaffSnapshot.summary.trim().length > 300
                                                        ? `${activeProject.agentStaffSnapshot.summary.trim().slice(0, 297)}â€¦`
                                                        : activeProject.agentStaffSnapshot.summary.trim()}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDexoBootstrap({
                                                        title: `Executive Synthesis â€” ${activeProject.name}`,
                                                        detail: activeProject.agentStaffSnapshot!.summary ?? '',
                                                        sourceRole: 'ceo',
                                                        requiredInfo: [],
                                                        userMessage: `I am reading the executive synthesis from the last Staff Sync for ${activeProject.name}:\n\n"${(activeProject.agentStaffSnapshot!.summary ?? '').trim().slice(0, 500)}"\n\nBased on this, what are the three most important things I should do this week? Be specific and direct.`,
                                                    });
                                                    switchRoom('dexo');
                                                }}
                                                className="shrink-0 flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[11px] font-semibold transition-all hover:opacity-80"
                                                style={{ borderColor: 'rgba(116,86,255,0.28)', background: 'rgba(116,86,255,0.12)', color: THEME.accent.primary }}
                                            >
                                                <Sparkles className="h-3 w-3 shrink-0" />
                                                Unpack with Dexo â†’
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                className="flex flex-col items-center gap-5 rounded-2xl border px-6 py-12 text-center"
                                style={{ borderColor: 'rgba(116,86,255,0.18)', background: 'rgba(116,86,255,0.04)' }}
                            >
                                <div
                                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                                    style={{ background: 'rgba(116,86,255,0.16)', boxShadow: '0 0 0 1px rgba(116,86,255,0.22)' }}
                                >
                                    <Cpu className="h-7 w-7" style={{ color: THEME.accent.primary }} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold" style={{ color: THEME.text.primary }}>Dexo Research Guide</h3>
                                    <p className="mt-0.5 text-[10px]" style={{ color: THEME.text.muted }}>Run Staff Sync to activate all 5 desks</p>
                                </div>
                                <button
                                    onClick={() => runAgentStaffSync()}
                                    disabled={agentSyncRunning}
                                    className="flex items-center gap-2 rounded-xl border px-6 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
                                    style={{ borderColor: 'rgba(116,86,255,0.3)', background: 'rgba(116,86,255,0.14)', color: THEME.accent.primary, opacity: agentSyncRunning ? 0.6 : 1 }}
                                >
                                    <RefreshCw className={`h-4 w-4 shrink-0 ${agentSyncRunning ? 'animate-spin' : ''}`} />
                                    {agentSyncRunning ? 'Analysingâ€¦' : 'Run Staff Sync now'}
                                </button>
                            </div>
                        )}


                        {/* â”€â”€ KPI COMMAND STRIP â”€â”€ */}
                        <div
                            className="grid grid-cols-2 divide-x overflow-hidden rounded-2xl border lg:grid-cols-4"
                            style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.03)' }}
                        >
                            {[
                                {
                                    label: foundationSparse ? 'Setup status' : 'Execution score',
                                    value: foundationSparse ? 'Needed' : `${animatedScore}%`,
                                    sub: foundationSparse ? 'Add venture data to unlock' : 'Strategy Â· phases Â· priorities',
                                    icon: Target,
                                    accent: THEME.chart.violet,
                                },
                                {
                                    label: foundationSparse ? 'Phase timeline' : 'Phases complete',
                                    value: foundationSparse ? 'Pending' : `${phaseDone} / ${phaseTotal || 0}`,
                                    sub: foundationSparse ? 'Define your roadmap phases' : phaseActive > 0 ? `${phaseActive} active now` : 'All planned',
                                    icon: Layers,
                                    accent: THEME.chart.blue,
                                },
                                {
                                    label: foundationSparse ? 'Executive priorities' : 'Priorities done',
                                    value: foundationSparse ? 'Pending' : `${priDone} / ${priTotal || 0}`,
                                    sub: foundationSparse ? 'Add priorities in CEO desk' : priTotal > 0 ? `${Math.round((priDone / priTotal) * 100)}% complete` : 'None set yet',
                                    icon: CheckCircle2,
                                    accent: THEME.chart.emerald,
                                },
                                {
                                    label: staffSyncAt ? 'Last AI research sync' : 'AI staff sync',
                                    value: staffSyncAt
                                        ? syncAgeMinutes < 60 ? `${syncAgeMinutes}m ago`
                                        : syncAgeMinutes < 1440 ? `${Math.floor(syncAgeMinutes / 60)}h ago`
                                        : `${Math.floor(syncAgeMinutes / 1440)}d ago`
                                        : 'Never synced',
                                    sub: staffSyncAt ? lastStaffSyncLabel ?? 'â€”' : 'Run sync to populate desks',
                                    icon: Clock,
                                    accent: THEME.chart.amber,
                                },
                            ].map(({ label, value, sub, icon: Icon, accent }, i) => (
                                <div key={i} className="flex items-start gap-3 px-5 py-4" style={{ borderColor: THEME.border.subtle }}>
                                    <div
                                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                        style={{ background: `${accent}14` }}
                                    >
                                        <Icon className="h-4 w-4" style={{ color: accent }} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: THEME.text.muted }}>{label}</p>
                                        <p className="mt-0.5 text-lg font-semibold leading-none tabular-nums" style={{ color: THEME.text.primary }}>{value}</p>
                                        <p className="mt-1 truncate text-[11px]" style={{ color: THEME.text.muted }}>{sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* â”€â”€ VENTURE CONTEXT + COMMAND CENTER â”€â”€ */}
                        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_300px]">
                            {/* LEFT â€” Research context */}
                            <div
                                className="flex flex-col gap-4 overflow-hidden rounded-2xl border p-5"
                                style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}
                            >
                                {/* Active research focus â€” user-defined, drives all AI research */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                            Research focus
                                        </p>
                                        {activePriorityDef ? (
                                            <>
                                                <p className="mt-1 text-[15px] font-semibold leading-tight" style={{ color: THEME.text.primary }}>
                                                    {activePriorityDef.label}
                                                </p>
                                                <p className="mt-0.5 text-[12px]" style={{ color: THEME.text.muted }}>
                                                    {activePriorityDef.tagline}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="mt-1 text-[13px]" style={{ color: THEME.text.muted }}>
                                                No focus set â€” Dexo runs full-stack research
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => switchRoom('dexo')}
                                        className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition hover:opacity-80"
                                        style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)', color: '#f2f2f5' }}
                                    >
                                        Change
                                    </button>
                                </div>

                                <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                                {/* Today's research output â€” 3 lines max, truncated */}
                                {staffFocusLines.length > 0 ? (
                                    <div>
                                        <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                            Today
                                        </p>
                                        <ul className="space-y-1.5">
                                            {staffFocusLines.slice(0, 3).map((line, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[12px] leading-snug" style={{ color: THEME.text.secondary }}>
                                                    <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full" style={{ background: THEME.accent.primary }} />
                                                    {line.length > 90 ? `${line.slice(0, 87)}â€¦` : line}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[12px]" style={{ color: THEME.text.muted }}>
                                            No research yet â€” run Staff Sync to generate insights.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => runAgentStaffSync()}
                                            disabled={agentSyncRunning}
                                            className="shrink-0 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition hover:opacity-80"
                                            style={{ borderColor: THEME.border.subtle, color: THEME.text.secondary, opacity: agentSyncRunning ? 0.5 : 1 }}
                                        >
                                            <RefreshCw className={`h-3 w-3 ${agentSyncRunning ? 'animate-spin' : ''}`} />
                                            Sync
                                        </button>
                                    </div>
                                )}

                                {/* Pending items â€” title only, no verbose AI text */}
                                {staffAttentionPending.length > 0 && (
                                    <>
                                        <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                        <div>
                                            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                                Pending Â· {staffAttentionPending.length}
                                            </p>
                                            <ul className="space-y-0.5">
                                                {staffAttentionPending.slice(0, 3).map((a) => (
                                                    <li key={a.id}>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setDexoBootstrap(buildDexoStaffAttentionBootstrap(a)); switchRoom('dexo'); }}
                                                            className="group flex w-full items-center justify-between gap-3 rounded-lg py-1.5 text-left transition"
                                                        >
                                                            <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: THEME.text.secondary }}>
                                                                {a.title}
                                                            </span>
                                                            <span className="shrink-0 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100" style={{ color: '#94a3b8' }}>
                                                                Ask Dexo â†’
                                                            </span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* RIGHT â€” Command center */}
                            <div className="flex flex-col gap-4">
                                {/* Health ring */}
                                <div
                                    className="flex items-center gap-4 rounded-2xl border p-5"
                                    style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}
                                >
                                    <CircularProgress
                                        value={executionScore}
                                        size={88}
                                        strokeWidth={7}
                                        color={executionScore > 70 ? THEME.accent.primary : executionScore > 40 ? THEME.chart.amber : THEME.chart.rose}
                                    />
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>Venture health</p>
                                        <p className="mt-1 text-base font-semibold" style={{ color: THEME.text.primary }}>
                                            {executionScore > 70 ? 'Strong' : executionScore > 40 ? 'Developing' : foundationSparse ? 'Setup needed' : 'Needs work'}
                                        </p>
                                        <p className="mt-0.5 text-[11px]" style={{ color: THEME.text.muted }}>
                                            Based on strategy, phases &amp; priorities
                                        </p>
                                    </div>
                                </div>

                                {/* Desk coverage */}
                                <div
                                    className="flex-1 rounded-2xl border p-5"
                                    style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}
                                >
                                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>Desk coverage</p>
                                    <div className="space-y-3">
                                        {deskCoverage.map((desk) => {
                                            const room = SNAPSHOT_DESK_ROOMS[desk.label];
                                            return (
                                                <button
                                                    key={desk.label}
                                                    type="button"
                                                    onClick={() => room && switchRoom(room)}
                                                    className="group flex w-full items-center gap-2.5 rounded-lg px-0 text-left transition-opacity hover:opacity-80"
                                                >
                                                    <div
                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                                                        style={{ background: `${desk.fill}18` }}
                                                    >
                                                        <desk.icon className="h-3.5 w-3.5" style={{ color: desk.fill }} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                                            <span className="text-[12px] font-medium" style={{ color: THEME.text.secondary }}>{desk.label}</span>
                                                            <span className="text-[10px] tabular-nums" style={{ color: desk.pct === 100 ? THEME.accent.primary : THEME.text.muted }}>
                                                                {desk.pct}%
                                                            </span>
                                                        </div>
                                                        <div className="h-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                                            <div
                                                                className="h-full rounded-full transition-all duration-700"
                                                                style={{ width: `${desk.pct}%`, background: desk.pct === 100 ? THEME.accent.primary : desk.fill }}
                                                            />
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => switchRoom('dexo')}
                                        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border py-2 text-[12px] font-semibold transition-all hover:opacity-80"
                                        style={{ borderColor: 'rgba(116,86,255,0.3)', background: 'rgba(116,86,255,0.10)', color: THEME.accent.primary }}
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Open Dexo AI
                                    </button>
                                </div>

                                {/* Recent activity */}
                                {systemLogs.length > 0 && (
                                    <div
                                        className="rounded-2xl border p-5"
                                        style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}
                                    >
                                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>Recent activity</p>
                                        <ul className="space-y-2">
                                            {systemLogs.slice(0, 4).map((log, i) => (
                                                <li key={log.id} className="flex items-start gap-2">
                                                    <span
                                                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                                                        style={{ background: i === 0 ? THEME.accent.primary : THEME.text.muted }}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[12px]" style={{ color: THEME.text.secondary }}>{log.message}</p>
                                                        <p className="text-[10px]" style={{ color: THEME.text.muted }}>
                                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* â”€â”€ OPERATIONS ROW (living office + delivery) â”€â”€ */}
                        {((livingOffice && livingOffice.brief.greeting !== 'No venture selected.') || upcomingEvents.length > 0 || kanbanTasks.length > 0) && (
                            <div className="grid gap-5 lg:grid-cols-3">
                                {/* Operational brief */}
                                {livingOffice && livingOffice.brief.greeting !== 'No venture selected.' && (
                                    <div
                                        className="rounded-2xl border p-5"
                                        style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}
                                    >
                                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>Daily brief</p>
                                        <p className="text-[13px] leading-relaxed" style={{ color: THEME.text.secondary }}>{livingOffice.brief.greeting}</p>
                                        <div className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: THEME.border.default, background: 'rgba(116,86,255,0.08)' }}>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.accent.primary }}>Focus</p>
                                            <p className="mt-1 text-[13px] font-medium" style={{ color: THEME.text.primary }}>{livingOffice.brief.suggestedFocus}</p>
                                        </div>
                                        {livingOffice.brief.priorities.length > 0 && (
                                            <ul className="mt-3 space-y-1">
                                                {livingOffice.brief.priorities.slice(0, 3).map((p, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: THEME.text.secondary }}>
                                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: THEME.text.muted }} />
                                                        {p}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Upcoming events */}
                                {upcomingEvents.length > 0 && (
                                    <div
                                        className="rounded-2xl border p-5"
                                        style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>Upcoming</p>
                                            <button type="button" onClick={() => switchRoom('calendar')} className="text-[10px] font-medium" style={{ color: THEME.accent.info }}>View all â†’</button>
                                        </div>
                                        <ul className="space-y-2.5">
                                            {upcomingEvents.slice(0, 4).map((ev, idx) => (
                                                <li key={`${ev.date}-${idx}`} className="flex items-start gap-2.5">
                                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: 'rgba(52,211,153,0.12)' }}>
                                                        <Calendar className="h-3.5 w-3.5" style={{ color: '#34d399' }} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[12px] font-medium leading-snug" style={{ color: THEME.text.primary }}>{ev.title}</p>
                                                        <p className="text-[10px]" style={{ color: THEME.text.muted }}>
                                                            {new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} Â· {ev.type}
                                                        </p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Delivery board */}
                                {kanbanTasks.length > 0 && (
                                    <div
                                        className="rounded-2xl border p-5"
                                        style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: THEME.text.muted }}>Delivery board</p>
                                            <button type="button" onClick={() => switchRoom('pm')} className="text-[10px] font-medium" style={{ color: THEME.accent.info }}>Open PM â†’</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {([['To do', kanbanCounts.todo, THEME.text.muted], ['In progress', kanbanCounts.in_progress, THEME.chart.amber], ['Next up', kanbanCounts.next, THEME.chart.blue], ['Done', kanbanCounts.completed, THEME.chart.emerald]] as const).map(([label, n, color]) => (
                                                <div
                                                    key={label}
                                                    className="rounded-xl border px-3 py-2.5 text-center"
                                                    style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.04)' }}
                                                >
                                                    <p className="text-xl font-semibold tabular-nums" style={{ color: THEME.text.primary }}>{n}</p>
                                                    <p className="mt-0.5 text-[10px] font-medium" style={{ color }}>{label}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3">
                                            <div className="mb-1 flex justify-between text-[10px]" style={{ color: THEME.text.muted }}>
                                                <span>Phase progress</span>
                                                <span>{phaseDone}/{phaseTotal || 0}</span>
                                            </div>
                                            <ProgressBar value={phaseDone} max={phaseTotal || 1} color={THEME.chart.violet} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* â”€â”€ AI TOOLS â”€â”€ */}
                        <div
                            className="overflow-hidden rounded-2xl border"
                            style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}
                        >
                            <div className="grid grid-cols-3 divide-x sm:grid-cols-5" style={{ borderColor: THEME.border.subtle }}>
                                {DASH_AI_TOOLS.map(({ label, desc, url, Logo, color }) => (
                                    <a
                                        key={label}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex flex-col items-center gap-2 border-r px-3 py-5 text-center transition-all last:border-r-0 hover:bg-[rgba(255,255,255,0.04)]"
                                        style={{ borderColor: THEME.border.subtle }}
                                    >
                                        <div
                                            className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                                            style={{ background: `${color}14` }}
                                        >
                                            <Logo size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-semibold" style={{ color: THEME.text.primary }}>{label}</p>
                                            <p className="text-[10px]" style={{ color: THEME.text.muted }}>{desc}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* â”€â”€ QUICK ACTIONS â”€â”€ */}
                        <div
                            className="overflow-hidden rounded-2xl border"
                            style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}
                        >
                            <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-3 lg:grid-cols-6">
                                {([
                                    { id: 'ceo', label: 'CEO', sub: 'Strategy', icon: Lightbulb, color: THEME.chart.violet, room: 'ceo' as const },
                                    { id: 'scout', label: 'Scout', sub: 'Market', icon: Globe, color: THEME.chart.blue, room: 'scout' as const },
                                    { id: 'finance', label: 'Finance', sub: 'Budget', icon: Wallet, color: THEME.chart.emerald, room: 'accountant' as const },
                                    { id: 'product', label: 'Product', sub: 'Roadmap', icon: Layers, color: THEME.chart.amber, room: 'pm' as const },
                                    { id: 'pa', label: 'Assistant', sub: 'Support', icon: MessageSquare, color: THEME.chart.cyan, room: 'personal_assistant' as const },
                                    { id: 'dexo', label: 'Dexo AI', sub: 'Command', icon: Cpu, color: THEME.accent.primary, room: 'dexo' as const },
                                ] as const).map(({ label, sub, icon: Icon, color, room }) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => switchRoom(room)}
                                        className="group flex flex-col items-center gap-2 border-[rgba(255,255,255,0.06)] py-5 text-center transition-all hover:bg-[rgba(255,255,255,0.04)]"
                                        style={{ borderColor: THEME.border.subtle }}
                                    >
                                        <div
                                            className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                                            style={{ background: `${color}14` }}
                                        >
                                            <Icon className="h-4 w-4" style={{ color }} />
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-semibold" style={{ color: THEME.text.primary }}>{label}</p>
                                            <p className="text-[10px]" style={{ color: THEME.text.muted }}>{sub}</p>
                                        </div>
                                    </button>
                                ))}
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
                    <div className="flex flex-col gap-4">
                        <DexoOpsPanel activeProject={activeProject} />
                        <DexoDailyBriefPanel activeProject={activeProject} autoRunPulse />
                    </div>
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
    const ventureCount = allProjects.length;
    const withStrategy = allProjects.filter((p: any) => p.strategy?.trim()).length;
    const draft = Math.max(0, allProjects.length - withStrategy);

    const deskStats = useMemo(() => aggregatePortfolioDeskStats(allProjects), [allProjects]);

    const portfolioComposition = [
        { name: 'Active', value: withStrategy, fill: THEME.chart.emerald },
        { name: 'Draft', value: draft, fill: THEME.chart.slate },
    ].filter((d) => d.value > 0);

    const syncAgeMin = Math.max(0, Math.floor((Date.now() - systemState.lastSync) / 60000));
    const syncLabel = syncAgeMin < 60 ? `${syncAgeMin}m ago` : syncAgeMin < 1440 ? `${Math.floor(syncAgeMin / 60)}h ago` : `${Math.floor(syncAgeMin / 1440)}d ago`;
    const synced = allProjects.filter((p: any) => p.agentStaffSnapshot?.at).length;
    const _ = syncLabel; // suppress unused warning

    // Flatten attention items across all ventures (watch list)
    const allAttentionItems = allProjects.flatMap((p: any) =>
        (p.staffAttentionItems ?? [])
            .filter((a: any) => !a.dismissed)
            .map((a: any) => ({ ...a, ventureName: p.name, ventureRef: p }))
    ).slice(0, 8);

    // All focus lines from most-recently-synced venture
    const leadingVenture = [...allProjects]
        .filter((p: any) => p.agentStaffSnapshot?.at)
        .sort((a: any, b: any) => b.agentStaffSnapshot.at - a.agentStaffSnapshot.at)[0] ?? allProjects[0];
    const focusLines: string[] = leadingVenture?.staffFocusToday ?? [];

    return (
        <div className="min-h-screen w-full pb-24" style={{ background: THEME.bg.primary }}>

            {/* â”€â”€â”€ COMMAND HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <header className="border-b px-6 py-5" style={{ borderColor: THEME.border.subtle }}>
                <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(116,86,255,0.12)' }}>
                            <LayoutDashboard className="h-5 w-5" style={{ color: THEME.accent.primary }} />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight" style={{ color: THEME.text.primary }}>Executive Overview</h1>
                            <p className="text-[11px]" style={{ color: THEME.text.muted }}>
                                AI Co-Founder Command Center Â· {ventureCount} venture{ventureCount !== 1 ? 's' : ''} Â· {synced} synced
                            </p>
                        </div>
                    </div>
                    {onNewVenture && (
                        <button onClick={onNewVenture} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90" style={{ background: THEME.accent.primary, color: '#fff' }}>
                            <Sparkles className="h-3.5 w-3.5" /> New Venture
                        </button>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-7xl flex flex-col gap-8 px-3 sm:px-6 py-4 sm:py-6">

                {/* â”€â”€ Morning Intel Brief â”€â”€ */}
                <section>
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#22d3ee' }}>Daily Intel</span>
                            <span className="text-sm font-semibold" style={{ color: THEME.text.primary }}>Morning Intelligence Brief</span>
                        </div>
                        <span className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ borderColor: 'rgba(6,182,212,0.25)', color: '#22d3ee' }}>Tavily Â· live</span>
                    </div>
                    <PortfolioDailyIntelSection allProjects={allProjects} onOpenVenture={setActiveProject} />
                    {allProjects.length === 0 && (
                        <div className="flex flex-col items-center gap-4 rounded-2xl border py-16 text-center" style={{ borderColor: THEME.border.subtle, background: 'rgba(116,86,255,0.04)' }}>
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(116,86,255,0.12)' }}>
                                <Globe className="h-7 w-7" style={{ color: THEME.accent.primary }} />
                            </div>
                            <div className="max-w-sm">
                                <p className="font-semibold" style={{ color: THEME.text.primary }}>No ventures yet</p>
                                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: THEME.text.secondary }}>
                                    Create a venture and run a Staff Sync â€” Dexo will pull live market research from the web and generate a daily briefing for it here.
                                </p>
                            </div>
                            {onNewVenture && (
                                <button onClick={onNewVenture} className="flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold" style={{ borderColor: 'rgba(116,86,255,0.3)', background: 'rgba(116,86,255,0.12)', color: THEME.accent.primary }}>
                                    <Sparkles className="h-4 w-4" /> Create venture
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* â”€â”€ AI Research Desk Briefing â”€â”€ */}
                {leadingVenture?.agentStaffSnapshot && (
                    <section>
                        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: THEME.accent.primary }}>Desk Research</span>
                                <span className="text-sm font-semibold truncate" style={{ color: THEME.text.primary }}>{leadingVenture.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px]" style={{ color: THEME.text.muted }}>
                                    {new Date(leadingVenture.agentStaffSnapshot.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                                <button
                                    onClick={() => setActiveProject(leadingVenture)}
                                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all hover:opacity-80"
                                    style={{ borderColor: 'rgba(116,86,255,0.3)', background: 'rgba(116,86,255,0.10)', color: THEME.accent.primary }}
                                >
                                    <Sparkles className="h-3 w-3" /> Full briefing
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {([
                                { key: 'scout',      label: 'Market Intelligence',  role: 'Scout',           covers: 'Competitor signals Â· trends Â· opportunities', finds: 'Use this to spot threats early and validate market assumptions before committing to any direction.',      color: THEME.chart.blue,    room: 'scout'      as const, icon: Globe     },
                                { key: 'ceo',        label: 'Strategic Direction',  role: 'CEO',             covers: 'Mission Â· vision Â· positioning',              finds: 'Use this to set or challenge your strategy â€” it shapes every other decision across the whole business.',   color: THEME.chart.violet,  room: 'ceo'        as const, icon: Lightbulb },
                                { key: 'pm',         label: 'Product Insights',     role: 'Product Manager', covers: 'Roadmap Â· features Â· user problems',          finds: 'Use this to decide what ships next and what gets cut. It directly drives your roadmap and sprint focus.',   color: THEME.chart.amber,   room: 'pm'         as const, icon: Layers    },
                                { key: 'accountant', label: 'Finance & Runway',     role: 'Accountant',      covers: 'Budget Â· burn Â· revenue signals',             finds: 'Read this before any spending or pricing call â€” it shows your real constraints and revenue opportunities.',   color: THEME.chart.emerald, room: 'accountant' as const, icon: Wallet    },
                                { key: 'cmo',        label: 'Growth & GTM',         role: 'CMO',             covers: 'Marketing Â· channels Â· acquisition',          finds: 'Use this to pick your channels and craft messaging before spending anything on marketing or sales.',          color: THEME.chart.rose,    room: 'cmo'        as const, icon: Megaphone },
                                { key: 'summary',    label: 'Executive Synthesis',  role: 'Chief of Staff',  covers: 'Cross-desk synthesis Â· executive brief',      finds: 'Read this first â€” it synthesizes all six desks into one brief. The fastest way to see the full picture.',    color: THEME.accent.primary, room: null,                  icon: Cpu       },
                            ] as const).map(({ key, label, role, covers, finds, color, room, icon: DeskIcon }) => {
                                const snap = key === 'summary'
                                    ? leadingVenture.agentStaffSnapshot.summary
                                    : leadingVenture.agentStaffSnapshot.desks?.[key as 'scout'|'ceo'|'pm'|'accountant'|'cmo'];
                                const hasContent = !!snap?.trim();
                                return (
                                    <div key={key}
                                        className="flex flex-col overflow-hidden rounded-2xl border"
                                        style={{
                                            borderColor: hasContent ? `${color}35` : THEME.border.subtle,
                                            background: hasContent ? `${color}07` : 'rgba(255,255,255,0.02)',
                                        }}
                                    >
                                        {/* Desk card header */}
                                        <div className="flex items-center justify-between gap-2 border-b px-4 py-3" style={{ borderColor: `${color}20`, background: `${color}05` }}>
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
                                                    <DeskIcon className="h-4 w-4" style={{ color }} />
                                                </div>
                                                <div>
                                                    <p className="text-[12px] font-semibold leading-tight" style={{ color: THEME.text.primary }}>{label}</p>
                                                    <p className="text-[10px] font-medium" style={{ color }}>{role}</p>
                                                </div>
                                            </div>
                                            {room && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setActiveProject(leadingVenture); switchRoom(room); }}
                                                    className="shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition-all hover:opacity-80"
                                                    style={{ borderColor: `${color}35`, background: `${color}12`, color }}
                                                >
                                                    Open desk â†’
                                                </button>
                                            )}
                                        </div>

                                        {/* Desk card body */}
                                        <div className="flex flex-1 flex-col gap-3 p-4">
                                            {hasContent ? (
                                                <>
                                                    {/* Research finding label */}
                                                    <div>
                                                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color }}>
                                                            Research Finding
                                                        </p>
                                                        <p className="text-[12px] leading-relaxed" style={{ color: THEME.text.secondary }}>
                                                            {snap!.trim().length > 400 ? `${snap!.trim().slice(0, 397)}â€¦` : snap!.trim()}
                                                        </p>
                                                    </div>
                                                    {/* Why it matters reasoning block */}
                                                    <div className="mt-auto space-y-1.5 rounded-xl border px-3 py-2.5" style={{ borderColor: `${color}20`, background: `${color}08` }}>
                                                        <p className="text-[10px] leading-snug" style={{ color: THEME.text.secondary }}>
                                                            <span className="font-bold" style={{ color }}>How to use this Â· </span>
                                                            {finds}
                                                        </p>
                                                        <p className="text-[9px]" style={{ color: THEME.text.muted }}>
                                                            Covers: {covers}
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                                                    <DeskIcon className="h-7 w-7 opacity-15" style={{ color }} />
                                                    <p className="text-[11px] font-medium" style={{ color: THEME.text.muted }}>No research yet</p>
                                                    <p className="max-w-[180px] text-[10px] leading-snug" style={{ color: THEME.text.muted }}>
                                                        Run Staff Sync Â· covers {covers}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* â”€â”€ Decision Queue â”€â”€ */}
                {(allAttentionItems.length > 0 || focusLines.length > 0) && (
                    <section>
                        <div className="mb-4 flex items-center gap-3 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#f59e0b' }}>Decisions</span>
                            <span className="text-sm font-semibold" style={{ color: THEME.text.primary }}>Decision Queue</span>
                            {allAttentionItems.length > 0 && (
                                <span className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.10)', color: '#f59e0b' }}>
                                    {allAttentionItems.length} pending
                                </span>
                            )}
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

                            {/* Flagged signals */}
                            {allAttentionItems.length > 0 && (
                                <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(245,158,11,0.25)' }}>
                                    <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.06)' }}>
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: '#f59e0b' }} />
                                        <span className="text-[11px] font-semibold" style={{ color: '#f59e0b' }}>Flagged for your decision</span>
                                    </div>
                                    <div>
                                        {allAttentionItems.map((a: any) => {
                                            const roleAccent = (PORTFOLIO_DESK_ACCENTS as Record<string, string>)[a.role] ?? '#f59e0b';
                                            const roleLabel  = (RESEARCH_STAFF as Record<string, any>)[a.role]?.navTitle ?? (a.role ?? 'AI Team');
                                            const createdAgo = a.createdAt ? (() => {
                                                const mins = Math.max(0, Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 60000));
                                                return mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
                                            })() : null;
                                            return (
                                                <div key={a.id}
                                                    className="border-b last:border-b-0"
                                                    style={{ borderColor: 'rgba(245,158,11,0.08)', borderLeft: `3px solid ${roleAccent}` }}
                                                >
                                                    <div className="flex items-start justify-between gap-3 px-5 py-4">
                                                        <div className="min-w-0 flex-1">
                                                            {/* Who flagged it + which venture + when */}
                                                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                                                <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${roleAccent}15`, color: roleAccent }}>
                                                                    {roleLabel}
                                                                </span>
                                                                <span className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: 'rgba(255,255,255,0.07)', color: THEME.text.secondary }}>
                                                                    {a.ventureName}
                                                                </span>
                                                                {createdAgo && (
                                                                    <span className="text-[10px]" style={{ color: THEME.text.muted }}>{createdAgo}</span>
                                                                )}
                                                            </div>
                                                            {/* Signal title */}
                                                            <p className="text-[13px] font-semibold leading-snug" style={{ color: THEME.text.primary }}>{a.title}</p>
                                                            {/* Full message â€” not truncated */}
                                                            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: THEME.text.secondary }}>{a.message}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setActiveProject(a.ventureRef); switchRoom('dexo'); }}
                                                            className="shrink-0 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all hover:opacity-80"
                                                            style={{ borderColor: 'rgba(116,86,255,0.3)', background: 'rgba(116,86,255,0.10)', color: THEME.accent.primary }}
                                                        >
                                                            Discuss â†’
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Dexo's recommended actions today */}
                            {focusLines.length > 0 && (
                                <div className="flex flex-col overflow-hidden rounded-2xl border" style={{ borderColor: THEME.border.subtle }}>
                                    <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: THEME.border.subtle, background: 'rgba(116,86,255,0.05)' }}>
                                        <Target className="h-3.5 w-3.5 shrink-0" style={{ color: THEME.accent.primary }} />
                                        <span className="text-[11px] font-semibold" style={{ color: THEME.text.primary }}>Dexo&apos;s focus picks</span>
                                        <span className="ml-auto text-[10px]" style={{ color: THEME.text.muted }}>{leadingVenture?.name ?? 'venture'}</span>
                                    </div>
                                    <ol className="flex-1 divide-y" style={{ borderColor: THEME.border.subtle }}>
                                        {focusLines.slice(0, 7).map((line, i) => (
                                            <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums" style={{ background: 'rgba(116,86,255,0.15)', color: THEME.accent.primary }}>
                                                    {i + 1}
                                                </span>
                                                <p className="text-[12px] leading-snug" style={{ color: THEME.text.secondary }}>{line}</p>
                                            </li>
                                        ))}
                                    </ol>
                                    <div className="border-t px-5 py-3" style={{ borderColor: THEME.border.subtle }}>
                                        <button type="button" onClick={() => leadingVenture && setActiveProject(leadingVenture)} className="text-[11px] font-semibold" style={{ color: THEME.accent.info }}>
                                            Open {leadingVenture?.name ?? 'venture'} to discuss these â†’
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* â”€â”€ Venture Workspaces â”€â”€ */}
                <section>
                    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: THEME.chart.emerald }}>Workspaces</span>
                            <span className="text-sm font-semibold" style={{ color: THEME.text.primary }}>Venture Workspaces</span>
                        </div>
                        {onNewVenture && (
                            <button onClick={onNewVenture} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold hover:opacity-80" style={{ background: 'rgba(116,86,255,0.12)', color: THEME.accent.primary }}>
                                <Sparkles className="h-3 w-3" /> New venture
                            </button>
                        )}
                    </div>
                    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                        {/* Venture cards grid */}
                        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}>
                            {allProjects.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 py-14 text-center">
                                    <Briefcase className="h-8 w-8" style={{ color: THEME.text.muted }} />
                                    <p className="text-sm" style={{ color: THEME.text.muted }}>No ventures yet.</p>
                                </div>
                            ) : (
                                <div className="grid gap-px bg-[rgba(255,255,255,0.05)] sm:grid-cols-2">
                                    {allProjects.map((project: any) => {
                                        const hasStrategy = !!project.strategy?.trim();
                                        const hasSynced   = !!project.agentStaffSnapshot?.at;
                                        const excerpt     = project.agentStaffSnapshot?.summary?.trim() || project.strategy?.trim();
                                        const syncedAt    = project.agentStaffSnapshot?.at;
                                        const syncAge     = syncedAt ? Math.max(0, Math.floor((Date.now() - syncedAt) / 60000)) : null;
                                        const syncAgo     = syncAge === null ? null : syncAge < 60 ? `${syncAge}m ago` : syncAge < 1440 ? `${Math.floor(syncAge / 60)}h ago` : `${Math.floor(syncAge / 1440)}d ago`;
                                        const desks       = project.agentStaffSnapshot?.desks;
                                        const coveredDesks = desks ? (['ceo','pm','accountant','scout','cmo'] as const).filter(d => !!desks[d]?.trim()).length : 0;
                                        return (
                                            <button key={project.id} type="button" onClick={() => setActiveProject(project)}
                                                className="group flex flex-col gap-3 bg-[rgba(14,14,16,0.95)] p-5 text-left transition-all hover:bg-[rgba(255,255,255,0.03)]"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: hasStrategy ? 'rgba(116,86,255,0.12)' : 'rgba(255,255,255,0.06)' }}>
                                                            <Briefcase className="h-4 w-4" style={{ color: hasStrategy ? THEME.accent.primary : THEME.text.muted }} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold leading-snug" style={{ color: THEME.text.primary }}>{project.name}</p>
                                                            <p className="text-[10px]" style={{ color: THEME.text.muted }}>{new Date(project.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={hasStrategy ? 'active' : 'pending'} />
                                                </div>
                                                {excerpt ? (
                                                    <p className="line-clamp-2 text-[12px] leading-relaxed" style={{ color: THEME.text.secondary }}>{excerpt.slice(0, 180)}{excerpt.length > 180 ? 'â€¦' : ''}</p>
                                                ) : (
                                                    <p className="text-[12px]" style={{ color: THEME.text.muted }}>No strategy yet â€” open CEO desk.</p>
                                                )}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {hasSynced ? (
                                                            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'rgba(116,86,255,0.12)', color: THEME.accent.primary }}>
                                                                <Zap className="h-2.5 w-2.5" /> Synced {syncAgo}
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'rgba(255,255,255,0.07)', color: THEME.text.muted }}>Not synced</span>
                                                        )}
                                                        {coveredDesks > 0 && (
                                                            <span className="text-[10px] font-medium" style={{ color: THEME.text.muted }}>{coveredDesks}/5 desks</span>
                                                        )}
                                                    </div>
                                                    <span className="flex items-center gap-0.5 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100" style={{ color: THEME.accent.info }}>
                                                        Open <ChevronRight className="h-3.5 w-3.5" />
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Research desk coverage sidebar */}
                        <div className="flex flex-col gap-4">
                            <div className="overflow-hidden rounded-2xl border" style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}>
                                <div className="border-b px-5 py-3.5" style={{ borderColor: THEME.border.subtle }}>
                                    <p className="text-[12px] font-semibold" style={{ color: THEME.text.primary }}>Research Desk Coverage</p>
                                    <p className="mt-0.5 text-[10px]" style={{ color: THEME.text.muted }}>% of ventures with AI research at each desk</p>
                                </div>
                                <div>
                                    {(['ceo', 'accountant', 'pm', 'cmo', 'scout'] as const).map((role) => {
                                        const row    = RESEARCH_STAFF[role];
                                        const stat   = deskStats[role];
                                        const accent = PORTFOLIO_DESK_ACCENTS[role];
                                        const pct    = stat.total === 0 ? 0 : Math.round(stat.coverage * 100);
                                        return (
                                            <button type="button" key={role}
                                                onClick={() => { const t = firstProjectNeedingRole(allProjects, role); if (t) { setActiveProject(t); switchRoom(role); } }}
                                                className="group flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[rgba(255,255,255,0.03)]"
                                                style={{ borderColor: THEME.border.subtle }}
                                            >
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: `${accent}14` }}>
                                                    <BarChart2 className="h-3 w-3" style={{ color: accent }} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1 mb-1">
                                                        <p className="text-[11px] font-medium" style={{ color: THEME.text.primary }}>{row.navTitle}</p>
                                                        <span className="text-[10px] tabular-nums font-semibold" style={{ color: pct === 100 ? accent : THEME.text.muted }}>{stat.total === 0 ? 'â€”' : `${pct}%`}</span>
                                                    </div>
                                                    <div className="h-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}99, ${accent})` }} />
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Ventures', value: String(ventureCount), accent: THEME.chart.violet },
                                    { label: 'AI Synced', value: String(synced),       accent: THEME.chart.amber  },
                                ].map(({ label, value, accent }) => (
                                    <div key={label} className="rounded-xl border p-3 text-center" style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.03)' }}>
                                        <p className="text-xl font-bold tabular-nums" style={{ color: THEME.text.primary }}>{value}</p>
                                        <p className="text-[10px] font-medium" style={{ color: accent }}>{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* â”€â”€ Tools & Workspace Navigator â”€â”€ */}
                <section>
                    <div className="mb-4 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: THEME.text.muted }}>Tools</span>
                        <span className="text-sm font-semibold" style={{ color: THEME.text.primary }}>Workspace Navigator</span>
                    </div>
                    <div className="flex flex-col gap-4">
                        {/* AI Tools row */}
                        <div>
                            <div className="overflow-hidden rounded-2xl border" style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}>
                                <div className="grid grid-cols-3 sm:grid-cols-5">
                                    {DASH_AI_TOOLS.map(({ label, desc, url, Logo, color }) => (
                                        <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                                            className="group flex flex-col items-center gap-2.5 border-r px-4 py-6 text-center transition-all last:border-r-0 hover:bg-[rgba(255,255,255,0.04)]"
                                            style={{ borderColor: THEME.border.subtle }}
                                        >
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110" style={{ background: `${color}14` }}>
                                                <Logo size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-semibold" style={{ color: THEME.text.primary }}>{label}</p>
                                                <p className="text-[10px]" style={{ color: THEME.text.muted }}>{desc}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Desk navigator */}
                        <div>
                            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: THEME.text.muted }}>Desk Navigator â€” Jump to any room</p>
                            <div className="overflow-hidden rounded-2xl border" style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.02)' }}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                                    {([
                                        { role: 'ceo'        as const, label: 'CEO Desk', sub: 'Strategy & Vision',  icon: Lightbulb, color: THEME.chart.violet  },
                                        { role: 'scout'      as const, label: 'Scout',    sub: 'Market Research',    icon: Globe,     color: THEME.chart.blue    },
                                        { role: 'accountant' as const, label: 'Finance',  sub: 'Budget & Runway',    icon: Wallet,    color: THEME.chart.emerald },
                                        { role: 'pm'         as const, label: 'Product',  sub: 'Roadmap & Features', icon: Layers,    color: THEME.chart.amber   },
                                        { role: 'cmo'        as const, label: 'Growth',   sub: 'GTM & Acquisition',  icon: Megaphone, color: THEME.chart.rose    },
                                        { role: null,                  label: 'Dexo AI',  sub: 'Discuss & Plan',     icon: Cpu,       color: THEME.accent.primary },
                                    ] as const).map(({ role, label, sub, icon: Icon, color }) => (
                                        <button key={label} type="button"
                                            onClick={() => {
                                                if (!role) { if (leadingVenture) setActiveProject(leadingVenture); switchRoom('dexo'); return; }
                                                const target = firstProjectNeedingRole(allProjects, role) ?? allProjects[0];
                                                if (target) { setActiveProject(target); switchRoom(role); }
                                            }}
                                            className="group flex flex-col items-center gap-2 border-r border-b py-5 text-center transition-all last-of-type:border-r-0 hover:bg-[rgba(255,255,255,0.04)]"
                                            style={{ borderColor: THEME.border.subtle }}
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110" style={{ background: `${color}14` }}>
                                                <Icon className="h-4.5 w-4.5" style={{ color }} />
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-semibold" style={{ color: THEME.text.primary }}>{label}</p>
                                                <p className="text-[10px]" style={{ color: THEME.text.muted }}>{sub}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

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
        <div className="flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
                {/* PHASE STATUS */}
                <Card className="p-5">
                    <SectionHeader
                        title="Phase Status"
                        subtitle="Timeline distribution"
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
                <Card className="p-5">
                    <SectionHeader
                        title="Priority Completion"
                        subtitle="Open vs completed"
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
        <div className="flex flex-col gap-4">
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

