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
        executiveBriefingAutopilot: boolean;
        wargameMultiRound: boolean;
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
            executiveBriefingAutopilot: true,
            wargameMultiRound: true,
            crossVentureIntelligence: true,
        },
    },
};

export const FREE_PLAN = PLANS.free;
export const PRO_PLAN = PLANS.pro;

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
