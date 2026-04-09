'use client';

import React from 'react';
import { SUITE_INTELLIGENCE_SECTIONS, scrollToSuiteSection } from '@/lib/suiteIntelligenceNav';

/** Colored rectangular section links — no dropdowns */
export function SuiteNavChips({
    className = '',
    dense = false,
}: {
    className?: string;
    /** Tighter padding when embedded in the chat dock */
    dense?: boolean;
}) {
    return (
        <nav
            className={`flex flex-wrap items-center gap-1.5 ${dense ? 'gap-1' : 'gap-1.5'} ${className}`}
            aria-label="AI team network sections"
        >
            {SUITE_INTELLIGENCE_SECTIONS.map((s) => (
                <button
                    key={s.id}
                    type="button"
                    onClick={() => scrollToSuiteSection(s.id)}
                    className={`shrink-0 rounded-md px-2 py-1 font-medium text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                        dense ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-[11px]'
                    } ${s.chipClass}`}
                >
                    {s.label}
                </button>
            ))}
        </nav>
    );
}
