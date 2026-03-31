'use client';

import React, { useState, useEffect, useId, useMemo } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import {
    Zap,
    TrendingUp,
    Activity,
    Target,
    Clock,
} from 'lucide-react';
import {
    ComposedChart,
    Area,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    ReferenceLine,
} from 'recharts';

const FOCUS = '#818cf8';
const ENERGY = '#e879f9';

type DemoTooltipProps = {
    active?: boolean;
    label?: string;
    payload?: ReadonlyArray<{ value?: number; dataKey?: string | number; color?: string; name?: string }>;
};

function DemoMomentumTooltip({ active, label, payload }: DemoTooltipProps) {
    if (!active || !payload?.length) return null;
    const pick = (key: string) =>
        payload.find((p) => p.dataKey === key || String(p.name) === key);
    const focus = pick('focus');
    const energy = pick('energy');
    return (
        <div className="min-w-[200px] rounded-xl border border-zinc-700/90 bg-zinc-950/98 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-md">
            <p className="mb-3 border-b border-zinc-800 pb-2 font-mono text-[11px] font-semibold tabular-nums text-zinc-300">{label}</p>
            <div className="space-y-2.5">
                {focus != null && (
                    <div className="flex items-center justify-between gap-8">
                        <span className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.6)]" style={{ background: FOCUS }} />
                            Focus
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-zinc-100">{focus.value ?? 0}</span>
                    </div>
                )}
                {energy != null && (
                    <div className="flex items-center justify-between gap-8">
                        <span className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(232,121,249,0.5)]" style={{ background: ENERGY }} />
                            Energy
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-zinc-100">{energy.value ?? 0}</span>
                    </div>
                )}
            </div>
            <p className="mt-3 border-t border-zinc-800/80 pt-2 text-[9px] leading-relaxed text-zinc-600">
                Demo index 0–100 · static sample, not live data
            </p>
        </div>
    );
}

export function FoundersOffice() {
    const { systemState, toggleDeepWork } = useOffice();
    const deepWorkMode = systemState.isDeepWork;
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const chartUid = useId().replace(/:/g, '');
    const [focusData] = useState([
        { time: '09:00', focus: 30, energy: 40 },
        { time: '10:00', focus: 85, energy: 70 },
        { time: '11:00', focus: 90, energy: 85 },
        { time: '12:00', focus: 45, energy: 50 },
        { time: '13:00', focus: 75, energy: 65 },
        { time: '14:00', focus: 95, energy: 90 },
        { time: '15:00', focus: 80, energy: 75 },
    ]);
    const focusSummary = useMemo(() => {
        const f = focusData.map((d) => d.focus);
        const e = focusData.map((d) => d.energy);
        const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
        return { focusAvg: avg(f), energyAvg: avg(e) };
    }, [focusData]);

    return (
        <div className={`flex flex-col h-full overflow-y-auto custom-scrollbar transition-colors duration-700 font-sans ${deepWorkMode ? 'bg-black text-white' : 'bg-zinc-950 text-zinc-100'}`}>

            {/* Header Section */}
            <header className="px-10 py-12 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-6xl mx-auto flex justify-between items-end">
                    <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest mb-2 text-zinc-500">
                            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h5>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white">
                            Good Morning, Founder.
                        </h1>
                        <p className="text-lg font-medium text-zinc-400">
                            Workspace view — <span className="text-zinc-300">no critical alerts</span> surfaced here. Capacity and financial figures below are{' '}
                            <span className="font-semibold text-zinc-300">illustrative placeholders</span>, not live telemetry.
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                            <div className="text-3xl font-bold font-mono tracking-tight text-white">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                                Local Time
                            </div>
                        </div>
                        <button
                            onClick={() => toggleDeepWork(!deepWorkMode)}
                            className={`group relative overflow-hidden rounded-2xl px-6 py-4 transition-all shadow-lg border ${deepWorkMode
                                ? 'bg-zinc-900 border-zinc-800 hover:border-violet-500/50'
                                : 'bg-zinc-900 border-zinc-800 hover:border-indigo-500/50'
                                }`}
                        >
                            <div className="relative z-10 flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${deepWorkMode ? 'bg-black text-violet-400' : 'bg-black text-indigo-400'}`}>
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                        Focus Mode
                                    </div>
                                    <div className="text-sm font-bold text-white">
                                        {deepWorkMode ? 'Active Protocol' : 'Standard Ops'}
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Dashboard Content */}
            <main className="flex-1 px-10 py-10">
                <div className="max-w-6xl mx-auto space-y-10">

                    {/* Key metrics — labeled demo so numbers are not mistaken for real KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Runway', value: '—', hint: 'Demo', icon: Activity },
                            { label: 'Burn rate', value: '—', hint: 'Demo', icon: TrendingUp },
                            { label: 'Active users', value: '—', hint: 'Demo', icon: Target },
                            { label: 'System health', value: '—', hint: 'Demo', icon: Zap },
                        ].map((stat, idx) => (
                            <div
                                key={idx}
                                className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/40 transition-all hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/60 shadow-lg"
                                title="Placeholder — connect your data source for real KPIs"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2.5 rounded-xl bg-black border border-zinc-800 text-zinc-400">
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-zinc-800 bg-zinc-950 text-zinc-500">
                                        {stat.hint}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider mb-1 text-zinc-500">{stat.label}</div>
                                    <div className="text-2xl font-extrabold tracking-tight text-zinc-500">{stat.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Central Visualization Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Main Chart Card */}
                        <div className="lg:col-span-2 p-8 rounded-3xl border border-zinc-900 bg-zinc-900/30 shadow-xl">
                            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-8">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/90 mb-1">Demo visualization</p>
                                    <h3 className="text-lg font-bold text-white">Sample focus &amp; energy curve</h3>
                                    <p className="text-sm font-medium text-zinc-500 mt-1 max-w-xl">
                                        Static sample data for layout only — not real-time team output, biometrics, or energy telemetry.
                                    </p>
                                </div>
                                <div
                                    className="flex bg-black rounded-lg p-1 border border-zinc-800 shrink-0 opacity-60"
                                    title="Time ranges are not wired — demo only"
                                    aria-label="Time range controls (disabled, demo)"
                                >
                                    {['12H', '24H', '7D'].map((period) => (
                                        <button
                                            key={period}
                                            type="button"
                                            disabled
                                            className="px-3 py-1 text-xs font-bold text-zinc-600 rounded-md cursor-not-allowed"
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950/90 via-black/40 to-zinc-950/80 px-4 py-3">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Sample avg</span>
                                    <span className="font-mono text-lg font-semibold tabular-nums text-indigo-300">{focusSummary.focusAvg}</span>
                                    <span className="text-zinc-600">/</span>
                                    <span className="font-mono text-lg font-semibold tabular-nums text-fuchsia-300">{focusSummary.energyAvg}</span>
                                </div>
                                <span className="text-[10px] text-zinc-600">Focus · Energy (demo indices)</span>
                            </div>

                            <div
                                className="relative h-[min(360px,52vh)] min-h-[280px] w-full touch-manipulation overflow-hidden rounded-2xl border border-zinc-800/60 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.12),transparent_50%)] [-webkit-tap-highlight-color:transparent] select-none"
                                role="img"
                                aria-label="Demo chart: sample focus index as area and energy index as line, 0 to 100 by time of day"
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={focusData}
                                        margin={{ top: 28, right: 12, left: 0, bottom: 8 }}
                                    >
                                        <defs>
                                            <linearGradient id={`${chartUid}-focusFill`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={FOCUS} stopOpacity={0.45} />
                                                <stop offset="45%" stopColor={FOCUS} stopOpacity={0.12} />
                                                <stop offset="100%" stopColor={FOCUS} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            strokeDasharray="4 8"
                                            vertical={false}
                                            stroke="#3c4043"
                                            strokeOpacity={0.85}
                                        />
                                        <ReferenceLine
                                            y={50}
                                            stroke="#3f3f46"
                                            strokeDasharray="6 6"
                                            strokeOpacity={0.9}
                                        />
                                        <XAxis
                                            dataKey="time"
                                            axisLine={false}
                                            tickLine={false}
                                            tickMargin={12}
                                            tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
                                            dy={4}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            domain={[0, 100]}
                                            ticks={[0, 25, 50, 75, 100]}
                                            width={36}
                                            tick={{ fill: '#71717a', fontSize: 10, fontWeight: 500 }}
                                            tickFormatter={(v) => `${v}`}
                                        />
                                        <Tooltip
                                            content={<DemoMomentumTooltip />}
                                            // Recharts default cursor rectangle uses a light fill if `fill` is omitted — reads as a white flash on dark UI.
                                            cursor={{
                                                stroke: '#52525b',
                                                strokeWidth: 1,
                                                strokeDasharray: '4 4',
                                                fill: 'rgba(24, 24, 27, 0.45)',
                                            }}
                                            animationDuration={200}
                                            wrapperStyle={{ outline: 'none' }}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            align="right"
                                            iconType="circle"
                                            iconSize={8}
                                            wrapperStyle={{ paddingBottom: 8, fontSize: '11px', fontWeight: 600 }}
                                            formatter={(value) => (
                                                <span className="text-zinc-400">{value === 'focus' ? 'Focus (area)' : 'Energy (line)'}</span>
                                            )}
                                        />
                                        <Area
                                            type="natural"
                                            dataKey="focus"
                                            name="focus"
                                            stroke={FOCUS}
                                            strokeWidth={2.5}
                                            fill={`url(#${chartUid}-focusFill)`}
                                            fillOpacity={1}
                                            dot={false}
                                            activeDot={{
                                                r: 6,
                                                stroke: '#1e1e1e',
                                                strokeWidth: 2,
                                                fill: FOCUS,
                                            }}
                                            isAnimationActive
                                            animationDuration={900}
                                            animationEasing="ease-out"
                                        />
                                        <Line
                                            type="natural"
                                            dataKey="energy"
                                            name="energy"
                                            stroke={ENERGY}
                                            strokeWidth={2.75}
                                            dot={false}
                                            activeDot={{
                                                r: 5,
                                                stroke: '#1e1e1e',
                                                strokeWidth: 2,
                                                fill: ENERGY,
                                            }}
                                            isAnimationActive
                                            animationDuration={1100}
                                            animationEasing="ease-out"
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-600">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-px w-4 border-t border-dashed border-zinc-600" aria-hidden />
                                    Mid reference at 50
                                </span>
                                <span className="text-zinc-700">·</span>
                                Y-axis is a 0–100 demo index only — not measured output or biometrics.
                            </p>
                        </div>

                        {/* Side Activity Card */}
                        <div className="p-8 rounded-3xl border border-zinc-900 bg-zinc-900/30 flex flex-col shadow-xl">
                            <div className="mb-6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/90 mb-1">Sample copy</p>
                                <h3 className="text-lg font-bold text-white">Intelligence feed (examples)</h3>
                                <p className="text-xs text-zinc-500 mt-1">Fictional items to show layout — not live intel from your stack.</p>
                            </div>

                            <div className="flex-1 space-y-6">
                                {[
                                    { title: 'Example: competitor', desc: 'Sample headline — replace with real alerts when connected', time: 'demo', type: 'alert' },
                                    { title: 'Example: milestone', desc: 'Sample headline — not your revenue data', time: 'demo', type: 'success' },
                                    { title: 'Example: ops signal', desc: 'Sample headline — not your infrastructure', time: 'demo', type: 'info' },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className={`w-2 h-full shrink-0 rounded-full opacity-70 transition-opacity group-hover:opacity-100 ${item.type === 'alert' ? 'bg-rose-500' : item.type === 'success' ? 'bg-violet-500' : 'bg-indigo-500'}`} />
                                        <div>
                                            <h4 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{item.title}</h4>
                                            <p className="text-xs text-zinc-500 font-medium leading-relaxed mt-1 group-hover:text-zinc-400 transition-colors">
                                                {item.desc}
                                            </p>
                                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-2 block">
                                                {item.time}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                disabled
                                className="w-full py-4 rounded-xl text-sm font-bold mt-6 cursor-not-allowed bg-zinc-950 text-zinc-600 border border-zinc-800"
                                title="No live feed connected yet"
                            >
                                Connect data for real intelligence
                            </button>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
