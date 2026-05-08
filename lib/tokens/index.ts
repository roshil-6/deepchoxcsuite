// Token System - Freemium model for Deepchox

export {
    getTokenState,
    syncTokenTier,
    getUserTier,
    canAfford,
    spendTokens,
    previewCost,
    getTokenStats,
    addBonusTokens,
    resetTokens,
    formatTokens,
    FREE_DAILY_TOKENS,
    PRO_DAILY_TOKENS,
    TOKEN_COSTS,
} from './tokenSystem';

export type {
    UserTier,
    TokenState,
} from './tokenSystem';

export {
    useTokens,
    useTokenCost,
    useAnalysisCost,
    useChatCost,
} from './useTokens';

export type {
    UseTokensReturn,
} from './useTokens';
