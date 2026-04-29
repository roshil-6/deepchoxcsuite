'use client';

import React from 'react';
import { Briefcase, Cpu, BarChart3, LineChart, Rocket, ArrowRight, Sparkles } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';

type DeskConfig = {
    room: 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo';
    emoji: string;
    label: string;
    subtitle: string;
    description: string;
    hint: string;
    borderClass: string;
    bgClass: string;
    labelClass: string;
    dotClass: string;
};

const DESKS: DeskConfig[] = [
    {
        room: 'ceo',
        emoji: '🎯',
        label: 'Strategy',
        subtitle: 'CEO Desk',
        description: 'Brand vision, competitive positioning, market strategy, and leadership direction.',
        hint: 'Where are we going and why?',
        borderClass: 'border-violet-500/20 hover:border-violet-500/40',
        bgClass: 'bg-violet-500/[0.06] hover:bg-violet-500/[0.1]',
        labelClass: 'text-violet-300',
        dotClass: 'bg-violet-400',
    },
    {
        room: 'pm',
        emoji: '⚙️',
        label: 'Product',
        subtitle: 'PM Desk',
        description: 'Roadmap planning, kanban execution, sprint goals, feature prioritisation, and shipping velocity.',
        hint: 'What are we building and when?',
        borderClass: 'border-blue-500/20 hover:border-blue-500/40',
        bgClass: 'bg-blue-500/[0.06] hover:bg-blue-500/[0.1]',
        labelClass: 'text-blue-300',
        dotClass: 'bg-blue-400',
    },
    {
        room: 'accountant',
        emoji: '💰',
        label: 'Finance',
        subtitle: 'Finance Desk',
        description: 'Budget planning, burn rate, cash flow projections, and financial scenario modelling.',
        hint: 'How long can we run and at what cost?',
        borderClass: 'border-emerald-500/20 hover:border-emerald-500/40',
        bgClass: 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.1]',
        labelClass: 'text-emerald-300',
        dotClass: 'bg-emerald-400',
    },
    {
        room: 'scout',
        emoji: '🔍',
        label: 'Market',
        subtitle: 'Scout Desk',
        description: 'Competitor mapping, market sizing, customer intelligence, trend signals, and white space identification.',
        hint: "What's happening in our market right now?",
        borderClass: 'border-amber-500/20 hover:border-amber-500/40',
        bgClass: 'bg-amber-500/[0.06] hover:bg-amber-500/[0.1]',
        labelClass: 'text-amber-300',
        dotClass: 'bg-amber-400',
    },
    {
        room: 'cmo',
        emoji: '🚀',
        label: 'Marketing',
        subtitle: 'CMO Desk',
        description: 'Brand narrative, campaign strategy, content direction, growth levers, and go-to-market execution.',
        hint: 'How do we reach and convert the right people?',
        borderClass: 'border-rose-500/20 hover:border-rose-500/40',
        bgClass: 'bg-rose-500/[0.06] hover:bg-rose-500/[0.1]',
        labelClass: 'text-rose-300',
        dotClass: 'bg-rose-400',
    },
];

export function DesksHub() {
    const { switchRoom, activeProject } = useOffice();

    return (
        <div className="space-y-6 py-2">
            {/* Header */}
            <div className="flex items-start gap-3">
                <DexoAvatar size="sm" state="idle" pulse={false} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">AI Desks</p>
                    <h1 className="mt-0.5 text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">
                        {activeProject?.name ?? 'Your venture'} — AI team
                    </h1>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                        Each desk is a specialist AI that digs deep into one dimension of your venture. Pick one to run a full analysis or continue a conversation.
                    </p>
                </div>
            </div>

            {/* Desk grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DESKS.map((desk) => (
                    <button
                        key={desk.room}
                        type="button"
                        onClick={() => switchRoom(desk.room)}
                        className={`group relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${desk.borderClass} ${desk.bgClass}`}
                    >
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <span className="text-2xl leading-none">{desk.emoji}</span>
                                <div>
                                    <p className={`text-[13px] font-semibold leading-tight ${desk.labelClass}`}>
                                        {desk.label}
                                    </p>
                                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                        {desk.subtitle}
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                        </div>

                        {/* Description */}
                        <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                            {desk.description}
                        </p>

                        {/* Hint chip */}
                        <div className="mt-auto flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${desk.dotClass} opacity-70`} />
                            <p className="text-[11px] italic text-[var(--text-muted)]">{desk.hint}</p>
                        </div>
                    </button>
                ))}

                {/* Dexo shortcut card */}
                <button
                    type="button"
                    onClick={() => switchRoom('dexo')}
                    className="group relative flex flex-col gap-3 rounded-2xl border border-[rgba(116,86,255,0.25)] bg-[rgba(116,86,255,0.08)] p-4 text-left transition-all duration-200 hover:border-[rgba(116,86,255,0.45)] hover:bg-[rgba(116,86,255,0.13)]"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <Sparkles className="h-6 w-6 text-[#9d88ff]" />
                            <div>
                                <p className="text-[13px] font-semibold leading-tight text-violet-200">Dexo</p>
                                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">AI Co-founder</p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                    </div>
                    <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                        Your full-stack AI partner — synthesises every desk, runs daily research, and adapts to your current priority.
                    </p>
                    <div className="mt-auto flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 opacity-70" />
                        <p className="text-[11px] italic text-[var(--text-muted)]">The command centre</p>
                    </div>
                </button>
            </div>
        </div>
    );
}
