'use client';

import React from 'react';

const HEADER_PAD = 'px-6 py-5 sm:px-8';
const BODY_PAD = 'px-6 py-6 sm:px-8';

function shellClass(base: string, extra?: string) {
    return extra ? `${base} ${extra}` : base;
}

export type DeskShellProps = {
    /** e.g. "CSO · Competitive map + threat level" */
    eyebrow: string;
    /** Full role title, e.g. "Chief Strategy Officer" */
    title: string;
    description?: string;
    /** Renders below description with CSO-style top border (tab pills, etc.) */
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
 * Shared desk chrome — matches CSO / Scout: eyebrow, title, description, optional tab row, scroll body.
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
        <div className={shellClass('flex h-full min-h-0 flex-col overflow-hidden bg-brand-bg', className)}>
            <header className={shellClass('shrink-0 border-b border-brand-border', HEADER_PAD)}>
                <p className="text-[11px] font-medium text-brand-muted">{eyebrow}</p>
                <h1 className="mt-1 text-lg font-medium tracking-tight text-brand-text sm:text-xl">{title}</h1>
                {description ? (
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-muted">{description}</p>
                ) : null}
                {tabs ? <div className="mt-5 flex flex-wrap gap-1.5 border-t border-brand-border pt-4">{tabs}</div> : null}
            </header>
            <div
                className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto ${bodyFlush ? 'p-0' : BODY_PAD} ${bodyClassName ?? ''}`}
            >
                {children}
            </div>
            {footer ? (
                <div className="shrink-0 border-t border-brand-border bg-brand-panel/50 px-6 py-3 sm:px-8">{footer}</div>
            ) : null}
        </div>
    );
}

/** Tab pill — same interaction model as ScoutTerminal feed / brief. */
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
                    ? 'border-brand-border bg-brand-input text-brand-text'
                    : 'border-transparent bg-transparent text-brand-muted hover:border-brand-border hover:bg-brand-input/60 hover:text-brand-text'
            }`}
        >
            {icon}
            {children}
        </button>
    );
}

export function DeskEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={shellClass('flex h-full items-center justify-center p-8 text-sm text-brand-muted', className)}>
            {children}
        </div>
    );
}
