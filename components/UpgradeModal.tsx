'use client';

import React, { useState } from 'react';
import { X, Check, Zap, Infinity } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { FREE_DAILY_TOKENS, TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import {
    BILLING_CONFIG,
    formatRegionalDualLine,
    formatRegionalPricePair,
    getProBillingAmounts,
    type BillingCycle,
} from '@/lib/billingConfig';
import { usePricingRegion } from '@/hooks/usePricingRegion';

/** One line for Free tier — only metering differs from Pro. */
const FREE_METERING_LINE = `${FREE_DAILY_TOKENS} Dexo tokens per day (resets midnight) · ${TOKEN_COSTS.ANALYSIS} per new analysis · ${TOKEN_COSTS.REANALYZE} per re-analyze · ${TOKEN_COSTS.CHAT_MESSAGE} per Dexo message`;

interface UpgradeModalProps {
    open: boolean;
    onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
    const { isPaidPro, isInTrial, hasUsedTrial, trialDaysLeft, trialHoursLeft, startTrial, activatePro, deactivatePro } = useSubscription();
    const [billing, setBilling] = useState<BillingCycle>('monthly');
    const pricingRegion = usePricingRegion();
    const PRO_BILLING = getProBillingAmounts();

    if (!open) return null;

    const isYearly = billing === 'yearly';
    const trialLabel = trialHoursLeft < 24 ? `${trialHoursLeft}h` : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}`;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Upgrade to Pro"
        >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden />

            <div className="relative z-10 flex max-h-[94dvh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0c0c0e] shadow-[0_24px_60px_rgba(0,0,0,0.8)]">

                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-5 py-4 sm:px-6">
                    <div>
                        <p className="text-sm font-semibold text-white">Co-Founder Pro</p>
                        <p className="mt-0.5 text-xs text-zinc-500">Unlimited AI usage — same workspace as Founder, no token meter</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-300"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Trial active banner */}
                {isInTrial && (
                    <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800/80 bg-orange-950/25 px-5 py-2.5 sm:px-6">
                        <Zap className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden />
                        <p className="text-xs text-zinc-300">
                            <span className="font-semibold text-white">{trialLabel}</span>
                            {' '}left in your trial — upgrade to keep full access
                        </p>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 sm:p-5">

                        {/* Billing toggle */}
                        {!isInTrial && (
                            <div className="mb-4 flex flex-col items-center gap-2">
                                <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/50 p-1">
                                    <button
                                        type="button"
                                        onClick={() => setBilling('monthly')}
                                        className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                                            !isYearly ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBilling('yearly')}
                                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                                            isYearly ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        Yearly
                                        <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                                            –17%
                                        </span>
                                    </button>
                                </div>
                                {isYearly && (
                                    <p className="text-[11px] text-zinc-500">
                                        Save{' '}
                                        {formatRegionalPricePair(PRO_BILLING.yearlySavingsInr, pricingRegion, { usdDecimals: 0 }).primary}{' '}
                                        vs monthly
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Plan cards */}
                        <div className="grid gap-3 sm:grid-cols-2">

                            {/* Free card */}
                            <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-[0_12px_28px_-24px_rgba(0,0,0,0.8)] sm:p-5">
                                <p className="text-xs font-medium text-zinc-500">Founder</p>
                                <p className="mt-3 text-3xl font-semibold leading-none tracking-tight text-white">
                                    Free
                                </p>
                                <p className="mt-1.5 text-xs text-zinc-600">forever · no card needed</p>

                                <div className="my-4 h-px bg-zinc-800/80" />

                                <ul className="flex-1 space-y-3">
                                    <li className="flex items-start gap-2">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                        <p className="text-xs leading-relaxed text-zinc-300">
                                            <span className="font-medium text-zinc-200">Same product as Pro</span>
                                            {' — '}research desks, Dexo, staff sync, dashboard, calendar, ventures, and the rest. Nothing is locked
                                            behind the paywall.
                                        </p>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                        <div>
                                            <p className="text-xs font-medium text-zinc-200">AI usage is metered</p>
                                            <p className="mt-1 text-[11px] leading-snug text-zinc-500">{FREE_METERING_LINE}</p>
                                        </div>
                                    </li>
                                </ul>

                                {isPaidPro ? (
                                    <button
                                        type="button"
                                        onClick={() => { deactivatePro(); onClose(); }}
                                        className="mt-5 w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 text-xs text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                                    >
                                        Downgrade to Free
                                    </button>
                                ) : (
                                    <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 text-center text-xs text-zinc-400">
                                        {isInTrial ? 'Trial active' : 'Current plan'}
                                    </div>
                                )}
                            </div>

                            {/* Pro card */}
                            <div className="relative flex flex-col rounded-xl border border-zinc-600/60 bg-zinc-900/60 p-4 ring-1 ring-white/[0.06] sm:p-5">
                                {/* Recommended badge */}
                                <div className="absolute -top-px left-4 rounded-b-md bg-zinc-200 px-2.5 py-0.5">
                                    <span className="text-[10px] font-semibold text-zinc-900">Recommended</span>
                                </div>

                                <p className="mt-2 text-xs font-medium text-zinc-300">Co-Founder Pro</p>

                                <div className="mt-3 flex items-end gap-1.5">
                                    <span className="text-3xl font-semibold leading-none tracking-tight text-white">
                                        {
                                            formatRegionalPricePair(
                                                isYearly ? PRO_BILLING.effectiveMonthlyInr : PRO_BILLING.monthlyInr,
                                                pricingRegion,
                                                { usdDecimals: 2, inrMaximumFractionDigits: isYearly ? 2 : 0 }
                                            ).primary
                                        }
                                    </span>
                                    <span className="mb-0.5 text-xs text-zinc-500">/mo</span>
                                    <span className="mb-0.5 text-xs text-zinc-600">
                                        (
                                        {formatRegionalPricePair(
                                            isYearly ? PRO_BILLING.effectiveMonthlyInr : PRO_BILLING.monthlyInr,
                                            pricingRegion,
                                            { usdDecimals: 2, inrMaximumFractionDigits: isYearly ? 2 : 0 }
                                        ).secondary}
                                        )
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-zinc-600">
                                    {isYearly
                                        ? `${formatRegionalDualLine(PRO_BILLING.yearlyInr, pricingRegion, { usdDecimals: 2 })} /yr · billed annually`
                                        : 'billed monthly · cancel anytime'}
                                </p>

                                <div className="my-4 h-px bg-zinc-800/80" />

                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2.5">
                                        <Infinity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-100">Unlimited AI usage</p>
                                            <p className="mt-1 text-[11px] leading-snug text-zinc-400">
                                                No daily Dexo token pool and no per-message / per-analysis deductions. Same features and workspaces as
                                                Founder — only the meter goes away.
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-zinc-500">
                                        Upgrade if you hit the free daily limit or want to run analyses and chat without counting tokens.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-4 space-y-2">
                            {isPaidPro ? (
                                <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 py-3">
                                    <Check className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                                    <span className="text-sm font-medium text-zinc-300">You are on Co-Founder Pro</span>
                                </div>
                            ) : isInTrial ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => { activatePro(); onClose(); }}
                                        className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
                                    >
                                        Upgrade to Pro — keep full access
                                    </button>
                                    <p className="text-center text-[11px] text-zinc-600">
                                        {trialLabel} left in trial · cancel anytime
                                    </p>
                                </>
                            ) : !hasUsedTrial ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => { startTrial(); onClose(); }}
                                        className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
                                    >
                                        Start 3-day free trial
                                    </button>
                                    <p className="text-center text-[11px] text-zinc-600">
                                        No card required · full Pro access · expires after {BILLING_CONFIG.plans.pro.trialDays} days
                                    </p>
                                    <div className="flex items-center gap-3 py-1">
                                        <div className="h-px flex-1 bg-zinc-800" />
                                        <span className="text-[10px] text-zinc-700">or pay now</span>
                                        <div className="h-px flex-1 bg-zinc-800" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { activatePro(); onClose(); }}
                                        className="w-full rounded-xl border border-zinc-700 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                                    >
                                        {isYearly
                                            ? `Pay now — ${formatRegionalDualLine(PRO_BILLING.yearlyInr, pricingRegion, { usdDecimals: 2 })} /yr`
                                            : `Pay now — ${formatRegionalDualLine(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 })} /mo`}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => { activatePro(); onClose(); }}
                                        className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
                                    >
                                        {isYearly
                                            ? `Upgrade to Pro — ${formatRegionalDualLine(PRO_BILLING.yearlyInr, pricingRegion, { usdDecimals: 2 })} /yr`
                                            : `Upgrade to Pro — ${formatRegionalDualLine(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 })} /mo`}
                                    </button>
                                    <p className="text-center text-[11px] text-zinc-600">
                                        Instant access · cancel anytime
                                    </p>
                                </>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
