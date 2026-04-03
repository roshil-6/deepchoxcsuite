'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, LogOut } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { getAllProjects, type Project } from '@/lib/db';
import { StaffNotificationCenter } from '@/components/StaffNotificationCenter';
import { APP_NAV_ITEMS, type AppNavRoom } from '@/components/ui/appNav';

type Props = {
    onLogout: () => void;
    onNewVenture: () => void;
};

export function LeftRail({ onLogout, onNewVenture }: Props) {
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

    return (
        <div
            role="navigation"
            aria-label="Executive desks"
            className="group/rail relative z-30 flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg)] transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:w-[5rem] lg:hover:w-64"
        >
            <div className="flex min-h-14 shrink-0 items-center justify-between gap-1 border-b border-[var(--border)] px-3 py-2.5">
                <div className="min-w-0 overflow-hidden opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">
                    <p className="truncate text-sm font-semibold tracking-tight text-[var(--text)]">DeepChox</p>
                    <p className="truncate text-[10px] text-[var(--muted)]">Executive OS</p>
                </div>
                <StaffNotificationCenter />
            </div>

            <nav className="custom-scrollbar flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
                {APP_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activeRoom === item.room;
                    return (
                        <motion.button
                            key={item.room}
                            type="button"
                            layout
                            onClick={() => go(item.room)}
                            title={item.label}
                            whileTap={{ scale: 0.98 }}
                            className={`relative flex w-full items-center gap-3 rounded-2xl py-2.5 pl-2 pr-2 text-left transition-colors ${
                                active
                                    ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                                    : 'text-[var(--muted)] hover:bg-white/[0.04] hover:text-[var(--text)]'
                            }`}
                        >
                            <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] ${
                                    active ? 'border-white/[0.14] text-[var(--text)]' : ''
                                }`}
                            >
                                <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">
                                {item.label}
                            </span>
                        </motion.button>
                    );
                })}
            </nav>

            <div className="border-t border-[var(--border)] px-2 py-2">
                <button
                    type="button"
                    onClick={onNewVenture}
                    className="flex w-full items-center gap-2 rounded-2xl py-2 pl-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text)]"
                >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="truncate opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">New venture</span>
                </button>
                <div className="max-h-28 space-y-0.5 overflow-y-auto">
                    {projects.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                                setActiveProject(p);
                                switchRoom('dashboard');
                            }}
                            className={`flex w-full items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 text-left text-xs transition-colors ${
                                activeProject?.id === p.id
                                    ? 'border-white/[0.1] bg-white/[0.05] text-[var(--text)]'
                                    : 'text-[var(--muted)] hover:bg-white/[0.04]'
                            }`}
                        >
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
                            <span className="truncate opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">{p.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-auto border-t border-[var(--border)] p-2">
                <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 rounded-2xl py-2.5 pl-2 text-sm text-[var(--muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text)]"
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span className="truncate opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">Sign out</span>
                </button>
            </div>
        </div>
    );
}
