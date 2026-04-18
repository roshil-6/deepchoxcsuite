import type { PricingRegion } from '@/lib/pricingRegion';

export type BillingCycle = 'monthly' | 'yearly';
export type SupportedCurrency = 'INR' | 'USD';

/**
 * Single source of truth for pricing and payment-display copy.
 * The chosen USD values intentionally mirror the INR amounts at a fixed UI exchange basis
 * so the product never shows conflicting numbers across screens.
 */
export const BILLING_CONFIG = {
    displayExchangeRate: 75,
    currencies: {
        INR: { code: 'INR', symbol: '₹', locale: 'en-IN' },
        USD: { code: 'USD', symbol: '$', locale: 'en-US' },
    },
    plans: {
        free: {
            id: 'free',
            name: 'Founder',
        },
        pro: {
            id: 'pro',
            name: 'Co-Founder Pro',
            monthlyInr: 350,
            yearlyInr: 3499,
            trialDays: 3,
            gateway: {
                productKey: 'cofounder-pro',
                monthlyLookupKey: 'deepchox_pro_monthly',
                yearlyLookupKey: 'deepchox_pro_yearly',
            },
        },
    },
} as const;

function roundUsdFromInr(inr: number): number {
    return Math.round((inr / BILLING_CONFIG.displayExchangeRate) * 100) / 100;
}

export function getProBillingAmounts() {
    const monthlyInr = BILLING_CONFIG.plans.pro.monthlyInr;
    const yearlyInr = BILLING_CONFIG.plans.pro.yearlyInr;
    const monthlyUsd = roundUsdFromInr(monthlyInr);
    const yearlyUsd = roundUsdFromInr(yearlyInr);
    const effectiveMonthlyInr = Math.round((yearlyInr / 12) * 100) / 100;
    const effectiveMonthlyUsd = roundUsdFromInr(effectiveMonthlyInr);
    const yearlySavingsInr = monthlyInr * 12 - yearlyInr;
    const yearlySavingsUsd = roundUsdFromInr(yearlySavingsInr);

    return {
        monthlyInr,
        monthlyUsd,
        yearlyInr,
        yearlyUsd,
        effectiveMonthlyInr,
        effectiveMonthlyUsd,
        yearlySavingsInr,
        yearlySavingsUsd,
    };
}

export function formatCurrency(
    amount: number,
    currency: SupportedCurrency,
    opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string {
    const cfg = BILLING_CONFIG.currencies[currency];
    return new Intl.NumberFormat(cfg.locale, {
        style: 'currency',
        currency: cfg.code,
        maximumFractionDigits: opts?.maximumFractionDigits ?? (currency === 'INR' ? 0 : 2),
        minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
    }).format(amount);
}

export function formatDualCurrency(inrAmount: number, opts?: { usdDecimals?: number }) {
    const usdAmount = roundUsdFromInr(inrAmount);
    return `${formatCurrency(inrAmount, 'INR')} (${formatCurrency(usdAmount, 'USD', {
        maximumFractionDigits: opts?.usdDecimals ?? 2,
        minimumFractionDigits: 0,
    })})`;
}

/** India: ₹ first; rest of world: $ first (INR reference in parentheses). */
export function formatRegionalPricePair(
    inrAmount: number,
    region: PricingRegion,
    opts?: { usdDecimals?: number; inrMaximumFractionDigits?: number }
): { primary: string; secondary: string } {
    const usdAmount = roundUsdFromInr(inrAmount);
    const usdDec = opts?.usdDecimals ?? (region === 'INTL' ? 0 : 2);
    const inrDec = opts?.inrMaximumFractionDigits ?? 0;
    const usdFmt = formatCurrency(usdAmount, 'USD', {
        maximumFractionDigits: usdDec,
        minimumFractionDigits: 0,
    });
    const inrFmt = formatCurrency(inrAmount, 'INR', {
        maximumFractionDigits: inrDec,
        minimumFractionDigits: 0,
    });
    if (region === 'IN') {
        return { primary: inrFmt, secondary: usdFmt };
    }
    return { primary: usdFmt, secondary: inrFmt };
}

export function formatRegionalDualLine(
    inrAmount: number,
    region: PricingRegion,
    opts?: { usdDecimals?: number; inrMaximumFractionDigits?: number }
): string {
    const { primary, secondary } = formatRegionalPricePair(inrAmount, region, opts);
    return `${primary} (${secondary})`;
}

export function getPaymentGatewayPlanMeta(cycle: BillingCycle) {
    const lookupKey =
        cycle === 'yearly'
            ? BILLING_CONFIG.plans.pro.gateway.yearlyLookupKey
            : BILLING_CONFIG.plans.pro.gateway.monthlyLookupKey;
    return {
        productKey: BILLING_CONFIG.plans.pro.gateway.productKey,
        cycle,
        lookupKey,
        currency: 'INR' as const,
        amountMinor:
            (cycle === 'yearly' ? BILLING_CONFIG.plans.pro.yearlyInr : BILLING_CONFIG.plans.pro.monthlyInr) * 100,
    };
}
