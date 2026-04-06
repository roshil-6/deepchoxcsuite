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
        <div className="flex items-center justify-center text-zinc-600" aria-hidden>
            <ArrowRight className="h-4 w-4" />
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

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-xl border border-zinc-800 bg-[#1a1a1d] ${className}`}>
            {children}
        </div>
    );
}

function SectionHeading({
    icon: Icon,
    title,
    id,
    right,
}: {
    icon: React.ElementType;
    title: string;
    id?: string;
    right?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h2 id={id} className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em] text-zinc-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </span>
                {title}
            </h2>
            {right}
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {children}
        </span>
    );
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

    /* ── Empty state ── */
    if (!activeProject?.id) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-5 bg-[#131314] px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-[#1a1a1d]">
                    <Radio className="h-7 w-7 text-zinc-500" aria-hidden />
                </div>
                <div>
                    <p className="text-[15px] font-semibold text-zinc-200">No venture selected</p>
                    <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-zinc-500">
                        Select a venture to open the Intelligence Suite — staff coordination and last sync outputs are tied to your
                        active project record.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => switchRoom('dashboard')}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
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

    /* ── Fullscreen flow overlay ── */
    const flowFullScreenLayer =
        flowStructureFullView && flowPortalReady ? (
            <div
                className="fixed inset-0 z-[10000] flex flex-col bg-[#111113]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="flow-full-title"
            >
                <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-[#161618] px-5 py-3.5 sm:px-7">
                    <div className="min-w-0">
                        <SectionLabel>Suite intelligence · flow only</SectionLabel>
                        <p id="flow-full-title" className="mt-0.5 truncate text-[15px] font-semibold text-zinc-100">
                            {activeProject.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                            Venture → one staff-sync response updates all five roles. Press{' '}
                            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 font-mono text-[10px] text-zinc-400">Esc</kbd>{' '}
                            to exit.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => runAgentStaffSync()}
                            disabled={agentSyncRunning}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-[12px] font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${agentSyncRunning ? 'animate-spin' : ''}`} aria-hidden />
                            {agentSyncRunning ? 'Syncing…' : 'Run staff sync'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setFlowStructureFullView(false)}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-[12px] font-semibold text-zinc-200 transition hover:bg-zinc-700"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden />
                            Close
                        </button>
                    </div>
                </header>
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-auto px-5 py-6 sm:px-7">
                    <div className="mx-auto w-full min-w-0 max-w-[1600px]">
                        <SuiteIntelligenceNeuralFlow {...flowProps} variant="fullscreen" />
                    </div>
                </div>
            </div>
        ) : null;

    /* ── Main page ── */
    return (
        <>
            {flowPortalReady && flowFullScreenLayer ? createPortal(flowFullScreenLayer, document.body) : null}

            <div className="w-full min-w-0 bg-[#131314]">
                <div className="mx-auto max-w-3xl px-5 pt-8 pb-28 sm:px-6 lg:max-w-5xl">

                    {/* ─── Page header ─── */}
                    <header className="mb-10">
                        <SectionLabel>Intelligence Suite</SectionLabel>
                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-50 sm:text-[28px]">
                            Staff network &amp; process
                        </h1>
                        <p className="mt-3 max-w-2xl text-[14px] leading-[1.7] text-zinc-400">
                            How <span className="font-medium text-zinc-200">coordinated staff sync</span> refreshes every officer
                            lane at once from your venture snapshot, and how{' '}
                            <span className="font-medium text-zinc-200">day-to-day AI</span> in each desk feeds the same record so
                            the next run stays aligned.
                        </p>
                        <div className="mt-5 h-px bg-zinc-800" />
                    </header>

                    {/* ─── Section 1: Live coordination map ─── */}
                    <section className="mb-10" aria-labelledby="live-net">
                        <SectionCard className="p-5 sm:p-6">
                            <div className="mb-5">
                                <SectionHeading
                                    icon={GitBranch}
                                    title="Live coordination map"
                                    id="live-net"
                                    right={
                                        <button
                                            type="button"
                                            onClick={() => setFlowStructureFullView(true)}
                                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-zinc-700 hover:text-zinc-100"
                                        >
                                            <Maximize2 className="h-3 w-3" aria-hidden />
                                            Fullscreen
                                        </button>
                                    }
                                />
                                <p className="mt-2 pl-[38px] text-[13px] leading-relaxed text-zinc-500">
                                    <span className="font-medium text-zinc-300">Venture → staff-sync → roles → workspaces.</span>{' '}
                                    Sync AI staff fills the pipeline strip.
                                </p>
                            </div>

                            {/* How it works — single-panel disclosure (no nested “second box”) */}
                            <div className="mb-5 overflow-hidden rounded-xl border border-zinc-800 bg-[#1a1a1d]">
                                <button
                                    type="button"
                                    onClick={() => setHowAiOpen((v) => !v)}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[12px] font-medium text-zinc-200 transition hover:bg-[#1e1e21] sm:px-5 sm:py-3.5"
                                    aria-expanded={howAiOpen}
                                    aria-controls="how-ai-updates"
                                    id="how-ai-toggle"
                                >
                                    <span>How sync &amp; desk updates work</span>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${howAiOpen ? 'rotate-180' : ''}`}
                                        aria-hidden
                                    />
                                </button>
                                {howAiOpen ? (
                                    <div
                                        id="how-ai-updates"
                                        className="border-t border-zinc-800 bg-[#161618] px-4 py-4 sm:px-5 sm:py-5"
                                        aria-labelledby="how-ai-toggle"
                                    >
                                        <ol className="list-decimal space-y-2.5 pl-4 text-[12px] leading-relaxed text-zinc-400 marker:text-zinc-600">
                                            <li>
                                                <span className="font-medium text-zinc-200">One venture record</span> — strategy,
                                                plan, budget, market, kanban, calendar, staff snapshot.
                                            </li>
                                            <li>
                                                <span className="font-medium text-zinc-200">Staff sync</span> — one model pass
                                                returns all five desk briefs + merges; see{' '}
                                                <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                                                    agentStaffSnapshot.desks.*
                                                </code>
                                            </li>
                                            <li>
                                                <span className="font-medium text-zinc-200">Between syncs</span> — desk AI / PA
                                                edits merge into the same record; next sync re-reads it.
                                            </li>
                                            <li>
                                                <span className="font-medium text-zinc-200">Map columns</span> — brief, fields,
                                                linked surfaces; Open desk to go deeper.
                                            </li>
                                        </ol>
                                    </div>
                                ) : null}
                            </div>

                            {/* Neural flow graph */}
                            <SuiteIntelligenceNeuralFlow {...flowProps} variant="inline" />

                            {/* HF desk buttons */}
                            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-[#1e1e21] px-3 py-2.5">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                                    HF desk
                                </span>
                                {DESK_ORDER.map((d) => (
                                    <button
                                        key={d.key}
                                        type="button"
                                        disabled={hfSyncing}
                                        onClick={() => {
                                            setHfSyncResult(null);
                                            void hfSyncRole(DESK_HF_ROLE[d.key]);
                                        }}
                                        className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50"
                                    >
                                        {d.title}
                                    </button>
                                ))}
                            </div>

                            {hfSyncResult ? (
                                <div className="mt-4 rounded-lg border border-zinc-800 bg-[#1e1e21] p-4 text-[12px] leading-relaxed text-zinc-400">
                                    {hfSyncResult}
                                    <ModelAttribution model={hfSyncModel} />
                                </div>
                            ) : null}

                            {/* Sync CTA */}
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-zinc-800 pt-5">
                                <button
                                    type="button"
                                    onClick={() => runAgentStaffSync()}
                                    disabled={agentSyncRunning}
                                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-[12px] font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-4 w-4 ${agentSyncRunning ? 'animate-spin' : ''}`} aria-hidden />
                                    {agentSyncRunning ? 'Running staff sync…' : 'Run staff sync now'}
                                </button>
                                <p className="max-w-sm text-center text-[11px] leading-snug text-zinc-500 sm:text-left">
                                    Uses your venture snapshot + headlines. Results merge into the fields shown in the graph and
                                    surface in each desk.
                                </p>
                            </div>
                        </SectionCard>
                    </section>

                    {/* ─── Section 2: Role outputs ─── */}
                    {snapshot?.desks && (
                        <section className="mb-10" aria-labelledby="desk-out">
                            <SectionHeading icon={Users} title="What each role prepared" id="desk-out" />
                            <p className="mt-2 pl-[38px] text-[13px] text-zinc-500">
                                From the last sync ({formatSyncTime(snapshot.at)}). Desk briefs are merged into your venture
                                record.
                            </p>

                            {snapshot.summary?.trim() ? (
                                <div className="mt-5 rounded-xl border border-zinc-800 bg-[#1a1a1d] p-5">
                                    <SectionLabel>Staff synthesis</SectionLabel>
                                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.75] text-zinc-300">
                                        {snapshot.summary}
                                    </p>
                                </div>
                            ) : null}

                            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-[#18181b]">
                                {deskEntries.map((row, idx) => {
                                    const open = openDesk === row.key;
                                    return (
                                        <div
                                            key={row.key}
                                            className={idx > 0 ? 'border-t border-zinc-800' : ''}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setOpenDesk(open ? null : row.key)}
                                                className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition ${
                                                    open ? 'bg-[#1a1a1d]' : 'hover:bg-[#1c1c1f]'
                                                }`}
                                            >
                                                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                                                    <span className="text-[14px] font-semibold text-zinc-100">{row.title}</span>
                                                    <span className="text-[11px] text-zinc-500">{row.subtitle}</span>
                                                </span>
                                                {open ? (
                                                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
                                                )}
                                            </button>
                                            {open ? (
                                                <div className="border-t border-zinc-800 bg-[#161618] px-5 py-4">
                                                    <p className="whitespace-pre-wrap text-[13px] leading-[1.75] text-zinc-300">
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

                    {/* ─── Section 3: Focus + Trace (side by side) ─── */}
                    <section className="mb-10 grid gap-5 lg:grid-cols-2" aria-labelledby="focus-trace">
                        {/* Focus today */}
                        <SectionCard className="p-5">
                            <SectionHeading icon={Sparkles} title="Focus today" id="focus-trace" />
                            <div className="mt-4">
                                {focus.length > 0 ? (
                                    <>
                                        <p className="mb-3 text-[11px] text-zinc-500">
                                            Check items off as you complete them. Notes are saved to journal.
                                        </p>
                                        <StaffFocusChecklist
                                            lines={focus}
                                            completedLines={activeProject?.staffFocusCompletedLines || []}
                                            onMarkDone={(line, note) => markStaffFocusLineDone(line, note)}
                                        />
                                    </>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-zinc-700 px-4 py-8 text-center">
                                        <p className="text-[13px] text-zinc-500">
                                            Run a staff sync to populate today&apos;s priorities.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        {/* Process trace */}
                        <SectionCard className="p-5">
                            <button
                                type="button"
                                onClick={() => setTraceOpen(!traceOpen)}
                                className="flex w-full items-center justify-between gap-2 text-left"
                            >
                                <SectionHeading icon={ListOrdered} title="Process trace" />
                                <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-700">
                                    {traceOpen ? 'Hide' : 'Show'}
                                </span>
                            </button>
                            {traceOpen && (lastAiSyncTrace?.length ?? 0) > 0 ? (
                                <ol className="custom-scrollbar mt-4 max-h-[min(52vh,420px)] space-y-2 overflow-y-auto pr-1">
                                    {lastAiSyncTrace!.map((step, i) => (
                                        <li
                                            key={step.id + i}
                                            className="flex gap-3 rounded-lg border border-zinc-800 bg-[#1e1e21] px-3 py-2.5"
                                        >
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-medium text-zinc-200">{step.label}</p>
                                                {step.detail ? (
                                                    <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                                                        {step.detail}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : traceOpen ? (
                                <div className="mt-4 rounded-lg border border-dashed border-zinc-700 px-4 py-6 text-center">
                                    <p className="text-[13px] text-zinc-500">
                                        Run <span className="font-medium text-zinc-300">staff sync</span> in this session to see
                                        the step-by-step trace. After refresh, use desk sections above — trace is session-only.
                                    </p>
                                </div>
                            ) : null}
                        </SectionCard>
                    </section>

                    {/* ─── Sync activity ─── */}
                    {syncLogs.length > 0 ? (
                        <section className="mb-10" aria-labelledby="act-feed">
                            <SectionHeading icon={Radio} title="Sync activity" id="act-feed" />
                            <div className="mt-4 rounded-xl border border-zinc-800 bg-[#1a1a1d] p-4">
                                <ul className="space-y-1">
                                    {syncLogs.map((log) => (
                                        <li key={log.id} className="flex gap-3 py-1">
                                            <span className="shrink-0 pt-px text-[10px] font-mono text-zinc-600">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                            <span
                                                className={`text-[12px] ${
                                                    log.type === 'error' ? 'text-red-400/90' : 'text-zinc-400'
                                                }`}
                                            >
                                                {log.message}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    ) : null}

                    {/* ─── Section 4: Data flow summary ─── */}
                    <section className="mb-10" aria-labelledby="net-title">
                        <SectionHeading icon={Layers} title="Data flow summary" id="net-title" />
                        <p className="mt-2 pl-[38px] text-[13px] leading-relaxed text-zinc-500">
                            The neural suite map above is this venture&apos;s live wiring.{' '}
                            <span className="font-medium text-zinc-300">Staff sync</span> is the batched step;{' '}
                            <span className="font-medium text-zinc-300">Desk AI</span> applies changes as you work.
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {[
                                {
                                    icon: Database,
                                    label: 'Venture data',
                                    text: 'Strategy, product, budget, market notes, events, kanban — stored locally per venture.',
                                },
                                {
                                    icon: Bot,
                                    label: 'Intelligence layer',
                                    text: 'Dexo, Chief of Staff, desk chats, Boardroom, and staff sync all touch the same venture row.',
                                },
                                {
                                    icon: Users,
                                    label: 'Officer outputs',
                                    text: 'Each desk has a defined artifact type so outputs stay structured and traceable.',
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="flex flex-col rounded-xl border border-zinc-800 bg-[#1a1a1d] p-5"
                                >
                                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                                        <item.icon className="h-4 w-4 text-zinc-400" aria-hidden />
                                    </div>
                                    <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-300">
                                        {item.label}
                                    </p>
                                    <p className="text-[12px] leading-relaxed text-zinc-500">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ─── Section 5: How decisions are shaped ─── */}
                    <section className="mb-10">
                        <SectionHeading icon={Shield} title="How decisions are shaped" />
                        <div className="mt-4 space-y-0 divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-[#1a1a1d]">
                            {[
                                {
                                    label: 'Executive overview',
                                    text: 'Reflects what you and desks recorded — not invented KPIs.',
                                },
                                {
                                    label: 'Boardroom',
                                    text: 'Runs a multi-officer loop with conflict checks before consensus.',
                                },
                                {
                                    label: 'Chat rail',
                                    text: 'Uses room-themed prompts so follow-ups match the surface you are in.',
                                },
                            ].map((item) => (
                                <div key={item.label} className="flex gap-4 px-5 py-4">
                                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" aria-hidden />
                                    <p className="text-[13px] leading-relaxed text-zinc-400">
                                        <span className="font-medium text-zinc-200">{item.label}</span> — {item.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ─── Section 6: Reports & artifacts ─── */}
                    <section className="mb-10">
                        <SectionHeading icon={FileText} title="Reports &amp; artifacts" />
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            {[
                                {
                                    icon: FileText,
                                    text: 'Knowledge base / exports from desks.',
                                },
                                {
                                    icon: RefreshCw,
                                    text: 'Staff sync merges snippets into venture sections and this Suite.',
                                },
                                {
                                    icon: MessageSquare,
                                    text: 'Neural diary for qualitative threads.',
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-[#1a1a1d] px-4 py-4"
                                >
                                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                                        <item.icon className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                                    </div>
                                    <p className="text-[13px] leading-relaxed text-zinc-400">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ─── Footer ─── */}
                    <footer className="rounded-xl border border-zinc-800 bg-[#18181b] px-5 py-4 text-[12px] leading-relaxed text-zinc-500">
                        <span className="font-medium text-zinc-300">Privacy:</span> venture data stays in your browser
                        (IndexedDB) unless your deployment adds server persistence. AI calls follow your backend configuration.
                    </footer>
                </div>
            </div>
        </>
    );
}
