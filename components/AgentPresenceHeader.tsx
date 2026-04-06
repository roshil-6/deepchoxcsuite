'use client';

import React from 'react';
import { useOffice, AgentRole } from '@/lib/OfficeContext';
import { Bot } from 'lucide-react';

interface AgentPresenceHeaderProps {
    role: AgentRole;
}

export function AgentPresenceHeader({ role }: AgentPresenceHeaderProps) {
    const { agents, activeProject } = useOffice();
    const agent = agents[role];

    return (
        <div className="group mx-8 mb-2 mt-6 flex items-center justify-between rounded-xl border border-brand-border/50 bg-brand-panel/20 p-4 transition hover:border-brand-teal/25">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border/60 bg-brand-bg text-brand-teal">
                    {agent.icon ?? <Bot className="h-5 w-5" aria-hidden />}
                </div>
                <div>
                    <h3 className="text-[13px] font-semibold leading-tight text-brand-text">{agent.title}</h3>
                    <p className="mt-0.5 text-[11px] text-brand-muted">{agent.execOutput}</p>
                    {activeProject?.name ? (
                        <p className="mt-1 text-[10px] text-brand-muted/80">Venture · {activeProject.name}</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
