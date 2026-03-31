'use client';

import React from 'react';
import { useAnalysisData } from '@/lib/useAnalysisData';
import {
    ScanSearch,
    MoreVertical,
    TrendingUp,
    ArrowUpRight,
    Zap,
    ShieldAlert,
    Globe,
    Activity,
    Compass
} from 'lucide-react';

export function InsightGrid() {
    const { analysis } = useAnalysisData();
    const market = analysis?.market;

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-brand-bg animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="p-10 pb-8 border-b border-brand-border bg-gradient-to-br from-brand-bg to-brand-panel/60">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-zinc-100 text-brand-bg rounded-xl border border-brand-border flex items-center justify-center">
                        <ScanSearch className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">Market Intelligence</h2>
                        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mt-1">Intelligence Scout Unit</p>
                    </div>
                </div>

                <div className="bg-zinc-900/30 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Executive Summary</div>
                    <p className="text-xl text-zinc-300 leading-relaxed font-medium">
                        {market?.summary || "Global market dimensions and competitive positioning data awaiting synchronization. Deploy the Scout unit to retrieve initial data points."}
                    </p>
                </div>
            </div>

            <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Competitor Analysis */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            Competitive Landscape
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {market?.competitors?.map((comp: any, idx: number) => (
                            <div key={idx} className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 p-6 rounded-xl group hover:border-zinc-500 transition-all shadow-lg hover:shadow-2xl hover:bg-zinc-900">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">{comp.name}</h4>
                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{comp.marketShare || 'Share TBD'}</p>
                                    </div>
                                    <button className="text-zinc-800 group-hover:text-zinc-500 transition-colors">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">Strength:</span>
                                        <span className="text-xs text-zinc-400 font-medium">{comp.strengths?.[0] || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">Weakness:</span>
                                        <span className="text-xs text-zinc-400 font-medium">{comp.weaknesses?.[0] || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="mt-5 pt-4 border-t border-zinc-800/50 flex justify-end">
                                    <button className="text-[9px] font-bold text-zinc-600 group-hover:text-[#0D9488] flex items-center gap-1.5 uppercase tracking-widest transition-colors">
                                        Full Profile
                                        <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )) || (
                                <div className="py-10 bg-zinc-900/20 rounded-xl border border-zinc-800 border-dashed text-center">
                                    <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Awaiting Competitor Scans</p>
                                </div>
                            )}
                    </div>
                </section>

                {/* Market Trends & Risks */}
                <div className="space-y-10">
                    <section className="space-y-6">
                        <div className="px-2">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Market Dynamics
                            </h3>
                        </div>
                        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl p-7 shadow-xl">
                            <div className="space-y-6">
                                {market?.trends?.map((trend: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-4 group">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-[#0D9488]/10 transition-colors">
                                            <TrendingUp className="w-4 h-4 text-[#0D9488]" />
                                        </div>
                                        <p className="text-xs text-zinc-400 font-medium leading-relaxed group-hover:text-zinc-100 transition-colors">
                                            {trend}
                                        </p>
                                    </div>
                                )) || (
                                        <div className="text-center py-6">
                                            <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">No active trends identified</p>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="px-2">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Compass className="w-4 h-4" />
                                Critical Risks & Threats
                            </h3>
                        </div>
                        <div className="bg-zinc-100/5 border border-zinc-100/10 rounded-2xl p-7 flex items-start gap-5 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <ShieldAlert className="w-16 h-16 text-zinc-100" />
                            </div>
                            <div className="w-10 h-10 rounded-full bg-zinc-100/10 flex items-center justify-center shrink-0">
                                <Zap className="w-5 h-5 text-zinc-300" />
                            </div>
                            <div className="relative z-10">
                                <ul className="space-y-4">
                                    {market?.risks?.map((risk: string, idx: number) => (
                                        <li key={idx} className="text-xs text-zinc-500 font-medium leading-relaxed flex gap-3">
                                            <span className="text-zinc-800">•</span>
                                            {risk}
                                        </li>
                                    )) || <li className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">No critical threats detected.</li>}
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
