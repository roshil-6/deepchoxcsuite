'use client';

import React from 'react';

export type DeskShellProps = {
    /** Optional kicker above the title */
    eyebrow?: string;
    /** Main headline — e.g. "{Venture} · fund intelligence research staff" */
    title: string;
    description?: string;
    /** Renders below description with a light divider (tab pills, etc.) */
    tabs?: React.ReactNode;
    children: React.ReactNode;
    /** Optional pinned footer (e.g. save bar) */
    footer?: React.ReactNode;
    className?: string;
    /** When true, body has no extra vertical padding (for full-bleed canvases) */
    bodyFlush?: boolean;
    /** Extra classes on the scroll body (e.g. extra bottom padding above a dock) */
    bodyClassName?: string;
    /** Left accent bar in the desk header (default neutral) */
    headerSpineClassName?: string;
    headerClassName?: string;
};

/**
 * Shared desk surface — clean header with role identity, helper copy, optional tabs.
 * The design makes the AI role feel present: the description speaks in first person,
 * the layout gives the content room to breathe.
 */
export function DeskShell({
    eyebrow,
    title,
    description,
    tabs,
    children,
    footer,
    className,
    bodyFlush,
    bodyClassName,
    headerSpineClassName = 'bg-white/20',
    headerClassName,
}: DeskShellProps) {
    return (
        <div className={`executive-panel flex min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[var(--color-brand-bg)] ${className ?? ''}`}>
            {/* ── Desk header ── */}
            <header className={`shrink-0 border-b border-white/[0.06] bg-white/[0.02] px-5 py-4 sm:px-6 sm:py-5 ${headerClassName ?? ''}`}>
                <div className="flex items-start gap-3">
                    {/* Accent indicator — subtle presence of the AI role */}
                    <div className={`mt-1 h-10 w-1 shrink-0 rounded-full ${headerSpineClassName}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                        {eyebrow ? (
                            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                                {eyebrow}
                            </p>
                        ) : null}
                        <h1
                            className={`text-base font-semibold leading-snug tracking-tight text-[var(--text)] sm:text-[17px] ${eyebrow ? 'mt-1' : ''}`}
                        >
                            {title}
                        </h1>
                        {description ? (
                            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>
                {tabs ? (
                    <div className="ml-5 mt-4 flex flex-wrap gap-1.5 border-t border-white/[0.05] pt-3">{tabs}</div>
                ) : null}
            </header>

            {/* ── Desk body ── */}
            <div className={`${bodyFlush ? 'p-0' : 'px-5 py-4 sm:px-6 sm:py-5'} ${bodyClassName ?? ''}`}>
                {children}
            </div>

            {/* ── Desk footer ── */}
            {footer ? (
                <div className="shrink-0 border-t border-white/[0.06] bg-white/[0.02] px-5 py-3 sm:px-6">
                    {footer}
                </div>
            ) : null}
        </div>
    );
}

/** Tab control — text-first, low chrome */
export function DeskTabButton({
    active,
    onClick,
    children,
    icon,
    type = 'button',
    className,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
    type?: 'button' | 'submit';
    className?: string;
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                    ? 'border-white/[0.12] bg-white/[0.07] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                    : 'border-transparent bg-transparent text-[var(--muted)] hover:-translate-y-px hover:border-white/[0.07] hover:bg-white/[0.04] hover:text-[var(--text)]'
            } ${className ?? ''}`}
        >
            {icon}
            {children}
        </button>
    );
}

export function DeskEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`executive-empty flex min-h-[min(50vh,24rem)] items-center justify-center p-8 text-sm text-[var(--muted)] ${className ?? ''}`}
        >
            {children}
        </div>
    );
}
