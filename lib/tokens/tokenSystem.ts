import { readSubscriptionIsPro, PLAN_STORAGE_KEY, emitSubscriptionChanged } from '@/lib/subscriptionLocal';

/**
 * Suite token / credit meter (client-side).
 *
 * Free: shared daily pool used by Dexo, desks, PA, Jarvis, Scout intel, etc.
 * Pro (paid, via Razorpay webhook → Clerk metadata): unlimited — no deductions.
 */

export type UserTier = 'free' | 'pro';

export interface TokenState {
    tier: UserTier;
    tokensRemaining: number;
    tokensUsedToday: number;
    dailyLimit: number;
    lastResetDate: string; // YYYY-MM-DD
    totalUsedAllTime: number;
}

// Daily token limits for free tier
export const FREE_DAILY_TOKENS = 50; // Generous but not unlimited
export const PRO_DAILY_TOKENS = Infinity;

// Token costs for different actions
export const TOKEN_COSTS = {
    ANALYSIS: 10,        // Full venture analysis
    CHAT_MESSAGE: 2,     // Each conversation message
    VOICE_READ: 0,       // Free - encourages engagement
    HISTORY_VIEW: 0,       // Free - viewing old analyses
    REANALYZE: 8,        // Slightly cheaper than fresh analysis
} as const;

const STORAGE_KEY = 'dexo-token-state';
const TIER_STORAGE_KEY = 'dexo-user-tier';

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Initialize or load token state
 */
export function getTokenState(): TokenState {
    if (typeof window === 'undefined') {
        return createDefaultState('free');
    }

    const effectiveTier: UserTier = readSubscriptionIsPro() ? 'pro' : 'free';

    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const parsed = JSON.parse(saved) as TokenState;
            const today = getTodayString();

            if (parsed.lastResetDate !== today) {
                return {
                    ...parsed,
                    tier: effectiveTier,
                    tokensRemaining: effectiveTier === 'pro' ? PRO_DAILY_TOKENS : FREE_DAILY_TOKENS,
                    tokensUsedToday: 0,
                    lastResetDate: today,
                    dailyLimit: effectiveTier === 'pro' ? PRO_DAILY_TOKENS : FREE_DAILY_TOKENS,
                };
            }

            const merged: TokenState = {
                ...parsed,
                tier: effectiveTier,
                dailyLimit: effectiveTier === 'pro' ? PRO_DAILY_TOKENS : FREE_DAILY_TOKENS,
            };
            if (effectiveTier === 'pro') {
                merged.tokensRemaining = PRO_DAILY_TOKENS;
            } else {
                if (typeof merged.tokensRemaining !== 'number' || isNaN(merged.tokensRemaining)) {
                    merged.tokensRemaining = FREE_DAILY_TOKENS;
                }
                if (typeof merged.tokensUsedToday !== 'number' || isNaN(merged.tokensUsedToday)) {
                    merged.tokensUsedToday = 0;
                }
                merged.tokensRemaining = Math.min(
                    Math.max(0, merged.tokensRemaining),
                    FREE_DAILY_TOKENS,
                );
            }
            return merged;
        }

        return createDefaultState(effectiveTier);
    } catch {
        return createDefaultState(effectiveTier);
    }
}

/**
 * Create default token state
 */
function createDefaultState(tier: UserTier): TokenState {
    return {
        tier,
        tokensRemaining: tier === 'pro' ? PRO_DAILY_TOKENS : FREE_DAILY_TOKENS,
        tokensUsedToday: 0,
        dailyLimit: tier === 'pro' ? PRO_DAILY_TOKENS : FREE_DAILY_TOKENS,
        lastResetDate: getTodayString(),
        totalUsedAllTime: 0,
    };
}

/**
 * Save token state to localStorage
 */
function saveTokenState(state: TokenState): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Save user tier
 */
export function setUserTier(tier: UserTier): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(TIER_STORAGE_KEY, tier);
        localStorage.setItem(PLAN_STORAGE_KEY, tier === 'pro' ? 'pro' : 'free');
        const newState = createDefaultState(tier);
        saveTokenState(newState);
        emitSubscriptionChanged();
    } catch {
        // Ignore storage errors
    }
}

/**
 * Get user tier
 */
export function getUserTier(): UserTier {
    if (typeof window === 'undefined') return 'free';
    return readSubscriptionIsPro() ? 'pro' : 'free';
}

/**
 * Check if user can afford an action
 */
export function canAfford(cost: number): boolean {
    const state = getTokenState();
    if (state.tier === 'pro') return true;
    return state.tokensRemaining >= cost;
}

/**
 * Spend tokens for an action
 * Returns success status and updated state
 */
export function spendTokens(cost: number, action: string): { 
    success: boolean; 
    state: TokenState; 
    message?: string;
} {
    const state = getTokenState();
    
    // Pro users never spend
    if (state.tier === 'pro') {
        return { 
            success: true, 
            state: { ...state, totalUsedAllTime: state.totalUsedAllTime + cost }
        };
    }
    
    // Check if can afford
    if (state.tokensRemaining < cost) {
        return {
            success: false,
            state,
            message: `Insufficient tokens. Need ${cost}, have ${state.tokensRemaining}. Upgrade to Pro for unlimited access.`,
        };
    }
    
    // Deduct tokens
    const newState: TokenState = {
        ...state,
        tokensRemaining: state.tokensRemaining - cost,
        tokensUsedToday: state.tokensUsedToday + cost,
        totalUsedAllTime: state.totalUsedAllTime + cost,
    };
    
    saveTokenState(newState);
    
    return { success: true, state: newState };
}

/**
 * Preview token cost without spending
 */
export function previewCost(cost: number): string {
    const state = getTokenState();
    if (state.tier === 'pro') return 'Unlimited';
    
    const remaining = state.tokensRemaining - cost;
    const percentage = Math.round((remaining / FREE_DAILY_TOKENS) * 100);
    
    if (remaining < 0) {
        return `Need ${cost} more tokens`;
    }
    
    return `${remaining} left (${percentage}%)`;
}

/**
 * Get token usage stats
 */
export function getTokenStats(): {
    usedToday: number;
    remaining: number;
    dailyLimit: number;
    percentageUsed: number;
    percentageRemaining: number;
    isLow: boolean;
    isCritical: boolean;
} {
    const state = getTokenState();
    
    if (state.tier === 'pro') {
        return {
            usedToday: state.tokensUsedToday,
            remaining: Infinity as unknown as number,
            dailyLimit: Infinity as unknown as number,
            percentageUsed: 0,
            percentageRemaining: 100,
            isLow: false,
            isCritical: false,
        };
    }
    
    const percentageUsed = Math.round((state.tokensUsedToday / FREE_DAILY_TOKENS) * 100);
    const percentageRemaining = 100 - percentageUsed;
    
    return {
        usedToday: state.tokensUsedToday,
        remaining: state.tokensRemaining,
        dailyLimit: FREE_DAILY_TOKENS,
        percentageUsed,
        percentageRemaining,
        isLow: percentageRemaining <= 30,
        isCritical: percentageRemaining <= 10,
    };
}

/**
 * Add bonus tokens (for promotions/referrals)
 */
export function addBonusTokens(amount: number): TokenState {
    const state = getTokenState();
    
    if (state.tier === 'pro') return state;
    
    const newState: TokenState = {
        ...state,
        tokensRemaining: state.tokensRemaining + amount,
    };
    
    saveTokenState(newState);
    return newState;
}

/**
 * Reset tokens (for testing or manual reset)
 */
export function resetTokens(): TokenState {
    const tier = getUserTier();
    const newState = createDefaultState(tier);
    saveTokenState(newState);
    return newState;
}

/**
 * Format token count for display
 */
export function formatTokens(count: number): string {
    if (count === Infinity) return '∞';
    return count.toString();
}
