'use client';

import React, { useState, useEffect } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { Target, TrendingUp, Save, Plus, Rocket, Flag } from 'lucide-react';

interface KeyResult {
    id: string;
    label: string;
    current: number;
    target: number;
    unit: string;
}

interface Objective {
    id: string;
    title: string;
    progress: number;
    keyResults: KeyResult[];
}

export function StrategyCanvas() {
    const { activeProject, updateProjectField } = useOffice();
    const [mission, setMission] = useState('');
    const [vision, setVision] = useState('');
    const [objectives, setObjectives] = useState<Objective[]>([]);
    const [kpis] = useState([
        { label: 'Monthly Recurring Revenue', value: '$0', change: '+0%' },
        { label: 'Burn Rate', value: '$0', change: '0%' },
        { label: 'Runway', value: '0 Months', change: '0%' },
        { label: 'CAC', value: '$0', change: '0%' },
    ]);

    useEffect(() => {
        if (activeProject) {
            const strategyData = safeParse(activeProject.strategy);
            setMission(strategyData.mission || '');
            setVision(strategyData.vision || '');
            setObjectives(strategyData.objectives || defaultObjectives);
        }
    }, [activeProject]);

    const handleSave = () => {
        if (!activeProject) return;
        updateProjectField('strategy', JSON.stringify({ mission, vision, objectives, kpis }));
    };

    const toggleKeyResult = (objId: string, krId: string, val: number) => {
        const updated = objectives.map(obj => {
            if (obj.id !== objId) return obj;
            const newKRs = obj.keyResults.map(kr => kr.id === krId ? { ...kr, current: val } : kr);
            const progress = Math.round(newKRs.reduce((acc, kr) => acc + kr.current / kr.target, 0) / newKRs.length * 100);
            return { ...obj, keyResults: newKRs, progress };
        });
        setObjectives(updated);
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-5 sm:p-6">
            <div className="mx-auto max-w-5xl space-y-6">

                {/* ── Page header ── */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">Strategic Command</p>
                        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">CEO Directive &amp; OKRs</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">Last saved</p>
                            <p className="text-xs font-mono text-[var(--text)]">
                                {activeProject
                                    ? typeof activeProject.timestamp === 'number' &&
                                      !Number.isNaN(activeProject.timestamp)
                                        ? new Date(activeProject.timestamp).toLocaleTimeString([], {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : '—'
                                    : 'Offline'}
                            </p>
                        </div>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.06] px-4 py-2 text-xs font-medium text-[var(--text)] transition-colors hover:bg-white/[0.1]"
                        >
                            <Save className="h-3.5 w-3.5" />
                            Save
                        </button>
                    </div>
                </div>

                {/* ── Mission / Vision ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] p-5 sm:p-6">
                        <label className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            <Rocket className="h-3.5 w-3.5" /> Mission Statement
                        </label>
                        <textarea
                            value={mission}
                            onChange={e => setMission(e.target.value)}
                            placeholder="Definitive purpose..."
                            className="h-28 w-full resize-none bg-transparent text-sm font-medium leading-relaxed text-[var(--text)] placeholder:text-[var(--muted)]/40 outline-none"
                        />
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] p-5 sm:p-6">
                        <label className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            <Flag className="h-3.5 w-3.5" /> Vision 2030
                        </label>
                        <textarea
                            value={vision}
                            onChange={e => setVision(e.target.value)}
                            placeholder="Ultimate future state..."
                            className="h-28 w-full resize-none bg-transparent text-sm font-medium leading-relaxed text-[var(--text)] placeholder:text-[var(--muted)]/40 outline-none"
                        />
                    </div>
                </div>

                {/* ── KPI Strip + Chart ── */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Chart placeholder */}
                    <div className="rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] p-5 sm:p-6 lg:col-span-2">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                                    <TrendingUp className="h-3.5 w-3.5" /> Growth trajectory
                                </p>
                                <p className="mt-1 text-xs text-[var(--muted)]/70">
                                    Connect financial metrics to plot real trends.
                                </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-white/[0.07] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)]">
                                Not connected
                            </span>
                        </div>
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-white/[0.06]">
                            <div className="text-center opacity-40">
                                <TrendingUp className="mx-auto mb-2 h-8 w-8 text-[var(--muted)]" />
                                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">Awaiting financial data</p>
                            </div>
                        </div>
                    </div>

                    {/* KPI tiles */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                        {kpis.map((kpi, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] p-4 transition-colors hover:border-white/[0.12]"
                            >
                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">{kpi.label}</p>
                                    <p className="mt-1 text-base font-semibold text-[var(--text)]">{kpi.value}</p>
                                </div>
                                <span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${kpi.change.includes('+') ? 'bg-violet-500/10 text-violet-400' : 'bg-white/[0.04] text-[var(--muted)]'}`}>
                                    {kpi.change}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── OKR Engine ── */}
                <div>
                    <div className="mb-4 flex items-center justify-between px-1">
                        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                            <Target className="h-3.5 w-3.5" />
                            Objectives &amp; Key Results (Q1)
                        </h3>
                        <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] bg-[var(--color-brand-card)] text-[var(--muted)] transition-colors hover:border-white/[0.14] hover:text-[var(--text)]"
                            aria-label="Add objective"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {objectives.map(obj => (
                            <div
                                key={obj.id}
                                className="flex flex-col gap-6 rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] p-5 transition-colors hover:border-white/[0.12] sm:p-6 lg:flex-row"
                            >
                                {/* Key Results */}
                                <div className="flex-1 min-w-0">
                                    <div className="mb-1 flex items-center gap-2">
                                        <span className="rounded border border-white/[0.07] bg-[var(--color-brand-bg)] px-2 py-0.5 text-[10px] font-mono text-[var(--muted)]">
                                            OBJ-{obj.id.slice(-3).toUpperCase()}
                                        </span>
                                    </div>
                                    <h4 className="mb-4 text-sm font-semibold text-[var(--text)]">{obj.title}</h4>

                                    <div className="space-y-4">
                                        {obj.keyResults.map(kr => (
                                            <div key={kr.id}>
                                                <div className="mb-1.5 flex items-center justify-between">
                                                    <span className="text-xs text-[var(--text)]/80">{kr.label}</span>
                                                    <span className="font-mono text-[10px] text-[var(--muted)]">
                                                        {kr.current} / {kr.target} {kr.unit}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={kr.target}
                                                    value={kr.current}
                                                    onChange={e => toggleKeyResult(obj.id, kr.id, parseInt(e.target.value))}
                                                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60 hover:[&::-webkit-slider-thumb]:bg-violet-400"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Progress ring */}
                                <div className="flex shrink-0 items-center gap-4 lg:flex-col lg:items-center lg:border-l lg:border-white/[0.06] lg:pl-6">
                                    <div className="relative h-20 w-20">
                                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2"
                                            />
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none" stroke="#a855f7" strokeWidth="2"
                                                strokeDasharray={`${obj.progress}, 100`} strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-base font-bold text-[var(--text)]">{obj.progress}%</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--muted)] lg:hidden">Progress</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

function safeParse(str: string) {
    try { return JSON.parse(str); } catch { return {}; }
}

const defaultObjectives: Objective[] = [
    {
        id: 'OBJ-1',
        title: 'Achieve Product-Market Fit',
        progress: 35,
        keyResults: [
            { id: 'KR-1', label: 'Reach 1,000 WAU', current: 350, target: 1000, unit: 'Users' },
            { id: 'KR-2', label: 'Maintain 40% Retention', current: 15, target: 40, unit: '%' },
        ],
    },
    {
        id: 'OBJ-2',
        title: 'Secure Seed Funding',
        progress: 10,
        keyResults: [
            { id: 'KR-3', label: 'Pitch 50 VCs', current: 5, target: 50, unit: 'Meetings' },
            { id: 'KR-4', label: 'Secure Term Sheet', current: 0, target: 1, unit: 'Deal' },
        ],
    },
];
