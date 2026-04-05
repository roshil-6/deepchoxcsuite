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
        <div className={isFull ? 'space-y-5' : 'space-y-3'}>
            {trace && trace.length > 0 ? (
                <div
                    className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2"
                    aria-label="Last sync pipeline trace"
                >
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
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
                <p className="rounded-md border border-dashed border-brand-border/40 bg-brand-bg/30 px-2.5 py-1.5 text-[10px] text-brand-muted">
                    Run <strong className="text-brand-text">Sync AI staff</strong> for the pipeline strip (snapshot → model → merge).
                </p>
            )}

            <p className={`${isFull ? 'text-[11px]' : 'text-[10px]'} leading-snug text-brand-muted/80`}>
                <span className="text-brand-muted">Map:</span> venture → sync API → lanes → screens. One sync refreshes all desk briefs.
            </p>

            <div
                className={`relative overflow-hidden rounded-xl border border-brand-border/80 bg-[#0c0c0e] p-3 sm:p-4 ${
                    isFull ? 'min-h-[min(72vh,820px)] shadow-xl shadow-black/35' : ''
                }`}
            >
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.35]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(161,161,170,0.07) 0%, transparent 45%),
              radial-gradient(circle at 80% 70%, rgba(139,92,246,0.06) 0%, transparent 40%),
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                        backgroundSize: '100% 100%, 100% 100%, 24px 24px, 24px 24px',
                    }}
                    aria-hidden
                />

                <div className="relative z-[1] mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-brand-muted">
                    <Network className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Neural suite map</span>
                    <span className="text-[9px] text-brand-muted/75">— brief · fields · links</span>
                </div>

                <div
                    ref={wrapRef}
                    className={`relative z-[1] pb-3 ${isFull ? 'min-h-[min(62vh,760px)] lg:min-h-[min(58vh,720px)]' : 'min-h-[420px] lg:min-h-[380px]'}`}
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
                                stroke="rgba(161, 161, 170, 0.35)"
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
                                    ? 'border-zinc-500/35 bg-white/[0.07] shadow-[0_0_20px_rgba(255,255,255,0.06)]'
                                    : 'border-white/[0.1] bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-input">
                                    <Database className="h-5 w-5 text-zinc-400" aria-hidden />
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
                                        <p className="mt-2 font-mono text-[10px] text-zinc-500">Last staff sync: {lastSyncAtLabel}</p>
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
                        <div className="mt-5 w-full">
                            <p className="mx-auto mb-3 max-w-xl text-center text-[9px] font-medium uppercase tracking-[0.14em] text-brand-muted/90">
                                Officer lanes · tap to open
                            </p>
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-2.5">
                                {SUITE_ROLE_FLOW_COLUMNS.map((col) => (
                                    <div key={col.id} className="flex flex-col items-stretch gap-3">
                                        <div
                                            ref={ref(`role-${col.id}`)}
                                            className="flex min-h-[9.5rem] flex-col rounded-lg border border-brand-border/70 bg-brand-bg/85 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                                        >
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
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
                                                className="mt-2 inline-flex items-center justify-center gap-1 rounded-md border border-white/[0.12] bg-white/[0.05] py-1.5 text-[9px] font-semibold text-brand-text transition hover:bg-white/[0.09]"
                                            >
                                                Open desk
                                                <ExternalLink className="h-2.5 w-2.5 opacity-70" aria-hidden />
                                            </button>
                                        </div>

                                        <div ref={ref(`surfaces-${col.id}`)} className="flex flex-col gap-1.5">
                                            <p className="text-[9px] font-semibold uppercase tracking-wider text-brand-muted/90">
                                                Linked suite sections
                                            </p>
                                            {col.surfaces.map((s) => (
                                                <button
                                                    key={`${col.id}-${s.label}`}
                                                    type="button"
                                                    onClick={() => switchRoom(s.room)}
                                                    className="rounded-md border border-brand-border/50 bg-brand-panel/45 px-2 py-1.5 text-left transition hover:border-white/15 hover:bg-brand-panel"
                                                >
                                                    <p className="flex items-center justify-between gap-1 text-[10px] font-medium text-brand-text">
                                                        {s.label}
                                                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50" aria-hidden />
                                                    </p>
                                                    <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-brand-muted">{s.detail}</p>
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
