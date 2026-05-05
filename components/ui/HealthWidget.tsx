'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { executiveSurfaceClass } from '@/components/ui/cardStyles';

export type HealthWidgetProps = {
    strategic: number;
    financial: number;
    execution: number;
    /** When true, skip animated scores â€” the venture record is still mostly empty. */
    needsSetup?: boolean;
};

export function HealthWidget({ strategic, financial, execution, needsSetup }: HealthWidgetProps) {
    const rows = [
        { label: 'Strategy depth', value: strategic, fill: 'bg-[var(--accent-soft)]' },
        { label: 'Financial', value: financial, fill: 'bg-emerald-500/25' },
        { label: 'Execution', value: execution, fill: 'bg-white/[0.05]' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${executiveSurfaceClass} p-5`}
        >
            <h3 className="text-sm font-medium text-[var(--text)]">Company health</h3>
            <p className="mt-1 text-xs text-[var(--muted)] opacity-80">
                {needsSetup
                    ? 'Waiting on your real venture details'
                    : 'How much founder context is on the record â€” not a grade of strategic brilliance'}
            </p>
            {needsSetup ? (
                <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                    Bars stay hidden until you&apos;ve added enough context (strategy narrative plus product, market, or
                    finance notes). Open Dexo or the desks â€” scores based only on templates aren&apos;t shown so nothing
                    feels invented.
                </p>
            ) : (
                <ul className="mt-4 space-y-3">
                    {rows.map((r) => (
                        <li key={r.label}>
                            <div className="mb-1 flex justify-between text-xs">
                                <span className="text-[var(--muted)]">{r.label}</span>
                                <span className="tabular-nums text-[var(--text)]">{Math.round(r.value)}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                <motion.div
                                    className={`h-full rounded-full ${r.fill}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, Math.max(0, r.value))}%` }}
                                    transition={{ duration: 0.45, ease: 'easeOut' }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </motion.div>
    );
}

