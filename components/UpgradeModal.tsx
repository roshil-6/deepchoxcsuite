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
    'Full AI C-Suite — all 11 desks & rooms',
    'Unlimited ventures, no cap',
    'Strategy · Finance · Product · GTM desks',
    'Personal Assistant & Meeting Room',
    'VC Gauntlet pitch practice',
    'Wargame Nexus — one-round simulation',
    'Intelligence Suite & market reports',
    'Kanban, Calendar & Pitch Forge',
];

const PRO_FEATURES = [
    {
        icon: Brain,
        label: 'Executive Briefing Autopilot',
        tagline: 'A brief waiting for you — every morning, without asking.',
        how: [
            'DEEPCHOX scans all your active ventures each morning — overdue tasks, risks your CFO or CTO flagged, deals that went quiet, milestones closing in. No prompt needed.',
            'Your PA and Strategy desks compress this into a tight 5-point brief: what needs action today, what can wait, and what is quietly going sideways.',
            'Open the app and it is already there. Like a chief of staff who reviewed everything overnight and left you a clear note before the day started.',
        ],
    },
    {
        icon: Target,
        label: 'Wargame Multi-Round Simulation',
        tagline: 'Not one stress test — the full campaign.',
        how: [
            'Free Wargame tests your strategy once. Multi-Round runs up to 5 back-and-forth rounds: your move, then a simulated competitor counter, then your response — played out like a real competitive sequence.',
            'The AI does not use generic threats. It uses your actual market position, your stated weaknesses, and real competitive patterns to make each counter-move feel like a genuine opponent.',
            'You end with a board stress-test report: which scenario hurt most, which assumptions you need to defend, and which moves survived every round. Downloadable as PDF.',
        ],
    },
    {
        icon: Network,
        label: 'Cross-Venture Intelligence',
        tagline: 'One layer that sees across everything you are building.',
        how: [
            'Every desk only knows its own venture. Cross-Venture Intelligence reads across all of them at once — spotting connections your individual desks would never surface.',
            'It catches things like: two ventures targeting the same customer, a GTM budget that could serve both, a risk present in one that is quietly building in another.',
            'Once a week it sends a synthesis note — not when you ask, but when it finds something worth flagging. Low noise, high signal.',
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
