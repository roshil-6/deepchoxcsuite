'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
    Maximize2,
    X,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import type { AgentStaffSnapshot } from '@/lib/db';
import { useHfRoleSync, type HfDeskRole } from '@/lib/useHfRoleSync';
import { ModelAttribution } from '@/components/ModelAttribution';
import { StaffFocusChecklist } from '@/components/office/StaffFocusChecklist';
import { SuiteIntelligenceNeuralFlow } from '@/components/SuiteIntelligenceNeuralFlow';
import type { IntelligenceNavRoom } from '@/lib/suiteIntelligenceFlowGraph';

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
        markStaffFocusLineDone,
    } = useOffice();

    const snapshot = activeProject?.agentStaffSnapshot;
    const focus = activeProject?.staffFocusToday ?? [];
    const syncLogs = systemLogs.filter((l) => l.source === 'agent-sync').slice(0, 12);

    const [openDesk, setOpenDesk] = useState<string | null>('ceo');
    const [traceOpen, setTraceOpen] = useState(true);
    const [flowStructureFullView, setFlowStructureFullView] = useState(false);
    const [flowPortalReady, setFlowPortalReady] = useState(false);
    const [howAiOpen, setHowAiOpen] = useState(false);

    useEffect(() => setFlowPortalReady(true), []);

    useEffect(() => {
        if (!flowStructureFullView) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setFlowStructureFullView(false);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [flowStructureFullView]);
    const {
        syncing: hfSyncing,
        syncResult: hfSyncResult,
        syncModel: hfSyncModel,
        setSyncResult: setHfSyncResult,
        syncRole: hfSyncRole,
    } = useHfRoleSync();

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

    const flowProps = {
        ventureName: activeProject.name,
        lastSyncAtLabel: snapshot?.at ? formatSyncTime(snapshot.at) : null,
        trace: lastAiSyncTrace,
        agentSyncRunning,
        switchRoom: (room: IntelligenceNavRoom) => switchRoom(room),
    } as const;

    const flowFullScreenLayer =
        flowStructureFullView && flowPortalReady ? (
            <div
                className="fixed inset-0 z-[10000] flex flex-col bg-brand-bg"
                role="dialog"
                aria-modal="true"
                aria-labelledby="flow-full-title"
            >
                <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-brand-border/70 bg-brand-bg/95 px-4 py-3 backdrop-blur-sm sm:px-6">
                    <div className="min-w-0">
                        <p
                            id="flow-full-title"
                            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted"
                        >
                            Suite intelligence · flow only
                        </p>
                        <p className="truncate text-sm font-semibold text-brand-text">{activeProject.name}</p>
                        <p className="text-[11px] text-brand-muted">
                            Venture → one staff-sync response updates all five roles; desk AI between syncs edits the same record. Press{' '}
                            <kbd className="rounded border border-brand-border px-1 font-mono text-[10px]">Esc</kbd> to exit.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => runAgentStaffSync()}
                            disabled={agentSyncRunning}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-brand-text transition hover:bg-white/[0.1] disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${agentSyncRunning ? 'animate-spin' : ''}`} aria-hidden />
                            {agentSyncRunning ? 'Syncing…' : 'Run staff sync'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setFlowStructureFullView(false)}
                            className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-xs font-semibold text-brand-text transition hover:bg-brand-input"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden />
                            Show all sections
                        </button>
                    </div>
                </header>
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-auto px-4 py-5 sm:px-6 sm:py-6">
                    <div className="mx-auto w-full min-w-0 max-w-[1600px]">
                        <SuiteIntelligenceNeuralFlow {...flowProps} variant="fullscreen" />
                    </div>
                </div>
            </div>
        ) : null;

    return (
        <>
            {flowPortalReady && flowFullScreenLayer ? createPortal(flowFullScreenLayer, document.body) : null}

        <div className="h-full min-h-0 overflow-y-auto bg-brand-bg custom-scrollbar">
            <div className="mx-auto max-w-3xl px-4 py-5 sm:px-5 sm:py-6 lg:max-w-5xl">
                <header className="mb-6 border-b border-brand-border/60 pb-5">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-panel/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
                        <Sparkles className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                        Intelligence Suite
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">Staff network &amp; process</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-muted">
                        This suite explains <strong className="font-medium text-brand-text">how coordinated staff sync</strong> refreshes
                        every officer lane at once from your venture snapshot, and how <strong className="font-medium text-brand-text">day-to-day AI</strong> in each desk feeds the same record so the next run stays aligned.
                    </p>
                </header>

                {/* Live network — neural flow + venture-aware graph */}
                <section className="mb-7" aria-labelledby="live-net">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <h2 id="live-net" className="flex items-center gap-2 text-base font-semibold text-brand-text">
                            <GitBranch className="h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                            Live coordination map
                        </h2>
                        <button
                            type="button"
                            onClick={() => setFlowStructureFullView(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-brand-teal/35 bg-brand-teal/10 px-3 py-2 text-xs font-semibold text-brand-text transition hover:bg-brand-teal/18"
                        >
                            <Maximize2 className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                            View full structure
                            <span className="hidden text-[10px] font-normal text-brand-muted sm:inline">(flow only)</span>
                        </button>
                    </div>
                    <p className="mb-3 text-xs leading-relaxed text-brand-muted">
                        Map: <strong className="font-medium text-brand-text">venture → staff-sync → roles → workspaces</strong>.{' '}
                        <strong className="font-medium text-brand-text">Sync AI staff</strong> fills the pipeline strip.
                    </p>

                    <div className="mb-4">
                        <button
                            type="button"
                            onClick={() => setHowAiOpen((v) => !v)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-brand-border/50 bg-brand-panel/20 px-3 py-2 text-left text-xs font-medium text-brand-text transition hover:bg-brand-panel/30"
                            aria-expanded={howAiOpen}
                            aria-controls="how-ai-updates"
                            id="how-ai-toggle"
                        >
                            <span>How sync &amp; desk updates work</span>
                            <ChevronDown
                                className={`h-4 w-4 shrink-0 text-brand-muted transition-transform ${howAiOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                            />
                        </button>
                        {howAiOpen ? (
                            <section
                                id="how-ai-updates"
                                className="mt-2 rounded-lg border border-brand-border/50 bg-brand-panel/15 px-3 py-3 sm:px-4"
                                aria-labelledby="how-ai-toggle"
                            >
                                <ol className="list-decimal space-y-2 pl-3.5 text-xs leading-relaxed text-brand-muted marker:text-brand-teal/80">
                                    <li>
                                        <strong className="font-medium text-brand-text">One venture record</strong> — strategy, plan,
                                        budget, market, kanban, calendar, staff snapshot.
                                    </li>
                                    <li>
                                        <strong className="font-medium text-brand-text">Staff sync</strong> — one model pass returns all five
                                        desk briefs + merges; see <span className="font-mono text-[10px]">agentStaffSnapshot.desks.*</span>.
                                    </li>
                                    <li>
                                        <strong className="font-medium text-brand-text">Between syncs</strong> — desk AI / PA edits merge into
                                        the same record; next sync re-reads it.
                                    </li>
                                    <li>
                                        <strong className="font-medium text-brand-text">Map columns</strong> — brief, fields, linked
                                        surfaces; <strong className="text-brand-text">Open desk</strong> to go deeper.
                                    </li>
                                </ol>
                            </section>
                        ) : null}
                    </div>

                    <SuiteIntelligenceNeuralFlow {...flowProps} variant="inline" />

                    <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-brand-border/50 bg-brand-panel/25 px-2.5 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">HF desk (optional)</span>
                        {DESK_ORDER.map((d) => (
                            <button
                                key={d.key}
                                type="button"
                                disabled={hfSyncing}
                                onClick={() => {
                                    setHfSyncResult(null);
                                    void hfSyncRole(DESK_HF_ROLE[d.key]);
                                }}
                                className="rounded-md border border-brand-border/80 bg-brand-bg/80 px-2 py-1 text-[10px] font-medium text-brand-muted transition hover:border-brand-border hover:text-brand-text disabled:opacity-50"
                            >
                                {d.title}
                            </button>
                        ))}
                    </div>

                    {hfSyncResult ? (
                        <div className="relative mt-4 rounded-lg border border-brand-border/60 bg-brand-bg/80 p-3 text-[11px] leading-relaxed text-brand-muted">
                            {hfSyncResult}
                            <ModelAttribution model={hfSyncModel} />
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
                            Uses your venture snapshot + headlines. Results merge into the fields shown in the graph and surface in each
                            desk.
                        </p>
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
                            <div className="rounded-lg border border-brand-border/50 bg-brand-panel/20 p-3">
                                <p className="mb-2 text-[10px] leading-snug text-brand-muted">Done / + note → journal (Assistant &amp; sync).</p>
                                <StaffFocusChecklist
                                    lines={focus}
                                    completedLines={activeProject?.staffFocusCompletedLines || []}
                                    onMarkDone={(line, note) => markStaffFocusLineDone(line, note)}
                                />
                            </div>
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
                                trace (snapshot → headlines → one combined model pass → per-desk lines → merge). After refresh, use desk
                                sections above — trace is session-only.
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
                        Data flow summary
                    </h2>
                    <p className="mb-4 text-sm text-brand-muted">
                        The <strong className="font-medium text-brand-text">Neural suite map</strong> above is this venture&apos;s live
                        wiring. <strong className="font-medium text-brand-text">Staff sync</strong> is the batched step: one API response
                        updates every role brief and shared fields together. <strong className="font-medium text-brand-text">Desk AI</strong>{' '}
                        applies changes as you work; the next sync reads that updated snapshot.
                    </p>
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
                                    Dexo, Chief of Staff, desk chats, Boardroom, and staff sync all touch the same venture row; sync is the
                                    coordinated refresh of all five desk outputs in one pass.
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
        </>
    );
}
