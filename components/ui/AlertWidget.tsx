'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { executiveSurfaceClass } from '@/components/ui/cardStyles';

export type AlertWidgetProps = {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    messages: string[];
    escalation?: boolean;
};

export function AlertWidget({ severity = 'low', messages, escalation }: AlertWidgetProps) {
    const tone =
        severity === 'critical'
            ? 'border-rose-500/30 bg-rose-950/20 text-rose-100/90'
            : severity === 'high'
              ? 'border-amber-500/25 bg-amber-950/15 text-amber-100/90'
              : 'border-white/[0.06] bg-[var(--surface-soft)] text-[var(--text)]/90';

    return (
        <motion.div layout className={`${executiveSurfaceClass} p-5 ${tone}`}>
            <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium">Alerts</h3>
                    <p className="mt-0.5 text-xs opacity-70">
                        Impact: <span className="font-medium capitalize">{severity}</span>
                        {escalation ? ' · Escalation suggested' : ''}
                    </p>
                    <AnimatePresence mode="popLayout">
                        {messages.length === 0 ? (
                            <p className="mt-2 text-xs opacity-60">No critical items.</p>
                        ) : (
                            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed opacity-90">
                                {messages.map((m, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: 4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        {m}
                                    </motion.li>
                                ))}
                            </ul>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
