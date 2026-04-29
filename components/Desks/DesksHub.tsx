'use client';

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';

type DeskConfig = {
    room: 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo';
    index: string;
    label: string;
    role: string;
    description: string;
    question: string;
};

const DESKS: DeskConfig[] = [
    {
        room: 'ceo',
        index: '01',
        label: 'Strategy',
        role: 'CEO Desk',
        description: 'Brand vision, competitive positioning, market strategy, and leadership direction.',
        question: 'Where are we going and why?',
    },
    {
        room: 'pm',
        index: '02',
        label: 'Product',
        role: 'PM Desk',
        description: 'Roadmap planning, kanban execution, sprint goals, feature prioritisation, and shipping velocity.',
        question: 'What are we building and when?',
    },
    {
        room: 'accountant',
        index: '03',
        label: 'Finance',
        role: 'Finance Desk',
        description: 'Budget planning, burn rate, cash flow projections, and financial scenario modelling.',
        question: 'How long can we run and at what cost?',
    },
    {
        room: 'scout',
        index: '04',
        label: 'Market',
        role: 'Scout Desk',
        description: 'Competitor mapping, market sizing, customer intelligence, trend signals, and white space identification.',
        question: "What's happening in our market right now?",
    },
    {
        room: 'cmo',
        index: '05',
        label: 'Marketing',
        role: 'CMO Desk',
        description: 'Brand narrative, campaign strategy, content direction, growth levers, and go-to-market execution.',
        question: 'How do we reach and convert the right people?',
    },
];

export function DesksHub() {
    const { switchRoom, activeProject } = useOffice();

    return (
        <div className="space-y-6 py-2">
            {/* Header */}
            <div className="border-b border-white/[0.07] pb-5">
                <div className="flex items-baseline gap-3 mb-1">
                    <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/25">Workspace</span>
                    <span className="font-mono text-[8px] text-white/15">·</span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/25">AI Desks</span>
                </div>
                <h1 className="text-[17px] font-semibold text-white/90">
                    {activeProject?.name ? `${activeProject.name} — AI Team` : 'AI Team'}
                </h1>
                <p className="mt-1 text-[13px] text-white/40 leading-relaxed">
                    Each desk is a specialist AI for one dimension of your venture. Pick one to run a full analysis or continue a session.
                </p>
            </div>

            {/* Desk grid — numbered table-like layout */}
            <div className="space-y-px">
                {DESKS.map((desk) => (
                    <button
                        key={desk.room}
                        type="button"
                        onClick={() => switchRoom(desk.room)}
                        className="group w-full flex items-start gap-4 border border-white/[0.07] bg-white/[0.02] px-4 py-4 text-left transition-colors hover:border-white/[0.13] hover:bg-white/[0.05] first:rounded-t-lg last:rounded-b-lg"
                    >
                        {/* Index */}
                        <span className="shrink-0 font-mono text-[9px] text-white/20 pt-[2px] w-6">{desk.index}</span>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="font-sans text-[13px] font-semibold text-white/80">{desk.label}</span>
                                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">{desk.role}</span>
                            </div>
                            <p className="text-[12px] leading-relaxed text-white/40">{desk.description}</p>
                            <p className="mt-1.5 text-[11px] text-white/25 italic">{desk.question}</p>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-white/20 transition-all group-hover:text-white/50 group-hover:translate-x-0.5" />
                    </button>
                ))}
            </div>

            {/* Dexo shortcut — separated */}
            <div className="pt-2">
                <button
                    type="button"
                    onClick={() => switchRoom('dexo')}
                    className="group w-full flex items-start gap-4 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-4 text-left transition-colors hover:border-white/[0.18] hover:bg-white/[0.07]"
                >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-white/30 group-hover:text-white/55 transition-colors" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="font-sans text-[13px] font-semibold text-white/80">Dexo</span>
                            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">AI Co-founder</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-white/40">
                            Full-stack AI partner — synthesises every desk, runs daily research, adapts to your current priority.
                        </p>
                    </div>
                    <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-white/20 transition-all group-hover:text-white/50 group-hover:translate-x-0.5" />
                </button>
            </div>
        </div>
    );
}
