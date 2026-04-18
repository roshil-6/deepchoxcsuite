'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    Crown, 
    X, 
    Check, 
    Infinity, 
    Zap, 
    Sparkles, 
    Lock,
    AlertTriangle,
    ArrowRight
} from 'lucide-react';
import { useTokens } from '@/lib/tokens/useTokens';
import { FREE_DAILY_TOKENS, TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import {
    BILLING_CONFIG,
    formatRegionalDualLine,
    getProBillingAmounts,
    getPaymentGatewayPlanMeta,
} from '@/lib/billingConfig';
import { usePricingRegion } from '@/hooks/usePricingRegion';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    triggerReason?: string;
}

export function UpgradeModal({ isOpen, onClose, triggerReason }: UpgradeModalProps) {
    const tokens = useTokens();
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
    const pricingRegion = usePricingRegion();
    const proBilling = getProBillingAmounts();
    
    if (!isOpen || typeof window === 'undefined') return null;
    
    // Close if user is already pro
    if (tokens.isPro) {
        onClose();
        return null;
    }
    
    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900/95 p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
                            <Crown className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-100">Dexo — Co-Founder Pro</h2>
                            <p className="text-[12px] text-slate-500">Unlimited command-center AI (no daily token cap)</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                
                {/* Trigger reason if provided */}
                {triggerReason && (
                    <div className="mb-6 p-3 rounded-xl border border-amber-500/20 bg-amber-950/20 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[12px] text-amber-300">{triggerReason}</p>
                            <p className="text-[10px] text-amber-400/60 mt-0.5">
                                You have {tokens.tokensRemaining} tokens remaining today
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Current status */}
                <div className="mb-6 p-3 rounded-xl border border-slate-700/50 bg-slate-800/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-slate-400">Current Plan</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">Founder (Free)</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[12px] text-slate-300">Daily Tokens</span>
                        <span className="text-[12px] font-medium text-slate-200">{FREE_DAILY_TOKENS}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-slate-400"
                            style={{ width: `${tokens.stats.percentageRemaining}%` }}
                        />
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-500">
                        {tokens.tokensRemaining} of {FREE_DAILY_TOKENS} left today · {TOKEN_COSTS.ANALYSIS} analysis ·{' '}
                        {TOKEN_COSTS.REANALYZE} re-analyze · {TOKEN_COSTS.CHAT_MESSAGE} / message
                    </p>
                </div>
                
                {/* Plan toggle */}
                <div className="flex p-1 rounded-xl bg-slate-800/50 mb-6">
                    <button
                        onClick={() => setSelectedPlan('monthly')}
                        className={`flex-1 py-2 text-[12px] font-medium rounded-lg transition-all ${
                            selectedPlan === 'monthly'
                                ? 'bg-slate-700 text-slate-200'
                                : 'text-slate-500 hover:text-slate-400'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setSelectedPlan('yearly')}
                        className={`flex-1 py-2 text-[12px] font-medium rounded-lg transition-all ${
                            selectedPlan === 'yearly'
                                ? 'bg-slate-700 text-slate-200'
                                : 'text-slate-500 hover:text-slate-400'
                        }`}
                    >
                        Yearly <span className="text-slate-400 text-[10px]">Save vs monthly</span>
                    </button>
                </div>
                
                               {/* Pro vs Free (Dexo metering) */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                            <Infinity className="h-4 w-4 text-slate-300" />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-slate-200">Unlimited Dexo tokens</p>
                            <p className="text-[10px] text-slate-500">
                                Pro removes the {FREE_DAILY_TOKENS}/day cap — no per-analysis or per-message charges in Dexo
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                            <Zap className="h-4 w-4 text-slate-300" />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-slate-200">Same Dexo features on Free</p>
                            <p className="text-[10px] text-slate-500">
                                Analyses, voice, chat, and history — Founder tier uses the costs above until the daily pool is used
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                            <Sparkles className="h-4 w-4 text-slate-300" />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-slate-200">Co-Founder Pro suite</p>
                            <p className="text-[10px] text-slate-500">
                                Unlimited Dexo is part of Pro; this same plan is used across the app for billing, limits, and upcoming gateway checkout
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Feature comparison */}
                <div className="mb-6">
                    <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-3">What's included</p>
                    <div className="space-y-2">
                        <FeatureRow icon="check" text={`Founder: ${FREE_DAILY_TOKENS} tokens/day with per-action pricing`} />
                        <FeatureRow icon="check" text="Pro: unlimited Dexo analyses & messages" />
                        <FeatureRow icon="check" text="Voice, history, and venture context on both tiers" />
                        <FeatureRow icon="check" text="Aligns with main app Co-Founder Pro upgrade" />
                    </div>
                </div>
                
                {/* Pricing */}
                <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-yellow-500/5">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-[11px] text-amber-400/80 uppercase tracking-wider">Pro Plan</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-slate-100">
                                    {selectedPlan === 'monthly'
                                        ? formatRegionalDualLine(proBilling.monthlyInr, pricingRegion, { usdDecimals: 0 })
                                        : formatRegionalDualLine(proBilling.effectiveMonthlyInr, pricingRegion, {
                                              usdDecimals: 2,
                                              inrMaximumFractionDigits: 2,
                                          })}
                                </span>
                                <span className="text-[12px] text-slate-500">/month</span>
                            </div>
                            <p className="text-[10px] text-emerald-400">
                                {selectedPlan === 'yearly'
                                    ? `Billed annually at ${formatRegionalDualLine(proBilling.yearlyInr, pricingRegion, { usdDecimals: 2 })} /year`
                                    : 'Billed monthly · cancel anytime'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] text-slate-500">
                                UI FX basis: ₹{BILLING_CONFIG.displayExchangeRate} = $1
                            </p>
                            <p className="text-[11px] text-emerald-400">
                                {selectedPlan === 'yearly'
                                    ? `Save ${formatRegionalDualLine(proBilling.yearlySavingsInr, pricingRegion, { usdDecimals: 0 })} vs monthly`
                                    : 'Unified app pricing'}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* CTA Buttons */}
                <div className="space-y-2">
                    <button
                        onClick={() => {
                            const _gatewayMeta = getPaymentGatewayPlanMeta(selectedPlan);
                            tokens.upgradeToPro();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-medium text-[13px] hover:opacity-90 transition-opacity"
                    >
                        <Crown className="h-4 w-4" />
                        Upgrade to Pro
                        <ArrowRight className="h-4 w-4" />
                    </button>
                    
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-[12px] text-slate-500 hover:text-slate-300"
                    >
                        Continue with Free Plan
                    </button>
                </div>
                
                {/* Trust message */}
                <p className="mt-4 text-center text-[10px] text-slate-600">
                    30-day money-back guarantee • Cancel anytime
                </p>
            </div>
        </div>
    );
    
    return createPortal(modalContent, document.body);
}

function FeatureRow({ icon, text }: { icon: 'check' | 'lock'; text: string }) {
    const Icon = icon === 'check' ? Check : Lock;
    return (
        <div className="flex items-center gap-2">
            <div className={`flex h-4 w-4 items-center justify-center rounded-full ${
                icon === 'check' ? 'bg-white/10' : 'bg-slate-700'
            }`}>
                <Icon className={`h-2.5 w-2.5 ${icon === 'check' ? 'text-slate-300' : 'text-slate-500'}`} />
            </div>
            <span className="text-[11px] text-slate-400">{text}</span>
        </div>
    );
}

// Hook for showing upgrade modal
export function useUpgradeModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [triggerReason, setTriggerReason] = useState<string | undefined>();
    
    const open = (reason?: string) => {
        setTriggerReason(reason);
        setIsOpen(true);
    };
    
    const close = () => {
        setIsOpen(false);
        setTriggerReason(undefined);
    };
    
    return {
        isOpen,
        open,
        close,
        triggerReason,
        UpgradeModal: () => (
            <UpgradeModal 
                isOpen={isOpen} 
                onClose={close} 
                triggerReason={triggerReason}
            />
        ),
    };
}
