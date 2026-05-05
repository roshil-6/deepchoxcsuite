'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Infinity } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useUser } from '@clerk/nextjs';
import { FREE_DAILY_TOKENS } from '@/lib/tokens/tokenSystem';
import {
    formatRegionalDualLine,
    formatRegionalPricePair,
    getProBillingAmounts,
} from '@/lib/billingConfig';
import { usePricingRegion } from '@/hooks/usePricingRegion';
import { openRazorpayPaymentPage } from '@/lib/razorpayPaymentLink';


interface UpgradeModalProps {
    open: boolean;
    onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
    const { isPaidPro, deactivatePro } = useSubscription();
    const { user } = useUser();
    const [awaitingPayment, setAwaitingPayment] = useState(false);
    const [checking, setChecking] = useState(false);
    const pricingRegion = usePricingRegion();
    const PRO_BILLING = getProBillingAmounts();

    // If they just became Pro (webhook + tab focus reload), close the modal.
    // Must be in a useEffect â€” calling onClose() during render is a React violation
    // that causes "Cannot update a component while rendering a different component".
    useEffect(() => {
        if (isPaidPro && awaitingPayment) onClose();
    }, [isPaidPro, awaitingPayment, onClose]);

    if (!open) return null;

    const payOnRazorpay = () => {
        const opened = openRazorpayPaymentPage('monthly', user?.id);
        if (opened) {
            setAwaitingPayment(true);   // stay open â€” show "I've paid" CTA
            return;
        }
        // Payment link not configured â€” never grant Pro for free.
        alert('Payment is not configured yet. Contact support to upgrade.');
    };

    const checkPaymentStatus = async () => {
        setChecking(true);
        try { await user?.reload(); } catch { /* noop */ }
        setTimeout(() => setChecking(false), 1500);
    };

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
                        <p className="mt-0.5 text-xs text-zinc-500">Remove the daily AI limit â€” use Dexo as much as you need, no cap</p>
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


                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 sm:p-5">


                        {/* Plan cards */}
                        <div className="grid gap-3 sm:grid-cols-2">

                            {/* Free card */}
                            <div className="flex flex-col rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/50 to-zinc-950 p-5 sm:p-6">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Founder</p>
                                <p className="mt-4 text-[32px] font-bold leading-none tracking-tight text-white">
                                    Free
                                </p>
                                <p className="mt-1.5 text-[12px] text-zinc-500">Forever â€” no card needed</p>

                                <div className="my-5 h-px bg-zinc-800/60" />

                                <ul className="flex-1 space-y-4">
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                        <div>
                                            <p className="text-[12.5px] font-medium leading-snug text-zinc-200">Full workspace</p>
                                            <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">Every desk, Dexo, daily briefs, staff sync, calendar &amp; tools</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                        <div>
                                            <p className="text-[12.5px] font-medium leading-snug text-zinc-200">{FREE_DAILY_TOKENS} AI tokens/day</p>
                                            <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">Shared across chat &amp; analysis â€” resets at midnight</p>
                                        </div>
                                    </li>
                                </ul>

                                {isPaidPro ? (
                                    <button
                                        type="button"
                                        onClick={() => { deactivatePro(); onClose(); }}
                                        className="mt-6 w-full rounded-xl border border-zinc-700/70 bg-zinc-900 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                                    >
                                        Downgrade to Free
                                    </button>
                                ) : (
                                    <div className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/60 py-2.5 text-center text-[12px] text-zinc-500">
                                        Current plan
                                    </div>
                                )}
                            </div>

                            {/* Pro card */}
                            <div className="relative flex flex-col overflow-hidden rounded-2xl border border-zinc-600/40 bg-gradient-to-b from-[#0e0c1a] to-zinc-950 p-5 ring-1 ring-white/[0.04] sm:p-6">
                                {/* Subtle top glow */}
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/08 to-transparent" aria-hidden />
                                <span className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/[0.05] blur-3xl" aria-hidden />

                                {/* Recommended badge */}
                                <div className="absolute -top-px left-4 rounded-b-lg border border-t-0 border-white/10 bg-white/[0.05] px-3 py-0.5">
                                    <span className="text-[10px] font-semibold tracking-wide text-white/55">Recommended</span>
                                </div>

                                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Co-Founder Pro</p>

                                <div className="mt-3 flex items-end gap-1.5">
                                    <span className="text-[32px] font-bold leading-none tracking-tight text-white">
                                        {formatRegionalPricePair(
                                            PRO_BILLING.monthlyInr,
                                            pricingRegion,
                                            { usdDecimals: 0 }
                                        ).primary}
                                    </span>
                                    <span className="mb-1 text-[12px] text-zinc-500">/mo</span>
                                </div>
                                <p className="mt-1.5 text-[11.5px] text-zinc-500">billed monthly Â· cancel anytime</p>

                                <div className="my-5 h-px bg-zinc-800/50" />

                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] px-3.5 py-3">
                                        <Infinity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" aria-hidden />
                                        <div>
                                            <p className="text-[12.5px] font-semibold text-zinc-100">Unlimited AI â€” no daily cap</p>
                                            <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">
                                                Analyses, chat, and re-runs â€” no token meter, no resets.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5 px-0.5">
                                        <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-white/55" aria-hidden />
                                        <p className="text-[11.5px] leading-relaxed text-zinc-500">
                                            Everything in Founder â€” plus wargame simulations &amp; cross-venture intelligence.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Awaiting payment confirmation banner */}
                        {awaitingPayment && !isPaidPro && (
                            <div className="mt-4 space-y-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                                <p className="text-center text-[13px] font-medium text-amber-200">
                                    Complete payment in the Razorpay tab, then come back here.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void checkPaymentStatus()}
                                    disabled={checking}
                                    className="w-full rounded-xl bg-amber-500/20 border border-amber-500/30 py-2.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-60"
                                >
                                    {checking ? 'Checkingâ€¦' : "I've paid â€” activate my Pro"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAwaitingPayment(false)}
                                    className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400"
                                >
                                    Pay again / change plan
                                </button>
                            </div>
                        )}

                        {/* CTA */}
                        {!awaitingPayment && (
                        <div className="mt-4 space-y-2">
                            {isPaidPro ? (
                                <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 py-3">
                                    <Check className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                                    <span className="text-sm font-medium text-zinc-300">You are on Co-Founder Pro</span>
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={payOnRazorpay}
                                        className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
                                    >
                                        {`Upgrade to Pro â€” ${formatRegionalDualLine(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 })} /mo`}
                                    </button>
                                    <p className="text-center text-[11px] text-zinc-600">
                                        Instant access Â· cancel anytime
                                    </p>
                                </>
                            )}
                        </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

