'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

const OUTLINE = {
    teal: 'border-teal-500/35 bg-gradient-to-br from-teal-500/[0.06] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    amber: 'border-amber-500/35 bg-gradient-to-br from-amber-950/25 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    sky: 'border-sky-500/35 bg-gradient-to-br from-sky-500/[0.06] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    violet: 'border-violet-500/35 bg-gradient-to-br from-violet-500/[0.06] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    zinc: 'border-zinc-500/35 bg-zinc-900/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    emerald: 'border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.06] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
} as const;

export type OfficeBriefPanelTone = keyof typeof OUTLINE;

export function OfficeBriefPanel({
    id,
    tone,
    icon,
    eyebrow,
    title,
    teaser,
    children,
    className = '',
}: {
    id?: string;
    tone: OfficeBriefPanelTone;
    icon: React.ReactNode;
    eyebrow?: string;
    title: string;
    teaser: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <details
            id={id}
            className={`group scroll-mt-6 rounded-2xl border px-3.5 py-3 sm:px-4 sm:py-3.5 ${OUTLINE[tone]} ${className}`}
        >
            <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black/25 ring-1 ring-white/[0.08]">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    {eyebrow ? (
                        <p className="text-[10px] font-medium text-zinc-500">{eyebrow}</p>
                    ) : null}
                    <h3 className={`text-sm font-semibold tracking-tight text-brand-text ${eyebrow ? 'mt-0.5' : ''}`}>{title}</h3>
                    <div className="mt-0.5 text-[11px] leading-snug text-brand-muted">{teaser}</div>
                </div>
                <ChevronDown
                    className="h-4 w-4 shrink-0 text-brand-muted/60 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                />
            </summary>
            <div className="mt-3 border-t border-white/[0.07] pt-3">{children}</div>
        </details>
    );
}
