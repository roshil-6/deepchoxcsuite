/**
 * DEEPCHOX — Subscription plan definitions.
 * Source of truth for every feature gate in the app.
 * When you wire up real auth/Stripe, replace `planFromStorage` with
 * a server-side check and keep these flag definitions untouched.
 */

export type PlanId = 'free' | 'pro';

export interface Plan {
    id: PlanId;
    name: string;
    /** Display price string, e.g. "Free" or "₹300" */
    price: string;
    priceNote: string;
    features: {
        // ── Core — available to everyone ──────────────────────────────────
        allDesks: boolean;
        personalAssistant: boolean;
        dashboard: boolean;
        pitchDeckExport: boolean;
        multipleVentures: boolean;
        relayMeetingRoom: boolean;
        vcGauntlet: boolean;
        wargameNexus: boolean;
        intelligenceSuite: boolean;
        // ── Pro-exclusive automated intelligence ──────────────────────────
        /** Daily AI briefing auto-delivered every morning without user prompting */
        executiveBriefingAutopilot: boolean;
        /** Full multi-round adversarial simulation + board stress-test + downloadable report */
        wargameMultiRound: boolean;
        /** Cross-venture AI synthesis — portfolio-level patterns & synergy detection */
        crossVentureIntelligence: boolean;
    };
}

export const PLANS: Record<PlanId, Plan> = {
    free: {
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
            // Pro-exclusive
            executiveBriefingAutopilot: false,
            wargameMultiRound: false,
            crossVentureIntelligence: false,
        },
    },
    pro: {
        id: 'pro',
        name: 'Co-Founder Pro',
        price: '₹300',
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
            // Pro-exclusive
            executiveBriefingAutopilot: true,
            wargameMultiRound: true,
            crossVentureIntelligence: true,
        },
    },
};

export const FREE_PLAN = PLANS.free;
export const PRO_PLAN = PLANS.pro;

/** The three Pro-exclusive intelligence features — used in upgrade prompts and pricing UI */
export const PRO_INTELLIGENCE_FEATURES = [
    {
        key: 'executiveBriefingAutopilot',
        name: 'Executive Briefing Autopilot',
        description:
            'Daily AI brief auto-delivered every morning — venture progress, risks flagged, priorities, and market intel without you asking.',
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
