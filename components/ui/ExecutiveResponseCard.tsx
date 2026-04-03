'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { executiveCardClass } from '@/components/ui/cardStyles';

export type ExecutiveResponseCardProps = {
    role: string;
    insight: string;
    recommendation?: string;
    actions?: string[];
    impact?: string;
    className?: string;
};

export function ExecutiveResponseCard({
    role,
    insight,
    recommendation,
    actions,
    impact,
    className = '',
}: ExecutiveResponseCardProps) {
    return (
        <motion.article
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`${executiveCardClass} transition-colors hover:border-white/[0.1] ${className}`}
        >
            <div className="space-y-5">
                <header>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">{role}</p>
                </header>
                <Block label="Insight" body={insight} />
                {recommendation ? <Block label="Recommendation" body={recommendation} /> : null}
                {actions?.length ? (
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)] opacity-80">Actions</p>
                        <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-[var(--text)]/90">
                            {actions.map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                {impact ? <Block label="Impact" body={impact} /> : null}
            </div>
        </motion.article>
    );
}

function Block({ label, body }: { label: string; body: string }) {
    return (
        <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)] opacity-80">{label}</p>
            <p className="text-sm leading-relaxed text-[var(--text)]/90">{body}</p>
        </div>
    );
}
