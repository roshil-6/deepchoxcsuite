'use client';

import React, { useState } from 'react';
import {
    TrendingUp,
    Package,
    DollarSign,
    Radar,
    Megaphone,
    Sparkles,
    Search,
    Check,
    ChevronDown,
    Plus,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type DeskConfig = {
    room: 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo';
    label: string;
    role: string;
    description: string;
    Icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    tag?: string;
};

type FilterId = 'all' | 'active' | 'available';

// ── Desk data ─────────────────────────────────────────────────────────────────

const DESKS: DeskConfig[] = [
    {
        room: 'ceo',
        label: 'Strategy',
        role: 'CEO Desk',
        description: 'Brand vision, competitive positioning, market strategy, and leadership direction.',
        Icon: TrendingUp,
        iconColor: '#c4b5fd',
        iconBg: 'rgba(255,255,255,0.09)',
        tag: 'Core',
    },
    {
        room: 'pm',
        label: 'Product',
        role: 'PM Desk',
        description: 'Roadmap planning, sprint goals, feature prioritisation, and shipping velocity.',
        Icon: Package,
        iconColor: '#38bdf8',
        iconBg: 'rgba(56,189,248,0.14)',
        tag: 'Core',
    },
    {
        room: 'accountant',
        label: 'Finance',
        role: 'Finance Desk',
        description: 'Budget planning, burn rate, cash flow projections, and scenario modelling.',
        Icon: DollarSign,
        iconColor: '#34d399',
        iconBg: 'rgba(52,211,153,0.14)',
        tag: 'Core',
    },
    {
        room: 'scout',
        label: 'Market',
        role: 'Scout Desk',
        description: 'Competitor mapping, market sizing, customer intelligence, and trend signals.',
        Icon: Radar,
        iconColor: '#fbbf24',
        iconBg: 'rgba(245,158,11,0.14)',
        tag: 'Core',
    },
    {
        room: 'cmo',
        label: 'Marketing',
        role: 'CMO Desk',
        description: 'Brand narrative, campaign strategy, content direction, and go-to-market execution.',
        Icon: Megaphone,
        iconColor: '#f87171',
        iconBg: 'rgba(244,63,94,0.14)',
        tag: 'Core',
    },
];

// ── Pill filter ───────────────────────────────────────────────────────────────

function FilterPill({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150"
            style={
                active
                    ? {
                          background: '#f2f2f5',
                          color: '#0d0d10',
                          border: '1px solid transparent',
                      }
                    : {
                          background: 'transparent',
                          color: '#8c8c9e',
                          border: '1px solid rgba(255,255,255,0.10)',
                      }
            }
        >
            {children}
        </button>
    );
}

// ── Connector card (Perplexity style: icon left, text right) ──────────────────

function DeskCard({
    desk,
    active,
    onClick,
}: {
    desk: DeskConfig;
    active: boolean;
    onClick: () => void;
}) {
    const Icon = desk.Icon;
    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative flex items-start gap-3.5 rounded-xl p-4 text-left transition-all duration-150"
            style={{
                background: '#19181f',
                border: '1px solid rgba(255,255,255,0.07)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = '#201f28';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = '#19181f';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
            }}
        >
            {/* Active checkmark — top right */}
            {active && (
                <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: 'rgba(34,197,94,0.15)' }}>
                    <Check className="h-2.5 w-2.5" style={{ color: '#22c55e' }} strokeWidth={2.5} />
                </span>
            )}

            {/* Icon square */}
            <div
                className="mt-0.5 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl"
                style={{ background: desk.iconBg }}
            >
                <Icon className="h-5 w-5" style={{ color: desk.iconColor }} strokeWidth={1.75} />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1 pr-5">
                <p className="text-[14px] font-semibold leading-snug text-white/90 group-hover:text-white transition-colors">
                    {desk.label}
                </p>
                <p
                    className="mt-1 text-[12.5px] leading-relaxed"
                    style={{ color: '#8c8c9e' }}
                >
                    {desk.description}
                </p>
            </div>
        </button>
    );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function DesksHub() {
    const { switchRoom, activeProject } = useOffice();
    const [filter, setFilter] = useState<FilterId>('all');
    const [query, setQuery] = useState('');

    const hasSnap = !!activeProject?.agentStaffSnapshot;

    const filtered = DESKS.filter((d) => {
        const matchesQuery =
            !query ||
            d.label.toLowerCase().includes(query.toLowerCase()) ||
            d.description.toLowerCase().includes(query.toLowerCase());
        if (!matchesQuery) return false;
        if (filter === 'active') return hasSnap;
        if (filter === 'available') return !hasSnap;
        return true;
    });

    return (
        <div className="min-h-full pb-16" style={{ background: '#0d0d10' }}>

            {/* ── Page header ── */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 pt-1">
                <div>
                    <h1 className="text-[22px] font-semibold leading-tight text-white/95">
                        AI Desks
                    </h1>
                    <p className="mt-1 text-[13.5px]" style={{ color: '#8c8c9e' }}>
                        Connect specialist AI to each dimension of your venture
                    </p>
                </div>

                {/* Search */}
                <div
                    className="flex items-center gap-2 rounded-full px-3.5 py-2"
                    style={{
                        background: '#19181f',
                        border: '1px solid rgba(255,255,255,0.08)',
                        minWidth: '200px',
                    }}
                >
                    <Search className="h-3.5 w-3.5 shrink-0" style={{ color: '#5c5c6e' }} strokeWidth={1.75} />
                    <input
                        type="text"
                        placeholder="Search all desks"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[13px] text-white/80 placeholder:text-[#5c5c6e] focus:outline-none"
                    />
                </div>
            </div>

            {/* ── Filter row ── */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                    <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
                        All
                    </FilterPill>
                    <FilterPill active={filter === 'active'} onClick={() => setFilter('active')}>
                        Active
                    </FilterPill>
                    <FilterPill active={filter === 'available'} onClick={() => setFilter('available')}>
                        Available
                    </FilterPill>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all"
                        style={{ background: '#19181f', border: '1px solid rgba(255,255,255,0.08)', color: '#8c8c9e' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#f2f2f5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8c8c9e'; }}
                    >
                        All types
                        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                        type="button"
                        onClick={() => switchRoom('dexo')}
                        className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all"
                        style={{ background: '#f2f2f5', border: '1px solid transparent', color: '#0d0d10' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e5ea'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f2f2f5'; }}
                    >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                        Ask Dexo
                    </button>
                </div>
            </div>

            {/* ── "Included with your plan" section ── */}
            <section className="mb-6">
                <p
                    className="mb-3 text-[13px] font-medium"
                    style={{ color: '#8c8c9e' }}
                >
                    {activeProject?.name ? `${activeProject.name} — included desks` : 'Included with your plan'}
                </p>

                {filtered.length === 0 ? (
                    <div
                        className="flex items-center justify-center rounded-xl py-10 text-[13px]"
                        style={{ border: '1px dashed rgba(255,255,255,0.07)', color: '#5c5c6e' }}
                    >
                        No desks match your filter
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((desk) => (
                            <DeskCard
                                key={desk.room}
                                desk={desk}
                                active={hasSnap}
                                onClick={() => switchRoom(desk.room)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* ── Divider ── */}
            <div className="my-6 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

            {/* ── AI Co-Founder section ── */}
            <section>
                <p className="mb-3 text-[13px] font-medium" style={{ color: '#8c8c9e' }}>
                    AI Co-Founder
                </p>
                <button
                    type="button"
                    onClick={() => switchRoom('dexo')}
                    className="group relative flex w-full items-start gap-3.5 rounded-xl p-4 text-left transition-all duration-150"
                    style={{ background: '#19181f', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#1c1b24';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#19181f';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    }}
                >
                    {/* Icon */}
                    <div
                        className="mt-0.5 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.07)' }}
                    >
                        <Sparkles className="h-5 w-5" style={{ color: '#f2f2f5' }} strokeWidth={1.75} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-[14px] font-semibold leading-snug text-white/90 group-hover:text-white transition-colors">
                                Dexo
                            </p>
                            <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                                style={{ background: 'rgba(255,255,255,0.07)', color: '#8c8c9e', border: '1px solid rgba(255,255,255,0.10)' }}
                            >
                                Co-Founder
                            </span>
                        </div>
                        <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: '#8c8c9e' }}>
                            Full-stack AI partner — synthesises every desk, runs daily research, and adapts to your current priority.
                        </p>
                    </div>
                </button>
            </section>

        </div>
    );
}
