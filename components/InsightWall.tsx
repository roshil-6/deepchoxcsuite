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
        <div className="flex flex-col h-full rounded-l-[32px] shadow-2xl relative overflow-hidden border-l border-white/[0.06]" style={{ background: '#0A0A0B' }}>
            {/* Solid Header */}
            <div className="px-10 py-8 border-b border-white/[0.06] flex items-center justify-between z-20" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)' }}>
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 text-[#0D9488] rounded flex items-center justify-center border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <ScanSearch className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest leading-none">Intelligence Radar</h2>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#71717A]">
                            <span className="flex items-center gap-2">
                                <Radio className="w-3.5 h-3.5 text-[#0D9488]" />
                                Live Sweep
                            </span>
                            <span className="w-1 h-1 rounded-full bg-[#52525B]"></span>
                            <span>Directives Synced</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {['AMEA', 'APAC', 'LATAM'].map(region => (
                        <span key={region} className="px-3 py-1 border border-white/[0.06] text-[9px] font-bold text-[#71717A] uppercase tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.02)' }}>{region}</span>
                    ))}
                </div>
            </div>

            {/* Content View - Clean Grid */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10" style={{ background: '#0A0A0B' }}>
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#0D9488 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                {insights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                        <div className="w-16 h-16 border border-white/[0.06] flex items-center justify-center mb-10" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <Globe className="w-8 h-8 text-[#52525B]" />
                        </div>
                        <p className="text-white text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Awaiting Signal Synthesis</p>
                        <p className="text-[9px] text-[#71717A] uppercase tracking-widest font-bold">Scanning Global Channels...</p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-10 px-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#71717A]">Market Synthesis Matrix</h3>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-[9px] font-bold text-[#52525B] uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 bg-[#0D9488]"></span>
                                    Signals
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-bold text-[#52525B] uppercase tracking-widest">
                                    <span className="w-1.5 h-px bg-[#52525B]"></span>
                                    Vector
                                </div>
                            </div>
                        </div>

                        <div className="columns-1 md:columns-2 gap-8 space-y-8">
                            {insights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className="break-inside-avoid p-8 border border-white/[0.06] hover:border-white/[0.10] transition-all duration-300 group relative"
                                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))' }}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="px-3 py-1 text-[#71717A] text-[9px] font-bold uppercase tracking-[0.2em] border border-white/[0.06] group-hover:text-[#0D9488] transition-colors" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                            SEC_SIGNAL_{idx + 1}
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 text-[#52525B] group-hover:text-white transition-all" />
                                    </div>

                                    <p className="text-[14px] text-[#A1A1AA] leading-[1.8] font-bold uppercase tracking-wide group-hover:text-white transition-colors">
                                        {insight.replace(/[-*#]/g, '').trim()}
                                    </p>

                                    {/* Content Tags */}
                                    <div className="mt-8 flex flex-wrap gap-2">
                                        <span className="px-3 py-1 text-[#71717A] text-[8px] font-bold uppercase tracking-[0.3em] border border-white/[0.06]" style={{ background: 'rgba(0,0,0,0.3)' }}>Q1_ST_CORE</span>
                                        {insight.toLowerCase().includes('competitor') && (
                                            <span className="px-3 py-1 text-[#0D9488] text-[8px] font-bold uppercase tracking-[0.3em] border border-[#0D9488]/30" style={{ background: 'rgba(0,0,0,0.3)' }}>Sector_Analysis</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Status Footer */}
            <div className="px-10 py-6 border-t border-white/[0.06] flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.4em] text-[#52525B]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent)' }}>
                <div className="flex items-center gap-10">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#0D9488]"></span>
                        Signal Optimal
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-px bg-[#52525B]"></span>
                        Index: 4.2M Points
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <button className="hover:text-[#F43F5E] transition-colors">Deep Scan</button>
                    <button className="hover:text-[#F43F5E] transition-colors">Audit Logs</button>
                </div>
            </div>
        </div>
    );
}
