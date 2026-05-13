'use client';

import React from 'react';
import { Cpu, Search, LayoutTemplate, Menu } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import type { AppView } from '@/components/Sidebar';

type Props = {
    activeView: AppView;
    onSwitchView: (v: AppView) => void;
    onOpenMore: () => void;
};

const VIEWS: { view: AppView; icon: typeof Cpu; label: string }[] = [
    { view: 'engineering', icon: Cpu, label: 'Engineering' },
    { view: 'research', icon: Search, label: 'Research' },
    { view: 'sites', icon: LayoutTemplate, label: 'Sites' },
];

export function MobileBottomNav({ activeView, onSwitchView, onOpenMore }: Props) {
    const { theme } = useTheme();
    const dark = theme === 'dark';

    return (
        <nav
            aria-label="Mobile navigation"
            className={[
                'fixed inset-x-0 bottom-0 z-40 flex items-start justify-around border-t lg:hidden',
                dark ? 'border-[#262626]' : 'border-neutral-200',
            ].join(' ')}
            style={{
                background: dark ? 'rgba(10,10,10,0.97)' : 'rgba(246,246,248,0.97)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            {VIEWS.map(({ view, icon: Icon, label }) => {
                const active = activeView === view;
                return (
                    <button
                        key={view}
                        type="button"
                        onClick={() => onSwitchView(view)}
                        aria-label={label}
                        aria-current={active ? 'page' : undefined}
                        className={`flex flex-1 flex-col items-center gap-1 px-1 pt-2.5 pb-1.5 transition-colors ${
                            active
                                ? dark
                                    ? 'text-neutral-100'
                                    : 'text-neutral-900'
                                : dark
                                  ? 'text-neutral-500 hover:text-neutral-300'
                                  : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                    >
                        <div className="relative">
                            {active && (
                                <span
                                    className={`absolute -top-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full ${
                                        dark ? 'bg-neutral-500' : 'bg-neutral-400'
                                    }`}
                                />
                            )}
                            <Icon className="h-[1.2rem] w-[1.2rem]" strokeWidth={active ? 2.1 : 1.7} />
                        </div>
                        <span className={`max-w-[4.25rem] truncate font-sans text-[9px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                            {label}
                        </span>
                    </button>
                );
            })}

            <button
                type="button"
                onClick={onOpenMore}
                aria-label="More navigation options"
                className={`flex flex-1 flex-col items-center gap-1 px-1 pt-2.5 pb-1.5 transition-colors ${
                    dark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-800'
                }`}
            >
                <Menu className="h-[1.2rem] w-[1.2rem]" strokeWidth={1.7} />
                <span className="font-sans text-[9px] font-medium leading-none">More</span>
            </button>
        </nav>
    );
}
