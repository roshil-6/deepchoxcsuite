'use client';

import React, { useState } from 'react';
import { X, Sparkles, Check, Brain, Target, Network } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

type BillingCycle = 'monthly' | 'yearly';

// ── Pricing constants ─────────────────────────────────────────────────────────
const MONTHLY_INR = 300;
const MONTHLY_USD = 4;
const YEARLY_MONTHLY_INR = 250;   // ₹2999 / 12, rounded
const YEARLY_MONTHLY_USD = 3.33;
const YEARLY_TOTAL_INR = 2999;
const YEARLY_TOTAL_USD = 40;

// ── Free tier features ────────────────────────────────────────────────────────
const FREE_ITEMS = [
    'All 11 AI desks and rooms',
    'Unlimited ventures',
    'Personal Assistant + Meeting Room',
    'Strategy, Finance, Product & GTM desks',
    'Wargame Nexus (1 round)',
    'VC Gauntlet — pitch practice',
    'Intelligence Suite & Reports',
    'Manual executive briefings on demand',
    'Calendar, Kanban & Pitch Forge',
];

// ── Pro-exclusive intelligence features ──────────────────────────────────────
const PRO_FEATURES = [
    {
        icon: Brain,
        name: 'Executive Briefing Autopilot',
        description:
            'Daily AI brief auto-delivered every morning — venture progress, risks flagged, priorities, and market intel without you asking.',
        color: 'text-violet-400',
        bg: 'bg-violet-400/[0.07]',
        border: 'border-violet-400/[0.18]',
    },
    {
        icon: Target,
        name: 'Wargame Multi-Round Simulation',
        description:
            'Full adversarial simulation with competitor counter-moves across multiple rounds, board stress-test mode, and downloadable scenario reports.',
        color: 'text-rose-400',
        bg: 'bg-rose-400/[0.07]',
        border: 'border-rose-400/[0.18]',
    },
    {
        icon: Network,
        name: 'Cross-Venture Intelligence',
        description:
            'AI layer that spots patterns, resource conflicts, and synergies across all your ventures simultaneously — portfolio-level decisions.',
        color: 'text-sky-400',
        bg: 'bg-sky-400/[0.07]',
        border: 'border-sky-400/[0.18]',
    },
] as const;

interface UpgradeModalProps {
    open: boolean;
    onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
    const { isPro, activatePro, deactivatePro } = useSubscription();
    const [billing, setBilling] = useState<BillingCycle>('monthly');

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Upgrade to Pro"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/78 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />

            {/* Modal card — scrollable on small screens */}
            <div className="relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0d0f] shadow-[0_28px_80px_rgba(0,0,0,0.9)]">

                {/* ── Header ── */}
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6 sm:py-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400/90">
                                DEEPCHOX Pro
                            </p>
                        </div>
                        <h2 className="mt-1.5 text-[18px] font-semibold leading-snug tracking-tight text-zinc-100 sm:text-[20px]">
                            Unlock automated intelligence
                        </h2>
                        <p className="mt-0.5 text-[12px] text-zinc-500">
                            Three features that turn your AI team into an autonomous operator
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-xl p-2 text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-300"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-5 sm:p-6">

                        {/* Billing toggle */}
                        <div className="mb-5 flex justify-center">
                            <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
                                <button
                                    type="button"
                                    onClick={() => setBilling('monthly')}
                                    className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition ${
                                        billing === 'monthly'
                                            ? 'bg-white/[0.1] text-zinc-100'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBilling('yearly')}
                                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition ${
                                        billing === 'yearly'
                                            ? 'bg-white/[0.1] text-zinc-100'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    Yearly
                                    <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                                        Save 17%
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* ── Plan cards ── */}
                        <div className="grid gap-3 sm:grid-cols-2">

                            {/* Free */}
                            <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                                    Founder
                                </p>
                                <p className="mt-2 text-[26px] font-bold leading-none text-zinc-300">Free</p>
                                <p className="mt-0.5 text-[11px] text-zinc-600">forever, no card needed</p>

                                <div className="my-4 h-px bg-white/[0.05]" />

                                <ul className="flex-1 space-y-2">
                                    {FREE_ITEMS.map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-2 text-[11px] text-zinc-500"
                                        >
                                            <Check
                                                className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600"
                                                aria-hidden
                                            />
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                {isPro && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            deactivatePro();
                                            onClose();
                                        }}
                                        className="mt-4 w-full rounded-xl border border-white/[0.06] py-2 text-[11px] text-zinc-600 transition hover:text-zinc-400"
                                    >
                                        Downgrade to Free
                                    </button>
                                )}
                            </div>

                            {/* Pro */}
                            <div className="relative flex flex-col overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/[0.05] to-transparent p-4">
                                <div
                                    className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-400/10 blur-2xl"
                                    aria-hidden
                                />
                                <div className="relative flex flex-1 flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles className="h-3 w-3 text-amber-400/80" aria-hidden />
                                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-400/90">
                                            Co-Founder Pro
                                        </p>
                                    </div>

                                    {/* Price */}
                                    {billing === 'monthly' ? (
                                        <>
                                            <div className="mt-2 flex items-end gap-1.5">
                                                <p className="text-[26px] font-bold leading-none text-zinc-100">
                                                    &#8377;{MONTHLY_INR}
                                                </p>
                                                <span className="mb-0.5 text-[13px] text-zinc-500">/mo</span>
                                                <span className="mb-0.5 ml-0.5 text-[11px] text-zinc-600">
                                                    (~${MONTHLY_USD})
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-zinc-600">
                                                billed monthly &middot; cancel anytime
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="mt-2 flex items-end gap-1.5">
                                                <p className="text-[26px] font-bold leading-none text-zinc-100">
                                                    &#8377;{YEARLY_MONTHLY_INR}
                                                </p>
                                                <span className="mb-0.5 text-[13px] text-zinc-500">/mo</span>
                                                <span className="mb-0.5 ml-0.5 text-[11px] text-zinc-600">
                                                    (~${YEARLY_MONTHLY_USD})
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-zinc-600">
                                                &#8377;{YEARLY_TOTAL_INR}/yr (~${YEARLY_TOTAL_USD}) &middot; billed annually
                                            </p>
                                        </>
                                    )}

                                    <div className="my-4 h-px bg-amber-400/10" />

                                    {/* 3 Pro-exclusive features */}
                                    <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400/60">
                                        Pro-exclusive intelligence
                                    </p>
                                    <div className="flex-1 space-y-2">
                                        {PRO_FEATURES.map(
                                            ({ icon: Icon, name, description, color, bg, border }) => (
                                                <div
                                                    key={name}
                                                    className={`flex gap-2.5 rounded-xl border ${border} ${bg} p-2.5`}
                                                >
                                                    <span className={`mt-0.5 shrink-0 ${color}`}>
                                                        <Icon className="h-3.5 w-3.5" aria-hidden />
                                                    </span>
                                                    <div>
                                                        <p className="text-[11px] font-semibold leading-snug text-zinc-200">
                                                            {name}
                                                        </p>
                                                        <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
                                                            {description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>

                                    <p className="mt-3 text-[11px] text-zinc-500">
                                        + everything in Free
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── CTA ── */}
                        <div className="mt-4">
                            {isPro ? (
                                <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] py-3.5">
                                    <Sparkles className="h-4 w-4 text-amber-400" aria-hidden />
                                    <span className="text-[13px] font-semibold text-amber-300">
                                        You are on Co-Founder Pro
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            activatePro();
                                            onClose();
                                        }}
                                        className="w-full rounded-2xl bg-white py-3.5 text-[14px] font-semibold text-zinc-900 shadow-[0_2px_24px_rgba(255,255,255,0.12)] transition hover:bg-zinc-100 active:scale-[0.98]"
                                    >
                                        {billing === 'monthly'
                                            ? `Upgrade to Pro — ₹${MONTHLY_INR}/mo (~$${MONTHLY_USD})`
                                            : `Upgrade to Pro — ₹${YEARLY_TOTAL_INR}/yr (~$${YEARLY_TOTAL_USD})`}
                                    </button>
                                    <p className="mt-2.5 text-center text-[10px] text-zinc-600">
                                        Instant access &middot; cancel anytime &middot; no questions asked
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
