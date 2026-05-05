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

// ── Text filter tab ───────────────────────────────────────────────────────────

function FilterTab({
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
            className="text-[13px] font-medium transition-colors duration-150"
            style={{ color: active ? '#f2f2f5' : '#5c5c6e', background: 'none', border: 'none', padding: 0 }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#8c8c9e'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#5c5c6e'; }}
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
            className="group flex w-full items-center gap-4 py-4 text-left transition-colors duration-150"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
            {/* Icon */}
            <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: desk.iconBg }}
            >
                <Icon className="h-4 w-4" style={{ color: desk.iconColor }} strokeWidth={1.75} />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-snug" style={{ color: '#f2f2f5' }}>
                    {desk.label}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: '#5c5c6e' }}>
                    {desk.description}
                </p>
            </div>

            {/* Active indicator */}
            {active && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: '#22c55e' }} strokeWidth={2.5} />}
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
            <div className="pb-6 pt-1">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#3d3d4e' }}>
                            {activeProject?.name ?? 'Workspace'}
                        </p>
                        <h1 className="text-[20px] font-semibold leading-tight" style={{ color: '#f2f2f5' }}>
                            AI Desks
                        </h1>
                    </div>

                    {/* Search — flat, no box feel */}
                    <div className="flex items-center gap-2 pb-0.5">
                        <Search className="h-3.5 w-3.5 shrink-0" style={{ color: '#3d3d4e' }} strokeWidth={1.75} />
                        <input
                            type="text"
                            placeholder="Search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-32 bg-transparent text-[13px] focus:outline-none focus:w-44 transition-all duration-200"
                            style={{ color: '#f2f2f5', caretColor: '#f2f2f5' }}
                        />
                    </div>
                </div>

                {/* Divider */}
                <div className="mt-5 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                {/* ── Filter tabs + action ── */}
                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterTab>
                        <FilterTab active={filter === 'active'} onClick={() => setFilter('active')}>Active</FilterTab>
                        <FilterTab active={filter === 'available'} onClick={() => setFilter('available')}>Available</FilterTab>
                    </div>
                    <button
                        type="button"
                        onClick={() => switchRoom('dexo')}
                        className="text-[13px] font-medium transition-colors duration-150"
                        style={{ color: '#5c5c6e', background: 'none', border: 'none' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#f2f2f5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#5c5c6e'; }}
                    >
                        Ask Dexo →
                    </button>
                </div>
            </div>

            {/* ── Desk list ── */}
            <section className="mb-8">
                {filtered.length === 0 ? (
                    <p className="py-10 text-[13px]" style={{ color: '#3d3d4e' }}>No desks match.</p>
                ) : (
                    <div className="flex flex-col">
                        {filtered.map((desk, i) => (
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
            <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

            {/* ── AI Co-Founder ── */}
            <section className="mt-8">
                <DeskCard
                    desk={{
                        room: 'dexo' as 'ceo',
                        label: 'Dexo',
                        role: 'AI Co-Founder',
                        description: 'Full-stack AI partner — synthesises every desk, runs daily research, and adapts to your current priority.',
                        Icon: Sparkles,
                        iconColor: '#f2f2f5',
                        iconBg: 'rgba(255,255,255,0.05)',
                    }}
                    active={false}
                    onClick={() => switchRoom('dexo')}
                />
            </section>

        </div>
    );
}
