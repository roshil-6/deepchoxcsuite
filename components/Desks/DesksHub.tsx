'use client';

import React from 'react';
import {
    TrendingUp,
    Package,
    DollarSign,
    Radar,
    Megaphone,
    ArrowUpRight,
    Sparkles,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';

type DeskConfig = {
    room: 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo';
    label: string;
    role: string;
    description: string;
    question: string;
    Icon: React.ElementType;
    iconColor: string;
    iconBg: string;
};

const DESKS: DeskConfig[] = [
    {
        room: 'ceo',
        label: 'Strategy',
        role: 'CEO Desk',
        description: 'Brand vision, competitive positioning, market strategy, and leadership direction.',
        question: 'Where are we going and why?',
        Icon: TrendingUp,
        iconColor: 'rgba(139,92,246,0.9)',
        iconBg: 'rgba(139,92,246,0.12)',
    },
    {
        room: 'pm',
        label: 'Product',
        role: 'PM Desk',
        description: 'Roadmap planning, sprint goals, feature prioritisation, and shipping velocity.',
        question: 'What are we building and when?',
        Icon: Package,
        iconColor: 'rgba(56,189,248,0.9)',
        iconBg: 'rgba(56,189,248,0.10)',
    },
    {
        room: 'accountant',
        label: 'Finance',
        role: 'Finance Desk',
        description: 'Budget planning, burn rate, cash flow projections, and scenario modelling.',
        question: 'How long can we run and at what cost?',
        Icon: DollarSign,
        iconColor: 'rgba(52,211,153,0.9)',
        iconBg: 'rgba(52,211,153,0.10)',
    },
    {
        room: 'scout',
        label: 'Market',
        role: 'Scout Desk',
        description: 'Competitor mapping, market sizing, customer intelligence, and trend signals.',
        question: "What's happening in our market right now?",
        Icon: Radar,
        iconColor: 'rgba(245,158,11,0.9)',
        iconBg: 'rgba(245,158,11,0.10)',
    },
    {
        room: 'cmo',
        label: 'Marketing',
        role: 'CMO Desk',
        description: 'Brand narrative, campaign strategy, content direction, and go-to-market execution.',
        question: 'How do we reach and convert the right people?',
        Icon: Megaphone,
        iconColor: 'rgba(244,63,94,0.9)',
        iconBg: 'rgba(244,63,94,0.10)',
    },
];

// ── Card component ────────────────────────────────────────────────────────────

function DeskCard({ desk, onClick }: { desk: DeskConfig; onClick: () => void }) {
    const Icon = desk.Icon;
    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex flex-col items-start gap-3.5 rounded-xl p-4 text-left transition-colors duration-150"
            style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = 'rgba(255,255,255,0.045)';
                el.style.borderColor = 'rgba(255,255,255,0.14)';
            }}
            onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = 'rgba(255,255,255,0.025)';
                el.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
        >
            {/* Top row: icon + arrow */}
            <div className="flex w-full items-start justify-between">
                <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: desk.iconBg }}
                >
                    <Icon className="h-4 w-4" style={{ color: desk.iconColor }} strokeWidth={1.75} />
                </div>
                <ArrowUpRight
                    className="h-3.5 w-3.5 text-white/18 transition-all duration-150 group-hover:text-white/50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={1.75}
                />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold leading-tight text-white/82 transition-colors group-hover:text-white/95">
                    {desk.label}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-white/28">{desk.role}</p>
                <p className="mt-2.5 text-[12px] leading-relaxed text-white/38 transition-colors group-hover:text-white/52">
                    {desk.description}
                </p>
                <p className="mt-2 text-[11px] italic text-white/22">{desk.question}</p>
            </div>
        </button>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DesksHub() {
    const { switchRoom, activeProject } = useOffice();

    return (
        <div className="py-2">

            {/* Header */}
            <div className="mb-6">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
                    Workspace · AI Team
                </p>
                <h1 className="text-[18px] font-semibold leading-tight text-white/90">
                    {activeProject?.name ? `${activeProject.name} — AI Team` : 'AI Team'}
                </h1>
                <p className="mt-1 text-[13px] leading-relaxed text-white/38">
                    Each desk is a specialist AI for one dimension of your venture. Pick one to run a full analysis or continue a session.
                </p>
            </div>

            {/* ── Desk grid ── */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {DESKS.map((desk) => (
                    <DeskCard key={desk.room} desk={desk} onClick={() => switchRoom(desk.room)} />
                ))}
            </div>

            {/* ── Dexo featured card ── */}
            <div className="mt-4">
                <button
                    type="button"
                    onClick={() => switchRoom('dexo')}
                    className="group flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors duration-150"
                    style={{
                        background: 'rgba(139,92,246,0.05)',
                        border: '1px solid rgba(139,92,246,0.18)',
                    }}
                    onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.background = 'rgba(139,92,246,0.09)';
                        el.style.borderColor = 'rgba(139,92,246,0.30)';
                    }}
                    onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.background = 'rgba(139,92,246,0.05)';
                        el.style.borderColor = 'rgba(139,92,246,0.18)';
                    }}
                >
                    {/* Icon */}
                    <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: 'rgba(139,92,246,0.14)' }}
                    >
                        <Sparkles className="h-4 w-4 text-violet-400" strokeWidth={1.75} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-[13.5px] font-semibold text-white/88">Dexo</p>
                            <span
                                className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]"
                                style={{ background: 'rgba(139,92,246,0.15)', color: 'rgba(167,139,250,0.85)' }}
                            >
                                AI Co-founder
                            </span>
                        </div>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-white/38 transition-colors group-hover:text-white/55">
                            Full-stack AI partner — synthesises every desk, runs daily research, and adapts to your current priority.
                        </p>
                    </div>

                    {/* Arrow */}
                    <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 text-violet-400/40 transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-violet-400/70"
                        strokeWidth={1.75}
                    />
                </button>
            </div>

        </div>
    );
}
