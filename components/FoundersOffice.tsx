'use client';

import React, { useState, useEffect, useId, useMemo } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { Zap, TrendingUp, Activity, Target, Clock } from 'lucide-react';
import {
    ComposedChart,
    Area,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
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
    const pick = (key: string) => payload.find((p) => p.dataKey === key || String(p.name) === key);
    const focus = pick('focus');
    const energy = pick('energy');
    return (
        <div className="min-w-[160px] rounded-xl border border-zinc-700/90 bg-zinc-950/98 px-3 py-2.5 shadow-2xl shadow-black/50 backdrop-blur-md">
            <p className="mb-2 border-b border-zinc-800 pb-1.5 font-mono text-[10px] font-semibold tabular-nums text-zinc-300">{label}</p>
            <div className="flex flex-col gap-1.5">
                {focus != null && (
                    <div className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                            <span className="h-2 w-2 rounded-full" style={{ background: FOCUS }} />
                            Focus
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums text-zinc-100">{focus.value ?? 0}</span>
                    </div>
                )}
                {energy != null && (
                    <div className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                            <span className="h-2 w-2 rounded-full" style={{ background: ENERGY }} />
                            Energy
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums text-zinc-100">{energy.value ?? 0}</span>
                    </div>
                )}
            </div>
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
        <div
            className={`flex flex-col gap-4 p-4 sm:gap-5 sm:p-5 lg:p-6 font-sans transition-colors duration-700 ${
                deepWorkMode ? 'bg-black text-white' : 'bg-zinc-950 text-zinc-100'
            }`}
        >
            {/* ── Top bar: date · time · focus mode ── */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-zinc-700 hidden sm:inline">·</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-zinc-300 hidden sm:inline">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <button
                    onClick={() => toggleDeepWork(!deepWorkMode)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                        deepWorkMode
                            ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-indigo-500/40 hover:text-indigo-300'
                    }`}
                >
                    <Zap className="h-3.5 w-3.5" />
                    {deepWorkMode ? 'Focus: on' : 'Focus'}
                </button>
            </div>

            {/* ── KPI strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                    { label: 'Runway', icon: Activity },
                    { label: 'Burn rate', icon: TrendingUp },
                    { label: 'Active users', icon: Target },
                    { label: 'System health', icon: Clock },
                ].map((stat, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-3 rounded-xl border border-zinc-900 bg-zinc-900/40 px-3 py-3 sm:px-4"
                        title="Placeholder — connect your data source for real KPIs"
                    >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black border border-zinc-800 text-zinc-500">
                            <stat.icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">{stat.label}</p>
                            <p className="text-base font-extrabold tracking-tight text-zinc-600 tabular-nums">—</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Main grid: chart + feed ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">

                {/* Chart */}
                <div className="lg:col-span-2 rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-500/80">Demo</span>
                            <span className="text-xs font-semibold text-zinc-300">Focus &amp; energy</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-mono text-sm font-semibold text-indigo-300 tabular-nums">{focusSummary.focusAvg}</span>
                            <span className="text-zinc-700 text-xs">/</span>
                            <span className="font-mono text-sm font-semibold text-fuchsia-300 tabular-nums">{focusSummary.energyAvg}</span>
                            <span className="text-[10px] text-zinc-600">avg</span>
                        </div>
                    </div>

                    <div
                        className="relative h-[min(280px,44vh)] min-h-[200px] w-full overflow-hidden rounded-xl border border-zinc-800/60 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.10),transparent_50%)] select-none touch-manipulation"
                        role="img"
                        aria-label="Demo chart: focus and energy indices by time of day"
                    >
                        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                            <ComposedChart data={focusData} margin={{ top: 20, right: 8, left: 0, bottom: 4 }}>
                                <defs>
                                    <linearGradient id={`${chartUid}-focusFill`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={FOCUS} stopOpacity={0.40} />
                                        <stop offset="50%" stopColor={FOCUS} stopOpacity={0.08} />
                                        <stop offset="100%" stopColor={FOCUS} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="#3c4043" strokeOpacity={0.7} />
                                <ReferenceLine y={50} stroke="#3f3f46" strokeDasharray="6 6" strokeOpacity={0.8} />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tickMargin={10} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 50, 100]} width={28} tick={{ fill: '#71717a', fontSize: 10 }} />
                                <Tooltip
                                    content={<DemoMomentumTooltip />}
                                    cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4', fill: 'rgba(24,24,27,0.4)' }}
                                    animationDuration={150}
                                    wrapperStyle={{ outline: 'none' }}
                                />
                                <Area type="natural" dataKey="focus" name="focus" stroke={FOCUS} strokeWidth={2.5} fill={`url(#${chartUid}-focusFill)`} fillOpacity={1} dot={false} activeDot={{ r: 5, stroke: '#1e1e1e', strokeWidth: 2, fill: FOCUS }} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                                <Line type="natural" dataKey="energy" name="energy" stroke={ENERGY} strokeWidth={2.5} dot={false} activeDot={{ r: 4, stroke: '#1e1e1e', strokeWidth: 2, fill: ENERGY }} isAnimationActive animationDuration={1100} animationEasing="ease-out" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-2 flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                            <span className="h-2 w-2 rounded-full" style={{ background: FOCUS }} />Focus
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                            <span className="h-2 w-2 rounded-full" style={{ background: ENERGY }} />Energy
                        </span>
                        <span className="text-[10px] text-zinc-700 ml-auto">0–100 demo index</span>
                    </div>
                </div>

                {/* Intelligence feed */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 sm:p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300">Intel feed</span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-500/80">Sample</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        {[
                            { title: 'Competitor signal', time: 'demo', type: 'alert' as const },
                            { title: 'Milestone reached', time: 'demo', type: 'success' as const },
                            { title: 'Ops signal', time: 'demo', type: 'info' as const },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 group">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                    item.type === 'alert' ? 'bg-rose-500' : item.type === 'success' ? 'bg-violet-500' : 'bg-indigo-500'
                                }`} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-medium text-zinc-200">{item.title}</p>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{item.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        disabled
                        className="mt-auto w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 text-xs font-bold text-zinc-600 cursor-not-allowed"
                    >
                        Connect data
                    </button>
                </div>
            </div>
        </div>
    );
}
