'use client';

import React from 'react';
import { Coins, Crown, ArrowRight } from 'lucide-react';
import { useTokens } from '@/lib/tokens/useTokens';

interface TokenWarningProps {
    onUpgrade: () => void;
}

export function TokenWarningBanner({ onUpgrade }: TokenWarningProps) {
    const tokens = useTokens();
    
    // Don't show for pro users
    if (tokens.isPro) return null;
    
    // Show warning when low or critical
    if (!tokens.stats.isLow && !tokens.stats.isCritical) return null;
    
    const isCritical = tokens.stats.isCritical;
    
    return (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border ${
            isCritical 
                ? 'bg-red-500/15 border-red-500/30' 
                : 'bg-amber-500/15 border-amber-500/30'
        }`}>
            <div className="flex items-center gap-2">
                <Coins className={`h-3.5 w-3.5 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
                <span className={`text-[11px] ${isCritical ? 'text-red-300' : 'text-amber-300'}`}>
                    {isCritical 
                        ? `Only ${tokens.tokensRemaining} tokens left!` 
                        : `${tokens.tokensRemaining} tokens remaining`
                    }
                </span>
            </div>
            <button
                onClick={onUpgrade}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    isCritical
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                }`}
            >
                <Crown className="h-3 w-3" />
                Upgrade
                <ArrowRight className="h-3 w-3" />
            </button>
        </div>
    );
}

// Inline warning for specific actions
export function TokenInlineWarning({ cost, action }: { cost: number; action: string }) {
    const tokens = useTokens();
    
    if (tokens.isPro) return null;
    
    const canAfford = tokens.canAfford(cost);
    const remaining = tokens.tokensRemaining;
    
    if (canAfford && remaining > 10) return null;
    
    if (!canAfford) {
        return (
            <div className="flex items-center gap-2 text-[10px] text-red-400">
                <Coins className="h-3 w-3" />
                <span>Need {cost} tokens ({remaining} available)</span>
            </div>
        );
    }
    
    return (
        <div className="flex items-center gap-2 text-[10px] text-amber-400">
            <Coins className="h-3 w-3" />
            <span>Low tokens: {cost} for {action}, {remaining} left</span>
        </div>
    );
}

// Cost preview pill
export function TokenCostPill({ cost }: { cost: number }) {
    const tokens = useTokens();
    
    if (tokens.isPro) return null;
    
    const canAfford = tokens.canAfford(cost);
    
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${
            canAfford 
                ? 'bg-slate-800 text-slate-500' 
                : 'bg-red-500/20 text-red-400'
        }`}>
            <Coins className="h-2.5 w-2.5" />
            {cost}
        </span>
    );
}
