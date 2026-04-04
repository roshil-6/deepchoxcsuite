'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import type { OfficeNotification } from '@/types/office';

function severityStyles(s: OfficeNotification['severity']): string {
    switch (s) {
        case 'critical':
            return 'border-rose-500/30 bg-rose-950/25 text-rose-100';
        case 'warning':
            return 'border-amber-500/25 bg-amber-950/20 text-amber-100';
        default:
            return 'border-white/[0.08] bg-white/[0.03] text-zinc-200';
    }
}

export function AmbientNotificationTray({
    items,
    className = '',
    maxVisible = 5,
}: {
    items: OfficeNotification[];
    className?: string;
    maxVisible?: number;
}) {
    const show = items.slice(0, maxVisible);
    if (show.length === 0) return null;

    return (
        <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 ${className}`}>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">
                <Bell className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                Office pulse
            </div>
            <ul className="space-y-2">
                {show.map((n, i) => (
                    <li
                        key={`${n.timestamp}-${i}`}
                        className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${severityStyles(n.severity)}`}
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
