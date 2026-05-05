'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, LogOut, LogIn, UserPlus, Sparkles } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useOffice } from '@/lib/OfficeContext';
import { getAllProjects } from '@/lib/db';
import { StaffNotificationCenter } from '@/components/StaffNotificationCenter';
import { APP_NAV_GROUPS, WORKSPACE_TITLES, type AppNavRoom } from '@/components/ui/appNav';
import { DailySyncBanner } from '@/components/DailySyncBanner';
import { TokenDisplay } from '@/components/tokens/TokenDisplay';
import { SectionGuideRailButton } from '@/components/SectionGuideCoach';
import { DeskSyncSidebarControls } from '@/components/ui/DeskSyncSidebarControls';

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
    onToggleIntel,
}: Props) {
    const { activeRoom, switchRoom, activeProject, setActiveProject, setAllProjects, allProjects } = useOffice();
    const { isSignedIn, isLoaded } = useAuth();

    React.useEffect(() => {
        void (async () => {
            const all = await getAllProjects();
            setAllProjects(all);
        })();
    }, [setAllProjects]);

    const go = (room: AppNavRoom) => {
        if (room === 'dashboard') setActiveProject(null);
        switchRoom(room as Parameters<typeof switchRoom>[0]);
        onNavigate?.();
    };

    return (
        <div
            role="navigation"
            aria-label="DeepChox workspace navigation"
            className="relative z-30 flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden lg:w-[252px]"
            style={{
                background: '#111117',
                borderRight: '1px solid rgba(255,255,255,0.07)',
            }}
        >
            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">

                {/* ── Brand ── */}
                <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        {/* Logo mark */}
                        <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                            style={{
                                background: 'rgba(139,92,246,0.14)',
                                border: '1px solid rgba(139,92,246,0.28)',
                                boxShadow: '0 0 12px rgba(139,92,246,0.15)',
                            }}
                        >
                            <Sparkles className="h-3.5 w-3.5 text-violet-400" strokeWidth={1.75} />
                        </div>
                        <span className="font-sans text-[13.5px] font-bold tracking-tight text-white/88">DeepChox</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {onToggleIntel && (
                            <button
                                type="button"
                                onClick={onToggleIntel}
                                className="rounded-lg p-1.5 text-white/25 transition-colors hover:bg-white/[0.05] hover:text-white/55"
                                aria-label="Toggle intelligence panel"
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="1" y="1" width="14" height="14" rx="2" />
                                    <line x1="10" y1="1" x2="10" y2="15" />
                                </svg>
                            </button>
                        )}
                        <StaffNotificationCenter />
                    </div>
                </div>

                {/* ── Ventures ── */}
                <div className="shrink-0 px-3 pb-1">
                    <div className="mb-1.5 flex items-center justify-between px-1.5">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/28">
                            Ventures{allProjects.length > 0 && <span className="ml-1.5 opacity-60">{allProjects.length}</span>}
                        </span>
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
                                    className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left transition-all duration-150"
                                    style={isActive ? {
                                        background: 'rgba(139,92,246,0.09)',
                                        boxShadow: 'inset 2px 0 0 rgba(139,92,246,0.55)',
                                        color: 'rgba(255,255,255,0.88)',
                                    } : {}}
                                >
                                    <span
                                        className="h-[5px] w-[5px] shrink-0 rounded-full transition-all duration-150"
                                        style={{
                                            background: isActive ? 'rgba(167,139,250,1)' : 'rgba(255,255,255,0.14)',
                                            boxShadow: isActive ? '0 0 6px rgba(167,139,250,0.6)' : 'none',
                                        }}
                                    />
                                    <span
                                        className="min-w-0 flex-1 truncate text-[12.5px] font-medium transition-colors duration-150"
                                        style={{ color: isActive ? undefined : 'rgba(255,255,255,0.38)' }}
                                    >
                                        {p.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => { onNewVenture(); onNavigate?.(); }}
                        className="mt-1.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-[7px] text-[12px] font-medium transition-all duration-150 hover:bg-white/[0.04]"
                        style={{
                            border: '1px dashed rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.28)',
                        }}
                    >
                        <Plus className="h-3 w-3 shrink-0" strokeWidth={2} />
                        New venture
                    </button>
                </div>

                {/* Desk sync controls */}
                <DeskSyncSidebarControls room={activeRoom} />

                {/* Daily sync banner */}
                {activeProject && (
                    <div className="px-3 pb-1">
                        <DailySyncBanner variant="rail" />
                    </div>
                )}

                {/* ── Divider ── */}
                <div className="mx-3 my-3 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                {/* ── Navigation (grouped) ── */}
                <nav className="flex shrink-0 flex-col gap-5 px-2 pb-3">
                    {APP_NAV_GROUPS.map((group) => (
                        <div key={group.id}>
                            {group.label && (
                                <p className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/22">
                                    {group.label}
                                </p>
                            )}
                            <div className="flex flex-col gap-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const active = activeRoom === item.room;
                                    const isDexo = item.room === 'dexo';

                                    if (isDexo) {
                                        return (
                                            <button
                                                key={item.room}
                                                type="button"
                                                onClick={() => go(item.room)}
                                                className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-150"
                                                style={active ? {
                                                    background: '#1c1b24',
                                                    color: '#f2f2f5',
                                                } : {
                                                    color: '#8c8c9e',
                                                }}
                                                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = '#161520'; e.currentTarget.style.color = '#c8c8d8'; } }}
                                                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8c8c9e'; } }}
                                            >
                                                <Icon
                                                    className="h-3.5 w-3.5 shrink-0"
                                                    style={{ color: active ? '#a78bfa' : undefined }}
                                                    strokeWidth={1.75}
                                                />
                                                <span className="flex min-w-0 flex-1 flex-col gap-0">
                                                    <span className="truncate text-[12.5px] font-medium leading-tight">
                                                        {item.label}
                                                    </span>
                                                    <span className="text-[9px] uppercase tracking-[0.14em] leading-tight opacity-50">
                                                        AI co-founder
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    }

                                    return (
                                        <button
                                            key={item.room}
                                            type="button"
                                            onClick={() => go(item.room)}
                                            title={WORKSPACE_TITLES[item.room] ?? item.label}
                                            className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-150"
                                            style={active ? {
                                                background: '#1c1b24',
                                                color: '#f2f2f5',
                                            } : {
                                                color: '#8c8c9e',
                                            }}
                                            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = '#161520'; e.currentTarget.style.color = '#c8c8d8'; } }}
                                            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8c8c9e'; } }}
                                        >
                                            <Icon
                                                className="h-3.5 w-3.5 shrink-0"
                                                style={{ color: active ? '#a78bfa' : undefined }}
                                                strokeWidth={1.75}
                                            />
                                            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium leading-tight">
                                                {item.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* ── Footer ── */}
                <div
                    className="mt-auto shrink-0 space-y-2 px-3 pb-4 pt-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <SectionGuideRailButton />
                    <div className="flex justify-center">
                        <TokenDisplay compact showCosts={false} onRequestUpgrade={onUpgrade} />
                    </div>

                    {!isLoaded ? (
                        <div className="h-9" aria-hidden />
                    ) : !isSignedIn ? (
                        <div className="flex flex-col gap-1.5">
                            <Link
                                href="/sign-in"
                                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-semibold text-white/75 transition-all hover:text-white/95"
                                style={{
                                    background: 'rgba(139,92,246,0.12)',
                                    border: '1px solid rgba(139,92,246,0.28)',
                                }}
                            >
                                <LogIn className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                                Sign in
                            </Link>
                            <Link
                                href="/sign-up"
                                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-medium text-white/40 transition-all hover:text-white/70"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                                Create account
                            </Link>
                            <button
                                type="button"
                                onClick={onLogout}
                                className="flex h-8 w-full items-center justify-center gap-2 rounded-xl text-[11.5px] text-white/24 transition-all hover:text-white/50"
                            >
                                Back to welcome
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={onLogout}
                            className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[12px] text-white/28 transition-all hover:bg-white/[0.04] hover:text-white/55"
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
