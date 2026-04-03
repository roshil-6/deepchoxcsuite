'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Database,
    ArrowRight,
    Bot,
    Users,
    FileText,
    RefreshCw,
    MessageSquare,
    GitBranch,
    Shield,
    Sparkles,
    Layers,
    ChevronDown,
    ChevronRight,
    Radio,
    ListOrdered,
    Zap,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import type { AgentStaffSnapshot } from '@/lib/db';
import { useHfRoleSync, type HfDeskRole } from '@/lib/useHfRoleSync';

const DESK_ORDER: { key: keyof AgentStaffSnapshot['desks']; title: string; subtitle: string }[] = [
    { key: 'ceo', title: 'CEO', subtitle: 'Strategy & narrative' },
    { key: 'pm', title: 'CTO', subtitle: 'Product & delivery' },
    { key: 'accountant', title: 'CFO', subtitle: 'Finance & runway' },
    { key: 'scout', title: 'CSO', subtitle: 'Market & intel' },
    { key: 'cmo', title: 'CMO', subtitle: 'GTM & motion' },
];

const DESK_HF_ROLE: Record<(typeof DESK_ORDER)[number]['key'], HfDeskRole> = {
    ceo: 'ceo',
    pm: 'cto',
    accountant: 'cfo',
    scout: 'cso',
    cmo: 'cmo',
};

function FlowArrow() {
    return (
        <div className="flex items-center justify-center text-brand-muted/50" aria-hidden>
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
    );
}

function formatSyncTime(at: number) {
    try {
        return new Date(at).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return '';
    }
}

export function CsuiteIntelligenceGuide() {
    const {
        activeProject,
        switchRoom,
        agentSyncRunning,
        runAgentStaffSync,
        lastAiSyncTrace,
        systemLogs,
    } = useOffice();

    const snapshot = activeProject?.agentStaffSnapshot;
    const focus = activeProject?.staffFocusToday ?? [];
    const syncLogs = systemLogs.filter((l) => l.source === 'agent-sync').slice(0, 12);

    const [pulseIdx, setPulseIdx] = useState(0);
    const [openDesk, setOpenDesk] = useState<string | null>('ceo');
    const [traceOpen, setTraceOpen] = useState(true);
    const { syncing: hfSyncing, syncResult: hfSyncResult, setSyncResult: setHfSyncResult, syncRole: hfSyncRole } =
        useHfRoleSync();

    useEffect(() => {
        if (!agentSyncRunning) return;
        const t = setInterval(() => setPulseIdx((i) => (i + 1) % 6), 550);
        return () => clearInterval(t);
    }, [agentSyncRunning]);

    const deskEntries = useMemo(() => {
        if (!snapshot?.desks) return [];
        return DESK_ORDER.map((d) => ({
            ...d,
            text: String(snapshot.desks[d.key] ?? '').trim(),
        }));
    }, [snapshot]);

    if (!activeProject?.id) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-brand-bg px-6 text-center">
                <Radio className="h-10 w-10 text-brand-muted" aria-hidden />
                <p className="max-w-md text-sm text-brand-muted">
                    Select a venture to open the Intelligence Suite — staff coordination and last sync outputs are tied to your
                    active project record.
                </p>
                <button
                    type="button"
                    onClick={() => switchRoom('dashboard')}
                    className="rounded-lg border border-brand-border bg-brand-card px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-input"
                >
                    Go to Executive Overview
                </button>
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 overflow-y-auto bg-brand-bg custom-scrollbar">
            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-5xl">
                <header className="mb-8 border-b border-brand-border/60 pb-8">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-panel/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
                        <Sparkles className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                        Intelligence Suite
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">Staff network &amp; process</h1>
                    <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-brand-muted">
                        See how officer roles connect to your venture record, watch a sync run, and read each desk&apos;s last
                        contribution — the same outputs merged into strategy, intel, finance, and your notification bell.
                    </p>
                </header>

                {/* Live network */}
                <section className="mb-10" aria-labelledby="live-net">
                    <h2 id="live-net" className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-text">
                        <GitBranch className="h-5 w-5 text-brand-teal" aria-hidden />
                        Live coordination map
                    </h2>
                    <p className="mb-5 text-sm leading-relaxed text-brand-muted">
                        When you run <strong className="font-medium text-brand-text">Sync AI staff</strong>, one model pass
                        produces all desk briefs together, then the app merges them into your record — nothing hidden.
                    </p>

                    <div className="relative overflow-hidden rounded-2xl border border-brand-border/80 bg-gradient-to-b from-brand-panel/50 to-brand-bg/90 p-4 sm:p-6">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.04),transparent_65%)]" aria-hidden />

                        {/* Center hub */}
                        <div className="relative mx-auto mb-6 flex max-w-md flex-col items-center">
                            <div
                                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                                    agentSyncRunning && pulseIdx === 0
                                        ? 'border-white/[0.14] bg-white/[0.05]'
                                        : 'border-brand-border/70 bg-brand-bg/90'
                                }`}
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-border bg-brand-input">
                                    <Database className="h-5 w-5 text-brand-teal" aria-hidden />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">Venture record</p>
                                    <p className="text-sm font-medium text-brand-text">{activeProject.name}</p>
                                    {snapshot?.at ? (
                                        <p className="text-[10px] text-brand-muted/90">Last staff sync: {formatSyncTime(snapshot.at)}</p>
                                    ) : (
                                        <p className="text-[10px] text-amber-400/90">No staff sync yet — run one below.</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-brand-muted">
                                <Zap className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                                {agentSyncRunning ? 'Staff run in progress…' : 'Officers read & write through controlled merge'}
                            </div>
                        </div>

                        {/* Role ring */}
                        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-2">
                            {DESK_ORDER.map((d, i) => {
                                const active = agentSyncRunning && pulseIdx === i + 1;
                                return (
                                    <div
                                        key={d.key}
                                        className={`rounded-xl border px-3 py-3 text-center transition-all ${
                                            active
                                                ? 'border-white/[0.14] bg-white/[0.05]'
                                                : 'border-brand-border/60 bg-brand-bg/70'
                                        }`}
                                    >
                                        <p className="text-[11px] font-bold text-brand-text">{d.title}</p>
                                        <p className="mt-0.5 text-[10px] text-brand-muted">{d.subtitle}</p>
                                        {agentSyncRunning ? (
                                            <p className="mt-2 text-[9px] font-medium uppercase tracking-wide text-brand-teal/90">
                                                {active ? 'In loop…' : 'Queued'}
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-[9px] text-brand-muted/80">Desk brief</p>
                                        )}
                                        <button
                                            type="button"
                                            disabled={hfSyncing}
                                            onClick={() => {
                                                setHfSyncResult(null);
                                                void hfSyncRole(DESK_HF_ROLE[d.key]);
                                            }}
                                            className="mt-2 w-full rounded-md border border-brand-border/80 bg-brand-bg/80 py-1 text-[10px] font-medium text-brand-muted transition hover:border-brand-border hover:text-brand-text disabled:opacity-50"
                                        >
                                            {hfSyncing ? '…' : 'Sync'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {hfSyncResult ? (
                            <div className="relative mt-4 rounded-lg border border-brand-border/60 bg-brand-bg/80 p-3 text-[11px] leading-relaxed text-brand-muted">
                                {hfSyncResult}
                            </div>
                        ) : null}

                        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-brand-border/40 pt-5">
                            <button
                                type="button"
                                onClick={() => runAgentStaffSync()}
                                disabled={agentSyncRunning}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-2.5 text-[12px] font-semibold text-brand-text transition hover:bg-white/[0.08] disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${agentSyncRunning ? 'animate-spin' : ''}`} aria-hidden />
                                {agentSyncRunning ? 'Running staff sync…' : 'Run staff sync now'}
                            </button>
                            <p className="max-w-sm text-center text-[11px] leading-snug text-brand-muted sm:text-left">
                                Uses your venture snapshot + headlines. Results appear here, in desk sections, and in notifications.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Last desk outputs */}
                {snapshot?.desks && (
                    <section className="mb-10" aria-labelledby="desk-out">
                        <h2 id="desk-out" className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-text">
                            <Users className="h-5 w-5 text-brand-teal" aria-hidden />
                            What each role prepared
                        </h2>
                        <p className="mb-4 text-sm text-brand-muted">
                            From the last successful sync ({formatSyncTime(snapshot.at)}). Desk briefs are merged into your venture
                            record; the summary below is the cross-desk synthesis.
                        </p>
                        {snapshot.summary?.trim() ? (
                            <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Staff synthesis</p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-text">{snapshot.summary}</p>
                            </div>
                        ) : null}
                        <div className="space-y-2">
                            {deskEntries.map((row) => {
                                const open = openDesk === row.key;
                                return (
                                    <div
                                        key={row.key}
                                        className="overflow-hidden rounded-xl border border-brand-border/60 bg-brand-panel/30"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setOpenDesk(open ? null : row.key)}
                                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-brand-bg/50"
                                        >
                                            <span>
                                                <span className="text-sm font-semibold text-brand-text">{row.title}</span>
                                                <span className="ml-2 text-[11px] text-brand-muted">{row.subtitle}</span>
                                            </span>
                                            {open ? (
                                                <ChevronDown className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                            )}
                                        </button>
                                        {open ? (
                                            <div className="border-t border-brand-border/40 px-4 py-3">
                                                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-brand-text/95">
                                                    {row.text || '—'}
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Focus + trace */}
                <section className="mb-10 grid gap-6 lg:grid-cols-2" aria-labelledby="focus-trace">
                    <div>
                        <h2 id="focus-trace" className="mb-3 flex items-center gap-2 text-base font-semibold text-brand-text">
                            <Sparkles className="h-4 w-4 text-brand-teal" aria-hidden />
                            Focus today
                        </h2>
                        {focus.length > 0 ? (
                            <ul className="space-y-2 rounded-xl border border-brand-border/50 bg-brand-panel/25 p-4">
                                {focus.map((line, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-brand-text/95">
                                        <span className="font-mono text-[11px] text-brand-teal">{i + 1}.</span>
                                        <span>{line}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="rounded-xl border border-dashed border-brand-border/60 bg-brand-bg/50 px-4 py-6 text-sm text-brand-muted">
                                Run a staff sync to populate prioritized actions for today.
                            </p>
                        )}
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={() => setTraceOpen(!traceOpen)}
                            className="mb-3 flex w-full items-center justify-between gap-2 text-left"
                        >
                            <span className="flex items-center gap-2 text-base font-semibold text-brand-text">
                                <ListOrdered className="h-4 w-4 text-brand-teal" aria-hidden />
                                Process trace
                            </span>
                            <span className="text-[11px] text-brand-muted">{traceOpen ? 'Hide' : 'Show'}</span>
                        </button>
                        {traceOpen && (lastAiSyncTrace?.length ?? 0) > 0 ? (
                            <ol className="max-h-[min(52vh,420px)] space-y-2 overflow-y-auto rounded-xl border border-brand-border/50 bg-brand-panel/20 p-3 custom-scrollbar">
                                {lastAiSyncTrace!.map((step, i) => (
                                    <li key={step.id + i} className="flex gap-2 rounded-lg border border-brand-border/30 bg-brand-bg/40 px-2.5 py-2">
                                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-teal/15 text-[10px] font-bold text-brand-teal">
                                            {i + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-medium text-brand-text">{step.label}</p>
                                            {step.detail ? (
                                                <p className="mt-0.5 text-[11px] leading-relaxed text-brand-muted">{step.detail}</p>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        ) : traceOpen ? (
                            <p className="rounded-xl border border-dashed border-brand-border/60 px-4 py-4 text-sm text-brand-muted">
                                Run <strong className="text-brand-text">staff sync</strong> in this session to populate a step-by-step
                                trace (snapshot → headlines → model → each desk → merge). After refresh, use desk sections above —
                                trace is session-only.
                            </p>
                        ) : null}
                    </div>
                </section>

                {/* Activity */}
                {syncLogs.length > 0 ? (
                    <section className="mb-10" aria-labelledby="act-feed">
                        <h2 id="act-feed" className="mb-3 text-base font-semibold text-brand-text">
                            Sync activity (recent)
                        </h2>
                        <ul className="space-y-1.5 text-[12px] text-brand-muted">
                            {syncLogs.map((log) => (
                                <li key={log.id} className="flex gap-2 border-l-2 border-brand-border/50 pl-3">
                                    <span className="shrink-0 text-[10px] text-brand-muted/70">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className={log.type === 'error' ? 'text-red-400/90' : ''}>{log.message}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}

                {/* Original educational sections — compact */}
                <section className="mb-8" aria-labelledby="net-title">
                    <h2 id="net-title" className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-text">
                        <Layers className="h-5 w-5 text-brand-teal" aria-hidden />
                        System map (static)
                    </h2>
                    <div className="rounded-2xl border border-brand-border/80 bg-brand-panel/35 p-4 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between lg:gap-2">
                            <div className="flex flex-1 flex-col rounded-xl border border-brand-border/60 bg-brand-bg/80 p-4">
                                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                    <Database className="h-4 w-4 text-brand-teal" aria-hidden />
                                    Venture data
                                </div>
                                <p className="text-[13px] leading-relaxed text-brand-muted">
                                    Strategy, product, budget, market notes, events, kanban — stored locally per venture.
                                </p>
                            </div>
                            <div className="hidden lg:flex lg:items-center">
                                <FlowArrow />
                            </div>
                            <div className="flex flex-1 flex-col rounded-xl border border-brand-border/60 bg-brand-bg/80 p-4">
                                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                    <Bot className="h-4 w-4 text-brand-teal" aria-hidden />
                                    Intelligence layer
                                </div>
                                <p className="text-[13px] leading-relaxed text-brand-muted">
                                    Dexo, Chief of Staff rail, and staff sync share the same record — desks stay aligned.
                                </p>
                            </div>
                            <div className="hidden lg:flex lg:items-center">
                                <FlowArrow />
                            </div>
                            <div className="flex flex-1 flex-col rounded-xl border border-brand-border/60 bg-brand-bg/80 p-4">
                                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                    <Users className="h-4 w-4 text-brand-teal" aria-hidden />
                                    Officer outputs
                                </div>
                                <p className="text-[13px] leading-relaxed text-brand-muted">
                                    Each desk has a defined artifact type so outputs stay structured and traceable.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-text">
                        <Shield className="h-5 w-5 text-brand-teal" aria-hidden />
                        How decisions are shaped
                    </h2>
                    <div className="space-y-3 text-sm leading-relaxed text-brand-muted">
                        <p>
                            <strong className="font-medium text-brand-text">Executive overview</strong> reflects what you and desks
                            recorded — not invented KPIs.
                        </p>
                        <p>
                            <strong className="font-medium text-brand-text">Boardroom</strong> runs a multi-officer loop with
                            conflict checks before consensus.
                        </p>
                        <p>
                            <strong className="font-medium text-brand-text">Chat rail</strong> uses room-themed prompts so follow-ups
                            match the surface you are in.
                        </p>
                    </div>
                </section>

                <section className="mb-8">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-text">
                        <FileText className="h-5 w-5 text-brand-teal" aria-hidden />
                        Reports &amp; artifacts
                    </h2>
                    <div className="rounded-xl border border-brand-border/60 bg-brand-panel/30 p-5">
                        <ul className="space-y-3 text-sm text-brand-muted">
                            <li className="flex gap-3">
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                                Knowledge base / exports from desks.
                            </li>
                            <li className="flex gap-3">
                                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                                Staff sync merges snippets into venture sections and this Suite.
                            </li>
                            <li className="flex gap-3">
                                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                                Neural diary for qualitative threads.
                            </li>
                        </ul>
                    </div>
                </section>

                <footer className="rounded-xl border border-dashed border-brand-border/60 bg-brand-bg/60 px-4 py-4 text-[12px] text-brand-muted">
                    <strong className="font-medium text-brand-text">Privacy:</strong> venture data stays in your browser (IndexedDB)
                    unless your deployment adds server persistence. AI calls follow your backend configuration.
                </footer>
            </div>
        </div>
    );
}
