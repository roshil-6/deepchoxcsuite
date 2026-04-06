'use client';

import React, { useId, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type DeskRevealSectionProps = {
    title: string;
    subtitle?: string;
    badge?: React.ReactNode;
    /** Anchor for in-page navigation (e.g. desk jump links) */
    id?: string;
    /** When true, section starts expanded */
    defaultOpen?: boolean;
    children: React.ReactNode;
    /** Outer frame — default matches CEO zinc panels */
    className?: string;
    innerClassName?: string;
    /** `brand` uses suite CFO/CTO panel borders */
    variant?: 'zinc' | 'brand';
};

const FRAME: Record<NonNullable<DeskRevealSectionProps['variant']>, string> = {
    zinc: 'rounded-xl border border-white/[0.08] bg-zinc-900/20',
    brand: 'rounded-xl border border-brand-border bg-brand-panel/30',
};

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
}: DeskRevealSectionProps) {
    const [open, setOpen] = useState(defaultOpen);
    const headingId = useId();
    const frame = `${FRAME[variant]} overflow-hidden ${className ?? ''}`.trim();

    return (
        <section id={id} className={[id ? 'scroll-mt-4' : '', frame].filter(Boolean).join(' ')}>
            <button
                type="button"
                id={headingId}
                onClick={() => setOpen((o) => !o)}
                className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition sm:px-5 sm:py-4 ${
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
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span
                            className={`text-sm font-semibold ${variant === 'brand' ? 'text-brand-text' : 'text-zinc-100'}`}
                        >
                            {title}
                        </span>
                        {badge}
                    </span>
                    {subtitle ? (
                        <span
                            className={`mt-1 block text-[11px] font-normal leading-relaxed ${
                                variant === 'brand' ? 'text-brand-muted' : 'text-zinc-500'
                            }`}
                        >
                            {subtitle}
                        </span>
                    ) : null}
                </span>
            </button>
            {open ? (
                <div
                    className={`border-t px-4 pb-4 pt-3 sm:px-5 sm:pb-5 ${
                        variant === 'brand'
                            ? 'border-brand-border/70 bg-brand-bg/40'
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
