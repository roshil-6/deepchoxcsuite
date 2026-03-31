'use client';

import React from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { Target, PenTool, Hash, ShieldCheck, Share2, Download } from 'lucide-react';

export function StrategyDeck() {
    const { activeProject } = useOffice();

    if (!activeProject) return null;

    return (
        <div className="flex flex-col h-full bg-black rounded-l-[40px] shadow-2xl relative overflow-hidden border-l border-[#1f1f1f]">
            {/* Solid Header */}
            <div className="relative z-10 px-12 py-10 border-b border-[#1f1f1f] flex items-center justify-between bg-black">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-[#0D9488] text-white rounded flex items-center justify-center border border-[#1f1f1f]">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Strategy Deck</h2>
                        <div className="flex items-center gap-3 mt-1.5 font-bold">
                            <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#0D9488]">
                                <ShieldCheck className="w-3.5 h-3.5" /> Restricted
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-800"></span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-600">Executive Interface</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded bg-[#0a0a0a] border border-[#1f1f1f] text-gray-600 hover:text-white transition-all">
                        <Share2 className="w-4 h-4" />
                    </button>
                    <button className="p-2.5 rounded bg-[#0a0a0a] border border-[#1f1f1f] text-gray-600 hover:text-white transition-all">
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => alert("Strategy Document Finalized")}
                        className="ml-2 px-8 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded transition-all shadow-2xl"
                    >
                        Commit Strategy
                    </button>
                </div>
            </div>

            {/* Document Content Area */}
            <div className="relative z-10 flex-1 overflow-y-auto px-16 py-16 custom-scrollbar selection:bg-red-800/30">
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="mb-24 text-center">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="px-3 py-1 bg-[#0a0a0a] text-gray-600 border border-[#1f1f1f] text-[9px] font-bold uppercase tracking-[0.2em]">Revision Core</div>
                            <div className="px-3 py-1 bg-black text-[#0D9488] border border-[#0D9488]/30 text-[9px] font-bold uppercase tracking-[0.2em]">Primary Archive</div>
                        </div>
                        <h1 className="text-7xl font-bold text-white mb-8 tracking-tighter uppercase">{activeProject.name}</h1>
                        <div className="h-0.5 w-24 bg-[#0D9488] mx-auto"></div>
                    </div>

                    {/* Content Section */}
                    <div className="relative border-t border-[#1f1f1f] pt-16">

                        {activeProject.strategy ? (
                            <div className="prose prose-invert prose-lg max-w-none">
                                <div className="font-serif leading-relaxed text-gray-300">
                                    {activeProject.strategy.split('\n').map((line, i) => {
                                        if (line.startsWith('###')) {
                                            return (
                                                <h3 key={i} className="text-xl mt-16 mb-8 font-bold text-white uppercase tracking-[0.2em] border-b border-[#1f1f1f] pb-6 flex items-center justify-between">
                                                    {line.replace('###', '')}
                                                    <span className="text-gray-800 font-mono text-sm">ARCHIVE_SYS_0{Math.min(9, i % 10)}</span>
                                                </h3>
                                            );
                                        }
                                        if (line.startsWith('-')) {
                                            return (
                                                <div key={i} className="flex gap-6 mb-6 group">
                                                    <span className="mt-2 w-1.5 h-1.5 bg-[#0D9488] flex-shrink-0"></span>
                                                    <p className="m-0 text-gray-500 uppercase tracking-wide text-[13px] font-bold leading-relaxed">{line.replace('-', '')}</p>
                                                </div>
                                            );
                                        }
                                        if (line.trim() === '') return <div key={i} className="h-10"></div>;
                                        return <p key={i} className="mb-8 text-gray-400 text-[14px] leading-[2] font-medium tracking-wide">{line}</p>;
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-40">
                                <div className="w-16 h-16 bg-[#0a0a0a] border border-[#1f1f1f] flex items-center justify-center mb-10">
                                    <PenTool className="w-6 h-6 text-gray-800" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-white uppercase tracking-[0.3em] mb-3">Intelligence Required</p>
                                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Awaiting Strategic Directives from Central C-Suite</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Solid Footer */}
            <div className="px-12 py-8 border-t border-[#1f1f1f] flex items-center justify-between bg-black">
                <div className="flex items-center gap-10 font-bold">
                    <div>
                        <p className="text-[8px] text-gray-700 uppercase tracking-[0.3em] mb-1.5">Authorization</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Autonomous Agent Swarm</p>
                    </div>
                    <div className="w-px h-6 bg-[#1f1f1f]"></div>
                    <div>
                        <p className="text-[8px] text-gray-700 uppercase tracking-[0.3em] mb-1.5">Registry Status</p>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#0D9488]"></span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Active Synthesis</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-mono text-gray-800 font-bold uppercase tracking-widest">System Integrity Verified</p>
                </div>
            </div>
        </div>
    );
}
