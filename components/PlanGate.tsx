'use client';

/**
 * PlanGate — wraps any feature that requires Pro.
 *
 * Usage:
 *   <PlanGate feature="vcGauntlet" label="VC Gauntlet">
 *     <VCGauntletContent />
 *   </PlanGate>
 *
 * When the user is on Free, the children are replaced with an upgrade prompt.
 * When Pro, children render normally — zero overhead.
 */

import React, { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { PRO_INTELLIGENCE_FEATURES, type Plan } from '@/lib/plans';

/** Build a quick lookup from feature key → human label using the Pro features list */
const PRO_FEATURE_LABELS: Record<string, string> = Object.fromEntries(
    PRO_INTELLIGENCE_FEATURES.map((f) => [f.key, f.name]),
);
import { UpgradeModal } from '@/components/UpgradeModal';

interface PlanGateProps {
    /** The feature key from Plan['features'] to check */
    feature: keyof Plan['features'];
    /** Optional short label override for the upgrade prompt */
    label?: string;
    /** What to show when locked — defaults to a full-surface upgrade card */
    lockedFallback?: React.ReactNode;
    children: React.ReactNode;
}

export function PlanGate({ feature, label, lockedFallback, children }: PlanGateProps) {
    const { can } = useSubscription();
    const [modalOpen, setModalOpen] = useState(false);

    if (can(feature)) return <>{children}</>;

    const featureLabel = label ?? PRO_FEATURE_LABELS[feature] ?? feature;

    if (lockedFallback) return <>{lockedFallback}</>;

    return (
        <>
            <UpgradeModal open={modalOpen} onClose={() => setModalOpen(false)} />
            <div className="flex min-h-[min(55vh,28rem)] w-full flex-col items-center justify-center gap-5 px-6 py-12 text-center">
                {/* Lock badge */}
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <Lock className="h-6 w-6 text-zinc-500" aria-hidden />
                </div>

                <div className="max-w-xs">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                        Pro feature
                    </p>
                    <h2 className="mt-1.5 text-[17px] font-semibold leading-snug tracking-tight text-zinc-100">
                        {featureLabel}
                    </h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                        Upgrade to Co-Founder to unlock this and all other power features.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-zinc-900 shadow-[0_2px_16px_rgba(255,255,255,0.12)] transition hover:bg-zinc-100 active:scale-[0.97]"
                >
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Upgrade to Pro
                </button>

                <p className="text-[10px] text-zinc-700">&#8377;300/mo (~$4) &middot; cancel anytime</p>
            </div>
        </>
    );
}

/** Inline lock badge — drop next to any button/label to signal it's Pro */
export function ProBadge({ className = '' }: { className?: string }) {
    return (
        <span
            className={`inline-flex items-center gap-0.5 rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-400/80 ${className}`}
        >
            <Sparkles className="h-2.5 w-2.5" aria-hidden />
            Pro
        </span>
    );
}
