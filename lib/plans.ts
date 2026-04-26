import { formatRegionalPricePair, getProBillingAmounts } from '@/lib/billingConfig';
import type { PricingRegion } from '@/lib/pricingRegion';

export type PlanId = 'free' | 'pro';

export interface Plan {
    id: PlanId;
    name: string;
    price: string;
    priceNote: string;
    features: {
        allDesks: boolean;
        personalAssistant: boolean;
        dashboard: boolean;
        pitchDeckExport: boolean;
        multipleVentures: boolean;
        relayMeetingRoom: boolean;
        vcGauntlet: boolean;
        wargameNexus: boolean;
        intelligenceSuite: boolean;
        /** Dexo daily research briefs: web pass, saved reports, dashboard tab. */
        dexoDailyBriefReports: boolean;
        wargameMultiRound: boolean;
        crossVentureIntelligence: boolean;
    };
}

const FREE_PLAN_BASE: Plan = {
    id: 'free',
    name: 'Founder',
    price: 'Free',
    priceNote: 'No credit card needed',
    features: {
        allDesks: true,
        personalAssistant: true,
        dashboard: true,
        pitchDeckExport: true,
        multipleVentures: true,
        relayMeetingRoom: true,
        vcGauntlet: true,
        wargameNexus: true,
        intelligenceSuite: true,
        dexoDailyBriefReports: true,
        wargameMultiRound: false,
        crossVentureIntelligence: false,
    },
};

export function getPlans(region: PricingRegion): Record<PlanId, Plan> {
    const monthlyInr = getProBillingAmounts().monthlyInr;
    const proPrice = formatRegionalPricePair(monthlyInr, region, { usdDecimals: 0 }).primary;
    return {
        free: { ...FREE_PLAN_BASE },
        pro: {
            id: 'pro',
            name: 'Co-Founder Pro',
            price: proPrice,
            priceNote: 'per month · cancel anytime',
            features: {
                allDesks: true,
                personalAssistant: true,
                dashboard: true,
                pitchDeckExport: true,
                multipleVentures: true,
                relayMeetingRoom: true,
                vcGauntlet: true,
                wargameNexus: true,
                intelligenceSuite: true,
                dexoDailyBriefReports: true,
                wargameMultiRound: true,
                crossVentureIntelligence: true,
            },
        },
    };
}

/** Default catalog for non-interactive contexts (INTL-first). */
export const PLANS = getPlans('INTL');
export const FREE_PLAN = PLANS.free;
export const PRO_PLAN = PLANS.pro;

export const PRO_INTELLIGENCE_FEATURES = [
    {
        key: 'dexoDailyBriefReports',
        name: 'Dexo daily research reports',
        description:
            'Automated daily brief with live web research, dual-model synthesis, saved report history, and suggested venture updates — plus the Dashboard “Daily brief” tab.',
    },
    {
        key: 'wargameMultiRound',
        name: 'Wargame Multi-Round Simulation',
        description:
            'Full adversarial simulation with competitor counter-moves across multiple rounds, board stress-test mode, and downloadable scenario reports.',
    },
    {
        key: 'crossVentureIntelligence',
        name: 'Cross-Venture Intelligence',
        description:
            'AI layer that spots patterns, resource conflicts, and synergies across all your ventures simultaneously — portfolio-level decisions.',
    },
] as const;
