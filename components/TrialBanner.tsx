'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface TrialBannerProps {
    onUpgrade: () => void;
}

export function TrialBanner({ onUpgrade }: TrialBannerProps) {
    const { isInTrial, trialDaysLeft, trialHoursLeft } = useSubscription();

    if (!isInTrial) return null;

    const timeLabel = trialHoursLeft < 24
        ? `${trialHoursLeft}h remaining`
        : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining`;

    return (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-2 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
                <Zap className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden />
                <p className="truncate text-[11.5px] text-zinc-400">
                    <span className="font-semibold text-white">Pro trial</span>
                    {' · '}
                    <span className="text-orange-400">{timeLabel}</span>
                    <span className="hidden sm:inline"> — you have full access to all Pro features</span>
                </p>
            </div>
            <button
                type="button"
                onClick={onUpgrade}
                className="shrink-0 rounded-lg bg-gradient-to-r from-orange-500 to-white px-3 py-1 text-[11px] font-semibold text-zinc-900 transition hover:opacity-90"
            >
                Upgrade
            </button>
        </div>
    );
}
