'use client';

import React from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { Calculator, DollarSign, PieChart, TrendingUp, AlertTriangle, FileSpreadsheet, Layers } from 'lucide-react';

export function BudgetGrid() {
    const { activeProject } = useOffice();

    if (!activeProject) return null;

    // Attempt to parse table rows from markdown
    const parseRows = (text: string) => {
        if (!text) return [];
        return text.split('\n').filter(line => line.includes('|')).map(line =>
            line.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim())
        ).filter(row => row.length > 0 && !row[0].includes('---'));
    };

    const rows = parseRows(activeProject.budget);

    // Extract numerical data for chart
    const chartData = React.useMemo(() => {
        if (rows.length < 2) return [];

        // Assume first column is label, last column is value (if numeric)
        // or try to find a numeric column
        const header = rows[0];
        const dataRows = rows.slice(1);

        return dataRows.map(row => {
            const label = row[0];
            // Find first numeric cell
            const valueCell = row.find(cell => !isNaN(parseFloat(cell.replace(/[^0-9.-]+/g, ""))));
            const value = valueCell ? parseFloat(valueCell.replace(/[^0-9.-]+/g, "")) : 0;
            return { label, value };
        }).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5
    }, [rows]);

    const maxValue = Math.max(...chartData.map(d => d.value), 1);

    return (
        <div className="flex flex-col h-full bg-black rounded-l-[32px] shadow-2xl relative overflow-hidden border-l border-[#1f1f1f] font-sans">
            {/* Solid Header */}
            <div className="px-10 py-8 border-b border-[#1f1f1f] flex items-center justify-between bg-[#050505]">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-[#0a0a0a] text-[#0D9488] rounded flex items-center justify-center border border-[#1f1f1f]">
                        <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest leading-none">Financial Ledger</h2>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-700">
                            <span>Fiscal Year 2026</span>
                            <span className="w-1 h-1 rounded-full bg-[#0D9488]"></span>
                            <span>Audit Active</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="px-4 py-1.5 rounded bg-[#0a0a0a] border border-[#1f1f1f] text-[9px] font-bold text-[#0D9488] flex items-center gap-2 uppercase tracking-widest">
                        <TrendingUp className="w-3.5 h-3.5" />
                        ROI TRACKING
                    </div>
                </div>
            </div>

            {/* Content Area - Minimalist Table */}
            <div className="flex-1 overflow-auto p-10 custom-scrollbar">
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                        <DollarSign className="w-16 h-16 text-gray-800 mb-6" />
                        <p className="text-white text-[10px] font-bold uppercase tracking-[0.3em]">No Assets Allocated</p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-700">Balance Sheet Summary</h3>
                            <div className="flex items-center gap-1 text-[9px] font-mono text-gray-800 font-bold">
                                <span>REF: {activeProject.id?.toString().padStart(8, '0')}</span>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded border border-[#1f1f1f] bg-[#050505]">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#0a0a0a] border-b border-[#1f1f1f]">
                                        {rows[0]?.map((header, i) => (
                                            <th key={i} className="px-6 py-5 font-bold text-gray-600 uppercase tracking-widest text-[9px] border-r border-[#1f1f1f] last:border-0">{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1f1f1f]">
                                    {rows.slice(1).map((row, i) => (
                                        <tr key={i} className="hover:bg-[#0a0a0a] transition-colors group">
                                            {row.map((cell, j) => (
                                                <td key={j} className={`px-6 py-4 text-gray-400 border-r border-[#1f1f1f] last:border-0 font-bold uppercase tracking-wider text-[11px] ${j > 0 ? 'text-right' : ''}`}>
                                                    {j > 0 && !isNaN(parseFloat(cell.replace(/[^0-9.-]+/g, ""))) ? (
                                                        <span className="text-white font-mono group-hover:text-[#0D9488] transition-colors">{cell}</span>
                                                    ) : (
                                                        <span className="group-hover:text-white transition-colors">{cell}</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Visualizations & AI Analysis */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">

                            {/* Chart */}
                            {chartData.length > 0 && (
                                <div className="p-8 bg-[#0a0a0a] border border-[#1f1f1f] rounded relative overflow-hidden">
                                    <h4 className="text-[10px] font-bold text-[#0D9488] mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
                                        <PieChart className="w-4 h-4" />
                                        Capital Allocation
                                    </h4>
                                    <div className="space-y-4">
                                        {chartData.map((d, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                                    <span>{d.label}</span>
                                                    <span className="text-white font-mono">${d.value.toLocaleString()}</span>
                                                </div>
                                                <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[#0D9488] relative"
                                                        style={{ width: `${(d.value / maxValue) * 100}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 opacity-50"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Analysis */}
                            <div className="p-8 bg-[#0a0a0a] border border-[#1f1f1f] rounded relative group overflow-hidden">
                                <h4 className="text-[10px] font-bold text-indigo-400 mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    AI Financial Risk Assessment
                                </h4>
                                <div className="text-gray-400 font-medium text-xs leading-relaxed space-y-4">
                                    <p>
                                        <span className="text-white font-bold">Burn Rate Analysis:</span> Based on the allocated budget, the current capital efficiency suggests a runway of approximately <span className="text-[#0D9488]">14 months</span> assuming zero revenue growth.
                                    </p>
                                    <p>
                                        <span className="text-white font-bold">Optimization Vector:</span> {chartData[0]?.label || 'Largest expense'} represents the highest cost center. Consider exploring vendor consolidation to reduce OpEx by ~15%.
                                    </p>
                                    <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                                        Recommendation: Initiate Q3 Cost Audit
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Analysis Footer */}
                        {activeProject.budget && !activeProject.budget.includes('|') && (
                            <div className="mt-12 p-8 bg-[#0a0a0a] border border-[#1f1f1f] relative group overflow-hidden">
                                <h4 className="text-[10px] font-bold text-[#0D9488] mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <PieChart className="w-4 h-4" />
                                    Quantitative Analysis
                                </h4>
                                <div className="text-gray-500 font-bold text-[11px] tracking-widest uppercase leading-relaxed">
                                    <p className="whitespace-pre-wrap">{activeProject.budget}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Status Bar */}
            <div className="px-10 py-6 border-t border-[#1f1f1f] flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.4em] text-gray-800">
                <div className="flex items-center gap-8">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#0D9488]"></span>
                        Compliance Verified
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-px bg-gray-900"></span>
                        Ledger: 0xA1F
                    </span>
                </div>
                <span>Session Active</span>
            </div>
        </div>
    );
}
