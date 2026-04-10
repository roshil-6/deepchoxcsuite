'use client';

import React from 'react';
import { useAnalysisData } from '@/lib/useAnalysisData';
import {
    ScanSearch,
    MoreVertical,
    TrendingUp,
    ArrowUpRight,
    Zap,
    ShieldAlert,
    Activity,
    Compass
} from 'lucide-react';

export function InsightGrid() {
    const { analysis } = useAnalysisData();
    const market = analysis?.market;

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-[var(--color-brand-bg)] animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex items-start gap-4 border-b border-[var(--color-brand-border)] px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] text-[var(--muted)]">
                    <ScanSearch className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">Intelligence Scout Unit</p>
                    <h2 className="mt-0.5 text-base font-semibold tracking-tight text-[var(--text)]">Market Intelligence</h2>
                </div>
            </div>

            {/* ── Executive Summary ── */}
            <div className="px-5 pt-5 sm:px-6">
                <div className="rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] p-4 sm:p-5">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">Executive Summary</p>
                    <p className="text-sm leading-relaxed text-[var(--text)]/90">
                        {market?.summary || "Global market dimensions and competitive positioning data awaiting synchronization. Deploy the Scout unit to retrieve initial data points."}
                    </p>
                </div>
            </div>

            {/* ── Main Grid ── */}
            <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2">

                {/* Competitor Analysis */}
                <section className="space-y-3">
                    <h3 className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Competitive Landscape
                    </h3>

                    <div className="space-y-3">
                        {market?.competitors?.map((comp: any, idx: number) => (
                            <div
                                key={idx}
                                className="group rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] p-4 sm:p-5 transition-colors hover:border-white/[0.12]"
                            >
                                <div className="mb-3 flex items-start justify-between">
                                    <div>
                                        <h4 className="text-sm font-semibold text-[var(--text)]">{comp.name}</h4>
                                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">{comp.marketShare || 'Share TBD'}</p>
                                    </div>
                                    <button className="text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100" aria-label="Options">
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Strength</span>
                                        <span className="text-xs text-[var(--text)]/80">{comp.strengths?.[0] || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Weakness</span>
                                        <span className="text-xs text-[var(--text)]/80">{comp.weaknesses?.[0] || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-end border-t border-white/[0.05] pt-3">
                                    <button className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] transition-colors hover:text-[var(--text)]">
                                        Full Profile <ArrowUpRight className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        )) || (
                            <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-white/[0.07]">
                                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">Awaiting Competitor Scans</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Market Trends & Risks */}
                <div className="space-y-5">

                    {/* Market Dynamics */}
                    <section className="space-y-3">
                        <h3 className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                            <Activity className="h-3.5 w-3.5" />
                            Market Dynamics
                        </h3>
                        <div className="rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] p-4 sm:p-5">
                            <div className="space-y-4">
                                {market?.trends?.map((trend: string, idx: number) => (
                                    <div key={idx} className="group flex items-start gap-3">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[var(--color-brand-bg)] transition-colors group-hover:border-white/[0.12]">
                                            <TrendingUp className="h-3.5 w-3.5 text-[var(--muted)]" />
                                        </div>
                                        <p className="text-xs leading-relaxed text-[var(--text)]/80 transition-colors group-hover:text-[var(--text)]">
                                            {trend}
                                        </p>
                                    </div>
                                )) || (
                                    <p className="py-4 text-center text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">No active trends identified</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Critical Risks */}
                    <section className="space-y-3">
                        <h3 className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                            <Compass className="h-3.5 w-3.5" />
                            Critical Risks &amp; Threats
                        </h3>
                        <div className="flex items-start gap-4 rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)] p-4 sm:p-5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[var(--color-brand-bg)]">
                                <Zap className="h-4 w-4 text-[var(--muted)]" />
                            </div>
                            <ul className="space-y-3">
                                {market?.risks?.map((risk: string, idx: number) => (
                                    <li key={idx} className="flex gap-2 text-xs leading-relaxed text-[var(--text)]/80">
                                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" />
                                        {risk}
                                    </li>
                                )) || (
                                    <li className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">No critical threats detected.</li>
                                )}
                            </ul>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
