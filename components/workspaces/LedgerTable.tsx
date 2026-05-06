'use client';

import React from 'react';
import { useAnalysisData } from '@/lib/useAnalysisData';
import {
    Calculator,
    TrendingUp,
    ArrowDown,
    ArrowUp,
    DollarSign,
    PieChart,
    ChevronRight,
    Search,
    FileText,
    Activity
} from 'lucide-react';

export function LedgerTable() {
    const { analysis } = useAnalysisData();
    const financial = analysis?.financial;

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-brand-bg animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="p-10 pb-8 border-b border-brand-border bg-gradient-to-br from-brand-bg to-brand-panel/60">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-zinc-100 text-brand-bg rounded-xl border border-brand-border flex items-center justify-center">
                        <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">Financial Ledger</h2>
                        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mt-1">CFO Fiscal Unit</p>
                    </div>
                </div>

                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#141416] border border-zinc-800 p-7 rounded-2xl shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Capitalization</div>
                            <TrendingUp className="w-4 h-4 text-[#0D9488]" />
                        </div>
                        <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">{financial?.keyMetrics?.totalRevenue || "TBD"}</div>
                        <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-[#0D9488] uppercase tracking-widest">
                            <ArrowUp className="w-3 h-3" />
                            Projected Growth active
                        </div>
                    </div>

                    <div className="bg-[#141416] border border-zinc-800 p-7 rounded-2xl shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operational Burn</div>
                            <Activity className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">{financial?.keyMetrics?.operatingExpenses || "TBD"}</div>
                        <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            System Efficiency Locked
                        </div>
                    </div>

                    <div className="bg-[#141416] border border-zinc-800 p-7 rounded-2xl shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Net Runway</div>
                            <PieChart className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">{financial?.keyMetrics?.netProfit || "TBD"}</div>
                        <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Calculated Margin
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-10 space-y-10">
                {/* Allocation Table */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Capital Allocation Framework
                        </h3>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" />
                            <input
                                type="text"
                                placeholder="Filter line items..."
                                className="bg-zinc-900/50 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 placeholder:text-zinc-800 focus:outline-none focus:border-zinc-500 transition-all w-64"
                            />
                        </div>
                    </div>

                    <div className="bg-[#141416] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-[#141416] border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Account Unit</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-right">Allocation</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {financial?.breakdown?.map((item: any, idx: number) => (
                                    <tr key={idx} className="group hover:bg-zinc-800/20 transition-all">
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-zinc-200 uppercase tracking-wide">{item.category}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-xs font-bold text-zinc-100">{item.amount || 'â€”'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">Operational</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-zinc-800 group-hover:text-zinc-500 transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )) || (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Financial synchronization required</td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* CFO Strategic Directive */}
                <section className="bg-zinc-100/5 border border-zinc-100/10 rounded-2xl p-8 flex items-start gap-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Calculator className="w-20 h-20 text-zinc-100" />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-zinc-100/10 flex items-center justify-center shrink-0">
                        <DollarSign className="w-6 h-6 text-zinc-300" />
                    </div>
                    <div className="relative z-10 max-w-2xl">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">CFO Fiscal Directive</h4>
                        <p className="text-sm text-zinc-500 leading-relaxed font-medium italic">
                            "{financial?.financialSummary || "Capital allocation framework awaiting initialization. Deploy fiscal specialists to optimize the burn-to-growth ratio."}"
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}


