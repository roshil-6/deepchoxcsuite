'use client';

import React, { useState } from 'react';
import { X, Check, Brain, Target, Network, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

type BillingCycle = 'monthly' | 'yearly';

const MONTHLY_INR = 300;
const MONTHLY_USD = 4;
const YEARLY_TOTAL_INR = 2999;
const YEARLY_TOTAL_USD = 40;
const YEARLY_MONTHLY_INR = 250;
const YEARLY_MONTHLY_USD = 3.33;
const YEARLY_SAVINGS_INR = MONTHLY_INR * 12 - YEARLY_TOTAL_INR;

const FREE_ITEMS = [
    'All 11 AI desks and rooms',
    'Unlimited ventures',
    'Personal Assistant + Meeting Room',
    'Strategy, Finance, Product & GTM',
    'Wargame Nexus (1 round)',
    'VC Gauntlet & Intelligence Suite',
    'Calendar, Kanban & Pitch Forge',
    'Manual executive briefings',
];

const PRO_FEATURES = [
    {
        icon: Brain,
        label: 'Executive Briefing Autopilot',
        tagline: 'Your company, summarised — every morning before you start.',
        how: [
            'Every day at a scheduled time, DEEPCHOX pulls data across all your active ventures — tasks overdue, risks flagged by your CFO or CTO desk, deals that stalled, milestones approaching.',
            'It runs this through your PA and Strategy desks to generate a tight 5-point brief: what needs your attention today, what can wait, and what looks like it is quietly going wrong.',
            'You open the app and the brief is already there — no prompt, no setup. Think of it as a chief of staff who reviewed everything overnight and left you a note.',
        ],
    },
    {
        icon: Target,
        label: 'Wargame Multi-Round Simulation',
        tagline: 'Run the full battle, not just the first move.',
        how: [
            'Free Wargame runs one round — your strategy gets stress-tested once. Multi-Round runs up to 5 adversarial rounds: your move, then a simulated competitor response, then your counter, and so on.',
            'Each round the AI plays the competitor intelligently — using your actual market context, your known weaknesses, and real competitive patterns. It does not just repeat generic threats.',
            'At the end you get a board stress-test report: the scenario that hurt you most, the assumptions you need to defend, and the moves that held up under pressure. Downloadable as PDF.',
        ],
    },
    {
        icon: Network,
        label: 'Cross-Venture Intelligence',
        tagline: 'See what your individual ventures cannot see alone.',
        how: [
            'When you have more than one venture, each desk only knows its own context. Cross-Venture Intelligence creates a meta-layer that reads across all of them simultaneously.',
            'It spots things like: Venture A and Venture B are both targeting the same customer segment — do they compete or complement? Your GTM budget for Venture C could fund a shared asset for Venture B. A risk flagged in one venture is present but unnoticed in another.',
            'The output is a weekly synthesis note — not a chatbot response you have to ask for, but a proactive signal that surfaces only when something meaningful is detected. Low noise, high signal.',
        ],
    },
] as const;

interface UpgradeModalProps {
    open: boolean;
    onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
    const { isPro, isPaidPro, isInTrial, hasUsedTrial, trialDaysLeft, trialHoursLeft, startTrial, activatePro, deactivatePro } = useSubscription();
    const [billing, setBilling] = useState<BillingCycle>('monthly');
    const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

    if (!open) return null;

    const isYearly = billing === 'yearly';

    const toggleFeature = (i: number) =>
        setExpandedFeature((prev) => (prev === i ? null : i));

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Upgrade to Pro"
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

            <div className="relative z-10 flex max-h-[94dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d0d0f] shadow-[0_20px_50px_rgba(0,0,0,0.7)]">

                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
                    <div>
                        <p className="text-[13px] font-semibold text-white">Co-Founder Pro</p>
                        <p className="text-[11px] text-zinc-500">Automated intelligence for your AI C-Suite</p>
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
                    <div className="flex shrink-0 items-center gap-2.5 border-b border-zinc-800 bg-zinc-900/60 px-6 py-2.5">
                        <Zap className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden />
                        <p className="text-[12px] text-zinc-300">
                            <span className="font-semibold text-white">
                                {trialHoursLeft < 24 ? `${trialHoursLeft}h` : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}`}
                            </span>
                            {' '}left in your free trial — upgrade to keep full access
                        </p>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-5 sm:p-6">

                        {/* Billing toggle — only show when not in trial */}
                        {!isInTrial && (
                            <div className="mb-5 flex flex-col items-center gap-2">
                                <div className="inline-flex items-center rounded-full border border-zinc-800 p-1">
                                    <button
                                        type="button"
                                        onClick={() => setBilling('monthly')}
                                        className={`rounded-full px-5 py-1.5 text-[12px] font-medium transition-all ${
                                            !isYearly ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBilling('yearly')}
                                        className={`flex items-center gap-1.5 rounded-full px-5 py-1.5 text-[12px] font-medium transition-all ${
                                            isYearly ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        Yearly
                                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-zinc-300">
                                            –17%
                                        </span>
                                    </button>
                                </div>
                                {isYearly && (
                                    <p className="text-[11px] text-zinc-500">
                                        Save &#8377;{YEARLY_SAVINGS_INR} vs monthly billing
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Plan cards */}
                        <div className="grid gap-3 sm:grid-cols-2">

                            {/* Free */}
                            <div className="flex flex-col rounded-xl border border-zinc-800 p-5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                                    Founder
                                </p>
                                <p className="mt-3 text-[34px] font-semibold leading-none tracking-tight text-white">
                                    Free
                                </p>
                                <p className="mt-1.5 text-[11px] text-zinc-600">forever, no card needed</p>

                                <div className="my-4 h-px bg-zinc-800" />

                                <ul className="flex-1 space-y-2">
                                    {FREE_ITEMS.map((item) => (
                                        <li key={item} className="flex items-center gap-2.5 text-[11.5px] text-zinc-500">
                                            <Check className="h-3 w-3 shrink-0 text-zinc-600" aria-hidden />
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                {isPaidPro ? (
                                    <button
                                        type="button"
                                        onClick={() => { deactivatePro(); onClose(); }}
                                        className="mt-5 w-full rounded-lg border border-zinc-800 py-2.5 text-[12px] text-zinc-600 transition hover:text-zinc-400"
                                    >
                                        Downgrade to Free
                                    </button>
                                ) : (
                                    <div className="mt-5 rounded-lg border border-zinc-800/50 py-2.5 text-center text-[11px] text-zinc-700">
                                        {isInTrial ? 'Trial active' : 'Current plan'}
                                    </div>
                                )}
                            </div>

                            {/* Pro */}
                            <div className="flex flex-col rounded-xl border border-zinc-800 bg-black p-5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Co-Founder Pro
                                </p>

                                <div className="mt-3 flex items-end gap-2">
                                    <span className="text-[34px] font-semibold leading-none tracking-tight text-white">
                                        ${isYearly ? YEARLY_MONTHLY_USD : MONTHLY_USD}
                                    </span>
                                    <span className="mb-1 text-[12px] text-zinc-500">/mo</span>
                                    <span className="mb-1 text-[11px] text-zinc-600">
                                        (&#8377;{isYearly ? YEARLY_MONTHLY_INR : MONTHLY_INR})
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-zinc-600">
                                    {isYearly
                                        ? `$${YEARLY_TOTAL_USD}/yr (₹${YEARLY_TOTAL_INR}) · billed annually`
                                        : 'billed monthly · cancel anytime'}
                                </p>

                                <div className="my-4 h-px bg-zinc-800" />

                                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                                    Pro-exclusive
                                </p>
                                <div className="flex-1 space-y-3.5">
                                    {PRO_FEATURES.map(({ icon: Icon, label, tagline }) => (
                                        <div key={label} className="flex gap-2.5">
                                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                                            <div>
                                                <p className="text-[11.5px] font-semibold leading-snug text-zinc-200">{label}</p>
                                                <p className="mt-0.5 text-[10.5px] leading-snug text-zinc-500">{tagline}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-3.5 text-[11px] text-zinc-600">+ everything in Free</p>
                            </div>
                        </div>

                        {/* ── How it works — expandable per feature ── */}
                        <div className="mt-5">
                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                                How the Pro features work
                            </p>
                            <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                                {PRO_FEATURES.map(({ icon: Icon, label, tagline, how }, i) => (
                                    <div key={label}>
                                        <button
                                            type="button"
                                            onClick={() => toggleFeature(i)}
                                            className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
                                            aria-expanded={expandedFeature === i}
                                        >
                                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12px] font-semibold text-zinc-200">{label}</p>
                                                <p className="mt-0.5 text-[11px] text-zinc-500">{tagline}</p>
                                            </div>
                                            {expandedFeature === i
                                                ? <ChevronUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />
                                                : <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />
                                            }
                                        </button>
                                        {expandedFeature === i && (
                                            <div className="border-t border-zinc-800/60 bg-zinc-900/30 px-4 py-4">
                                                <ol className="space-y-3">
                                                    {how.map((step, si) => (
                                                        <li key={si} className="flex gap-3">
                                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-bold text-zinc-500">
                                                                {si + 1}
                                                            </span>
                                                            <p className="text-[12px] leading-relaxed text-zinc-400">{step}</p>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-4">
                            {isPaidPro ? (
                                <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 py-3.5">
                                    <span className="text-[13px] font-semibold text-zinc-300">
                                        You are on Co-Founder Pro
                                    </span>
                                </div>
                            ) : isInTrial ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => { activatePro(); onClose(); }}
                                        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-white py-3.5 text-[14px] font-semibold text-zinc-900 transition hover:opacity-90 active:scale-[0.98]"
                                    >
                                        Upgrade to Pro — keep full access
                                    </button>
                                    <p className="mt-2.5 text-center text-[10px] text-zinc-600">
                                        {trialHoursLeft < 24 ? `${trialHoursLeft}h` : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}`} left in trial · cancel anytime
                                    </p>
                                </>
                            ) : !hasUsedTrial ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => { startTrial(); onClose(); }}
                                        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-white py-3.5 text-[14px] font-semibold text-zinc-900 transition hover:opacity-90 active:scale-[0.98]"
                                    >
                                        Start 3-Day Free Trial
                                    </button>
                                    <p className="mt-2.5 text-center text-[10px] text-zinc-600">
                                        No card required · full Pro access · trial ends after 3 days
                                    </p>
                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="h-px flex-1 bg-zinc-800" />
                                        <span className="text-[10px] text-zinc-700">or upgrade now</span>
                                        <div className="h-px flex-1 bg-zinc-800" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { activatePro(); onClose(); }}
                                        className="mt-3 w-full rounded-xl border border-zinc-700 py-2.5 text-[13px] font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                                    >
                                        {isYearly
                                            ? `Pay now — $${YEARLY_TOTAL_USD}/yr (₹${YEARLY_TOTAL_INR})`
                                            : `Pay now — $${MONTHLY_USD}/mo (₹${MONTHLY_INR})`}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => { activatePro(); onClose(); }}
                                        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-white py-3.5 text-[14px] font-semibold text-zinc-900 transition hover:opacity-90 active:scale-[0.98]"
                                    >
                                        {isYearly
                                            ? `Upgrade to Pro — $${YEARLY_TOTAL_USD}/yr (₹${YEARLY_TOTAL_INR})`
                                            : `Upgrade to Pro — $${MONTHLY_USD}/mo (₹${MONTHLY_INR})`}
                                    </button>
                                    <p className="mt-2.5 text-center text-[10px] text-zinc-600">
                                        Instant access · cancel anytime · no questions asked
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
