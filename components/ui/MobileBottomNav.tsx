'use client';

import React from 'react';
import { Sparkles, LayoutGrid, Layers, MessageSquare, Menu } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';

type Props = {
    onOpenMore: () => void;
};

const BOTTOM_NAV = [
    { room: 'dexo'              as const, icon: Sparkles,       label: 'Deepchox'      },
    { room: 'dashboard'         as const, icon: LayoutGrid,     label: 'Overview'  },
    { room: 'desks_hub'         as const, icon: Layers,         label: 'Desks'     },
    { room: 'personal_assistant' as const, icon: MessageSquare, label: 'Assistant' },
] as const;

export function MobileBottomNav({ onOpenMore }: Props) {
    const { activeRoom, switchRoom, setActiveProject } = useOffice();

    const go = (room: typeof BOTTOM_NAV[number]['room']) => {
        if (room === 'dashboard') setActiveProject(null);
        switchRoom(room);
    };

    return (
        <nav
            aria-label="Mobile navigation"
            className="fixed inset-x-0 bottom-0 z-50 flex items-start justify-around border-t border-[var(--border)] px-0.5 lg:hidden"
            style={{
                background: 'rgba(12,12,15,0.97)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            {BOTTOM_NAV.map(({ room, icon: Icon, label }) => {
                const active = activeRoom === room;
                return (
                    <button
                        key={room}
                        type="button"
                        onClick={() => go(room)}
                        aria-label={label}
                        aria-current={active ? 'page' : undefined}
                        className={`flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1.5 transition-colors ${
                            active ? 'text-[#9d88ff]' : 'text-[var(--muted)] hover:text-[var(--text-secondary)]'
                        }`}
                    >
                        <div className="relative">
                            {/* Active pill indicator above icon */}
                            {active && (
                                <span className="absolute -top-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#9d88ff]" />
                            )}
                            <Icon className="h-[1.2rem] w-[1.2rem]" strokeWidth={active ? 2.1 : 1.7} />
                        </div>
                        <span className={`font-sans text-[9px] leading-none ${active ? 'font-semibold text-[#9d88ff]' : 'font-medium'}`}>
                            {label}
                        </span>
                    </button>
                );
            })}

            {/* More — opens the full nav drawer */}
            <button
                type="button"
                onClick={onOpenMore}
                aria-label="More navigation options"
                className="flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1.5 text-[var(--muted)] transition-colors hover:text-[var(--text-secondary)]"
            >
                <Menu className="h-[1.2rem] w-[1.2rem]" strokeWidth={1.7} />
                <span className="font-sans text-[9px] font-medium leading-none">More</span>
            </button>
        </nav>
    );
}
