'use client';

import React, { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { PRO_INTELLIGENCE_FEATURES, type Plan } from '@/lib/plans';
import { UpgradeModal } from '@/components/UpgradeModal';

const PRO_FEATURE_LABELS: Record<string, string> = Object.fromEntries(
    PRO_INTELLIGENCE_FEATURES.map((f) => [f.key, f.name]),
);

interface PlanGateProps {
    feature: keyof Plan['features'];
    label?: string;
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
            <div className="flex min-h-[min(55vh,28rem)] w-full flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                    <Lock className="h-5 w-5 text-zinc-500" aria-hidden />
                </div>

                <div className="max-w-xs">
                    <p className="text-[11px] font-medium text-zinc-600">Pro feature</p>
                    <h2 className="mt-1 text-base font-semibold leading-snug tracking-tight text-zinc-100">
                        {featureLabel}
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                        Upgrade to Co-Founder Pro to unlock this feature.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:scale-[0.97]"
                >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Upgrade to Pro
                </button>

                <p className="text-[11px] text-zinc-700">₹300/mo (~$4) · cancel anytime</p>
            </div>
        </>
    );
}

export function ProBadge({ className = '' }: { className?: string }) {
    return (
        <span
            className={`inline-flex items-center gap-0.5 rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-amber-400/80 ${className}`}
        >
            <Sparkles className="h-2.5 w-2.5" aria-hidden />
            Pro
        </span>
    );
}
