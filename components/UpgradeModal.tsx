'use client';

import React, { useState } from 'react';
import { X, Sparkles, Check, Brain, Target, Network, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

type BillingCycle = 'monthly' | 'yearly';

const MONTHLY_INR = 300;
const MONTHLY_USD = 4;
const YEARLY_TOTAL_INR = 2999;
const YEARLY_TOTAL_USD = 40;
const YEARLY_MONTHLY_INR = 250;
const YEARLY_MONTHLY_USD = 3.33;
const YEARLY_SAVINGS_INR = MONTHLY_INR * 12 - YEARLY_TOTAL_INR; // 601

const FREE_ITEMS = [
    'All 11 AI desks and rooms',
    'Unlimited ventures',
    'Personal Assistant + Meeting Room',
    'Strategy, Finance, Product & GTM',
    'Wargame Nexus (1 round)',
    'VC Gauntlet, Intelligence Suite',
    'Calendar, Kanban & Pitch Forge',
    'Manual executive briefings',
];

const PRO_FEATURES = [
    {
        icon: Brain,
        label: 'Executive Briefing Autopilot',
        desc: 'Daily AI brief auto-delivered — progress, risks, priorities, and market intel without you asking.',
        accent: '#a78bfa',
        glow: 'rgba(167,139,250,0.12)',
    },
    {
        icon: Target,
        label: 'Wargame Multi-Round',
        desc: 'Full adversarial simulation with competitor counter-moves, board stress-test mode, and downloadable reports.',
        accent: '#f87171',
        glow: 'rgba(248,113,113,0.12)',
    },
    {
        icon: Network,
        label: 'Cross-Venture Intelligence',
        desc: 'AI that spots patterns, conflicts, and synergies across all your ventures — portfolio-level decisions.',
        accent: '#38bdf8',
        glow: 'rgba(56,189,248,0.12)',
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

    const isYearly = billing === 'yearly';

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Upgrade to Pro"
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} aria-hidden />

            <div className="relative z-10 flex max-h-[94dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0b0b0d] shadow-[0_32px_80px_rgba(0,0,0,0.95)]">

                {/* Header */}
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15">
                            <Zap className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-zinc-100">Upgrade to Co-Founder Pro</p>
                            <p className="text-[11px] text-zinc-500">Unlock automated intelligence</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition hover:bg-white/[0.07] hover:text-zinc-300"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-5 sm:p-6">

                        {/* Billing toggle */}
                        <div className="mb-5 flex flex-col items-center gap-2.5">
                            <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950 p-1 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setBilling('monthly')}
                                    className={`rounded-full px-5 py-1.5 text-[12px] font-semibold transition-all ${
                                        !isYearly
                                            ? 'bg-zinc-700 text-white shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBilling('yearly')}
                                    className={`flex items-center gap-2 rounded-full px-5 py-1.5 text-[12px] font-semibold transition-all ${
                                        isYearly
                                            ? 'bg-zinc-700 text-white shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    Yearly
                                    <span className="rounded-full bg-amber-400/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                                        Save 17%
                                    </span>
                                </button>
                            </div>
                            {isYearly && (
                                <p className="flex items-center gap-1.5 text-[11px] text-emerald-400/90">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    You save &#8377;{YEARLY_SAVINGS_INR} compared to monthly billing
                                </p>
                            )}
                        </div>

                        {/* Plan cards */}
                        <div className="grid gap-3 sm:grid-cols-2">

                            {/* ── Free card ── */}
                            <div className="flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">
                                    Founder
                                </p>
                                <p className="mt-2.5 text-[38px] font-bold leading-none tracking-tight text-zinc-300">
                                    Free
                                </p>
                                <p className="mt-1 text-[11px] text-zinc-600">forever, no card needed</p>

                                <div className="my-4 h-px bg-zinc-800" />

                                <ul className="flex-1 space-y-2">
                                    {FREE_ITEMS.map((item) => (
                                        <li key={item} className="flex items-center gap-2 text-[11.5px] text-zinc-500">
                                            <Check className="h-3 w-3 shrink-0 text-zinc-600" aria-hidden />
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                {isPro ? (
                                    <button
                                        type="button"
                                        onClick={() => { deactivatePro(); onClose(); }}
                                        className="mt-5 w-full rounded-xl border border-zinc-800 py-2.5 text-[12px] text-zinc-600 transition hover:border-zinc-700 hover:text-zinc-400"
                                    >
                                        Downgrade to Free
                                    </button>
                                ) : (
                                    <div className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 py-2.5">
                                        <span className="text-[11px] text-zinc-600">Current plan</span>
                                    </div>
                                )}
                            </div>

                            {/* ── Pro card ── */}
                            <div
                                className="relative flex flex-col overflow-hidden rounded-2xl border border-amber-400/30 p-5"
                                style={{
                                    background: 'linear-gradient(160deg, #130f00 0%, #0d0c0a 50%, #090909 100%)',
                                    boxShadow: '0 0 0 1px rgba(251,191,36,0.1), 0 8px 40px rgba(251,191,36,0.1), 0 2px 8px rgba(0,0,0,0.6)',
                                }}
                            >
                                {/* Glow orb */}
                                <div
                                    className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl"
                                    style={{ background: 'rgba(251,191,36,0.15)' }}
                                    aria-hidden
                                />

                                <div className="relative flex flex-1 flex-col">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/90">
                                            Co-Founder Pro
                                        </p>
                                    </div>

                                    {/* Price */}
                                    <div className="mt-2.5">
                                        <div className="flex items-start gap-1">
                                            <span className="mt-1.5 text-[16px] font-semibold text-zinc-300">&#8377;</span>
                                            <span className="text-[38px] font-bold leading-none tracking-tight text-white">
                                                {isYearly ? YEARLY_MONTHLY_INR : MONTHLY_INR}
                                            </span>
                                            <div className="ml-1 mt-1.5 flex flex-col">
                                                <span className="text-[12px] text-zinc-500">/mo</span>
                                                <span className="text-[10px] text-zinc-600">
                                                    (~${isYearly ? YEARLY_MONTHLY_USD : MONTHLY_USD})
                                                </span>
                                            </div>
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-zinc-600">
                                            {isYearly
                                                ? `₹${YEARLY_TOTAL_INR}/yr (~$${YEARLY_TOTAL_USD}) · billed annually`
                                                : 'billed monthly · cancel anytime'}
                                        </p>
                                    </div>

                                    <div className="my-4 h-px bg-amber-400/10" />

                                    {/* Pro-exclusive features */}
                                    <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400/50">
                                        Pro-exclusive intelligence
                                    </p>

                                    <div className="flex-1 space-y-2">
                                        {PRO_FEATURES.map(({ icon: Icon, label, desc, accent, glow }) => (
                                            <div
                                                key={label}
                                                className="flex gap-3 rounded-xl border p-2.5"
                                                style={{
                                                    borderColor: `${accent}28`,
                                                    background: `radial-gradient(ellipse at top left, ${glow} 0%, transparent 60%)`,
                                                }}
                                            >
                                                <span
                                                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                                                    style={{ background: `${accent}18` }}
                                                >
                                                    <Icon
                                                        className="h-3.5 w-3.5"
                                                        style={{ color: accent }}
                                                        aria-hidden
                                                    />
                                                </span>
                                                <div>
                                                    <p className="text-[11px] font-semibold text-zinc-200">{label}</p>
                                                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="mt-3 text-[11px] text-zinc-500">+ everything in Free</p>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-4">
                            {isPro ? (
                                <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] py-3.5">
                                    <Sparkles className="h-4 w-4 text-amber-400" aria-hidden />
                                    <span className="text-[13px] font-semibold text-amber-300">
                                        You are on Co-Founder Pro
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => { activatePro(); onClose(); }}
                                        className="relative w-full overflow-hidden rounded-2xl py-3.5 text-[14px] font-bold text-black transition-all active:scale-[0.98]"
                                        style={{
                                            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                                            boxShadow: '0 4px 24px rgba(251,191,36,0.35)',
                                        }}
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <Sparkles className="h-4 w-4" aria-hidden />
                                            {isYearly
                                                ? `Upgrade to Pro — ₹${YEARLY_TOTAL_INR}/yr (~$${YEARLY_TOTAL_USD})`
                                                : `Upgrade to Pro — ₹${MONTHLY_INR}/mo (~$${MONTHLY_USD})`}
                                        </span>
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
