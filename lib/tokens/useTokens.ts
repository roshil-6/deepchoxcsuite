'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    getTokenState,
    getUserTier,
    spendTokens,
    getTokenStats,
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
    refresh: () => void;
}

export function useTokens(): UseTokensReturn {
    const [state, setState] = useState<TokenState>(() => getTokenState());

    const refresh = useCallback(() => {
        setState(getTokenState());
    }, []);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 60000);
        return () => clearInterval(interval);
    }, [refresh]);

    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (
                e.key === 'dexo-token-state' ||
                e.key === 'dexo-user-tier' ||
                e.key === 'deepchox_plan'
            ) {
                refresh();
            }
        };
        const sameTab = () => refresh();
        window.addEventListener('storage', handleStorage);
        window.addEventListener('deepchox-subscription-changed', sameTab);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('deepchox-subscription-changed', sameTab);
        };
    }, [refresh]);

    const spend = useCallback((cost: number, action: string) => {
        const result = spendTokens(cost, action);
        setState(result.state);
        return { success: result.success, message: result.message };
    }, []);

    const checkAfford = useCallback((cost: number) => canAfford(cost), [state]);
    const preview = useCallback((cost: number) => previewCost(cost), [state]);
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
