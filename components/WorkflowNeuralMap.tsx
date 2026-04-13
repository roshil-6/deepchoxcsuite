'use client';

import React from 'react';
import { BrainCircuit, Bot, Cpu, GitBranch, Radar, FileSearch, MessageSquareText } from 'lucide-react';
import { INTELLIGENCE_WORKFLOWS, type IntelligenceWorkflow } from '@/lib/intelligence/workflowMap';

const WORKFLOW_ICON: Record<IntelligenceWorkflow['id'], React.ReactNode> = {
    staff_sync: <GitBranch className="h-4 w-4" aria-hidden />,
    boardroom: <BrainCircuit className="h-4 w-4" aria-hidden />,
    personal_assistant: <MessageSquareText className="h-4 w-4" aria-hidden />,
    desk_chat: <Bot className="h-4 w-4" aria-hidden />,
    research_report: <FileSearch className="h-4 w-4" aria-hidden />,
    pinpoint_probe: <Radar className="h-4 w-4" aria-hidden />,
};

function protocolTone(protocol: IntelligenceWorkflow['protocol']): string {
    switch (protocol) {
        case 'parallel_merge':
            return 'border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-200/90';
        case 'lead_challenger':
            return 'border-violet-500/25 bg-violet-500/[0.08] text-violet-200/90';
        case 'relay_critique':
            return 'border-amber-500/25 bg-amber-500/[0.08] text-amber-200/90';
        default:
            return 'border-zinc-500/25 bg-zinc-500/[0.08] text-zinc-200/85';
    }
}

function protocolLabel(protocol: IntelligenceWorkflow['protocol']): string {
    switch (protocol) {
        case 'parallel_merge':
            return 'Parallel merge';
        case 'lead_challenger':
            return 'Lead + challenger';
        case 'relay_critique':
            return 'Relay critique';
        default:
            return 'Single context';
    }
}

export function WorkflowNeuralMap() {
    return (
        <div className="relative rounded-2xl border border-violet-500/18 bg-[#09090b] p-4 ring-1 ring-white/[0.04] sm:p-5">
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.25]"
                aria-hidden
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 20% 20%, rgba(139,92,246,0.12) 0%, transparent 30%), radial-gradient(circle at 80% 80%, rgba(34,211,238,0.1) 0%, transparent 28%)',
                }}
            />

            <div className="relative">
                <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-zinc-100 ring-1 ring-white/[0.05]">
                        <BrainCircuit className="h-5 w-5" aria-hidden />
                    </div>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/60">
                        Intelligence core
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-100">Deepchox neural operating map</p>
                </div>

                <div className="mx-auto mt-4 h-6 w-px bg-gradient-to-b from-violet-400/50 to-transparent" aria-hidden />

                <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <div className="flex flex-col items-center rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-3 text-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/[0.1] text-sky-300">
                            <Cpu className="h-4 w-4" aria-hidden />
                        </div>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200/60">GPT</p>
                        <p className="mt-1 text-[12px] font-medium text-zinc-100">Execution architect</p>
                    </div>

                    <div className="hidden h-px bg-gradient-to-r from-sky-400/35 via-white/[0.08] to-amber-400/35 sm:block" aria-hidden />

                    <div className="flex flex-col items-center rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/[0.1] text-amber-300">
                            <Bot className="h-4 w-4" aria-hidden />
                        </div>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/60">Claude</p>
                        <p className="mt-1 text-[12px] font-medium text-zinc-100">Strategic analyst</p>
                    </div>
                </div>

                <div className="mx-auto mt-4 h-6 w-px bg-gradient-to-b from-white/[0.12] to-transparent" aria-hidden />

                <div className="grid gap-3 lg:grid-cols-3">
                    {INTELLIGENCE_WORKFLOWS.map((workflow) => (
                        <div
                            key={workflow.id}
                            className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.03]"
                        >
                            <div className="mb-3 flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/25 text-zinc-300">
                                        {WORKFLOW_ICON[workflow.id]}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                                            {workflow.title}
                                        </p>
                                        <p className="mt-1 text-[10px] text-zinc-600">{workflow.status}</p>
                                    </div>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${protocolTone(workflow.protocol)}`}>
                                    {protocolLabel(workflow.protocol)}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="rounded-lg border border-sky-500/15 bg-sky-500/[0.04] px-2.5 py-2">
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-200/60">GPT lane</p>
                                    <p className="mt-1 text-[11px] leading-snug text-zinc-300">{workflow.gptRole}</p>
                                </div>
                                <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-2.5 py-2">
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-200/60">Claude lane</p>
                                    <p className="mt-1 text-[11px] leading-snug text-zinc-300">{workflow.claudeRole}</p>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {workflow.rooms.map((room) => (
                                    <span
                                        key={`${workflow.id}-${room}`}
                                        className="rounded-full border border-white/[0.08] bg-black/20 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-zinc-400"
                                    >
                                        {room.split('_').join(' ')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
