'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    Sliders,
    LayoutDashboard,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import type { AgentStaffSnapshot } from '@/lib/db';
import { useHfRoleSync, type HfDeskRole, HF_DEFAULT_COMPANY_CONTEXT } from '@/lib/useHfRoleSync';
import { ModelAttribution } from '@/components/ModelAttribution';
import { StaffFocusChecklist } from '@/components/office/StaffFocusChecklist';
import { RESEARCH_STAFF } from '@/lib/researchStaffLabels';
import { SuiteNavChips } from '@/components/SuiteNavChips';
import { DeskChatThreadMount } from '@/components/DeskChatThreadSlotContext';
import { DualAgentWorkPanel, useDualAgentPanelState } from '@/components/DualAgentWorkPanel';
import { GuideHint, ProgressTrail } from '@/components/ui/ContextualGuide';
import { WorkflowNeuralMap } from '@/components/WorkflowNeuralMap';
import { AITeamNetwork } from '@/components/AITeamNetwork';

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

/** Tinted shells â€” same vocabulary as executive dashboard â€œmessageâ€ blocks */
/** Neutral panels â€” readable hierarchy without tinted gradients or glow */
const INTEL_OUTLINE = {
    flow: 'executive-panel',
    roles: 'executive-panel',
    focus: 'executive-panel',
    trace: 'executive-panel',
    activity: 'executive-panel',
    dataflow: 'executive-panel',
    decisions: 'executive-panel',
    reports: 'executive-panel',
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
            className={`scroll-mt-28 rounded-2xl px-4 py-4 sm:px-5 sm:py-5 ${INTEL_OUTLINE[outline]} ${className}`}
        >
            <header className="mb-4 shrink-0 flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-[#A1A1AA]">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    {eyebrow ? (
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#71717A]">{eyebrow}</p>
                    ) : null}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className={`text-sm font-semibold tracking-tight text-[#FAFAFA] ${eyebrow ? 'mt-1' : ''}`}>{title}</h2>
                        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
                    </div>
                    {subtitle ? <p className="mt-1 text-[11px] leading-snug text-[#71717A]">{subtitle}</p> : null}
                </div>
            </header>
            <div className={`min-h-0 text-[13px] leading-relaxed text-[#A1A1AA] ${bodyClassName}`}>{children}</div>
        </section>
    );
}

const DESK_MESSAGE_ACCENT: Record<(typeof DESK_ORDER)[number]['key'], string> = {
    ceo: 'border-l-2 border-l-zinc-600',
    pm: 'border-l-2 border-l-zinc-600',
    accountant: 'border-l-2 border-l-zinc-600',
    scout: 'border-l-2 border-l-zinc-600',
    cmo: 'border-l-2 border-l-zinc-600',
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

/** Nested â€œinline insightâ€ â€” small outline inside a message block */
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
            ? 'executive-card px-4 py-3 sm:px-5 sm:py-4'
            : 'executive-card px-4 py-4 sm:px-5 sm:py-5';
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
        <span className="inline-block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#71717A]">
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
        lastSyncDualAgent,
        systemLogs,
        markStaffFocusLineDone,
        setSuiteIntelOpenDesk,
        patchActiveProject,
        updateProjectField,
    } = useOffice();

    // Memoize the result object to prevent infinite re-renders
    const dualAgentResult = useMemo(() => {
        return lastSyncDualAgent ? { dual_agent: lastSyncDualAgent } : null;
    }, [lastSyncDualAgent]);
    
    const dualAgentPanelState = useDualAgentPanelState(
        agentSyncRunning,
        dualAgentResult,
        lastSyncDualAgent?.at ?? null
    );

    const snapshot = activeProject?.agentStaffSnapshot;
    const focus = activeProject?.staffFocusToday ?? [];
    const syncLogs = systemLogs.filter((l) => l.source === 'agent-sync').slice(0, 12);

    const [openDesk, setOpenDesk] = useState<string | null>('ceo');
    const [traceOpen, setTraceOpen] = useState(true);
    const [howAiOpen, setHowAiOpen] = useState(false);
    const [coordDraft, setCoordDraft] = useState('');

    useEffect(() => {
        setCoordDraft(activeProject?.agentCoordinationBrief ?? '');
    }, [activeProject?.id, activeProject?.agentCoordinationBrief]);

    useEffect(() => {
        setSuiteIntelOpenDesk(openDesk);
    }, [openDesk, setSuiteIntelOpenDesk]);

    useEffect(() => {
        if (!snapshot?.desks) setOpenDesk(null);
    }, [snapshot?.desks]);


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

    /* â”€â”€ Empty state â”€â”€ */
    if (!activeProject?.id) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: '#0A0A0B' }}>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                    <Radio className="h-6 w-6 text-[#FAFAFA]" strokeWidth={1.85} aria-hidden />
                </div>
                <div>
                    <p className="text-[13px] font-medium text-[#FAFAFA]">No venture selected</p>
                    <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-[#71717A]">
                        Select a venture to configure how AI staff coordinate and to run staff sync for that workspace.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => switchRoom('dexo')}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-4 py-2 text-[11px] font-medium text-[#FAFAFA] transition-colors hover:bg-white/[0.06]"
                >
                    Go to Deepchox
                </button>
            </div>
        );
    }


    /* â”€â”€ Fullscreen flow overlay â”€â”€ */
    return (
        <div className="w-full min-w-0" style={{ background: '#0A0A0B' }}>
                <div className="mx-auto max-w-3xl space-y-6 px-4 pt-5 pb-16 sm:px-5 lg:max-w-5xl">
                    <header className="rounded-2xl border border-white/[0.06] px-4 py-5 sm:px-5" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))' }}>
                        <SectionLabel>northROSC LABS Â· Deepchox</SectionLabel>
                        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#71717A]">
                            AI-powered team for founders
                        </p>
                        <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#FAFAFA] sm:text-[22px]">
                            Intelligence suite
                        </h1>
                        <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-[#A1A1AA]">
                            Configure <span className="text-[#FAFAFA]">how your AI teammates stay aligned</span>, then run staff sync
                            so every desk brief is generated from the same venture snapshot. Desk chats and your notes still edit the
                            record between runs.
                        </p>
                        <p className="mt-3 text-[11px] leading-snug text-[#52525B]">
                            Outlined blocks group controls (your setup) from readouts (model output). Nothing here replaces your judgment
                            â€” verify anything that affects real decisions.
                        </p>
                        <SuiteNavChips className="mt-5" />

                        {/* Workflow progress trail */}
                        <div className="mt-4">
                            <ProgressTrail
                                steps={[
                                    { label: 'Venture created', done: true },
                                    { label: 'Strategy added', done: !!(activeProject?.strategy && activeProject.strategy.length > 30) },
                                    { label: 'Coordination brief', done: !!(activeProject?.agentCoordinationBrief?.trim()), active: !(activeProject?.agentCoordinationBrief?.trim()) },
                                    { label: 'Staff sync run', done: !!activeProject?.agentStaffSnapshot, active: !activeProject?.agentStaffSnapshot && !!(activeProject?.strategy && activeProject.strategy.length > 30) },
                                ]}
                            />
                        </div>
                    </header>

                    <section className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-card)] shadow-[0_0_48px_-16px_rgba(255,255,255,0.07)]">
                        <div
                            className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[min(100%,36rem)] -translate-x-1/2 rounded-full bg-white/[0.05] blur-3xl"
                            aria-hidden
                        />
                        <div className="relative border-b border-[var(--border)] px-4 py-3 sm:px-5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">AI network</p>
                            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[var(--text-secondary)]">
                                Your <span className="text-[var(--text-primary)]">neural map</span> (workflows &amp; model lanes) and{' '}
                                <span className="text-[var(--text-primary)]">team link diagram</span> (desks) live in one surface so the suite feels
                                like one system, not two separate tools.
                            </p>
                        </div>
                        <div className="relative space-y-0 px-3 py-4 sm:px-4 sm:py-5">
                            <WorkflowNeuralMap embedded />
                            <div
                                className="my-6 h-px bg-gradient-to-r from-transparent via-white/08 to-transparent"
                                aria-hidden
                            />
                            <AITeamNetwork embedded />
                        </div>
                    </section>

                    {/* First-time guide hints */}
                    <div className="flex flex-col gap-2">
                        <GuideHint
                            id="intel-no-brief"
                            when={!activeProject?.agentCoordinationBrief?.trim() && !activeProject?.agentStaffSnapshot}
                            variant="tip"
                            message='Write a short coordination brief below â€” e.g. "Ship-first: CFO flags runway risk, CMO stays lean until we have pilot names." This tells your AI team how to weight priorities.'
                            dismissible
                        />
                        <GuideHint
                            id="intel-first-sync"
                            when={!activeProject?.agentStaffSnapshot && !agentSyncRunning}
                            variant="info"
                            message="No sync has run yet. Hit Run staff sync â€” Claude and GPT routes run together (dual-model stack) across all five desks and populate the outputs below."
                            action="Run sync"
                            onAction={() => runAgentStaffSync()}
                            dismissible={false}
                        />
                        <GuideHint
                            id="intel-sync-running"
                            when={agentSyncRunning}
                            variant="info"
                            message="Both model routes are running in parallel right now. GPT and Claude each contribute to the merged staff output; results combine automatically."
                            dismissible={false}
                        />
                    </div>

                    <IntelMessageSection
                        id="live-net"
                        outline="flow"
                        icon={<GitBranch className="h-4 w-4 text-zinc-400" strokeWidth={1.9} aria-hidden />}
                        eyebrow="Network"
                        title="Controls"
                        subtitle="Run staff sync, steer coordination, and compare optional per-role probes below."
                    >
                        <div className="space-y-4">
                            <div
                                id="coord-brief"
                                className="scroll-mt-28 rounded-xl border border-zinc-800/90 bg-zinc-950/40 p-4 sm:p-5"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400">
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
                                            className="mt-3 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
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
                                                    className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-[10px] font-medium text-zinc-300 transition hover:bg-zinc-800/80"
                                                >
                                                    + {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/30">
                                <button
                                    type="button"
                                    onClick={() => setHowAiOpen((v) => !v)}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[12px] font-medium text-zinc-200 transition hover:bg-zinc-900/50"
                                    aria-expanded={howAiOpen}
                                    aria-controls="how-ai-updates"
                                    id="how-ai-toggle"
                                >
                                    <span>What staff sync actually uses</span>
                                    {howAiOpen ? (
                                        <Minus className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={2} aria-hidden />
                                    ) : (
                                        <Plus className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={2} aria-hidden />
                                    )}
                                </button>
                                {howAiOpen ? (
                                    <div
                                        id="how-ai-updates"
                                        className="border-t border-zinc-800/80 bg-zinc-950/50 px-4 py-4"
                                        aria-labelledby="how-ai-toggle"
                                    >
                                        <ol className="list-decimal space-y-2.5 pl-4 text-[12px] leading-relaxed text-zinc-400 marker:text-zinc-600">
                                            <li>
                                                <span className="text-zinc-200">Venture snapshot</span> â€” strategy, product, budget,
                                                market notes, kanban, calendar, onboarding, team directives, and your coordination brief
                                                above (if any).
                                            </li>
                                            <li>
                                                <span className="text-zinc-200">Server run</span> â€” one request to the configured model
                                                returns five desk strings plus optional merges (intel, budget, board, focus list,
                                                etc.).
                                            </li>
                                            <li>
                                                <span className="text-zinc-200">Between syncs</span> â€” you edit desks, PA, or notes
                                                locally; the next sync sees the updated snapshot.
                                            </li>
                                            <li>
                                                <span className="text-zinc-200">Not automatic</span> â€” sync only runs when you press the
                                                button (or equivalent). Headlines are fetched when the server allows; they can be empty.
                                            </li>
                                        </ol>
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex flex-col gap-3 rounded-xl border border-zinc-800/90 bg-zinc-950/35 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 sm:max-w-[55%]">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                                        Alternate model probe (optional)
                                    </span>
                                    <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                                        Separate from staff sync: calls a different API with your venture name and coordination brief
                                        (or team directives) as a short blurb â€” useful to compare tone, not to update the venture record.
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

                            <div className="flex flex-col gap-3 rounded-xl border border-zinc-800/90 bg-zinc-950/35 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                                <button
                                    type="button"
                                    onClick={() => runAgentStaffSync()}
                                    disabled={agentSyncRunning}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-600 bg-zinc-100 px-5 py-2.5 text-[12px] font-semibold text-zinc-900 transition hover:bg-white disabled:opacity-50"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 ${agentSyncRunning ? 'animate-spin' : ''}`}
                                        strokeWidth={2}
                                        aria-hidden
                                    />
                                    {agentSyncRunning ? 'Running staff syncâ€¦' : 'Run staff sync now'}
                                </button>
                                <p className="max-w-md text-[12px] leading-relaxed text-zinc-400 sm:text-right">
                                    Sends your venture snapshot, optional RSS headlines, and coordination brief to the staff-sync
                                    endpoint. Outputs merge into this venture and the map refreshes.
                                </p>
                            </div>
                        </div>
                    </IntelMessageSection>

                    {/* â”€â”€â”€ Dual-Agent Network Panel â”€â”€â”€ */}
                    <DualAgentWorkPanel state={dualAgentPanelState} />

                    {/* â”€â”€â”€ Section 2: Role outputs â”€â”€â”€ */}
                    {snapshot?.desks && (
                        <IntelMessageSection
                            id="desk-out"
                            outline="roles"
                            icon={<Users className="h-4 w-4 text-zinc-400" strokeWidth={1.9} aria-hidden />}
                            eyebrow="Model output"
                            title="Latest desk briefs from staff sync"
                            subtitle={`Generated ${formatSyncTime(snapshot.at)} â€” stored on this venture; open a lane to read or continue in desk chat.`}
                        >
                            {snapshot.summary?.trim() ? (
                                <InsetPanel className="mb-5 border-l-2 border-l-zinc-600 pl-4">
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
                                            className={`overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/30 transition-colors ${
                                                open ? 'bg-zinc-900/40' : 'hover:border-zinc-700'
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
                                                        {row.text || 'â€”'}
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
                            icon={<Sparkles className="h-4 w-4 text-zinc-400" strokeWidth={1.9} aria-hidden />}
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
                                        className="border-zinc-800/80 bg-zinc-950/40"
                                    />
                                ) : (
                                    <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-[12px] text-zinc-500">
                                        Run a staff sync to populate today&apos;s priorities.
                                    </div>
                                )}
                            </div>
                        </IntelMessageSection>

                        <IntelMessageSection
                            outline="trace"
                            icon={<ListOrdered className="h-4 w-4 text-zinc-400" strokeWidth={1.9} aria-hidden />}
                            eyebrow="Session"
                            title="Process trace"
                            subtitle="Steps from the last staff sync in this session."
                            headerRight={
                                <button
                                    type="button"
                                    onClick={() => setTraceOpen(!traceOpen)}
                                    className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-300 transition hover:bg-zinc-800"
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
                                                className="flex gap-3 rounded-lg border border-zinc-800/90 bg-zinc-950/50 px-3 py-2.5"
                                            >
                                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-[11px] font-bold text-zinc-400">
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
                                    <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-[12px] leading-relaxed text-zinc-500">
                                        Run <span className="font-medium text-zinc-400">staff sync</span> in this session to see the trace. It
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
                        icon={<Layers className="h-4 w-4 text-zinc-400" strokeWidth={1.9} aria-hidden />}
                        eyebrow="Reality check"
                        title="What you steer vs what runs for you"
                        subtitle="No hidden autonomy: these are the actual splits in this app today."
                    >
                        <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800/90 bg-zinc-950/30">
                            {[
                                {
                                    icon: Sliders,
                                    label: 'You steer',
                                    text: 'Coordination brief, strategy & product fields, team directives, kanban, calendar, notes, and which desk you open. All of that is included in the snapshot sent to staff sync.',
                                    tone: 'border-l-2 border-l-zinc-600',
                                },
                                {
                                    icon: Bot,
                                    label: 'Automated on demand',
                                    text: 'Staff sync (button) calls the server once and merges results into the venture. The app also refreshes desk briefs in the background when the last sync is older than three hours while this tab is visible or when you return to the window.',
                                    tone: 'border-l-2 border-l-zinc-600',
                                },
                                {
                                    icon: Users,
                                    label: 'Per-desk AI',
                                    text: 'Each roomâ€™s chat uses that surfaceâ€™s context; replies do not automatically rerun the whole staff sync. Use sync when you want all five briefs refreshed together.',
                                    tone: 'border-l-2 border-l-zinc-600',
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className={`flex gap-4 px-4 py-4 first:pt-4 last:pb-4 sm:px-5 ${item.tone}`}
                                >
                                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400">
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
                        </div>
                    </IntelMessageSection>


                    <IntelMessageSection
                        id="decisions-shape"
                        outline="decisions"
                        icon={<Shield className="h-4 w-4 text-zinc-400" strokeWidth={1.9} aria-hidden />}
                        eyebrow="Safety"
                        title="Ground rules for trusting output"
                        subtitle="Models can be wrong; thin venture data makes that more likely."
                    >
                        <InsetPanel className="border-zinc-800/80 bg-zinc-950/40">
                            <ul className="space-y-4">
                                {[
                                    {
                                        label: 'Executive overview',
                                        text: 'Charts and scores derive from what is already in the venture â€” they are not independent research.',
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
                                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500"
                                            aria-hidden
                                        />
                                        <span>
                                            <span className="font-medium text-zinc-200">{item.label}</span>
                                            <span className="text-zinc-500"> â€” {item.text}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </InsetPanel>
                    </IntelMessageSection>

                    <IntelMessageSection
                        id="reports-artifacts"
                        outline="reports"
                        icon={<FileText className="h-4 w-4 text-zinc-400" strokeWidth={1.9} aria-hidden />}
                        eyebrow="Next steps"
                        title="Continue in the office"
                        subtitle="Jump to where you edit the venture or review saved work."
                    >
                        <div className="grid gap-3 sm:grid-cols-3">
                            {[
                                {
                                    icon: LayoutDashboard,
                                    text: 'Executive overview â€” KPIs, office brief, and dashboard tiles.',
                                    ring: 'border-zinc-800/90 bg-zinc-950/40',
                                    room: 'dashboard' as const,
                                    label: 'Overview',
                                    ctaClass: 'text-zinc-400',
                                },
                                {
                                    icon: FileText,
                                    text: 'Knowledge â€” exports and artifacts tied to desks.',
                                    ring: 'border-zinc-800/90 bg-zinc-950/40',
                                    room: 'reports' as const,
                                    label: 'Knowledge',
                                    ctaClass: 'text-zinc-400',
                                },
                                {
                                    icon: MessageSquare,
                                    text: 'Personal Assistant â€” change strategy, phases, or board through chat.',
                                    ring: 'border-zinc-800/90 bg-zinc-950/40',
                                    room: 'personal_assistant' as const,
                                    label: 'Assistant',
                                    ctaClass: 'text-zinc-400',
                                },
                            ].map((item) => (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => switchRoom(item.room)}
                                    className={`flex flex-col gap-3 rounded-xl border px-4 py-4 text-left transition hover:bg-zinc-900/50 ${item.ring}`}
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-300">
                                        <item.icon className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden />
                                    </div>
                                    <p className="text-[12px] leading-relaxed text-zinc-400">{item.text}</p>
                                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${item.ctaClass}`}>
                                        Open {item.label} â†’
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
    );
}

