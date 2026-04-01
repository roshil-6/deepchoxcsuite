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
            <header className={shellClass('shrink-0 border-b border-zinc-700', HEADER_PAD)}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{eyebrow}</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">{title}</h1>
                {description ? (
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">{description}</p>
                ) : null}
                {tabs ? <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">{tabs}</div> : null}
            </header>
            <div
                className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto ${bodyFlush ? 'p-0' : BODY_PAD} ${bodyClassName ?? ''}`}
            >
                {children}
            </div>
            {footer ? (
                <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/40 px-6 py-3 sm:px-8">{footer}</div>
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
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                active
                    ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
            }`}
        >
            {icon}
            {children}
        </button>
    );
}

export function DeskEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={shellClass('flex h-full items-center justify-center p-8 text-sm text-zinc-500', className)}>
            {children}
        </div>
    );
}
