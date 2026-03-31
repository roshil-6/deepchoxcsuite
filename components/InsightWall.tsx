'use client';

import React from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { ScanSearch, Lightbulb, TrendingUp, Globe, ArrowUpRight, Radio, Search } from 'lucide-react';

export function InsightWall() {
    const { activeProject } = useOffice();

    if (!activeProject) return null;

    // Parse insights into independent cards
    const parseInsights = (text: string) => {
        if (!text) return [];
        // Split by double newlines or bullet points to find distinct chunks
        const chunks = text.split(/\n\n|\n- /).filter(c => c.trim().length > 10);
        return chunks;
    };

    const insights = parseInsights(activeProject.marketInsights);

    return (
        <div className="flex flex-col h-full bg-black rounded-l-[32px] shadow-2xl relative overflow-hidden border-l border-[#1f1f1f]">
            {/* Solid Header */}
            <div className="px-10 py-8 border-b border-[#1f1f1f] flex items-center justify-between bg-[#050505] z-20">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-[#0a0a0a] text-[#0D9488] rounded flex items-center justify-center border border-[#1f1f1f]">
                        <ScanSearch className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest leading-none">Intelligence Radar</h2>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-700">
                            <span className="flex items-center gap-2">
                                <Radio className="w-3.5 h-3.5 text-[#0D9488]" />
                                Live Sweep
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-900"></span>
                            <span>Directives Synced</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {['AMEA', 'APAC', 'LATAM'].map(region => (
                        <span key={region} className="px-3 py-1 bg-[#0a0a0a] border border-[#1f1f1f] text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">{region}</span>
                    ))}
                </div>
            </div>

            {/* Content View - Clean Grid */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#0D9488 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                {insights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                        <div className="w-16 h-16 bg-[#0a0a0a] border border-[#1f1f1f] flex items-center justify-center mb-10">
                            <Globe className="w-8 h-8 text-gray-800" />
                        </div>
                        <p className="text-white text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Awaiting Signal Synthesis</p>
                        <p className="text-[9px] text-gray-700 uppercase tracking-widest font-bold">Scanning Global Channels...</p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-10 px-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-700">Market Synthesis Matrix</h3>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 bg-[#0D9488]"></span>
                                    Signals
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                    <span className="w-1.5 h-px bg-gray-800"></span>
                                    Vector
                                </div>
                            </div>
                        </div>

                        <div className="columns-1 md:columns-2 gap-8 space-y-8">
                            {insights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className="break-inside-avoid bg-[#050505] p-8 border border-[#1f1f1f] hover:border-white/10 transition-all duration-300 group relative"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="bg-black px-3 py-1 text-gray-700 text-[9px] font-bold uppercase tracking-[0.2em] border border-[#1f1f1f] group-hover:text-[#0D9488] transition-colors">
                                            SEC_SIGNAL_{idx + 1}
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 text-gray-900 group-hover:text-white transition-all" />
                                    </div>

                                    <p className="text-[14px] text-gray-500 leading-[1.8] font-bold uppercase tracking-wide group-hover:text-white transition-colors">
                                        {insight.replace(/[-*#]/g, '').trim()}
                                    </p>

                                    {/* Content Tags */}
                                    <div className="mt-8 flex flex-wrap gap-2">
                                        <span className="px-3 py-1 bg-black text-gray-600 text-[8px] font-bold uppercase tracking-[0.3em] border border-[#1f1f1f]">Q1_ST_CORE</span>
                                        {insight.toLowerCase().includes('competitor') && (
                                            <span className="px-3 py-1 bg-black text-[#0D9488] text-[8px] font-bold uppercase tracking-[0.3em] border border-[#0D9488]/30">Sector_Analysis</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Status Footer */}
            <div className="px-10 py-6 border-t border-[#1f1f1f] flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.4em] text-gray-800">
                <div className="flex items-center gap-10">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#0D9488]"></span>
                        Signal Optimal
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-px bg-gray-900"></span>
                        Index: 4.2M Points
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <button className="hover:text-[#8B1538] transition-colors">Deep Scan</button>
                    <button className="hover:text-[#8B1538] transition-colors">Audit Logs</button>
                </div>
            </div>
        </div>
    );
}
