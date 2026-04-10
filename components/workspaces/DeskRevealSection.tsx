'use client';

import React, { useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export type DeskRevealSectionProps = {
    title: string;
    subtitle?: string;
    /** Optional status or meta — rendered as plain text, not a role badge */
    badge?: React.ReactNode;
    /** Anchor for in-page navigation (e.g. desk jump links) */
    id?: string;
    /** When true, section starts expanded */
    defaultOpen?: boolean;
    children: React.ReactNode;
    /** Outer frame — default matches CEO zinc panels */
    className?: string;
    innerClassName?: string;
    /** `brand` uses suite panel borders */
    variant?: 'zinc' | 'brand';
    /** Tighter padding and header — less visual weight */
    density?: 'default' | 'compact';
};

const FRAME: Record<NonNullable<DeskRevealSectionProps['variant']>, string> = {
    zinc: 'rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)]',
    brand: 'rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)]',
};

function frameClass(variant: DeskRevealSectionProps['variant'], density: DeskRevealSectionProps['density']): string {
    if (density === 'compact') {
        return 'rounded-xl border border-white/[0.07] bg-[var(--color-brand-card)]';
    }
    return FRAME[variant ?? 'zinc'];
}

export function DeskRevealSection({
    title,
    subtitle,
    badge,
    id,
    defaultOpen = false,
    children,
    className,
    innerClassName,
    variant = 'zinc',
    density = 'default',
}: DeskRevealSectionProps) {
    const [open, setOpen] = useState(defaultOpen);
    const headingId = useId();
    const frame = `${frameClass(variant, density)} overflow-hidden ${className ?? ''}`.trim();

    return (
        <section id={id} className={[id ? 'scroll-mt-4' : '', frame].filter(Boolean).join(' ')}>
            <button
                type="button"
                id={headingId}
                onClick={() => setOpen((o) => !o)}
                className={`flex w-full items-start gap-2.5 text-left transition ${
                    density === 'compact' ? 'px-3 py-2.5 sm:px-4 sm:py-3' : 'gap-3 px-4 py-3.5 sm:px-5 sm:py-4'
                } ${
                    variant === 'brand'
                        ? open
                            ? 'bg-brand-input/25 hover:bg-brand-input/40'
                            : 'hover:bg-brand-input/45'
                        : open
                          ? 'bg-white/[0.03] hover:bg-white/[0.05]'
                          : 'hover:bg-white/[0.04]'
                }`}
                aria-expanded={open}
            >
                <span
                    className={`mt-0.5 shrink-0 ${variant === 'brand' ? 'text-brand-muted' : 'text-zinc-500'}`}
                    aria-hidden
                >
                    {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span
                            className={`font-semibold ${density === 'compact' ? 'text-[13px]' : 'text-sm'} ${variant === 'brand' ? 'text-brand-text' : 'text-zinc-100'}`}
                        >
                            {title}
                        </span>
                        {badge ? (
                            <span
                                className={`inline-flex items-center gap-1 font-normal ${
                                    density === 'compact' ? 'text-[10px]' : 'text-[11px]'
                                } ${variant === 'brand' ? 'text-brand-muted' : 'text-zinc-500'}`}
                            >
                                {badge}
                            </span>
                        ) : null}
                    </span>
                    {subtitle ? (
                        <span
                            className={`mt-0.5 block font-normal leading-snug ${
                                density === 'compact' ? 'text-[10px]' : 'mt-1 text-[11px] leading-relaxed'
                            } ${variant === 'brand' ? 'text-brand-muted' : 'text-zinc-500'}`}
                        >
                            {subtitle}
                        </span>
                    ) : null}
                </span>
            </button>
            {open ? (
                <div
                    className={`border-t ${
                        density === 'compact'
                            ? 'px-3 pb-3 pt-2 sm:px-4 sm:pb-4'
                            : 'px-4 pb-4 pt-3 sm:px-5 sm:pb-5'
                    } ${
                        variant === 'brand'
                            ? 'border-brand-border/50 bg-brand-bg/30'
                            : 'border-white/[0.06] bg-zinc-950/30'
                    } ${innerClassName ?? ''}`}
                    role="region"
                    aria-labelledby={headingId}
                >
                    {children}
                </div>
            ) : null}
        </section>
    );
}
