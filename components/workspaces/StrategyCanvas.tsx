'use client';

import React, { useState, useEffect } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { Target, TrendingUp, Shield, Zap, AlertCircle, Save, Plus, Trash2, CheckCircle2, Circle, ArrowRight, Flag, Rocket } from 'lucide-react';

// Interface for local state management of OKRs
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
    const [kpis, setKpis] = useState([
        { label: 'Monthly Recurring Revenue', value: '$0', change: '+0%' },
        { label: 'Burn Rate', value: '$0', change: '0%' },
        { label: 'Runway', value: '0 Months', change: '0%' },
        { label: 'CAC', value: '$0', change: '0%' },
    ]);

    // Load initial data
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
        const payload = JSON.stringify({
            mission,
            vision,
            objectives,
            kpis
        });
        updateProjectField('strategy', payload);
    };

    const toggleKeyResult = (objId: string, krId: string, val: number) => {
        const updated = objectives.map(obj => {
            if (obj.id === objId) {
                const newKRs = obj.keyResults.map(kr =>
                    kr.id === krId ? { ...kr, current: val } : kr
                );
                // Auto-calc progress
                const totalProgress = newKRs.reduce((acc, kr) => acc + (kr.current / kr.target), 0) / newKRs.length * 100;
                return { ...obj, keyResults: newKRs, progress: Math.round(totalProgress) };
            }
            return obj;
        });
        setObjectives(updated);
    };

    return (
        <div className="h-full font-sans overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* Hero Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500"></span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Strategic Command</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">CEO Directive & OKRs</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Synced</div>
                            <div className="text-xs font-mono text-zinc-300">
                                {activeProject ? new Date(activeProject.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Offline'}
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg hover:scale-105"
                        >
                            <Save className="w-4 h-4" />
                            Save
                        </button>
                    </div>
                </div>

                {/* Northern Star Section (Mission/Vision) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-8 bg-black/40 backdrop-blur-md border border-zinc-800 rounded-[2rem] group hover:border-zinc-700 transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-amber-500" /> Mission Statement
                        </label>
                        <textarea
                            value={mission}
                            onChange={(e) => setMission(e.target.value)}
                            placeholder="Definitive purpose..."
                            className="w-full bg-transparent border-none focus:ring-0 text-2xl font-medium text-zinc-100 placeholder:text-zinc-800 resize-none h-32 leading-relaxed selection:bg-amber-500/30 outline-none tracking-tight"
                        />
                    </div>
                    <div className="p-8 bg-black/40 backdrop-blur-md border border-zinc-800 rounded-[2rem] group hover:border-zinc-700 transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Flag className="w-4 h-4 text-indigo-500" /> Vision 2030
                        </label>
                        <textarea
                            value={vision}
                            onChange={(e) => setVision(e.target.value)}
                            placeholder="Ultimate future state..."
                            className="w-full bg-transparent border-none focus:ring-0 text-2xl font-medium text-zinc-100 placeholder:text-zinc-800 resize-none h-32 leading-relaxed selection:bg-indigo-500/30 outline-none tracking-tight"
                        />
                    </div>
                </div>

                {/* KPI Live Strip & Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-zinc-900/30 backdrop-blur-md border border-zinc-800 rounded-[2rem] p-8 relative overflow-hidden">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-6">
                            <div>
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Growth trajectory
                                </h3>
                                <p className="mt-1 text-[10px] text-zinc-600 max-w-md">
                                    Chart area reserved — connect financial or product metrics to plot real trends (no fabricated % here).
                                </p>
                            </div>
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 border border-zinc-800 rounded-full px-2.5 py-1">
                                Not connected
                            </span>
                        </div>
                        <div className="h-48 w-full -ml-2 flex items-center justify-center">
                            {/* Placeholder for now - Real chart requires financial data integration */}
                            <div className="text-center opacity-30">
                                <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Awaiting Financial Data</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {kpis.map((kpi, idx) => (
                            <div key={idx} className="p-6 bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 rounded-[1.5rem] hover:bg-zinc-800/40 transition-all flex items-center justify-between group">
                                <div>
                                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-zinc-400 transition-colors">{kpi.label}</div>
                                    <div className="text-xl font-bold text-white tracking-tight">{kpi.value}</div>
                                </div>
                                <div className={`text-[10px] font-bold px-2 py-1 rounded-lg ${kpi.change.includes('+') ? 'bg-violet-500/10 text-violet-400' : 'text-zinc-500 bg-zinc-800/50'}`}>
                                    {kpi.change}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* OKR Engine */}
                <div>
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Target className="w-4 h-4 text-violet-500" />
                            Objectives & Key Results (Q1)
                        </h3>
                        <button className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 transition-all hover:border-violet-500/50 hover:text-violet-400">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {objectives.map((obj) => (
                            <div key={obj.id} className="bg-zinc-900/20 backdrop-blur-md border border-zinc-800 rounded-[2rem] p-8 hover:bg-zinc-900/40 transition-all group shadow-lg flex flex-col lg:flex-row gap-8">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded border border-zinc-800">OBJ-{obj.id.slice(-3).toUpperCase()}</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-zinc-100 mb-6">{obj.title}</h4>

                                    <div className="space-y-4">
                                        {obj.keyResults.map((kr) => (
                                            <div key={kr.id} className="group/kr">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-zinc-400 font-medium group-hover/kr:text-zinc-200 transition-colors">{kr.label}</span>
                                                    <span className="text-[10px] font-mono text-zinc-500">
                                                        {kr.current} / {kr.target} {kr.unit}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={kr.target}
                                                    value={kr.current}
                                                    onChange={(e) => toggleKeyResult(obj.id, kr.id, parseInt(e.target.value))}
                                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-600 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-violet-500 transition-all"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-row lg:flex-col items-center gap-6 lg:border-l lg:border-zinc-800 lg:pl-8">
                                    <div className="relative w-24 h-24 flex-shrink-0">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="transparent"
                                                stroke="#27272a"
                                                strokeWidth="2"
                                            />
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="#a855f7"
                                                strokeWidth="2"
                                                strokeDasharray={`${obj.progress}, 100`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                                            <span className="text-xl font-bold text-white">{obj.progress}%</span>
                                        </div>
                                    </div>
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
    try {
        return JSON.parse(str);
    } catch {
        return {};
    }
}

const defaultObjectives = [
    {
        id: 'OBJ-1',
        title: 'Achieve Product-Market Fit',
        progress: 35,
        keyResults: [
            { id: 'KR-1', label: 'Reach 1,000 WAU', current: 350, target: 1000, unit: 'Users' },
            { id: 'KR-2', label: 'Maintain 40% Retention', current: 15, target: 40, unit: '%' }
        ]
    },
    {
        id: 'OBJ-2',
        title: 'Secure Seed Funding',
        progress: 10,
        keyResults: [
            { id: 'KR-3', label: 'Pitch 50 VCs', current: 5, target: 50, unit: 'Meetings' },
            { id: 'KR-4', label: 'Secure Term Sheet', current: 0, target: 1, unit: 'Deal' }
        ]
    }
];
