'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import type { OfficeNotification } from '@/types/office';

function severityStyles(s: OfficeNotification['severity']): string {
    switch (s) {
        case 'critical':
            return 'bg-rose-950/30 text-rose-100';
        case 'warning':
            return 'bg-amber-950/25 text-amber-100';
        default:
            return 'bg-white/[0.05] text-zinc-200';
    }
}

export function AmbientNotificationTray({
    items,
    className = '',
    maxVisible = 5,
    detailOnly = false,
}: {
    items: OfficeNotification[];
    className?: string;
    maxVisible?: number;
    detailOnly?: boolean;
}) {
    const show = items.slice(0, maxVisible);
    if (show.length === 0) return null;

    return (
        <div className={detailOnly ? `rounded-xl bg-black/20 p-3 ring-1 ring-white/[0.06] ${className}` : `dash-msg bg-zinc-800/40 ${className}`}>
            {!detailOnly ? (
                <div className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">
                    <Bell className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                    Office pulse
                </div>
            ) : null}
            <ul className="space-y-3">
                {show.map((n, i) => (
                    <li
                        key={`${n.timestamp}-${i}`}
                        className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${severityStyles(n.severity)}`}
                    >
                        <span className="font-semibold text-zinc-300">{n.desk}</span>
                        <span className="text-zinc-500"> · </span>
                        <span>{n.message}</span>
                    </li>
                ))}
            </ul>
            {items.length > maxVisible ? (
                <p className="mt-2 text-[10px] text-zinc-500">+{items.length - maxVisible} more in full cycle</p>
            ) : null}
        </div>
    );
}
