'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, LogOut } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { getAllProjects, type Project } from '@/lib/db';
import { StaffNotificationCenter } from '@/components/StaffNotificationCenter';
import { APP_NAV_ITEMS, type AppNavRoom } from '@/components/ui/appNav';
import { RelayNavHint } from '@/components/pa/RelayNavHint';
import { PA_SECTION_TAG } from '@/lib/paBuddy';

type Props = {
    onLogout: () => void;
    onNewVenture: () => void;
    /** Use inside a parent panel that already provides rounded border/shadow (e.g. mobile drawer). */
    variant?: 'floating' | 'flush';
};

export function LeftRail({ onLogout, onNewVenture, variant = 'floating' }: Props) {
    const { activeRoom, switchRoom, activeProject, setActiveProject, setAllProjects } = useOffice();
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        void (async () => {
            const all = await getAllProjects();
            setProjects(all);
            setAllProjects(all);
        })();
    }, [setAllProjects]);

    const go = (room: AppNavRoom) => {
        switchRoom(room as Parameters<typeof switchRoom>[0]);
    };

    const surface =
        variant === 'flush'
            ? 'relative z-30 flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden lg:w-52'
            : 'relative z-30 flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[var(--bg)]/95 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:w-52';

    return (
        <div role="navigation" aria-label="Research workspace navigation" className={surface}>
            <div className="flex min-h-12 shrink-0 items-center justify-between gap-1 border-b border-white/[0.06] px-2.5 py-2">
                <div className="min-w-0 overflow-hidden">
                    <p className="truncate text-xs font-semibold tracking-tight text-[var(--text)]">DeepChox</p>
                    <p className="truncate text-[10px] leading-tight text-[var(--muted)]">Research workspace</p>
                </div>
                <StaffNotificationCenter />
            </div>

            <nav className="custom-scrollbar flex flex-1 flex-col gap-px overflow-y-auto px-1.5 py-2">
                {APP_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activeRoom === item.room;
                    return (
                        <motion.button
                            key={item.room}
                            type="button"
                            layout
                            onClick={() => go(item.room)}
                            title={item.room === 'personal_assistant' ? PA_SECTION_TAG : item.label}
                            whileTap={{ scale: 0.98 }}
                            className={`relative flex w-full items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 text-left transition-colors ${
                                active
                                    ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                                    : 'text-[var(--muted)] hover:bg-white/[0.04] hover:text-[var(--text)]'
                            }`}
                        >
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[var(--text)] ${
                                    active ? 'border-white/[0.16] bg-white/[0.06]' : 'text-zinc-300'
                                }`}
                            >
                                <Icon className="h-[18px] w-[18px]" strokeWidth={1.85} aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                                {item.room === 'personal_assistant' ? (
                                    <span className="flex flex-col items-start gap-0">
                                        <span className="truncate text-[11px] font-medium leading-snug">{item.label}</span>
                                        <RelayNavHint className="!text-[9px] !leading-snug !text-[var(--muted)]" />
                                    </span>
                                ) : (
                                    <span className="truncate text-[11px] font-medium leading-snug">{item.label}</span>
                                )}
                            </span>
                        </motion.button>
                    );
                })}
            </nav>

            <div className="border-t border-white/[0.06] px-1.5 py-2">
                <button
                    type="button"
                    onClick={onNewVenture}
                    className="flex w-full items-center gap-2 rounded-xl py-1.5 pl-1.5 text-[11px] font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text)]"
                >
                    <Plus className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.85} aria-hidden />
                    <span className="truncate">New venture</span>
                </button>
                <div className="max-h-28 space-y-px overflow-y-auto">
                    {projects.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                                setActiveProject(p);
                                switchRoom('dashboard');
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-left text-[10px] transition-colors ${
                                activeProject?.id === p.id
                                    ? 'border-white/[0.1] bg-white/[0.05] text-[var(--text)]'
                                    : 'text-[var(--muted)] hover:bg-white/[0.04]'
                            }`}
                        >
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
                            <span className="truncate">{p.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-auto border-t border-white/[0.06] p-1.5">
                <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 rounded-xl py-2 pl-1.5 text-[11px] text-[var(--muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text)]"
                >
                    <LogOut className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.85} aria-hidden />
                    <span className="truncate">Sign out</span>
                </button>
            </div>
        </div>
    );
}
