'use client';

import React, { useEffect, useState } from 'react';

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
    headerSpineClassName = 'bg-[var(--accent)]/70',
    headerClassName,
}: DeskShellProps) {
    const [entered, setEntered] = useState(false);
    useEffect(() => { requestAnimationFrame(() => setEntered(true)); }, []);

    return (
        <div
            className={`executive-panel flex min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[var(--bg-elevated)] transition-all duration-300 ease-out ${className ?? ''}`}
            style={{ opacity: entered ? 1 : 0, transform: entered ? 'translateY(0)' : 'translateY(6px)' }}
        >
            {/* ── Desk header ── */}
            <header
                className={`shrink-0 border-b border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 sm:px-6 sm:py-5 ${headerClassName ?? ''}`}
            >
                <div className="flex items-start gap-3">
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
                    <div className="mt-3 sm:mt-4 flex flex-wrap gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pt-0.5">{tabs}</div>
                ) : null}
            </header>

            {/* ── Desk body ── */}
            <div className={`${bodyFlush ? 'p-0' : 'px-5 py-4 sm:px-6 sm:py-5'} ${bodyClassName ?? ''}`}>
                {children}
            </div>

            {/* ── Desk footer ── */}
            {footer ? (
                <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-card)] px-5 py-3 sm:px-6">
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
    chroming = 'default',
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
    type?: 'button' | 'submit';
    className?: string;
    /** `ghost` — no stroke (e.g. Relay header). */
    chroming?: 'default' | 'ghost';
}) {
    const ghost = chroming === 'ghost';
    return (
        <button
            type={type}
            onClick={onClick}
            className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                ghost ? 'border-0' : 'border'
            } ${
                active
                    ? ghost
                        ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                        : 'border-[rgba(116,86,255,0.18)] bg-[var(--accent-soft)] text-[var(--text)]'
                    : ghost
                      ? 'bg-transparent text-[var(--muted)] hover:-translate-y-px hover:bg-[var(--accent-soft)] hover:text-[var(--text)]'
                      : 'border-transparent bg-transparent text-[var(--muted)] hover:-translate-y-px hover:border-[var(--border)] hover:bg-[var(--accent-soft)] hover:text-[var(--text)]'
            } ${className ?? ''}`}
        >
            {icon}
            {children}
            {active && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[var(--accent)]" />
            )}
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
