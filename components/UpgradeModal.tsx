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
    { label: 'Strategy, Finance, Product, Market & Growth desks', detail: '5 AI teammates, each scoped to their role' },
    { label: 'Personal Assistant', detail: 'Chat-first venture setup and cross-desk coordination' },
    { label: 'AI Staff Sync', detail: 'All desks refresh research from the same venture snapshot' },
    { label: 'VC Gauntlet', detail: 'Investor-style stress test — adversarial Q&A on your pitch' },
    { label: 'Wargame Nexus', detail: 'Competitive strategy simulation — one round' },
    { label: 'Pitch Forge', detail: 'Narrative builder and slide deck exporter' },
    { label: 'Market Intelligence & Neural Diary', detail: 'Live signals, competitor tracking, and strategic notes' },
    { label: 'Dashboard, Kanban, Calendar & Meeting Room', detail: 'Execution score, board, timeline, and guided walkthroughs' },
    { label: 'Unlimited ventures', detail: 'No cap on projects or venture records' },
];

const PRO_FEATURES = [
    {
        icon: Brain,
        label: 'Executive Briefing Autopilot',
        tagline: 'A daily brief waiting for you — without asking.',
        how: [
            'Each morning DEEPCHOX scans your active ventures: overdue tasks, risks your CFO or CTO flagged, deals that went quiet, and milestones closing in.',
            'Your PA and Strategy desks compress this into a tight 5-point brief — what needs action today, what can wait, and what is quietly going sideways.',
            'Open the app and it is already there. Like a chief of staff who reviewed everything overnight and left a clear note before the day started.',
        ],
    },
    {
        icon: Target,
        label: 'Wargame Multi-Round Simulation',
        tagline: 'Not one stress test — the full campaign.',
        how: [
            'Free Wargame tests your strategy once. Multi-Round runs up to 5 back-and-forth rounds: your move, simulated competitor counter, your response — played out like a real competitive sequence.',
            'The AI uses your actual market position, stated weaknesses, and real competitive patterns to make each counter-move feel like a genuine opponent.',
            'You end with a board stress-test report: which scenario hurt most, which assumptions to defend, and which moves survived every round. Downloadable as PDF.',
        ],
    },
    {
        icon: Network,
        label: 'Cross-Venture Intelligence',
        tagline: 'One layer that sees across everything you are building.',
        how: [
            'Every desk knows only its own venture. Cross-Venture Intelligence reads across all of them at once — surfacing connections individual desks would never catch.',
            'Spots things like two ventures targeting the same customer, a GTM budget that could serve both, or a risk building quietly in one that is already present in another.',
            'Once a week it sends a synthesis note — not when you ask, but when it finds something worth flagging. Low noise, high signal.',
        ],
    },
] as const;

interface UpgradeModalProps {
    open: boolean;
    onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
    const { isPaidPro, isInTrial, hasUsedTrial, trialDaysLeft, trialHoursLeft, startTrial, activatePro, deactivatePro } = useSubscription();
    const [billing, setBilling] = useState<BillingCycle>('monthly');
    const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

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
                        <p className="mt-0.5 text-xs text-zinc-500">Automated intelligence for your AI C-Suite</p>
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
                                        Save ₹{YEARLY_SAVINGS_INR} vs monthly
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

                                <ul className="flex-1 space-y-2.5">
                                    {FREE_ITEMS.map((item) => (
                                        <li key={item.label} className="flex items-start gap-2">
                                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />
                                            <div>
                                                <p className="text-xs font-medium text-zinc-300">{item.label}</p>
                                                <p className="text-[11px] leading-snug text-zinc-600">{item.detail}</p>
                                            </div>
                                        </li>
                                    ))}
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
                                        ${isYearly ? YEARLY_MONTHLY_USD : MONTHLY_USD}
                                    </span>
                                    <span className="mb-0.5 text-xs text-zinc-500">/mo</span>
                                    <span className="mb-0.5 text-xs text-zinc-600">
                                        (₹{isYearly ? YEARLY_MONTHLY_INR : MONTHLY_INR})
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-zinc-600">
                                    {isYearly
                                        ? `$${YEARLY_TOTAL_USD}/yr (₹${YEARLY_TOTAL_INR}) · billed annually`
                                        : 'billed monthly · cancel anytime'}
                                </p>

                                <div className="my-4 h-px bg-zinc-800/80" />

                                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                                    Pro only
                                </p>
                                <div className="flex-1 space-y-3">
                                    {PRO_FEATURES.map(({ icon: Icon, label, tagline }) => (
                                        <div key={label} className="flex gap-2.5">
                                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                                            <div>
                                                <p className="text-xs font-semibold leading-snug text-zinc-200">{label}</p>
                                                <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{tagline}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-3 text-[11px] text-zinc-600">+ everything in Free</p>
                            </div>
                        </div>

                        {/* How Pro features work */}
                        <div className="mt-4">
                            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                                How Pro features work
                            </p>
                            <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800">
                                {PRO_FEATURES.map(({ icon: Icon, label, tagline, how }, i) => (
                                    <div key={label}>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedFeature((prev) => (prev === i ? null : i))}
                                            className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
                                            aria-expanded={expandedFeature === i}
                                        >
                                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-zinc-200">{label}</p>
                                                <p className="mt-0.5 text-[11px] text-zinc-500">{tagline}</p>
                                            </div>
                                            {expandedFeature === i
                                                ? <ChevronUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />
                                                : <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />
                                            }
                                        </button>
                                        {expandedFeature === i && (
                                            <div className="border-t border-zinc-800/60 bg-zinc-900/40 px-4 py-3.5">
                                                <ol className="space-y-3">
                                                    {how.map((step, si) => (
                                                        <li key={si} className="flex gap-3">
                                                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-[9px] font-bold text-zinc-500">
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
                                        className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:scale-[0.98]"
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
                                        className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:scale-[0.98]"
                                    >
                                        Start 3-day free trial
                                    </button>
                                    <p className="text-center text-[11px] text-zinc-600">
                                        No card required · full Pro access · expires after 3 days
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
                                            ? `Pay now — $${YEARLY_TOTAL_USD}/yr (₹${YEARLY_TOTAL_INR})`
                                            : `Pay now — $${MONTHLY_USD}/mo (₹${MONTHLY_INR})`}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => { activatePro(); onClose(); }}
                                        className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:scale-[0.98]"
                                    >
                                        {isYearly
                                            ? `Upgrade to Pro — $${YEARLY_TOTAL_USD}/yr (₹${YEARLY_TOTAL_INR})`
                                            : `Upgrade to Pro — $${MONTHLY_USD}/mo (₹${MONTHLY_INR})`}
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
