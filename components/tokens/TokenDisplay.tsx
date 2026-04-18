'use client';

import React, { useState } from 'react';
import { Coins, Crown, AlertTriangle, Sparkles, Zap } from 'lucide-react';
import { useTokens } from '@/lib/tokens/useTokens';
import { formatTokens, TOKEN_COSTS } from '@/lib/tokens/tokenSystem';

interface TokenDisplayProps {
    compact?: boolean;
    showCosts?: boolean;
    /** Prefer main app upgrade (e.g. shell modal) over only flipping local storage */
    onRequestUpgrade?: () => void;
}

export function TokenDisplay({ compact = false, showCosts = false, onRequestUpgrade }: TokenDisplayProps) {
    const tokens = useTokens();
    const [showDetails, setShowDetails] = useState(false);
    
    if (tokens.isPro) {
        return (
            <div
                className={`flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.06] ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}
            >
                <Crown className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-[var(--muted)]`} />
                <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-[var(--text)]`}>Pro</span>
                {!compact && <span className="ml-1 text-[10px] text-[var(--muted)]">Unlimited</span>}
            </div>
        );
    }

    const isLow = tokens.stats.isLow;
    const isCritical = tokens.stats.isCritical;

    const bgClass = isCritical
        ? 'border-rose-400/30 bg-rose-500/10'
        : isLow
          ? 'border-amber-400/25 bg-amber-500/10'
          : 'border-[var(--border)] bg-white/[0.04]';

    const textClass = isCritical
        ? 'text-rose-100'
        : isLow
          ? 'text-amber-100'
          : 'text-[var(--muted)]';
    
    const icon = isCritical ? AlertTriangle : isLow ? Zap : Coins;
    const Icon = icon;
    
    return (
        <div className="relative">
            <button
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-1.5 ${compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2'} rounded-full border ${bgClass} shadow-[0_8px_22px_rgba(0,0,0,0.25)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10`}
            >
                {(isLow || isCritical) && (
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${isCritical ? 'bg-rose-300' : 'bg-amber-300'} ${compact ? '' : 'animate-pulse'}`}
                        aria-hidden
                    />
                )}
                <Icon className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${textClass}`} />
                {!compact && <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Credits</span>}
                <span className={`${compact ? 'text-[11px]' : 'text-[12px]'} font-semibold tabular-nums ${textClass}`}>
                    {formatTokens(tokens.tokensRemaining)}
                </span>
                {!compact && (
                    <span className="text-[10px] tabular-nums text-[var(--text-tertiary)]">/ {formatTokens(tokens.dailyLimit)}</span>
                )}
            </button>
            
            {/* Dropdown details */}
            {showDetails && !compact && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow-panel)] backdrop-blur-md">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[var(--muted)]">Free Tier</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onRequestUpgrade) onRequestUpgrade();
                                    else tokens.upgradeToPro();
                                }}
                                className="rounded bg-white/[0.08] px-2 py-0.5 text-[10px] text-[var(--text)] transition-colors hover:bg-white/[0.12]"
                            >
                                Upgrade
                            </button>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-[var(--muted)]">Daily Usage</span>
                                <span className="text-[var(--text)]">{tokens.stats.percentageUsed}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                <div
                                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                                    style={{ width: `${Math.min(100, tokens.stats.percentageUsed)}%` }}
                                />
                            </div>
                        </div>

                        <p className="text-[9px] text-[var(--muted)]">Resets daily at midnight</p>
                        
                        {showCosts && <TokenCostsList />}
                    </div>
                </div>
            )}
        </div>
    );
}

function TokenCostsList() {
    return (
        <div className="mt-2 space-y-1 border-t border-[var(--border)] pt-2">
            <p className="mb-1.5 text-[9px] uppercase tracking-wider text-[var(--muted)]">Token Costs</p>
            {Object.entries(TOKEN_COSTS).map(([action, cost]) => (
                <div key={action} className="flex justify-between text-[10px]">
                    <span className="text-[var(--muted)]">{action.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className={cost === 0 ? 'text-[var(--muted)]' : 'text-[var(--text)]'}>
                        {cost === 0 ? 'Free' : `${cost} tokens`}
                    </span>
                </div>
            ))}
        </div>
    );
}

// Compact token indicator for inline usage
export function TokenInlineCost({ cost }: { cost: number }) {
    const tokens = useTokens();
    
    if (tokens.isPro) return null;
    
    const canAfford = tokens.canAfford(cost);
    const preview = tokens.previewCost(cost);
    
    return (
        <span className={`text-[10px] ${canAfford ? 'text-[var(--muted)]' : 'text-[var(--text)]'}`}>
            ({cost} tokens • {preview})
        </span>
    );
}

// Token spending confirmation
export function TokenConfirmButton({
    cost,
    action,
    onConfirm,
    children,
    className = '',
    disabled = false,
}: {
    cost: number;
    action: string;
    onConfirm: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}) {
    const tokens = useTokens();
    const [showConfirm, setShowConfirm] = useState(false);
    
    if (tokens.isPro) {
        return (
            <button 
                onClick={onConfirm} 
                disabled={disabled}
                className={className}
            >
                {children}
            </button>
        );
    }
    
    const canAfford = tokens.canAfford(cost);
    
    if (!canAfford) {
        return (
            <button
                onClick={() => tokens.upgradeToPro()}
                className={`${className} opacity-60`}
            >
                <span className="flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    Upgrade for {cost} tokens
                </span>
            </button>
        );
    }
    
    const handleClick = () => {
        const result = tokens.spend(cost, action);
        if (result.success) {
            onConfirm();
        }
    };
    
    // Show inline cost if low on tokens
    if (tokens.stats.isLow) {
        return (
            <div className="relative group">
                <button 
                    onClick={handleClick}
                    disabled={disabled}
                    className={className}
                >
                    {children}
                </button>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-amber-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    Costs {cost} tokens
                </span>
            </div>
        );
    }
    
    return (
        <button 
            onClick={handleClick}
            disabled={disabled}
            className={className}
        >
            {children}
        </button>
    );
}
