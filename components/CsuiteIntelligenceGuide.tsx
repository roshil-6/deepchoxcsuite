'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Database,
    Bot,
    Users,
    FileText,
    RefreshCw,
    MessageSquare,
    GitBranch,
    Shield,
    Sparkles,
    Layers,
    Minus,
    Plus,
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
import { RESEARCH_STAFF } from '@/lib/researchStaffLabels';
import { SuiteNavChips } from '@/components/SuiteNavChips';
import { DeskChatThreadMount } from '@/components/DeskChatThreadSlotContext';

const DESK_ORDER: { key: keyof AgentStaffSnapshot['desks']; title: string; subtitle: string }[] = [
    { key: 'ceo', title: RESEARCH_STAFF.ceo.navTitle, subtitle: RESEARCH_STAFF.ceo.navHint },
    { key: 'pm', title: RESEARCH_STAFF.pm.navTitle, subtitle: RESEARCH_STAFF.pm.navHint },
    { key: 'accountant', title: RESEARCH_STAFF.accountant.navTitle, subtitle: RESEARCH_STAFF.accountant.navHint },
    { key: 'scout', title: RESEARCH_STAFF.scout.navTitle, subtitle: RESEARCH_STAFF.scout.navHint },
    { key: 'cmo', title: RESEARCH_STAFF.cmo.navTitle, subtitle: RESEARCH_STAFF.cmo.navHint },
];

const DESK_HF_ROLE: Record<(typeof DESK_ORDER)[number]['key'], HfDeskRole> = {
    ceo: 'ceo',
    pm: 'cto',
    accountant: 'cfo',
    scout: 'cso',
    cmo: 'cmo',
};

/** Secondary surface — one consistent treatment for nested content */
function InsetPanel({
    children,
    className = '',
    variant = 'default',
}: {
    children: React.ReactNode;
    className?: string;
    /** `muted` = terminal / code-heavy */
    variant?: 'default' | 'muted';
}) {
    const base =
        variant === 'muted'
            ? 'rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3 sm:px-5 sm:py-4'
            : 'rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-5 sm:py-5';
    return <div className={`${base} ${className}`}>{children}</div>;
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
        <div className="flex items-start justify-between gap-3">
            <h2
                id={id}
                className={`flex min-w-0 items-center gap-3 text-[14px] font-semibold leading-snug tracking-tight text-zinc-100 ${
                    id ? 'scroll-mt-28' : ''
                }`}
            >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-white/[0.09] to-white/[0.04] text-zinc-100 ring-1 ring-white/[0.08]">
                    <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden />
                </span>
                <span>{title}</span>
            </h2>
            {right}
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-block text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
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
        setSuiteIntelOpenDesk,
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
        setSuiteIntelOpenDesk(openDesk);
    }, [openDesk, setSuiteIntelOpenDesk]);

    useEffect(() => {
        if (!snapshot?.desks) setOpenDesk(null);
    }, [snapshot?.desks]);

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
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-[#131314] px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                    <Radio className="h-6 w-6 text-zinc-200" strokeWidth={1.85} aria-hidden />
                </div>
                <div>
                    <p className="text-[13px] font-medium text-zinc-200">No venture selected</p>
                    <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-zinc-500">
                        Select a venture to open the Intelligence Suite — staff coordination and last sync outputs are tied to your
                        active project record.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => switchRoom('dashboard')}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.07]"
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
                <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-[#131314] px-4 py-3 sm:px-6">
                    <div className="min-w-0">
                        <SectionLabel>Suite intelligence · flow only</SectionLabel>
                        <p id="flow-full-title" className="mt-0.5 truncate text-[13px] font-medium text-zinc-100">
                            {activeProject.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">
                            Venture → one staff-sync response updates all five roles. Press{' '}
                            <kbd className="rounded border border-white/[0.1] bg-white/[0.05] px-1 font-mono text-[9px] text-zinc-400">
                                Esc
                            </kbd>{' '}
                            to exit.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => runAgentStaffSync()}
                            disabled={agentSyncRunning}
                            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/[0.07] disabled:opacity-50"
                        >
                            <RefreshCw
                                className={`h-3.5 w-3.5 ${agentSyncRunning ? 'animate-spin' : ''}`}
                                strokeWidth={2}
                                aria-hidden
                            />
                            {agentSyncRunning ? 'Syncing…' : 'Run staff sync'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setFlowStructureFullView(false)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/[0.07]"
                        >
                            <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
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
                <div className="mx-auto max-w-3xl px-4 pt-5 pb-16 sm:px-5 lg:max-w-4xl">

                    {/* ─── Page heading: single top rule + spacing for the whole page ─── */}
                    <header className="mb-10 max-w-2xl border-b border-white/[0.07] pb-6">
                        <SectionLabel>Intelligence Suite</SectionLabel>
                        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-100 sm:text-[22px]">
                            Staff network &amp; process
                        </h1>
                        <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-500">
                            How <span className="text-zinc-300">coordinated staff sync</span> refreshes every officer lane at once
                            from your venture snapshot, and how <span className="text-zinc-300">day-to-day AI</span> in each desk
                            feeds the same record so the next run stays aligned.
                        </p>
                        <SuiteNavChips className="mt-6" />
                    </header>

                    {/* ─── Section 1: Live coordination map ─── */}
                    <section className="mb-10" aria-labelledby="live-net">
                        <SectionHeading
                            icon={GitBranch}
                            title="Live coordination map"
                            id="live-net"
                            right={
                                <button
                                    type="button"
                                    onClick={() => setFlowStructureFullView(true)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/[0.07]"
                                >
                                    <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                    Fullscreen
                                </button>
                            }
                        />
                        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
                            <span className="text-zinc-400">Venture → staff-sync → roles → workspaces.</span> Sync AI staff fills the
                            pipeline below.
                        </p>

                        <InsetPanel className="mt-4 space-y-0">
                            <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-black/20">
                                <button
                                    type="button"
                                    onClick={() => setHowAiOpen((v) => !v)}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[12px] font-medium text-zinc-200 transition hover:bg-white/[0.04]"
                                    aria-expanded={howAiOpen}
                                    aria-controls="how-ai-updates"
                                    id="how-ai-toggle"
                                >
                                    <span>How sync &amp; desk updates work</span>
                                    {howAiOpen ? (
                                        <Minus className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={2} aria-hidden />
                                    ) : (
                                        <Plus className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={2} aria-hidden />
                                    )}
                                </button>
                                {howAiOpen ? (
                                    <div
                                        id="how-ai-updates"
                                        className="border-t border-white/[0.06] bg-black/15 px-4 py-4"
                                        aria-labelledby="how-ai-toggle"
                                    >
                                        <ol className="list-decimal space-y-2.5 pl-4 text-[12px] leading-relaxed text-zinc-400 marker:text-zinc-600">
                                            <li>
                                                <span className="text-zinc-200">One venture record</span> — strategy, plan, budget,
                                                market, kanban, calendar, staff snapshot.
                                            </li>
                                            <li>
                                                <span className="text-zinc-200">Staff sync</span> — one model pass returns all five desk
                                                briefs + merges; see{' '}
                                                <code className="rounded-md border border-white/[0.06] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
                                                    agentStaffSnapshot.desks.*
                                                </code>
                                            </li>
                                            <li>
                                                <span className="text-zinc-200">Between syncs</span> — desk AI / PA edits merge into the
                                                same record; next sync re-reads it.
                                            </li>
                                            <li>
                                                <span className="text-zinc-200">Map columns</span> — brief, fields, linked surfaces; open
                                                a desk to go deeper.
                                            </li>
                                        </ol>
                                    </div>
                                ) : null}
                            </div>

                            <div className="rounded-lg border border-white/[0.05] bg-black/20 px-2 py-4 sm:px-3">
                                <SuiteIntelligenceNeuralFlow {...flowProps} variant="inline" />
                            </div>

                            <div className="flex flex-col gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                                    Hugging Face desk
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {DESK_ORDER.map((d) => (
                                        <button
                                            key={d.key}
                                            type="button"
                                            disabled={hfSyncing}
                                            onClick={() => {
                                                setHfSyncResult(null);
                                                void hfSyncRole(DESK_HF_ROLE[d.key]);
                                            }}
                                            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-zinc-100 disabled:opacity-50"
                                        >
                                            {d.title}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {hfSyncResult ? (
                                <InsetPanel variant="muted" className="text-[12px] leading-relaxed text-zinc-400">
                                    {hfSyncResult}
                                    <ModelAttribution model={hfSyncModel} />
                                </InsetPanel>
                            ) : null}

                            <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <button
                                    type="button"
                                    onClick={() => runAgentStaffSync()}
                                    disabled={agentSyncRunning}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.08] px-5 py-2.5 text-[12px] font-semibold text-zinc-100 shadow-sm transition hover:bg-white/[0.06] disabled:opacity-50"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 ${agentSyncRunning ? 'animate-spin' : ''}`}
                                        strokeWidth={2}
                                        aria-hidden
                                    />
                                    {agentSyncRunning ? 'Running staff sync…' : 'Run staff sync now'}
                                </button>
                                <p className="max-w-md text-[12px] leading-relaxed text-zinc-500 sm:text-right">
                                    Uses your venture snapshot and headlines. Results merge into the graph and each desk.
                                </p>
                            </div>
                        </InsetPanel>
                    </section>

                    {/* ─── Section 2: Role outputs ─── */}
                    {snapshot?.desks && (
                        <section className="mb-10" aria-labelledby="desk-out">
                            <SectionHeading icon={Users} title="What each role prepared" id="desk-out" />
                            <p className="mt-3 text-[13px] text-zinc-500">
                                Last sync <span className="text-zinc-400">{formatSyncTime(snapshot.at)}</span>. Briefs are merged into
                                your venture record.
                            </p>

                            {snapshot.summary?.trim() ? (
                                <InsetPanel className="mt-6 border-l-4 border-l-white/[0.12] pl-5">
                                    <SectionLabel>Staff synthesis</SectionLabel>
                                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-300">
                                        {snapshot.summary}
                                    </p>
                                </InsetPanel>
                            ) : null}

                            <div className="mt-6 space-y-2.5">
                                {deskEntries.map((row) => {
                                    const open = openDesk === row.key;
                                    return (
                                        <div
                                            key={row.key}
                                            className={`overflow-hidden rounded-xl border transition-colors ${
                                                open
                                                    ? 'border-white/[0.12] bg-white/[0.04] ring-1 ring-white/[0.06]'
                                                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setOpenDesk(open ? null : row.key)}
                                                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block text-[13px] font-semibold text-zinc-100">{row.title}</span>
                                                    <span className="mt-0.5 block text-[11px] text-zinc-500">{row.subtitle}</span>
                                                </span>
                                                {open ? (
                                                    <Minus className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={2} aria-hidden />
                                                ) : (
                                                    <Plus className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={2} aria-hidden />
                                                )}
                                            </button>
                                            {open ? (
                                                <div className="border-t border-white/[0.06] bg-black/25 px-4 py-4">
                                                    <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-400">
                                                        {row.text || '—'}
                                                    </p>
                                                    <DeskChatThreadMount className="mt-4 max-w-3xl" />
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                            {openDesk === null ? (
                                <DeskChatThreadMount className="mx-auto mt-6 max-w-3xl" />
                            ) : null}
                        </section>
                    )}

                    {/* ─── Section 3: Focus + Trace ─── */}
                    <section className="mb-10 grid gap-4 lg:grid-cols-2 lg:gap-5" aria-labelledby="focus-trace">
                        <InsetPanel className="flex min-h-0 max-h-[min(38vh,21rem)] flex-col">
                            <SectionHeading icon={Sparkles} title="Focus today" id="focus-trace" />
                            <p className="mt-3 text-[12px] text-zinc-500">
                                Check items as you go. Notes are saved to your journal.
                            </p>
                            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
                                {focus.length > 0 ? (
                                    <StaffFocusChecklist
                                        lines={focus}
                                        completedLines={activeProject?.staffFocusCompletedLines || []}
                                        onMarkDone={(line, note) => markStaffFocusLineDone(line, note)}
                                        className="border-white/[0.08] bg-black/15"
                                    />
                                ) : (
                                    <div className="rounded-lg border border-dashed border-white/[0.1] bg-black/15 px-4 py-8 text-center text-[12px] text-zinc-500">
                                        Run a staff sync to populate today&apos;s priorities.
                                    </div>
                                )}
                            </div>
                        </InsetPanel>

                        <InsetPanel className="flex min-h-0 max-h-[min(38vh,21rem)] flex-col">
                            <div className="flex items-start justify-between gap-2">
                                <SectionHeading icon={ListOrdered} title="Process trace" />
                                <button
                                    type="button"
                                    onClick={() => setTraceOpen(!traceOpen)}
                                    className="shrink-0 rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 transition hover:bg-white/[0.08]"
                                >
                                    {traceOpen ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <p className="mt-3 text-[12px] text-zinc-500">Steps from the last staff sync in this session.</p>
                            <div className="mt-3 min-h-0 flex-1 overflow-hidden">
                                {traceOpen && (lastAiSyncTrace?.length ?? 0) > 0 ? (
                                    <ol className="custom-scrollbar max-h-[min(28vh,200px)] space-y-1.5 overflow-y-auto pr-1">
                                        {lastAiSyncTrace!.map((step, i) => (
                                            <li
                                                key={step.id + i}
                                                className="flex gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5"
                                            >
                                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-[11px] font-bold text-zinc-300">
                                                    {i + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-medium text-zinc-200">{step.label}</p>
                                                    {step.detail ? (
                                                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{step.detail}</p>
                                                    ) : null}
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                ) : traceOpen ? (
                                    <div className="rounded-lg border border-dashed border-white/[0.1] bg-black/15 px-4 py-6 text-[12px] leading-relaxed text-zinc-500">
                                        Run <span className="text-zinc-400">staff sync</span> in this session to see the trace. It
                                        does not persist after refresh.
                                    </div>
                                ) : (
                                    <p className="py-2 text-[12px] text-zinc-600">Open Show to view the step list from your last sync.</p>
                                )}
                            </div>
                        </InsetPanel>
                    </section>

                    {/* ─── Sync activity (anchor always present for section nav) ─── */}
                    <section id="act-feed" className="mb-10 scroll-mt-28" aria-labelledby="act-feed-title">
                        <SectionHeading icon={Radio} title="Sync activity" id="act-feed-title" />
                        {syncLogs.length > 0 ? (
                            <InsetPanel variant="muted" className="mt-4 font-mono">
                                <ul className="space-y-2">
                                    {syncLogs.map((log) => (
                                        <li key={log.id} className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-snug">
                                            <span className="shrink-0 text-zinc-500">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                            <span
                                                className={`min-w-0 ${
                                                    log.type === 'error' ? 'text-red-400/90' : 'text-zinc-400'
                                                }`}
                                            >
                                                {log.message}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </InsetPanel>
                        ) : (
                            <p className="mt-3 text-[12px] text-zinc-600">No sync activity recorded yet.</p>
                        )}
                    </section>

                    {/* ─── Section 4: Data flow ─── */}
                    <section className="mb-10" aria-labelledby="net-title">
                        <SectionHeading icon={Layers} title="Data flow summary" id="net-title" />
                        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
                            The map above is this venture&apos;s wiring.{' '}
                            <span className="text-zinc-400">Staff sync</span> is the batched step;{' '}
                            <span className="text-zinc-400">Desk AI</span> applies changes as you work.
                        </p>

                        <InsetPanel className="mt-6 divide-y divide-white/[0.06] p-0">
                            {[
                                {
                                    icon: Database,
                                    label: 'Venture data',
                                    text: 'Strategy, product, budget, market notes, events, kanban — stored locally per venture.',
                                },
                                {
                                    icon: Bot,
                                    label: 'Intelligence layer',
                                    text: 'Dexo, coordination, desk chats, and staff sync all touch the same venture row.',
                                },
                                {
                                    icon: Users,
                                    label: 'Officer outputs',
                                    text: 'Each desk has a defined artifact type so outputs stay structured and traceable.',
                                },
                            ].map((item) => (
                                <div key={item.label} className="flex gap-4 px-5 py-4 first:pt-5 last:pb-5">
                                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-100 ring-1 ring-white/[0.06]">
                                        <item.icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                            {item.label}
                                        </p>
                                        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </InsetPanel>
                    </section>

                    {/* ─── Section 5: Decisions ─── */}
                    <section className="mb-10">
                        <SectionHeading icon={Shield} title="How decisions are shaped" id="decisions-shape" />
                        <InsetPanel className="mt-6">
                            <ul className="space-y-4">
                                {[
                                    {
                                        label: 'Executive overview',
                                        text: 'Reflects what you and desks recorded — not invented KPIs.',
                                    },
                                    {
                                        label: 'Staff sync',
                                        text: 'One batched pass refreshes all desk briefs from the same venture snapshot.',
                                    },
                                    {
                                        label: 'Chat rail',
                                        text: 'Uses room-themed prompts so follow-ups match the surface you are in.',
                                    },
                                ].map((item) => (
                                    <li key={item.label} className="flex gap-3 text-[13px] leading-relaxed text-zinc-400">
                                        <span
                                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500"
                                            aria-hidden
                                        />
                                        <span>
                                            <span className="font-medium text-zinc-200">{item.label}</span>
                                            <span className="text-zinc-500"> — {item.text}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </InsetPanel>
                    </section>

                    {/* ─── Section 6: Reports ─── */}
                    <section className="mb-12">
                        <SectionHeading icon={FileText} title="Reports &amp; artifacts" id="reports-artifacts" />
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            {[
                                {
                                    icon: FileText,
                                    text: 'Knowledge base and exports from desks.',
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
                                <InsetPanel key={i} className="flex flex-col gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-100">
                                        <item.icon className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden />
                                    </div>
                                    <p className="text-[12px] leading-relaxed text-zinc-400">{item.text}</p>
                                </InsetPanel>
                            ))}
                        </div>
                    </section>

                    <footer className="border-t border-white/[0.07] pt-8 text-[11px] leading-relaxed text-zinc-600">
                        <span className="font-medium text-zinc-500">Privacy.</span> Venture data stays in your browser (IndexedDB)
                        unless your deployment adds server persistence. AI calls follow your backend configuration.
                    </footer>
                </div>
            </div>
        </>
    );
}
