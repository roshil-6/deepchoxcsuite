'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, LogOut, Sparkles, PanelRight, LogIn, UserPlus, Home } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useOffice } from '@/lib/OfficeContext';
import { getAllProjects } from '@/lib/db';
import { StaffNotificationCenter } from '@/components/StaffNotificationCenter';
import { APP_NAV_ITEMS, WORKSPACE_TITLES, type AppNavRoom } from '@/components/ui/appNav';
import { DailySyncBanner } from '@/components/DailySyncBanner';
import { useSubscription } from '@/hooks/useSubscription';
import { TokenDisplay } from '@/components/tokens/TokenDisplay';
import { SectionGuideRailButton } from '@/components/SectionGuideCoach';
import { DeskSyncSidebarControls } from '@/components/ui/DeskSyncSidebarControls';

const AI_STATUS_MESSAGES = [
    'Monitoring venture health...',
    'Analyzing market signals...',
    'Reviewing strategy data...',
    'Processing team insights...',
    'Scanning opportunities...',
    'Evaluating priorities...',
    'Optimizing workflows...',
    'Tracking milestones...',
];

function AmbientStatus() {
    const [msgIndex, setMsgIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setMsgIndex((i) => (i + 1) % AI_STATUS_MESSAGES.length);
                setVisible(true);
            }, 280);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[rgba(116,86,255,0.12)] bg-[rgba(116,86,255,0.05)] px-2.5 py-2">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/40 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span
                className="min-w-0 flex-1 font-sans text-[10px] leading-snug text-zinc-500 transition-opacity duration-300"
                style={{ opacity: visible ? 1 : 0 }}
            >
                {AI_STATUS_MESSAGES[msgIndex]}
            </span>
        </div>
    );
}

type Props = {
    onLogout: () => void;
    onNewVenture: () => void;
    onUpgrade?: () => void;
    onNavigate?: () => void;
    variant?: 'floating' | 'flush';
    desktopWorkspaceStrip?: boolean;
    onToggleIntel?: () => void;
    intelDesktopCollapsed?: boolean;
};

export function LeftRail({
    onLogout,
    onNewVenture,
    onUpgrade,
    onNavigate,
    variant = 'flush',
    desktopWorkspaceStrip = false,
    onToggleIntel,
    intelDesktopCollapsed = false,
}: Props) {
    const { activeRoom, switchRoom, activeProject, setActiveProject, setAllProjects, allProjects } = useOffice();
    const { isPro } = useSubscription();
    const { isSignedIn, isLoaded } = useAuth();
    const isFlush = variant === 'flush';

    useEffect(() => {
        void (async () => {
            const all = await getAllProjects();
            setAllProjects(all);
        })();
    }, [setAllProjects]);

    const go = (room: AppNavRoom) => {
        if (room === 'dashboard') {
            setActiveProject(null);
        }
        switchRoom(room as Parameters<typeof switchRoom>[0]);
        onNavigate?.();
    };

    return (
        <div
            role="navigation"
            aria-label="NorthROSC Labs DeepChox workspace navigation"
            className="relative z-30 flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-r border-[rgba(116,86,255,0.12)] bg-[#030304] lg:w-[272px]"
        >
            {/* Dot grid overlay */}
            <div
                className="pointer-events-none absolute inset-0 z-0 opacity-[0.22]"
                style={{
                    backgroundImage: 'radial-gradient(circle at center, #3f3f46 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
                aria-hidden
            />
            {/* Violet top gradient */}
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{ background: 'radial-gradient(ellipse 120% 40% at 50% 0%, rgba(116,86,255,0.08) 0%, transparent 60%)' }}
                aria-hidden
            />
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[rgba(116,86,255,0.4)] to-transparent" aria-hidden />

            <div className="custom-scrollbar relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
                {/* Brand */}
                <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-4">
                    <div className="min-w-0">
                        <p className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-[#7456ff]">NorthROSC Labs</p>
                        <p className="mt-0.5 truncate font-sans text-[15px] font-bold tracking-tight text-white">DeepChox AI</p>
                        <p className="mt-0.5 truncate font-sans text-[11px] text-zinc-500">Co-founder</p>
                    </div>
                    <StaffNotificationCenter />
                </div>

                {desktopWorkspaceStrip && isFlush && activeProject && (
                    <div className="mx-3 mb-3 shrink-0 rounded-2xl border border-[rgba(116,86,255,0.15)] bg-[rgba(116,86,255,0.06)] px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                                    Venture
                                </span>
                                <h2 className="mt-0.5 truncate font-sans text-[13px] font-medium leading-snug text-white">
                                    {activeProject.name}
                                </h2>
                                <p className="mt-0.5 truncate font-sans text-[11px] text-zinc-500">
                                    {WORKSPACE_TITLES[activeRoom] ?? activeRoom}
                                </p>
                            </div>
                            {onToggleIntel && (
                                <button
                                    type="button"
                                    className="shrink-0 rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-[rgba(116,86,255,0.1)] hover:text-zinc-300"
                                    onClick={onToggleIntel}
                                    aria-expanded={!intelDesktopCollapsed}
                                    aria-label={intelDesktopCollapsed ? 'Show intelligence panel' : 'Hide intelligence panel'}
                                >
                                    <PanelRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                                </button>
                            )}
                        </div>
                        <div className="mt-2">
                            <DailySyncBanner variant="rail" />
                        </div>
                    </div>
                )}

                <div className="shrink-0 px-3 pb-2">
                    <button
                        type="button"
                        onClick={() => {
                            onNewVenture();
                            onNavigate?.();
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(116,86,255,0.22)] bg-[rgba(116,86,255,0.08)] py-2.5 font-sans text-[13px] font-medium text-[#c4b5fd] transition hover:border-[rgba(116,86,255,0.35)] hover:bg-[rgba(116,86,255,0.14)]"
                    >
                        <Plus className="h-4 w-4 text-[#9d88ff]" strokeWidth={1.75} aria-hidden />
                        New venture
                    </button>
                </div>

                <DeskSyncSidebarControls room={activeRoom} />

                <nav className="flex shrink-0 flex-col gap-0.5 px-2 pt-2">
                    {APP_NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = activeRoom === item.room;
                        const isDexo = item.room === 'dexo';
                        return (
                            <button
                                key={item.room}
                                type="button"
                                onClick={() => go(item.room)}
                                title={item.label}
                                className={`group relative flex w-full items-center gap-3 rounded-xl py-2.5 pl-3 pr-2 text-left transition-colors ${
                                    active
                                        ? 'bg-[rgba(116,86,255,0.12)] text-white'
                                        : 'text-zinc-500 hover:bg-[rgba(255,255,255,0.04)] hover:text-zinc-200'
                                }`}
                            >
                                {active && (
                                    <span
                                        className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[#7456ff] shadow-[0_0_8px_rgba(116,86,255,0.6)]"
                                        aria-hidden
                                    />
                                )}
                                <Icon
                                    className={`h-4 w-4 shrink-0 ${active ? 'text-[#9d88ff]' : 'text-zinc-600 group-hover:text-zinc-400'}`}
                                    strokeWidth={1.75}
                                    aria-hidden
                                />
                                <span className="min-w-0 flex-1">
                                    {isDexo ? (
                                        <span className="flex flex-col gap-0.5">
                                            <span className="truncate font-sans text-[13px] font-medium leading-tight">{item.label}</span>
                                            <span className="font-sans text-[10px] leading-tight text-zinc-600">AI co-founder</span>
                                        </span>
                                    ) : (
                                        <span className="truncate font-sans text-[13px] font-medium leading-tight">{item.label}</span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Gradient divider */}
                <div className="mx-3 my-4 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.07)] to-transparent" />

                {/* Ventures */}
                <div className="px-2 pb-3">
                    <div className="mb-2 flex items-center justify-between px-2">
                        <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Ventures</span>
                        {allProjects.length > 0 && (
                            <span className="font-sans text-[10px] tabular-nums text-zinc-700">{allProjects.length}</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-px">
                        {allProjects.map((p) => {
                            const isActive = activeProject?.id === p.id;
                            return (
                                <button
                                    key={p.id ?? `${p.name}-${p.timestamp}`}
                                    type="button"
                                    onClick={() => {
                                        setActiveProject(p);
                                        switchRoom('dexo');
                                        onNavigate?.();
                                    }}
                                    className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                                        isActive
                                            ? 'bg-[rgba(116,86,255,0.12)] text-white ring-1 ring-[rgba(116,86,255,0.2)]'
                                            : 'text-zinc-500 hover:bg-[rgba(255,255,255,0.04)] hover:text-zinc-200'
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                            isActive ? 'bg-[#7456ff] shadow-[0_0_6px_rgba(116,86,255,0.6)]' : 'bg-zinc-700 group-hover:bg-zinc-500'
                                        }`}
                                    />
                                    <span className="min-w-0 flex-1 truncate font-sans text-[13px]">{p.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-2 shrink-0 border-t border-[rgba(255,255,255,0.06)] px-3 pb-4 pt-3">
                    <SectionGuideRailButton />
                    <AmbientStatus />
                    <div className="mb-2 flex justify-center">
                        <TokenDisplay compact showCosts={false} onRequestUpgrade={onUpgrade ? () => onUpgrade() : undefined} />
                    </div>
                    {!isPro && (
                        <button
                            type="button"
                            onClick={() => onUpgrade?.()}
                            className="mb-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[rgba(116,86,255,0.25)] bg-[rgba(116,86,255,0.1)] font-sans text-[12px] font-medium text-[#9d88ff] transition hover:border-[rgba(116,86,255,0.4)] hover:bg-[rgba(116,86,255,0.16)]"
                        >
                            <Sparkles className="h-3.5 w-3.5" aria-hidden />
                            Upgrade to Pro
                        </button>
                    )}
                    {!isLoaded ? (
                        <div className="h-9" aria-hidden />
                    ) : !isSignedIn ? (
                        <div className="flex flex-col gap-2">
                            <Link
                                href="/sign-in"
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[rgba(116,86,255,0.25)] bg-[rgba(116,86,255,0.1)] font-sans text-[12px] font-medium text-[#9d88ff] transition hover:bg-[rgba(116,86,255,0.16)]"
                            >
                                <LogIn className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                                Sign in
                            </Link>
                            <Link
                                href="/sign-up"
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] font-sans text-[12px] font-medium text-zinc-400 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-zinc-200"
                            >
                                <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                                Create account
                            </Link>
                            <button
                                type="button"
                                onClick={onLogout}
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl font-sans text-[12px] text-zinc-600 transition hover:bg-[rgba(255,255,255,0.04)] hover:text-zinc-300"
                            >
                                <Home className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                                Back to welcome
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={onLogout}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl font-sans text-[12px] text-zinc-600 transition hover:bg-[rgba(255,255,255,0.04)] hover:text-zinc-300"
                        >
                            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                            Sign out
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
