'use client';

import React from 'react';

const HEADER_PAD = 'px-5 py-5 sm:px-6 sm:py-5';
const BODY_PAD = 'px-5 py-4 sm:px-6 sm:py-5';

function shellClass(base: string, extra?: string) {
    return extra ? `${base} ${extra}` : base;
}

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
};

/**
 * Shared desk surface — calm header, helper copy, optional tabs; no role badges.
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
}: DeskShellProps) {
    return (
        <div className={shellClass('flex w-full min-w-0 flex-col bg-brand-bg', className)}>
            <header
                className={shellClass(
                    'shrink-0 border-b border-brand-border/50 bg-gradient-to-b from-brand-panel/25 to-transparent',
                    HEADER_PAD
                )}
            >
                {eyebrow ? (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted/90">{eyebrow}</p>
                ) : null}
                <h1
                    className={`text-[1.05rem] font-semibold leading-snug tracking-tight text-brand-text sm:text-lg ${eyebrow ? 'mt-1.5' : ''}`}
                >
                    {title}
                </h1>
                {description ? (
                    <p className="mt-2.5 max-w-3xl text-[13px] font-normal leading-relaxed text-brand-muted">{description}</p>
                ) : null}
                {tabs ? (
                    <div className="mt-4 flex flex-wrap gap-1 border-t border-brand-border/35 pt-3">{tabs}</div>
                ) : null}
            </header>
            <div className={`${bodyFlush ? 'p-0' : BODY_PAD} ${bodyClassName ?? ''}`}>{children}</div>
            {footer ? (
                <div className="shrink-0 border-t border-brand-border/60 bg-brand-panel/20 px-5 py-3 sm:px-6">{footer}</div>
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
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
    type?: 'button' | 'submit';
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                    ? 'border-brand-border/80 bg-brand-input text-brand-text'
                    : 'border-transparent bg-transparent text-brand-muted hover:border-brand-border/60 hover:bg-brand-input/50 hover:text-brand-text'
            }`}
        >
            {icon}
            {children}
        </button>
    );
}

export function DeskEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={shellClass('flex min-h-[min(50vh,24rem)] items-center justify-center p-8 text-sm text-brand-muted', className)}>
            {children}
        </div>
    );
}
