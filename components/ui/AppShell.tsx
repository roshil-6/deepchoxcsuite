'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRight, Menu, X } from 'lucide-react';
import { DailySyncBanner } from '@/components/DailySyncBanner';
import { LeftRail } from '@/components/ui/LeftRail';
import { WorkspacePanel } from '@/components/ui/WorkspacePanel';
import { ContextPanel } from '@/components/ui/ContextPanel';
import { useOffice } from '@/lib/OfficeContext';
import { WORKSPACE_TITLES } from '@/components/ui/appNav';
import { UpgradeModal } from '@/components/UpgradeModal';

const INTEL_DESKTOP_COLLAPSED_KEY = 'deepchox-intel-panel-collapsed';

function readIntelDesktopCollapsed(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return localStorage.getItem(INTEL_DESKTOP_COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

type Props = {
    children: React.ReactNode;
    bottomBar?: React.ReactNode;
    onLogout: () => void;
    onNewVenture: () => void;
};

export function AppShell({ children, bottomBar, onLogout, onNewVenture }: Props) {
    const { activeProject, activeRoom } = useOffice();
    const [mobileContext, setMobileContext] = useState(false);
    const [mobileNav, setMobileNav] = useState(false);
    const [intelDesktopCollapsed, setIntelDesktopCollapsed] = useState(false);
    const [upgradeOpen, setUpgradeOpen] = useState(false);

    useEffect(() => {
        setIntelDesktopCollapsed(readIntelDesktopCollapsed());
    }, []);

    const toggleIntelDesktop = useCallback(() => {
        setIntelDesktopCollapsed((c) => {
            const next = !c;
            try {
                localStorage.setItem(INTEL_DESKTOP_COLLAPSED_KEY, next ? '1' : '0');
            } catch {
                /* noop */
            }
            return next;
        });
    }, []);

    const title = WORKSPACE_TITLES[activeRoom] ?? activeRoom;

    return (
        <div className="flex h-full min-h-0 w-full flex-col bg-[var(--bg)] pb-14 text-[var(--text)] lg:pb-0">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3 sm:px-5 lg:hidden">
                <div className="flex min-w-0 items-center gap-2">
                    <button
                        type="button"
                        className="rounded-xl p-2 text-[var(--muted)] transition-colors hover:bg-white/[0.06] lg:hidden"
                        onClick={() => setMobileNav(true)}
                        aria-label="Open navigation"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base font-semibold tracking-tight text-[var(--text)] sm:text-[17px]">{title}</h1>
                        <p className="truncate text-[11px] text-[var(--muted)] opacity-90">
                            {activeProject?.name ?? 'Select or create a venture'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="hidden rounded-lg border border-[var(--border)] bg-white/[0.03] p-2 text-[var(--muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text)] lg:inline-flex"
                        onClick={toggleIntelDesktop}
                        aria-expanded={!intelDesktopCollapsed}
                        aria-label={intelDesktopCollapsed ? 'Show intelligence panel' : 'Hide intelligence panel'}
                        title={intelDesktopCollapsed ? 'Show alerts panel' : 'Hide alerts panel'}
                    >
                        <PanelRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    </button>
                    <button
                        type="button"
                        className="rounded-full bg-white/[0.05] px-3 py-2 text-[11px] font-medium text-[var(--text)] transition-colors hover:bg-white/[0.08] lg:hidden"
                        onClick={() => setMobileContext(true)}
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <PanelRight className="h-4 w-4 opacity-70" aria-hidden />
                            Intel
                        </span>
                    </button>
                </div>
            </header>

            <div className="lg:hidden">
                <DailySyncBanner />
            </div>

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <div className="hidden h-full min-h-0 shrink-0 items-stretch lg:flex">
                    <LeftRail
                        onLogout={onLogout}
                        onNewVenture={onNewVenture}
                        onUpgrade={() => setUpgradeOpen(true)}
                        desktopWorkspaceStrip
                        onToggleIntel={toggleIntelDesktop}
                        intelDesktopCollapsed={intelDesktopCollapsed}
                    />
                </div>

                <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden lg:gap-5 lg:px-6 lg:pb-4 lg:pt-3">
                <AnimatePresence>
                    {mobileNav && (
                        <>
                            <motion.button
                                type="button"
                                aria-label="Close navigation"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm lg:hidden"
                                onClick={() => setMobileNav(false)}
                            />
                            <motion.aside
                                initial={{ x: -320 }}
                                animate={{ x: 0 }}
                                exit={{ x: -320 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                                className="fixed inset-y-3 left-3 z-[70] flex h-[calc(100%-1.5rem)] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[var(--bg)]/95 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden"
                            >
                                <div className="flex shrink-0 items-center justify-end border-b border-white/[0.06] p-2">
                                    <button
                                        type="button"
                                        onClick={() => setMobileNav(false)}
                                        className="rounded-xl p-2 text-[var(--muted)] hover:bg-white/[0.06]"
                                        aria-label="Close"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="min-h-0 flex-1 overflow-hidden">
                                    <LeftRail
                                        variant="flush"
                                        onLogout={onLogout}
                                        onNewVenture={onNewVenture}
                                        onUpgrade={() => { setMobileNav(false); setUpgradeOpen(true); }}
                                    />
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                <WorkspacePanel reserveBottom={Boolean(bottomBar)}>
                    <motion.div
                        key={activeRoom}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex min-h-full flex-col"
                    >
                        {children}
                    </motion.div>
                </WorkspacePanel>

                <ContextPanel
                    mobileOpen={mobileContext}
                    onCloseMobile={() => setMobileContext(false)}
                    desktopCollapsed={intelDesktopCollapsed}
                    onToggleDesktopCollapse={toggleIntelDesktop}
                />
                </div>
            </div>

            {bottomBar}

            <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 lg:hidden">
                <button
                    type="button"
                    onClick={() => setMobileNav(true)}
                    className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium text-[var(--muted)]"
                >
                    <Menu className="h-5 w-5" />
                    Desks
                </button>
                <button
                    type="button"
                    onClick={() => setMobileContext(true)}
                    className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium text-[var(--muted)]"
                >
                    <PanelRight className="h-5 w-5" />
                    Intel
                </button>
            </nav>
            <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
        </div>
    );
}
