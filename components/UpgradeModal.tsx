'use client';

import React from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { PLANS } from '@/lib/plans';

const FREE_ITEMS = [
    '1 active venture',
    'All 5 AI desks (chat)',
    'Personal Assistant',
    'Dashboard, Kanban & Calendar',
    'Pitch deck PDF export',
    '1 staff sync per day',
];

const PRO_ITEMS = [
    'Unlimited ventures',
    'Unlimited staff syncs',
    'Relay Meeting Room',
    'VC Gauntlet — pitch practice',
    'Wargame Nexus — scenario planning',
    'Intelligence Suite',
    'File uploads & document context',
    'Living Office Memory',
];

interface UpgradeModalProps {
    open: boolean;
    onClose: () => void;
    /** Highlight a specific feature in the Pro list */
    highlight?: string;
}

export function UpgradeModal({ open, onClose, highlight }: UpgradeModalProps) {
    const { isPro, activatePro, deactivatePro } = useSubscription();

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Upgrade to Pro"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />

            {/* Modal card */}
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.09] bg-[#111113] shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400/80">
                            DEEPCHOX Pro
                        </p>
                        <h2 className="mt-1 text-[20px] font-semibold leading-snug tracking-tight text-zinc-100">
                            Upgrade to Co-Founder
                        </h2>
                        <p className="mt-1 text-[13px] text-zinc-500">
                            Unlock the full AI C-Suite experience
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

                {/* Plans side by side */}
                <div className="grid grid-cols-2 gap-3 p-5">
                    {/* Free */}
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="text-[11px] font-semibold text-zinc-500">Founder</p>
                        <p className="mt-1 text-[22px] font-bold leading-none text-zinc-300">Free</p>
                        <p className="mt-0.5 text-[10px] text-zinc-600">forever</p>
                        <ul className="mt-4 space-y-2">
                            {FREE_ITEMS.map((item) => (
                                <li key={item} className="flex items-start gap-1.5 text-[11px] text-zinc-500">
                                    <Check className="mt-px h-3 w-3 shrink-0 text-zinc-600" aria-hidden />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        {isPro && (
                            <button
                                type="button"
                                onClick={() => { deactivatePro(); onClose(); }}
                                className="mt-4 w-full rounded-xl border border-white/[0.06] py-2 text-[11px] text-zinc-600 transition hover:text-zinc-400"
                            >
                                Downgrade
                            </button>
                        )}
                    </div>

                    {/* Pro */}
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-semibold text-amber-400/90">Co-Founder</p>
                            <Sparkles className="h-3 w-3 text-amber-400/70" aria-hidden />
                        </div>
                        <p className="mt-1 text-[22px] font-bold leading-none text-zinc-100">
                            {PLANS.pro.price}
                            <span className="text-[13px] font-normal text-zinc-500">/mo</span>
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-600">cancel anytime</p>
                        <ul className="mt-4 space-y-2">
                            {PRO_ITEMS.map((item) => (
                                <li
                                    key={item}
                                    className={`flex items-start gap-1.5 text-[11px] ${
                                        highlight && item.startsWith(highlight.slice(0, 12))
                                            ? 'font-semibold text-amber-300/90'
                                            : 'text-zinc-400'
                                    }`}
                                >
                                    <Check
                                        className={`mt-px h-3 w-3 shrink-0 ${
                                            highlight && item.startsWith(highlight.slice(0, 12))
                                                ? 'text-amber-400'
                                                : 'text-amber-400/50'
                                        }`}
                                        aria-hidden
                                    />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* CTA */}
                <div className="border-t border-white/[0.06] px-5 pb-5 pt-4">
                    {isPro ? (
                        <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] py-3">
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
                                className="w-full rounded-2xl bg-white py-3 text-[14px] font-semibold text-zinc-900 shadow-[0_2px_20px_rgba(255,255,255,0.15)] transition hover:bg-zinc-100 active:scale-[0.98]"
                            >
                                Upgrade to Pro — $29/mo
                            </button>
                            <p className="mt-2.5 text-center text-[10px] text-zinc-600">
                                Instant access · cancel anytime · no questions asked
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
