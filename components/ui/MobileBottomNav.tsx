'use client';

import React from 'react';
import { Sparkles, LayoutGrid, Layers, Menu } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';

type Props = {
    onOpenMore: () => void;
};

const BOTTOM_NAV = [
    { room: 'dexo'      as const, icon: Sparkles,    label: 'Dexo'     },
    { room: 'dashboard' as const, icon: LayoutGrid,   label: 'Overview' },
    { room: 'desks_hub' as const, icon: Layers,       label: 'Desks'    },
] as const;

export function MobileBottomNav({ onOpenMore }: Props) {
    const { activeRoom, switchRoom, setActiveProject } = useOffice();

    const go = (room: typeof BOTTOM_NAV[number]['room']) => {
        if (room === 'dashboard') setActiveProject(null);
        switchRoom(room);
    };

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-[var(--border)] px-1 pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
            style={{ background: 'rgba(14,14,17,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
            {BOTTOM_NAV.map(({ room, icon: Icon, label }) => {
                const active = activeRoom === room;
                return (
                    <button
                        key={room}
                        type="button"
                        onClick={() => go(room)}
                        className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                            active ? 'text-[#9d88ff]' : 'text-[var(--muted)] hover:text-[var(--text-secondary)]'
                        }`}
                    >
                        <div className="relative">
                            <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
                            {active && (
                                <span className="absolute -bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-[#9d88ff]" />
                            )}
                        </div>
                        <span className={`font-sans text-[10px] font-medium leading-none ${active ? 'text-[#9d88ff]' : ''}`}>
                            {label}
                        </span>
                    </button>
                );
            })}

            {/* More — opens the full nav drawer */}
            <button
                type="button"
                onClick={onOpenMore}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[var(--muted)] transition-colors hover:text-[var(--text-secondary)]"
            >
                <Menu className="h-5 w-5" strokeWidth={1.75} />
                <span className="font-sans text-[10px] font-medium leading-none">More</span>
            </button>
        </div>
    );
}
