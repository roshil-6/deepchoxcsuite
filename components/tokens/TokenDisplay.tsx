'use client';

import React, { useState } from 'react';
import { Coins, Crown, AlertTriangle, Sparkles, Zap } from 'lucide-react';
import { useTokens } from '@/lib/tokens/useTokens';
import { formatTokens, TOKEN_COSTS } from '@/lib/tokens/tokenSystem';

interface TokenDisplayProps {
    compact?: boolean;
    showCosts?: boolean;
}

export function TokenDisplay({ compact = false, showCosts = false }: TokenDisplayProps) {
    const tokens = useTokens();
    const [showDetails, setShowDetails] = useState(false);
    
    if (tokens.isPro) {
        return (
            <div className={`flex items-center gap-1.5 ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30`}>
                <Crown className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-amber-400`} />
                <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-amber-300`}>
                    Pro
                </span>
                {!compact && (
                    <span className="text-[10px] text-amber-400/60 ml-1">Unlimited</span>
                )}
            </div>
        );
    }
    
    const isLow = tokens.stats.isLow;
    const isCritical = tokens.stats.isCritical;
    
    const bgClass = isCritical 
        ? 'bg-red-500/15 border-red-500/30' 
        : isLow 
            ? 'bg-amber-500/15 border-amber-500/30'
            : 'bg-sky-500/15 border-sky-500/30';
    
    const textClass = isCritical
        ? 'text-red-400'
        : isLow
            ? 'text-amber-400'
            : 'text-sky-400';
    
    const icon = isCritical ? AlertTriangle : isLow ? Zap : Coins;
    const Icon = icon;
    
    return (
        <div className="relative">
            <button
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-1.5 ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-full border ${bgClass} transition-all hover:opacity-80`}
            >
                <Icon className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${textClass}`} />
                <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-medium ${textClass}`}>
                    {formatTokens(tokens.tokensRemaining)}
                </span>
                {!compact && (
                    <span className="text-[10px] text-slate-500">/ {formatTokens(tokens.dailyLimit)}</span>
                )}
            </button>
            
            {/* Dropdown details */}
            {showDetails && !compact && (
                <div className="absolute top-full right-0 mt-2 w-64 p-3 rounded-xl border border-slate-700/50 bg-slate-900/95 shadow-xl z-50">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Free Tier</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); tokens.upgradeToPro(); }}
                                className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                            >
                                Upgrade
                            </button>
                        </div>
                        
                        {/* Token bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-slate-500">Daily Usage</span>
                                <span className={textClass}>{tokens.stats.percentageUsed}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all ${
                                        isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-sky-500'
                                    }`}
                                    style={{ width: `${Math.min(100, tokens.stats.percentageUsed)}%` }}
                                />
                            </div>
                        </div>
                        
                        {/* Reset info */}
                        <p className="text-[9px] text-slate-500">
                            Resets daily at midnight
                        </p>
                        
                        {showCosts && <TokenCostsList onClose={() => setShowDetails(false)} />}
                    </div>
                </div>
            )}
        </div>
    );
}

function TokenCostsList({ onClose }: { onClose: () => void }) {
    return (
        <div className="border-t border-slate-800 pt-2 mt-2 space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-1.5">Token Costs</p>
            {Object.entries(TOKEN_COSTS).map(([action, cost]) => (
                <div key={action} className="flex justify-between text-[10px]">
                    <span className="text-slate-400">{action.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className={cost === 0 ? 'text-emerald-400' : 'text-slate-300'}>
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
        <span className={`text-[10px] ${canAfford ? 'text-slate-500' : 'text-red-400'}`}>
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
