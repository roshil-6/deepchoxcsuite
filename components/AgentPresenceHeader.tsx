'use client';

import React from 'react';
import { useOffice, AgentRole } from '@/lib/OfficeContext';
import { Bot, Sparkles, Activity } from 'lucide-react';

interface AgentPresenceHeaderProps {
    role: AgentRole;
}

export function AgentPresenceHeader({ role }: AgentPresenceHeaderProps) {
    const { agents, activeProject } = useOffice();
    const agent = agents[role];

    return (
        <div className="mx-8 mt-6 mb-2 p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl flex items-center justify-between group hover:border-[#0D9488]/20 transition-all duration-300">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center text-[#0D9488] border border-zinc-800 shadow-sm">
                    {agent.icon}
                </div>
                <div>
                    <h3 className="text-[10px] font-bold text-zinc-100 uppercase tracking-widest">{agent.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0D9488] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0D9488]"></span>
                        </span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                            Active Intelligence • Monitoring Directives
                        </span>
                    </div>
                </div>
            </div>

            <div className="hidden md:block text-right">
                <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-tighter">
                    Situational Awareness: {activeProject?.teamDirectives ? "High" : "Optimal"}
                </div>
                <div className="text-[9px] font-bold text-zinc-400 flex items-center justify-end gap-1 mt-1">
                    <Activity className="w-3 h-3 text-[#0D9488]" />
                    Live Analysis Channel
                </div>
            </div>
        </div>
    );
}
