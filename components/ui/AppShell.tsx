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
import { SectionGuideMobileHeaderButton } from '@/components/SectionGuideCoach';

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
        <div
            className="flex h-full min-h-0 w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
        >
            {/* Mobile Header */}
            <header 
                className="mx-3 mt-3 flex shrink-0 items-center justify-between gap-3 rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-card)]/92 px-4 py-3 shadow-[var(--shadow-soft)] sm:mx-4 sm:px-5 lg:hidden"
                style={{ 
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                }}
            >
                <div className="flex min-w-0 items-center gap-2">
                    <button
                        type="button"
                        className="rounded-xl p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] lg:hidden"
                        onClick={() => setMobileNav(true)}
                        aria-label="Open navigation"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-[17px]">
                            {title}
                        </h1>
                        <p className="truncate text-[11px] text-[var(--text-secondary)]">
                            {activeProject?.name ?? 'Select or create a venture'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <SectionGuideMobileHeaderButton />
                    <button
                        type="button"
                        className="hidden rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] lg:inline-flex"
                        onClick={toggleIntelDesktop}
                        aria-expanded={!intelDesktopCollapsed}
                        aria-label={intelDesktopCollapsed ? 'Show intelligence panel' : 'Hide intelligence panel'}
                    >
                        <PanelRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    </button>
                    <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-colors hover:bg-[rgba(255,255,255,0.08)] lg:hidden"
                        onClick={() => setMobileContext(true)}
                    >
                        <PanelRight className="h-4 w-4 opacity-70" aria-hidden />
                        Intel
                    </button>
                </div>
            </header>

            <div className="lg:hidden px-3 py-2">
                <DailySyncBanner />
            </div>

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
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

                {/* Main Content Area */}
                <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden lg:gap-5 lg:px-5 lg:pb-5 lg:pt-4">
                    {/* Mobile Navigation Overlay */}
                    <AnimatePresence>
                        {mobileNav && (
                            <>
                                <motion.button
                                    type="button"
                                    aria-label="Close navigation"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm lg:hidden"
                                    onClick={() => setMobileNav(false)}
                                />
                            <motion.aside
                                initial={{ x: -320 }}
                                animate={{ x: 0 }}
                                exit={{ x: -320 }}
                                transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                                className="fixed inset-y-3 left-3 z-[70] flex h-[calc(100%-1.5rem)] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.5rem] border border-[var(--border)] lg:hidden"
                                style={{ 
                                    background: 'rgba(30,30,30,0.96)',
                                    boxShadow: 'var(--shadow-panel)',
                                    backdropFilter: 'blur(24px)',
                                    WebkitBackdropFilter: 'blur(24px)',
                                }}
                            >
                                    <div className="flex shrink-0 items-center justify-end p-3">
                                        <button
                                            type="button"
                                            onClick={() => setMobileNav(false)}
                                            className="rounded-xl p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
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
                                            onNavigate={() => setMobileNav(false)}
                                            onUpgrade={() => { setMobileNav(false); setUpgradeOpen(true); }}
                                        />
                                    </div>
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Main Workspace */}
                    <WorkspacePanel
                        reserveBottom={Boolean(bottomBar)}
                        fillViewport={activeRoom === 'dexo' || activeRoom === 'personal_assistant'}
                        roomKey={activeRoom}
                    >
                        <motion.div
                            key={activeRoom}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className={
                                activeRoom === 'dexo' || activeRoom === 'personal_assistant'
                                    ? 'flex min-h-0 min-w-0 flex-1 flex-col'
                                    : 'flex min-h-full flex-col'
                            }
                        >
                            {children}
                        </motion.div>
                    </WorkspacePanel>

                    {/* Context Panel (Intel) */}
                    <ContextPanel
                        mobileOpen={mobileContext}
                        onCloseMobile={() => setMobileContext(false)}
                        desktopCollapsed={intelDesktopCollapsed}
                        onToggleDesktopCollapse={toggleIntelDesktop}
                    />
                </div>
            </div>

            {bottomBar}

            {/* Mobile Bottom Navigation */}
            <nav
                className="fixed z-40 flex rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-card)]/94 px-2 py-2 shadow-[var(--shadow-soft)] lg:hidden"
                style={{
                    bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
                    left: 'max(0.75rem, env(safe-area-inset-left))',
                    right: 'max(0.75rem, env(safe-area-inset-right))',
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                }}
            >
                <button
                    type="button"
                    onClick={() => setMobileNav(true)}
                    className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                >
                    <Menu className="h-5 w-5" />
                    Desks
                </button>
                <button
                    type="button"
                    onClick={() => setMobileContext(true)}
                    className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                >
                    <PanelRight className="h-5 w-5" />
                    Intel
                </button>
            </nav>
            
            <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
        </div>
    );
}
