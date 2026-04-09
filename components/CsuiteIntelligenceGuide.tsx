'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
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
    Sliders,
    LayoutDashboard,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import type { AgentStaffSnapshot } from '@/lib/db';
import { useHfRoleSync, type HfDeskRole, HF_DEFAULT_COMPANY_CONTEXT } from '@/lib/useHfRoleSync';
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

/** Tinted shells — same vocabulary as executive dashboard “message” blocks */
const INTEL_OUTLINE = {
    flow: 'border-cyan-500/35 bg-gradient-to-br from-cyan-500/[0.08] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    roles: 'border-violet-500/35 bg-gradient-to-br from-violet-500/[0.09] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    focus: 'border-amber-500/38 bg-gradient-to-br from-amber-950/30 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    trace: 'border-sky-500/35 bg-gradient-to-br from-sky-500/[0.07] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    activity: 'border-zinc-500/35 bg-zinc-900/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    dataflow: 'border-teal-500/32 bg-gradient-to-br from-teal-500/[0.06] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    decisions: 'border-emerald-500/32 bg-gradient-to-br from-emerald-500/[0.06] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    reports: 'border-fuchsia-500/28 bg-gradient-to-br from-fuchsia-500/[0.06] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
} as const;

type IntelOutlineKey = keyof typeof INTEL_OUTLINE;

function IntelMessageSection({
    id,
    outline,
    icon,
    eyebrow,
    title,
    subtitle,
    headerRight,
    children,
    className = '',
    bodyClassName = '',
}: {
    id?: string;
    outline: IntelOutlineKey;
    icon: React.ReactNode;
    eyebrow?: string;
    title: string;
    subtitle?: string;
    headerRight?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    /** e.g. min-h-0 flex-1 flex flex-col for scroll regions inside a max-height shell */
    bodyClassName?: string;
}) {
    return (
        <section
            id={id}
            className={`scroll-mt-28 rounded-2xl border px-4 py-4 sm:px-5 sm:py-5 ${INTEL_OUTLINE[outline]} ${className}`}
        >
            <header className="mb-4 shrink-0 flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black/25 ring-1 ring-white/[0.08]">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    {eyebrow ? (
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{eyebrow}</p>
                    ) : null}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className={`text-sm font-semibold tracking-tight text-zinc-100 ${eyebrow ? 'mt-1' : ''}`}>{title}</h2>
                        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
                    </div>
                    {subtitle ? <p className="mt-1 text-[11px] leading-snug text-zinc-500">{subtitle}</p> : null}
                </div>
            </header>
            <div className={`min-h-0 text-[13px] leading-relaxed text-zinc-300/95 ${bodyClassName}`}>{children}</div>
        </section>
    );
}

const DESK_MESSAGE_ACCENT: Record<(typeof DESK_ORDER)[number]['key'], string> = {
    ceo: 'border-l-4 border-l-violet-400/50',
    pm: 'border-l-4 border-l-amber-400/50',
    accountant: 'border-l-4 border-l-emerald-400/45',
    scout: 'border-l-4 border-l-sky-400/50',
    cmo: 'border-l-4 border-l-fuchsia-400/45',
};

const COORD_PRESETS: { label: string; text: string }[] = [
    {
        label: 'Ship first',
        text: 'Prioritize delivery and the CTO execution board. Other desks should stay concise unless they unblock shipping.',
    },
    {
        label: 'Runway first',
        text: 'Lead with finance and runway. Product and GTM scope should respect cash and fundraising constraints.',
    },
    {
        label: 'Market first',
        text: 'Lead with market intel and GTM. Align product and CEO narrative with positioning and customer evidence.',
    },
];

/** Nested “inline insight” — small outline inside a message block */
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
            ? 'rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 ring-1 ring-white/[0.04] sm:px-5 sm:py-4'
            : 'rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.05] sm:px-5 sm:py-5';
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
        patchActiveProject,
        updateProjectField,
    } = useOffice();

    const snapshot = activeProject?.agentStaffSnapshot;
    const focus = activeProject?.staffFocusToday ?? [];
    const syncLogs = systemLogs.filter((l) => l.source === 'agent-sync').slice(0, 12);

    const [openDesk, setOpenDesk] = useState<string | null>('ceo');
    const [traceOpen, setTraceOpen] = useState(true);
    const [flowStructureFullView, setFlowStructureFullView] = useState(false);
    const [flowPortalReady, setFlowPortalReady] = useState(false);
    const [howAiOpen, setHowAiOpen] = useState(false);
    const [coordDraft, setCoordDraft] = useState('');

    useEffect(() => setFlowPortalReady(true), []);

    useEffect(() => {
        setCoordDraft(activeProject?.agentCoordinationBrief ?? '');
    }, [activeProject?.id, activeProject?.agentCoordinationBrief]);

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

    const hfCompanyContext = useMemo(() => {
        if (!activeProject?.name) return HF_DEFAULT_COMPANY_CONTEXT;
        const bits: string[] = [activeProject.name];
        const brief = activeProject.agentCoordinationBrief?.trim();
        if (brief) bits.push(brief.slice(0, 1200));
        const td = activeProject.teamDirectives?.trim();
        if (!brief && td) bits.push(td.slice(0, 600));
        return bits.join('\n\n');
    }, [activeProject?.name, activeProject?.agentCoordinationBrief, activeProject?.teamDirectives]);

    const persistCoordinationBrief = async (raw: string) => {
        const v = raw.trim() || undefined;
        if (activeProject?.id) {
            await updateProjectField('agentCoordinationBrief', v);
        } else {
            patchActiveProject({ agentCoordinationBrief: v });
        }
    };

    const {
        syncing: hfSyncing,
        syncResult: hfSyncResult,
        syncModel: hfSyncModel,
        setSyncResult: setHfSyncResult,
        syncRole: hfSyncRole,
    } = useHfRoleSync(hfCompanyContext);

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
                        Select a venture to configure how AI staff coordinate and to run staff sync for that workspace.
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
                        <SectionLabel>DEEPCHOX · AI team network</SectionLabel>
                        <p id="flow-full-title" className="mt-0.5 truncate text-[13px] font-medium text-zinc-100">
                            {activeProject.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">
                            One staff-sync run refreshes all five desk briefs from your venture snapshot. Press{' '}
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
                <div className="mx-auto max-w-3xl space-y-6 px-4 pt-5 pb-16 sm:px-5 lg:max-w-4xl">
                    <header className="rounded-2xl border border-zinc-500/30 bg-zinc-900/40 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-5">
                        <SectionLabel>DEEPCHOX</SectionLabel>
                        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-500/80">
                            AI-powered team for founders
                        </p>
                        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100 sm:text-[22px]">
                            AI team coordination
                        </h1>
                        <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
                            Set <span className="text-zinc-300">how you want your AI teammates to coordinate</span>, then run staff
                            sync so every desk brief is generated from the same venture snapshot. Desk chats and your notes still edit
                            the record between runs.
                        </p>
                        <p className="mt-3 text-[11px] leading-snug text-zinc-600">
                            Outlined blocks group controls (your setup) from readouts (model output). Nothing here replaces your judgment
                            — verify anything that affects real decisions.
                        </p>
                        <SuiteNavChips className="mt-5" />
                    </header>

                    <IntelMessageSection
                        id="live-net"
                        outline="flow"
                        icon={<GitBranch className="h-4 w-4 text-cyan-300/90" strokeWidth={1.9} aria-hidden />}
                        eyebrow="Network"
                        title="Coordination map &amp; controls"
                        subtitle="Visualize the fan-out from one staff sync, then run sync or try optional per-role probes below."
                        headerRight={
                            <button
                                type="button"
                                onClick={() => setFlowStructureFullView(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/[0.08] px-3 py-1.5 text-[11px] font-medium text-zinc-100 transition hover:bg-cyan-500/[0.12]"
                            >
                                <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                Fullscreen
                            </button>
                        }
                    >
                        <div className="space-y-4">
                            <div
                                id="coord-brief"
                                className="scroll-mt-28 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 ring-1 ring-white/[0.05] sm:p-5"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/30 text-emerald-200/90 ring-1 ring-white/[0.08]">
                                        <Sliders className="h-4 w-4" strokeWidth={1.9} aria-hidden />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <SectionLabel>Your coordination brief</SectionLabel>
                                        <p className="mt-1 text-[12px] leading-snug text-zinc-400">
                                            Tell the staff how to weight the five desks (e.g. ship-first vs runway-first). This text is
                                            saved on the venture and sent with the next{' '}
                                            <span className="text-zinc-300">Run staff sync</span> request.
                                        </p>
                                        <textarea
                                            value={coordDraft}
                                            onChange={(e) => setCoordDraft(e.target.value)}
                                            onBlur={() => {
                                                void persistCoordinationBrief(coordDraft);
                                            }}
                                            rows={5}
                                            placeholder='Example: "Ship the calibration MVP first; CFO calls out runway below 9 months; keep GTM copy short until we have pilot names."'
                                            className="mt-3 w-full resize-y rounded-xl border border-emerald-500/25 bg-black/40 px-3 py-2.5 text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-400/45 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
                                            spellCheck
                                        />
                                        <p className="mt-2 text-[10px] text-zinc-500">
                                            Saved when you leave this field (persisted with the venture once it has an id). Presets append
                                            a paragraph you can edit.
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {COORD_PRESETS.map((preset) => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => {
                                                        const next = coordDraft.trim()
                                                            ? `${coordDraft.trim()}\n\n${preset.text}`
                                                            : preset.text;
                                                        setCoordDraft(next);
                                                        void persistCoordinationBrief(next);
                                                    }}
                                                    className="rounded-lg border border-emerald-500/25 bg-black/30 px-2.5 py-1 text-[10px] font-medium text-emerald-100/90 transition hover:bg-emerald-500/15"
                                                >
                                                    + {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-sky-500/28 bg-sky-500/[0.05] ring-1 ring-white/[0.04]">
                                <button
                                    type="button"
                                    onClick={() => setHowAiOpen((v) => !v)}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[12px] font-medium text-zinc-200 transition hover:bg-white/[0.04]"
                                    aria-expanded={howAiOpen}
                                    aria-controls="how-ai-updates"
                                    id="how-ai-toggle"
                                >
                                    <span>What staff sync actually uses</span>
                                    {howAiOpen ? (
                                        <Minus className="h-4 w-4 shrink-0 text-sky-300/80" strokeWidth={2} aria-hidden />
                                    ) : (
                                        <Plus className="h-4 w-4 shrink-0 text-sky-400/70" strokeWidth={2} aria-hidden />
                                    )}
                                </button>
                                {howAiOpen ? (
                                    <div
                                        id="how-ai-updates"
                                        className="border-t border-sky-500/20 bg-black/20 px-4 py-4"
                                        aria-labelledby="how-ai-toggle"
                                    >
                                        <ol className="list-decimal space-y-2.5 pl-4 text-[12px] leading-relaxed text-zinc-400 marker:text-zinc-600">
                                            <li>
                                                <span className="text-zinc-200">Venture snapshot</span> — strategy, product, budget,
                                                market notes, kanban, calendar, onboarding, team directives, and your coordination brief
                                                above (if any).
                                            </li>
                                            <li>
                                                <span className="text-zinc-200">Server run</span> — one request to the configured model
                                                returns five desk strings plus optional merges (intel, budget, board, focus list,
                                                etc.).
                                            </li>
                                            <li>
                                                <span className="text-zinc-200">Between syncs</span> — you edit desks, PA, or notes
                                                locally; the next sync sees the updated snapshot.
                                            </li>
                                            <li>
                                                <span className="text-zinc-200">Not automatic</span> — sync only runs when you press the
                                                button (or equivalent). Headlines are fetched when the server allows; they can be empty.
                                            </li>
                                        </ol>
                                    </div>
                                ) : null}
                            </div>

                            <div className="rounded-xl border border-white/[0.1] bg-black/30 px-2 py-4 ring-1 ring-white/[0.05] sm:px-3">
                                <SuiteIntelligenceNeuralFlow {...flowProps} variant="inline" />
                            </div>

                            <div className="flex flex-col gap-3 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] px-4 py-3 ring-1 ring-white/[0.04] sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 sm:max-w-[55%]">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/70">
                                        Alternate model probe (optional)
                                    </span>
                                    <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                                        Separate from staff sync: calls a different API with your venture name and coordination brief
                                        (or team directives) as a short blurb — useful to compare tone, not to update the venture record.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                    {DESK_ORDER.map((d) => (
                                        <button
                                            key={d.key}
                                            type="button"
                                            disabled={hfSyncing}
                                            onClick={() => {
                                                setHfSyncResult(null);
                                                void hfSyncRole(DESK_HF_ROLE[d.key]);
                                            }}
                                            className="rounded-lg border border-white/[0.1] bg-black/25 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/[0.08] disabled:opacity-50"
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

                            <div className="flex flex-col gap-3 rounded-xl border border-teal-500/25 bg-teal-500/[0.06] px-4 py-3.5 ring-1 ring-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
                                <button
                                    type="button"
                                    onClick={() => runAgentStaffSync()}
                                    disabled={agentSyncRunning}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-400/30 bg-teal-950/40 px-5 py-2.5 text-[12px] font-semibold text-teal-50 transition hover:bg-teal-950/55 disabled:opacity-50"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 ${agentSyncRunning ? 'animate-spin' : ''}`}
                                        strokeWidth={2}
                                        aria-hidden
                                    />
                                    {agentSyncRunning ? 'Running staff sync…' : 'Run staff sync now'}
                                </button>
                                <p className="max-w-md text-[12px] leading-relaxed text-zinc-400 sm:text-right">
                                    Sends your venture snapshot, optional RSS headlines, and coordination brief to the staff-sync
                                    endpoint. Outputs merge into this venture and the map refreshes.
                                </p>
                            </div>
                        </div>
                    </IntelMessageSection>

                    {/* ─── Section 2: Role outputs ─── */}
                    {snapshot?.desks && (
                        <IntelMessageSection
                            id="desk-out"
                            outline="roles"
                            icon={<Users className="h-4 w-4 text-violet-300/90" strokeWidth={1.9} aria-hidden />}
                            eyebrow="Model output"
                            title="Latest desk briefs from staff sync"
                            subtitle={`Generated ${formatSyncTime(snapshot.at)} — stored on this venture; open a lane to read or continue in desk chat.`}
                        >
                            {snapshot.summary?.trim() ? (
                                <InsetPanel className="mb-5 border-l-4 border-l-violet-400/45 pl-4">
                                    <SectionLabel>Staff synthesis</SectionLabel>
                                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-300">
                                        {snapshot.summary}
                                    </p>
                                </InsetPanel>
                            ) : null}

                            <div className="space-y-2.5">
                                {deskEntries.map((row) => {
                                    const open = openDesk === row.key;
                                    const accent = DESK_MESSAGE_ACCENT[row.key];
                                    return (
                                        <div
                                            key={row.key}
                                            className={`overflow-hidden rounded-xl border border-white/[0.08] bg-black/20 transition-colors ring-1 ring-white/[0.04] ${
                                                open ? 'bg-white/[0.05] ring-violet-500/20' : 'hover:border-white/[0.12]'
                                            } ${accent}`}
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
                        </IntelMessageSection>
                    )}

                    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5" aria-labelledby="focus-trace">
                        <IntelMessageSection
                            id="focus-trace"
                            outline="focus"
                            icon={<Sparkles className="h-4 w-4 text-amber-200/90" strokeWidth={1.9} aria-hidden />}
                            eyebrow="Today"
                            title="Focus today"
                            subtitle="Check items as you go. Notes are saved to your journal."
                            className="flex min-h-0 max-h-[min(38vh,21rem)] flex-col"
                            bodyClassName="flex min-h-0 flex-1 flex-col"
                        >
                            <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
                                {focus.length > 0 ? (
                                    <StaffFocusChecklist
                                        lines={focus}
                                        completedLines={activeProject?.staffFocusCompletedLines || []}
                                        onMarkDone={(line, note) => markStaffFocusLineDone(line, note)}
                                        className="border-amber-500/15 bg-black/25"
                                    />
                                ) : (
                                    <div className="rounded-xl border border-dashed border-amber-500/25 bg-amber-950/15 px-4 py-8 text-center text-[12px] text-zinc-500">
                                        Run a staff sync to populate today&apos;s priorities.
                                    </div>
                                )}
                            </div>
                        </IntelMessageSection>

                        <IntelMessageSection
                            outline="trace"
                            icon={<ListOrdered className="h-4 w-4 text-sky-300/90" strokeWidth={1.9} aria-hidden />}
                            eyebrow="Session"
                            title="Process trace"
                            subtitle="Steps from the last staff sync in this session."
                            headerRight={
                                <button
                                    type="button"
                                    onClick={() => setTraceOpen(!traceOpen)}
                                    className="rounded-lg border border-sky-500/25 bg-sky-500/[0.1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200/90 transition hover:bg-sky-500/[0.15]"
                                >
                                    {traceOpen ? 'Hide' : 'Show'}
                                </button>
                            }
                            className="flex min-h-0 max-h-[min(38vh,21rem)] flex-col"
                            bodyClassName="flex min-h-0 flex-1 flex-col"
                        >
                            <div className="min-h-0 flex-1 overflow-hidden">
                                {traceOpen && (lastAiSyncTrace?.length ?? 0) > 0 ? (
                                    <ol className="custom-scrollbar max-h-[min(28vh,200px)] space-y-1.5 overflow-y-auto pr-1">
                                        {lastAiSyncTrace!.map((step, i) => (
                                            <li
                                                key={step.id + i}
                                                className="flex gap-3 rounded-lg border border-sky-500/15 bg-black/25 px-3 py-2.5 ring-1 ring-white/[0.04]"
                                            >
                                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-[11px] font-bold text-sky-200/90">
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
                                    <div className="rounded-xl border border-dashed border-sky-500/25 bg-sky-950/20 px-4 py-6 text-[12px] leading-relaxed text-zinc-500">
                                        Run <span className="text-sky-300/80">staff sync</span> in this session to see the trace. It
                                        does not persist after refresh.
                                    </div>
                                ) : (
                                    <p className="py-2 text-[12px] text-zinc-600">Open Show to view the step list from your last sync.</p>
                                )}
                            </div>
                        </IntelMessageSection>
                    </div>

                    <IntelMessageSection
                        id="act-feed"
                        outline="activity"
                        icon={<Radio className="h-4 w-4 text-zinc-300" strokeWidth={1.9} aria-hidden />}
                        eyebrow="Log"
                        title="Sync activity"
                        subtitle={
                            syncLogs.length > 0
                                ? `${syncLogs.length} recent agent-sync line${syncLogs.length === 1 ? '' : 's'}`
                                : 'Agent-sync events in this session.'
                        }
                    >
                        {syncLogs.length > 0 ? (
                            <InsetPanel variant="muted" className="font-mono">
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
                            <p className="text-[12px] text-zinc-600">No sync activity recorded yet.</p>
                        )}
                    </IntelMessageSection>

                    <IntelMessageSection
                        id="net-title"
                        outline="dataflow"
                        icon={<Layers className="h-4 w-4 text-teal-300/85" strokeWidth={1.9} aria-hidden />}
                        eyebrow="Reality check"
                        title="What you steer vs what runs for you"
                        subtitle="No hidden autonomy: these are the actual splits in this app today."
                    >
                        <div className="divide-y divide-teal-500/15 rounded-xl border border-teal-500/20 bg-black/20 ring-1 ring-white/[0.04]">
                            {[
                                {
                                    icon: Sliders,
                                    label: 'You steer',
                                    text: 'Coordination brief, strategy & product fields, team directives, kanban, calendar, notes, and which desk you open. All of that is included in the snapshot sent to staff sync.',
                                    tone: 'border-l-4 border-l-teal-400/45',
                                },
                                {
                                    icon: Bot,
                                    label: 'Automated on demand',
                                    text: 'Staff sync (button) calls the server model once and writes back desk briefs, optional merges, focus list, and notifications. It does not run on a timer unless you add that elsewhere.',
                                    tone: 'border-l-4 border-l-cyan-400/45',
                                },
                                {
                                    icon: Users,
                                    label: 'Per-desk AI',
                                    text: 'Each room’s chat uses that surface’s context; replies do not automatically rerun the whole staff sync. Use sync when you want all five briefs refreshed together.',
                                    tone: 'border-l-4 border-l-violet-400/45',
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className={`flex gap-4 px-4 py-4 first:pt-4 last:pb-4 sm:px-5 ${item.tone}`}
                                >
                                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-100 ring-1 ring-teal-500/15">
                                        <item.icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-200/55">
                                            {item.label}
                                        </p>
                                        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </IntelMessageSection>

                    <IntelMessageSection
                        id="decisions-shape"
                        outline="decisions"
                        icon={<Shield className="h-4 w-4 text-emerald-300/85" strokeWidth={1.9} aria-hidden />}
                        eyebrow="Safety"
                        title="Ground rules for trusting output"
                        subtitle="Models can be wrong; thin venture data makes that more likely."
                    >
                        <InsetPanel className="border-emerald-500/15 bg-emerald-950/15">
                            <ul className="space-y-4">
                                {[
                                    {
                                        label: 'Executive overview',
                                        text: 'Charts and scores derive from what is already in the venture — they are not independent research.',
                                    },
                                    {
                                        label: 'Staff sync',
                                        text: 'Must follow your snapshot and headlines; it should not invent funding, customers, or KPIs without basis in the input.',
                                    },
                                    {
                                        label: 'Your coordination brief',
                                        text: 'Biases how desks emphasize topics; it does not add facts. Pair it with solid strategy and directives.',
                                    },
                                ].map((item) => (
                                    <li key={item.label} className="flex gap-3 text-[13px] leading-relaxed text-zinc-400">
                                        <span
                                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/50"
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
                    </IntelMessageSection>

                    <IntelMessageSection
                        id="reports-artifacts"
                        outline="reports"
                        icon={<FileText className="h-4 w-4 text-fuchsia-300/80" strokeWidth={1.9} aria-hidden />}
                        eyebrow="Next steps"
                        title="Continue in the office"
                        subtitle="Jump to where you edit the venture or review saved work."
                    >
                        <div className="grid gap-3 sm:grid-cols-3">
                            {[
                                {
                                    icon: LayoutDashboard,
                                    text: 'Executive overview — KPIs, office brief, and dashboard tiles.',
                                    ring: 'border-fuchsia-500/20 bg-fuchsia-950/15',
                                    room: 'dashboard' as const,
                                    label: 'Overview',
                                    ctaClass: 'text-fuchsia-200/75',
                                },
                                {
                                    icon: FileText,
                                    text: 'Knowledge — exports and artifacts tied to desks.',
                                    ring: 'border-violet-500/20 bg-violet-950/15',
                                    room: 'reports' as const,
                                    label: 'Knowledge',
                                    ctaClass: 'text-violet-200/75',
                                },
                                {
                                    icon: MessageSquare,
                                    text: 'Personal Assistant — change strategy, phases, or board through chat.',
                                    ring: 'border-sky-500/20 bg-sky-950/15',
                                    room: 'personal_assistant' as const,
                                    label: 'Assistant',
                                    ctaClass: 'text-sky-200/80',
                                },
                            ].map((item) => (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => switchRoom(item.room)}
                                    className={`flex flex-col gap-3 rounded-xl border px-4 py-4 text-left ring-1 ring-white/[0.04] transition hover:bg-white/[0.04] ${item.ring}`}
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/25 text-zinc-100 ring-1 ring-white/[0.06]">
                                        <item.icon className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden />
                                    </div>
                                    <p className="text-[12px] leading-relaxed text-zinc-400">{item.text}</p>
                                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${item.ctaClass}`}>
                                        Open {item.label} →
                                    </span>
                                </button>
                            ))}
                        </div>
                    </IntelMessageSection>

                    <footer className="border-t border-white/[0.07] pt-8 text-[11px] leading-relaxed text-zinc-600">
                        <span className="font-medium text-zinc-500">Privacy.</span> Venture data stays in your browser (IndexedDB)
                        unless your deployment adds server persistence. AI calls follow your backend configuration.
                    </footer>
                </div>
            </div>
        </>
    );
}
