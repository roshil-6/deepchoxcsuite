'use client';

import React, { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { Database, Bot, ArrowRight, ExternalLink, Network } from 'lucide-react';
import type { AiSyncTraceStep } from '@/lib/agentStaffTypes';
import {
    SUITE_INTELLIGENCE_API_NODE,
    SUITE_INTELLIGENCE_VENTURE_NODE,
    SUITE_ROLE_FLOW_COLUMNS,
    type IntelligenceNavRoom,
} from '@/lib/suiteIntelligenceFlowGraph';

type Props = {
    ventureName: string;
    lastSyncAtLabel: string | null;
    trace: AiSyncTraceStep[] | null;
    agentSyncRunning: boolean;
    switchRoom: (room: IntelligenceNavRoom) => void;
    /** Wider, taller layout when opened as the only view (e.g. Suite Intelligence full structure). */
    variant?: 'inline' | 'fullscreen';
};

function setNodeRef(map: React.MutableRefObject<Record<string, HTMLElement | null>>, id: string) {
    return (el: HTMLElement | null) => {
        map.current[id] = el;
    };
}

function connect(
    container: DOMRect,
    a: DOMRect | undefined,
    b: DOMRect | undefined,
    curve = true
): string {
    if (!a || !b) return '';
    const x1 = a.left + a.width / 2 - container.left;
    const y1 = a.bottom - container.top;
    const x2 = b.left + b.width / 2 - container.left;
    const y2 = b.top - container.top;
    if (curve) {
        const mid = (y1 + y2) / 2;
        return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
    }
    return `M ${x1} ${y1} L ${x2} ${y2}`;
}

export function SuiteIntelligenceNeuralFlow({
    ventureName,
    lastSyncAtLabel,
    trace,
    agentSyncRunning,
    switchRoom,
    variant = 'inline',
}: Props) {
    const isFull = variant === 'fullscreen';
    const wrapRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<Record<string, HTMLElement | null>>({});
    const [paths, setPaths] = useState<string[]>([]);

    const recompute = useCallback(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const c = wrap.getBoundingClientRect();
        if (c.width < 40 || c.height < 40) return;

        const p: string[] = [];
        const v = SUITE_INTELLIGENCE_VENTURE_NODE.id;
        const api = SUITE_INTELLIGENCE_API_NODE.id;

        const pv = connect(c, nodesRef.current[v]?.getBoundingClientRect(), nodesRef.current[api]?.getBoundingClientRect());
        if (pv) p.push(pv);

        for (const col of SUITE_ROLE_FLOW_COLUMNS) {
            const rid = `role-${col.id}`;
            const sid = `surfaces-${col.id}`;
            const a1 = connect(c, nodesRef.current[api]?.getBoundingClientRect(), nodesRef.current[rid]?.getBoundingClientRect());
            if (a1) p.push(a1);
            const a2 = connect(
                c,
                nodesRef.current[rid]?.getBoundingClientRect(),
                nodesRef.current[sid]?.getBoundingClientRect()
            );
            if (a2) p.push(a2);
        }

        setPaths(p);
    }, []);

    useLayoutEffect(() => {
        const run = () => {
            requestAnimationFrame(() => requestAnimationFrame(() => recompute()));
        };
        run();
        const ro = new ResizeObserver(() => run());
        if (wrapRef.current) ro.observe(wrapRef.current);
        window.addEventListener('resize', run);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', run);
        };
    }, [recompute, ventureName, lastSyncAtLabel, trace?.length, agentSyncRunning]);

    const ref = (id: string) => setNodeRef(nodesRef, id);

    return (
        <div className={isFull ? 'space-y-8' : 'space-y-6'}>
            {trace && trace.length > 0 ? (
                <div
                    className="rounded-xl border border-brand-teal/20 bg-brand-teal/[0.04] px-4 py-3"
                    aria-label="Last sync pipeline trace"
                >
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-teal/90">
                        AI pipeline (last run)
                    </p>
                    <div className="flex flex-wrap items-stretch gap-1.5 sm:gap-2">
                        {trace.map((step, i) => (
                            <React.Fragment key={`${step.id}-${i}`}>
                                {i > 0 ? (
                                    <div className="flex items-center text-brand-muted/50" aria-hidden>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </div>
                                ) : null}
                                <div
                                    className="max-w-[min(100%,14rem)] rounded-lg border border-brand-border/60 bg-brand-bg/80 px-2.5 py-2"
                                    title={step.detail || step.label}
                                >
                                    <p className="text-[11px] font-medium leading-snug text-brand-text">{step.label}</p>
                                    {step.detail ? (
                                        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-brand-muted">
                                            {step.detail}
                                        </p>
                                    ) : null}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="rounded-lg border border-dashed border-brand-border/50 bg-brand-bg/40 px-3 py-2 text-[11px] text-brand-muted">
                    Run <strong className="text-brand-text">Sync AI staff</strong> to populate the strip — each box is a backend step
                    (snapshot → headlines → one combined model pass for all five roles → merge into the venture record).
                </p>
            )}

            <div
                className={`rounded-xl border border-brand-border/55 bg-brand-panel/20 px-3 py-2.5 sm:px-4 ${isFull ? 'text-[12px]' : 'text-[11px]'} leading-relaxed text-brand-muted`}
            >
                <span className="font-semibold text-brand-text">How to read the map: </span>
                Flow is <span className="text-brand-text/95">venture data → staff-sync API → each officer lane → suite screens</span>.
                Sync regenerates <em>all</em> desk briefs in one response so roles stay consistent; AI you use inside a desk updates the same
                record when you save, and the next sync picks that up.
            </div>

            <div
                className={`relative overflow-hidden rounded-2xl border border-brand-border/80 bg-[#0c0c0e] p-4 sm:p-6 ${
                    isFull ? 'min-h-[min(78vh,900px)] shadow-2xl shadow-black/40' : ''
                }`}
            >
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.35]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(45,212,191,0.08) 0%, transparent 45%),
              radial-gradient(circle at 80% 70%, rgba(139,92,246,0.06) 0%, transparent 40%),
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                        backgroundSize: '100% 100%, 100% 100%, 24px 24px, 24px 24px',
                    }}
                    aria-hidden
                />

                <div className="relative z-[1] mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-brand-muted">
                    <Network className="h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Neural suite map</span>
                    <span className="text-[10px] text-brand-muted/80">
                        — per role: last sync brief, fields updated, linked suite surfaces
                    </span>
                </div>

                <div
                    ref={wrapRef}
                    className={`relative z-[1] pb-4 ${isFull ? 'min-h-[min(68vh,820px)] lg:min-h-[min(65vh,780px)]' : 'min-h-[520px] lg:min-h-[480px]'}`}
                >
                    <svg
                        className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
                        aria-hidden
                    >
                        {paths.map((d, i) => (
                            <path
                                key={i}
                                d={d}
                                fill="none"
                                stroke="rgba(45, 212, 191, 0.28)"
                                strokeWidth={1.5}
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}
                    </svg>

                    <div className="relative z-[2] flex flex-col items-center gap-0">
                        {/* Venture hub */}
                        <div
                            ref={ref(SUITE_INTELLIGENCE_VENTURE_NODE.id)}
                            className={`w-full max-w-lg rounded-2xl border px-4 py-4 sm:px-5 ${
                                agentSyncRunning
                                    ? 'border-brand-teal/40 bg-brand-teal/[0.08] shadow-[0_0_24px_rgba(45,212,191,0.12)]'
                                    : 'border-white/[0.1] bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-input">
                                    <Database className="h-5 w-5 text-brand-teal" aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                                        {SUITE_INTELLIGENCE_VENTURE_NODE.title}
                                    </p>
                                    <p className="mt-0.5 text-sm font-semibold text-brand-text">{ventureName}</p>
                                    <p className="mt-1 text-[11px] text-brand-muted">{SUITE_INTELLIGENCE_VENTURE_NODE.subtitle}</p>
                                    <ul className="mt-2 list-inside list-disc space-y-1 text-[10px] leading-relaxed text-brand-muted/95">
                                        {SUITE_INTELLIGENCE_VENTURE_NODE.detailLines.map((line, idx) => (
                                            <li key={idx}>{line}</li>
                                        ))}
                                    </ul>
                                    {lastSyncAtLabel ? (
                                        <p className="mt-2 font-mono text-[10px] text-brand-teal/85">Last staff sync: {lastSyncAtLabel}</p>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="h-6 w-px shrink-0 bg-transparent lg:hidden" aria-hidden />

                        {/* API node */}
                        <div
                            ref={ref(SUITE_INTELLIGENCE_API_NODE.id)}
                            className={`mt-2 w-full max-w-lg rounded-2xl border px-4 py-4 sm:px-5 ${
                                agentSyncRunning
                                    ? 'animate-pulse border-violet-400/35 bg-violet-950/25'
                                    : 'border-violet-500/25 bg-violet-950/15'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-950/40">
                                    <Bot className="h-5 w-5 text-violet-300" aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-mono text-[11px] font-semibold text-violet-200/95">{SUITE_INTELLIGENCE_API_NODE.title}</p>
                                    <p className="mt-1 text-[11px] text-violet-200/70">{SUITE_INTELLIGENCE_API_NODE.subtitle}</p>
                                    <ul className="mt-2 space-y-1.5 border-t border-violet-500/15 pt-2 text-[10px] leading-relaxed text-violet-100/75">
                                        {SUITE_INTELLIGENCE_API_NODE.detailLines.map((line, idx) => (
                                            <li key={idx} className="pl-1">
                                                {line}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Role columns + surfaces */}
                        <div className="mt-8 w-full">
                            <p className="mx-auto mb-1 max-w-2xl text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
                                Officer lanes → where that role shows up (tap to open)
                            </p>
                            <p className="mx-auto mb-4 max-w-xl text-center text-[10px] leading-snug text-brand-muted/85">
                                Each lane is refreshed together on staff sync; between syncs, desk AI can change the venture record so the
                                next run reflects your latest work.
                            </p>
                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-3">
                                {SUITE_ROLE_FLOW_COLUMNS.map((col) => (
                                    <div key={col.id} className="flex flex-col items-stretch gap-4">
                                        <div
                                            ref={ref(`role-${col.id}`)}
                                            className="flex min-h-[11rem] flex-col rounded-xl border border-brand-border/70 bg-brand-bg/85 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                                        >
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-teal/90">
                                                Desk · {col.agentSyncDeskKey}
                                            </p>
                                            <p className="mt-2 text-[12px] font-semibold leading-snug text-brand-text">{col.fullTitle}</p>
                                            <p className="mt-2 text-[10px] leading-relaxed text-brand-muted">{col.aiDelivers}</p>
                                            <div className="mt-3 border-t border-brand-border/40 pt-2">
                                                <p className="text-[9px] font-semibold uppercase tracking-wider text-brand-muted/90">
                                                    Persisted fields
                                                </p>
                                                <ul className="mt-1 space-y-1 text-[9px] leading-snug text-brand-muted">
                                                    {col.dataBindings.map((b) => (
                                                        <li key={b} className="break-words">
                                                            · {b}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => switchRoom(col.deskRoom)}
                                                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-teal/30 bg-brand-teal/10 py-2 text-[10px] font-semibold text-brand-text transition hover:bg-brand-teal/20"
                                            >
                                                Open desk workspace
                                                <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                                            </button>
                                        </div>

                                        <div ref={ref(`surfaces-${col.id}`)} className="flex flex-col gap-2">
                                            <p className="text-[9px] font-semibold uppercase tracking-wider text-brand-muted/90">
                                                Linked suite sections
                                            </p>
                                            {col.surfaces.map((s) => (
                                                <button
                                                    key={`${col.id}-${s.label}`}
                                                    type="button"
                                                    onClick={() => switchRoom(s.room)}
                                                    className="rounded-lg border border-brand-border/55 bg-brand-panel/50 px-2.5 py-2 text-left transition hover:border-brand-teal/35 hover:bg-brand-panel"
                                                >
                                                    <p className="flex items-center justify-between gap-1 text-[11px] font-medium text-brand-text">
                                                        {s.label}
                                                        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
                                                    </p>
                                                    <p className="mt-1 text-[10px] leading-relaxed text-brand-muted">{s.detail}</p>
                                                    <p className="mt-1 font-mono text-[9px] text-brand-teal/70">workspace · {s.room}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
