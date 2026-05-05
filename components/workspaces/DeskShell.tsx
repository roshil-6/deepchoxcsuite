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
    headerSpineClassName = 'bg-white/20',
    headerClassName,
}: DeskShellProps) {
    const [entered, setEntered] = useState(false);
    useEffect(() => { requestAnimationFrame(() => setEntered(true)); }, []);

    return (
        <div
            className={`flex min-h-0 w-full min-w-0 flex-col overflow-hidden transition-all duration-300 ease-out ${className ?? ''}`}
            style={{
                opacity: entered ? 1 : 0,
                transform: entered ? 'translateY(0)' : 'translateY(6px)',
                background: '#111117',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '0.875rem',
            }}
        >
            {/* ── Desk header ── */}
            <header
                className={`shrink-0 px-5 py-4 sm:px-6 sm:py-5 ${headerClassName ?? ''}`}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#111117' }}
            >
                <div className="flex items-start gap-3">
                    <div className={`mt-1 h-10 w-0.5 shrink-0 rounded-full ${headerSpineClassName}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                        {eyebrow ? (
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#5c5c6e' }}>
                                {eyebrow}
                            </p>
                        ) : null}
                        <h1
                            className={`text-[16px] font-semibold leading-snug tracking-tight sm:text-[17px] ${eyebrow ? 'mt-1' : ''}`}
                            style={{ color: '#f2f2f5' }}
                        >
                            {title}
                        </h1>
                        {description ? (
                            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed" style={{ color: '#8c8c9e' }}>
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>
                {tabs ? (
                    <div className="mt-4 flex items-center gap-5 overflow-x-auto no-scrollbar" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                        {tabs}
                    </div>
                ) : null}
            </header>

            {/* ── Desk body ── */}
            <div className={`${bodyFlush ? 'p-0' : 'px-5 py-4 sm:px-6 sm:py-5'} ${bodyClassName ?? ''}`}>
                {children}
            </div>

            {/* ── Desk footer ── */}
            {footer ? (
                <div className="shrink-0 px-5 py-3 sm:px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#19181f' }}>
                    {footer}
                </div>
            ) : null}
        </div>
    );
}

/** Tab control — flat text, no chrome, no box */
export function DeskTabButton({
    active,
    onClick,
    children,
    icon,
    type = 'button',
    className,
    chroming: _chroming = 'default',
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
    type?: 'button' | 'submit';
    className?: string;
    chroming?: 'default' | 'ghost';
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150 ${className ?? ''}`}
            style={{ color: active ? '#f2f2f5' : '#5c5c6e', padding: 0, background: 'none', border: 'none' }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#8c8c9e'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#5c5c6e'; }}
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
