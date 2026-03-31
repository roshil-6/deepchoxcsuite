'use client';

import React from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { ClipboardList, CheckSquare, Layers, Clock, AlertCircle, BarChart3 } from 'lucide-react';

export function ProductBoard() {
    const { activeProject } = useOffice();

    if (!activeProject) return null;

    // Simple parser to turn bullet points into "cards"
    const parseItems = (text: string) => {
        if (!text) return [];
        return text.split('\n').filter(line => line.trim().length > 0 && !line.startsWith('###'));
    };

    const tasks = parseItems(activeProject.productPlan);

    return (
        <div className="flex flex-col h-full bg-black rounded-l-[32px] shadow-2xl relative overflow-hidden border-l border-[#1f1f1f]">
            {/* Solid Header */}
            <div className="px-10 py-8 border-b border-[#1f1f1f] flex items-center justify-between bg-[#050505]">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-[#0a0a0a] text-[#0D9488] rounded flex items-center justify-center border border-[#1f1f1f]">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest leading-none">Product Roadmap</h2>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-700">
                            <span>Cycle {new Date().getMonth() + 1}</span>
                            <span className="w-1 h-1 rounded-full bg-[#0D9488]"></span>
                            <span>Directives Active</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-4 py-1.5 rounded bg-[#0a0a0a] border border-[#1f1f1f] text-[9px] font-bold text-[#0D9488] flex items-center gap-2 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-[#0D9488]"></span>
                        Registry Synced
                    </div>
                </div>
            </div>

            {/* Content Area - Clean List View */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                        <div className="w-16 h-16 bg-[#0a0a0a] border border-[#1f1f1f] flex items-center justify-center mb-6">
                            <ClipboardList className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-white text-[10px] font-bold uppercase tracking-[0.3em]">No Active Roadmap</p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-4">
                        <div className="flex items-center justify-between mb-8 px-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-700">Active Directives ({tasks.length})</h3>
                            <button className="text-[10px] font-bold text-[#0D9488] hover:text-white transition-colors uppercase tracking-[0.2em]">Export Data</button>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                            {tasks.map((task, idx) => (
                                <div
                                    key={idx}
                                    className="group flex items-start gap-6 p-6 bg-[#050505] hover:bg-[#0a0a0a] border border-[#1f1f1f] transition-all duration-300"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        <div className="w-5 h-5 bg-black border border-[#1f1f1f] flex items-center justify-center group-hover:border-[#0D9488]/50 transition-colors">
                                            <CheckSquare className="w-3 h-3 text-gray-900 group-hover:text-[#0D9488] transition-colors" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[14px] font-bold text-gray-400 leading-relaxed group-hover:text-white transition-colors uppercase tracking-wide">
                                            {task.replace(/[-*]/g, '').trim()}
                                        </p>
                                        <div className="flex items-center gap-6 mt-4">
                                            <span className="flex items-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                                <span className="w-1 h-1 bg-[#0D9488]"></span>
                                                Pr: {idx % 3 === 0 ? 'High' : 'Std'}
                                            </span>
                                            <span className="flex items-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                                <Clock className="w-3 h-3 text-gray-800" />
                                                ETA: {1 + (idx % 4)}d
                                            </span>
                                            <span className="text-[9px] font-mono text-gray-900 ml-auto uppercase tracking-widest">OBJ_{1000 + idx}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Status Bar */}
            <div className="px-10 py-6 border-t border-[#1f1f1f] flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.3em] text-gray-800">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#0D9488]"></span>
                        Registry Synced
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-px bg-gray-900"></span>
                        Index: 0x92f
                    </span>
                </div>
                <span>Session Active</span>
            </div>
        </div>
    );
}
