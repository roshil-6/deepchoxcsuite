'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    getTokenState,
    getUserTier,
    spendTokens,
    getTokenStats,
    setUserTier,
    type UserTier,
    type TokenState,
    TOKEN_COSTS,
    canAfford,
    previewCost,
} from './tokenSystem';

export interface UseTokensReturn {
    // State
    tier: UserTier;
    tokensRemaining: number;
    tokensUsedToday: number;
    dailyLimit: number;
    
    // Computed
    isPro: boolean;
    isFree: boolean;
    stats: ReturnType<typeof getTokenStats>;
    
    // Actions
    spend: (cost: number, action: string) => { success: boolean; message?: string };
    canAfford: (cost: number) => boolean;
    previewCost: (cost: number) => string;
    upgradeToPro: () => void;
    downgradeToFree: () => void; // For testing
    refresh: () => void;
}

export function useTokens(): UseTokensReturn {
    const [state, setState] = useState<TokenState>(() => getTokenState());
    
    // Refresh state from localStorage
    const refresh = useCallback(() => {
        setState(getTokenState());
    }, []);
    
    // Initial load and periodic refresh (for day changes)
    useEffect(() => {
        refresh();
        
        // Check for day changes every minute
        const interval = setInterval(refresh, 60000);
        return () => clearInterval(interval);
    }, [refresh]);
    
    // Listen for storage changes (multi-tab sync)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'dexo-token-state' || e.key === 'dexo-user-tier') {
                refresh();
            }
        };
        
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [refresh]);
    
    // Spend tokens wrapper
    const spend = useCallback((cost: number, action: string) => {
        const result = spendTokens(cost, action);
        setState(result.state);
        return {
            success: result.success,
            message: result.message,
        };
    }, []);
    
    // Can afford check
    const checkAfford = useCallback((cost: number) => {
        return canAfford(cost);
    }, [state]);
    
    // Preview cost
    const preview = useCallback((cost: number) => {
        return previewCost(cost);
    }, [state]);
    
    // Tier management
    const upgradeToPro = useCallback(() => {
        setUserTier('pro');
        refresh();
    }, [refresh]);
    
    const downgradeToFree = useCallback(() => {
        setUserTier('free');
        refresh();
    }, [refresh]);
    
    // Computed stats
    const stats = useMemo(() => getTokenStats(), [state]);
    
    return {
        tier: state.tier,
        tokensRemaining: state.tokensRemaining,
        tokensUsedToday: state.tokensUsedToday,
        dailyLimit: state.dailyLimit,
        isPro: state.tier === 'pro',
        isFree: state.tier === 'free',
        stats,
        spend,
        canAfford: checkAfford,
        previewCost: preview,
        upgradeToPro,
        downgradeToFree,
        refresh,
    };
}

// Convenience hooks for specific actions

export function useTokenCost(action: keyof typeof TOKEN_COSTS) {
    const cost = TOKEN_COSTS[action];
    const tokens = useTokens();
    
    return {
        cost,
        canAfford: tokens.canAfford(cost),
        preview: tokens.previewCost(cost),
        spend: () => tokens.spend(cost, action),
    };
}

export function useAnalysisCost() {
    return useTokenCost('ANALYSIS');
}

export function useChatCost() {
    return useTokenCost('CHAT_MESSAGE');
}
