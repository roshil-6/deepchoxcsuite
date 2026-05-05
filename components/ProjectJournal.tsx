'use client';

import React, { useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { Book, Plus, Clock, PenTool, Send, History } from 'lucide-react';

export function ProjectJournal() {
    const { activeProject, addJournal } = useOffice();
    const [newEntry, setNewEntry] = useState('');

    if (!activeProject) return null;

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newEntry.trim()) return;
        addJournal(newEntry);
        setNewEntry('');
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] rounded-[32px] overflow-hidden shadow-2xl border border-red-900/20">
            {/* Header - Minimalist Journal */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-[#0d0d10]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-950/30 text-red-600 rounded-xl flex items-center justify-center border border-red-900/30">
                        <History className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Operational Log</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Project Chronology</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Session</span>
                </div>
            </div>

            {/* Entry Input - Dark & Minimalist */}
            <div className="p-6 border-b border-white/5 bg-black/20">
                <div className="relative group">
                    <textarea
                        value={newEntry}
                        onChange={(e) => setNewEntry(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Log a strategic update or decision..."
                        className="w-full p-5 pr-14 rounded-2xl bg-[#0a0a0a] border border-white/5 focus:border-red-900/50 focus:ring-1 focus:ring-red-900/20 outline-none transition-all resize-none text-sm text-gray-200 placeholder:text-gray-700 min-h-[100px] selection:bg-red-800/30"
                    />
                    <button
                        onClick={() => handleSubmit()}
                        disabled={!newEntry.trim()}
                        className="absolute bottom-4 right-4 p-2.5 bg-red-800 text-white rounded-xl hover:bg-red-700 disabled:opacity-20 disabled:hover:bg-red-800 transition-all shadow-lg shadow-red-900/20 group-focus-within:scale-105"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Timeline - High Visibility */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-[#050505]">
                {(!activeProject.journal || activeProject.journal.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 py-12">
                        <PenTool className="w-12 h-12 mb-4 text-gray-400" />
                        <p className="text-sm font-serif italic text-gray-500">The chronology remains unwritten...</p>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto space-y-8">
                        {activeProject.journal.map((entry, idx) => (
                            <div key={entry.id} className="relative pl-10 animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 50}ms` }}>
                                {/* Timeline Line */}
                                <div className="absolute left-[3px] top-4 bottom-[-32px] w-px bg-gradient-to-b from-red-800/40 via-red-800/10 to-transparent"></div>
                                {/* Node */}
                                <div className="absolute left-[-4px] top-1.5 z-10 h-4 w-4 rounded-full border-2 border-red-800 bg-black"></div>

                                <div className="flex flex-col gap-2">
                                    <div className="bg-[#0c0c0c] p-6 rounded-2xl border border-white/5 group hover:border-red-900/30 transition-all duration-300 shadow-sm hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                                        <p className="text-[14px] text-gray-300 leading-relaxed whitespace-pre-wrap font-sans group-hover:text-white transition-colors">
                                            {entry.content}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-600 pl-1 mt-1">
                                        <Clock className="w-3.5 h-3.5 text-red-900/60" />
                                        <span>{new Date(entry.timestamp).toLocaleString(undefined, {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Bar */}
            <div className="px-8 py-4 border-t border-white/5 bg-[#0d0d10] flex items-center justify-between">
                <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">Entry Verification: Level 4</span>
                <span className="text-[9px] font-mono text-gray-700">IDX: {activeProject.journal?.length || 0}</span>
            </div>
        </div>
    );
}

