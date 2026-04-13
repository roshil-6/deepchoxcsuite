'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, PanelRight, Sparkles } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { parseStrategy } from '@/lib/strategyDoc';
import { computeExecutionScore } from '@/lib/ventureMetrics';
import { aggregateImpact } from '@/lib/impact/impactEngine';
import { fromExecutionScore } from '@/lib/impact/adapters/dashboardAdapter';
import { HealthWidget } from '@/components/ui/HealthWidget';
import { AlertWidget } from '@/components/ui/AlertWidget';
import { executiveSurfaceClass, executiveToolbarButtonClass } from '@/components/ui/cardStyles';
import { EmptyStateGuide } from '@/components/ui/ContextualGuide';
import { WORKSPACE_TITLES } from '@/components/ui/appNav';

type Props = {
    className?: string;
    mobileOpen?: boolean;
    onCloseMobile?: () => void;
    /** lg+ only: panel tucked to a slim strip */
    desktopCollapsed?: boolean;
    onToggleDesktopCollapse?: () => void;
};

export function ContextPanel({
    className = '',
    mobileOpen,
    onCloseMobile,
    desktopCollapsed = false,
    onToggleDesktopCollapse,
}: Props) {
    const { activeProject, activeRoom, staffAttentionPending, livingOffice } = useOffice();
    const hasActiveVenture = Boolean(activeProject?.id);

    const execution = useMemo(
        () => computeExecutionScore(activeProject?.strategy),
        [activeProject?.strategy]
    );

    const businessImpact = useMemo(() => aggregateImpact([fromExecutionScore(execution)]), [execution]);

    const priorities = useMemo(() => {
        const doc = parseStrategy(activeProject?.strategy || '');
        return (doc.priorities || []).filter((p) => !p.done).slice(0, 3);
    }, [activeProject?.strategy]);

    const alertMessages = useMemo(() => {
        const msgs: string[] = [];
        const pending = staffAttentionPending.filter((a) => !a.dismissed);
        for (const p of pending.slice(0, 3)) {
            msgs.push(`${p.title}: ${p.message}`);
        }
        if (businessImpact.requiresEscalation) {
            msgs.unshift('Decision layer suggests escalation - review finance or strategy.');
        }
        return msgs;
    }, [staffAttentionPending, businessImpact.requiresEscalation]);

    const deskLabel = WORKSPACE_TITLES[activeRoom] ?? activeRoom;

    const inner = (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            {hasActiveVenture ? (
                <>
                    <HealthWidget
                        strategic={businessImpact.strategic}
                        financial={businessImpact.financial}
                        execution={businessImpact.execution}
                    />
                    <AlertWidget
                        severity={businessImpact.severity}
                        messages={alertMessages}
                        escalation={businessImpact.requiresEscalation}
                    />
                    {livingOffice ? (
                        <div className={`${executiveSurfaceClass} p-5`}>
                            <h3 className="text-sm font-medium text-[var(--text)]">Goal advancement</h3>
                            <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text)]">
                                {livingOffice.progress.percentage}%
                            </p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                                Risk: <span className="text-[var(--text)]/90">{livingOffice.progress.risk}</span>
                                {' · '}
                                ~{livingOffice.progress.projectedDaysRemaining}d to next horizon
                            </p>
                            {livingOffice.suggestedActions[0] ? (
                                <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                                    <span className="font-medium text-[var(--text)]/90">Routed: </span>
                                    {livingOffice.suggestedActions[0].summary}
                                    {' -> '}
                                    {livingOffice.suggestedActions[0].targetDesks.join(', ')}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`${executiveSurfaceClass} p-5`}
                    >
                        <h3 className="text-sm font-medium text-[var(--text)]">Today&apos;s priorities</h3>
                        <p className="mt-1 text-xs text-[var(--muted)] opacity-80">Top open items</p>
                        <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-relaxed text-[var(--text)]/85">
                            {priorities.length === 0 ? (
                                <li className="text-[var(--muted)]">No open priorities - add under Research strategy and direction.</li>
                            ) : (
                                priorities
                                    .filter((p) => p.title?.trim())
                                    .map((p) => (p.title ? <li key={p.id}>{p.title}</li> : null))
                            )}
                        </ol>
                    </motion.div>
                </>
            ) : (
                <EmptyStateGuide
                    title="Intelligence waits on a venture"
                    description="Select or create a venture to unlock company health, routed alerts, and execution tracking in this panel."
                    action="Open overview"
                    onAction={onCloseMobile}
                    className="min-h-[13rem] justify-center"
                    icon={<Sparkles className="h-5 w-5" aria-hidden />}
                />
            )}
            <div className={`${executiveSurfaceClass} p-5`}>
                <h3 className="text-sm font-medium text-[var(--text)]">Active context</h3>
                <p className="mt-2 text-xs text-[var(--muted)]">
                    Desk: <span className="font-medium text-[var(--text)]">{deskLabel}</span>
                </p>
                {activeProject?.name ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                        Venture: <span className="text-[var(--text)]/90">{activeProject.name}</span>
                    </p>
                ) : null}
            </div>
        </div>
    );

    return (
        <>
            <AnimatePresence>
                {mobileOpen ? (
                    <motion.button
                        type="button"
                        aria-label="Close panel"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                        onClick={onCloseMobile}
                    />
                ) : null}
            </AnimatePresence>
            <aside
                className={`
                  ${className}
                  fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] flex-col border-l border-[var(--border)] bg-[var(--bg)] transition-[width,transform] duration-300 ease-out
                  lg:static lg:z-0 lg:translate-x-0
                  ${mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                  ${desktopCollapsed ? 'lg:w-11 lg:min-w-[2.75rem]' : 'lg:w-80 lg:max-w-[20rem]'}
                `}
            >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 lg:hidden">
                    <span className="text-sm font-medium text-[var(--text)]">Intelligence</span>
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="rounded-lg px-2 py-1 text-xs text-[var(--muted)] hover:bg-white/[0.06]"
                    >
                        Close
                    </button>
                </div>

                {onToggleDesktopCollapse ? (
                    <div className="hidden shrink-0 border-b border-[var(--border)] lg:block">
                        <button
                            type="button"
                            onClick={onToggleDesktopCollapse}
                            aria-expanded={!desktopCollapsed}
                            aria-label={desktopCollapsed ? 'Show alerts and context' : 'Hide alerts and context'}
                            className="flex h-10 w-full items-center justify-center text-[var(--muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text)]"
                        >
                            {desktopCollapsed ? (
                                <PanelRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                            ) : (
                                <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                            )}
                        </button>
                    </div>
                ) : null}

                {!desktopCollapsed ? (
                    <div className="hidden shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 lg:flex">
                        <div>
                            <p className="executive-kicker">Intelligence</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">Live venture health and routed desk context</p>
                        </div>
                        <button type="button" className={executiveToolbarButtonClass} onClick={onToggleDesktopCollapse}>
                            <PanelRight className="h-3.5 w-3.5" aria-hidden />
                            Collapse
                        </button>
                    </div>
                ) : null}

                <div
                    className={`min-h-0 flex-1 overflow-hidden ${desktopCollapsed ? 'lg:hidden' : ''}`}
                >
                    {inner}
                </div>
            </aside>
        </>
    );
}
