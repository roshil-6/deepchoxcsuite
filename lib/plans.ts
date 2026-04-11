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
    price: string;
    priceNote: string;
    /** Max ventures (projects). null = unlimited */
    maxVentures: number | null;
    /** Max staff syncs per day. null = unlimited */
    maxSyncsPerDay: number | null;
    features: {
        // Core (both tiers)
        allDesks: boolean;
        personalAssistant: boolean;
        dashboard: boolean;
        pitchDeckExport: boolean;
        // Gated — Pro only
        multipleVentures: boolean;
        relayMeetingRoom: boolean;
        vcGauntlet: boolean;
        wargameNexus: boolean;
        intelligenceSuite: boolean;
        fileUploads: boolean;
        livingOfficeMemory: boolean;
        unlimitedSync: boolean;
    };
}

export const PLANS: Record<PlanId, Plan> = {
    free: {
        id: 'free',
        name: 'Founder',
        price: 'Free',
        priceNote: 'No credit card needed',
        maxVentures: 1,
        maxSyncsPerDay: 1,
        features: {
            allDesks: true,
            personalAssistant: true,
            dashboard: true,
            pitchDeckExport: true,
            multipleVentures: false,
            relayMeetingRoom: false,
            vcGauntlet: false,
            wargameNexus: false,
            intelligenceSuite: false,
            fileUploads: false,
            livingOfficeMemory: false,
            unlimitedSync: false,
        },
    },
    pro: {
        id: 'pro',
        name: 'Co-Founder',
        price: '$29',
        priceNote: 'per month · cancel anytime',
        maxVentures: null,
        maxSyncsPerDay: null,
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
            fileUploads: true,
            livingOfficeMemory: true,
            unlimitedSync: true,
        },
    },
};

export const FREE_PLAN = PLANS.free;
export const PRO_PLAN = PLANS.pro;

/** Human-readable label for each Pro feature, used in upgrade prompts */
export const PRO_FEATURE_LABELS: Record<string, string> = {
    multipleVentures: 'Multiple ventures',
    relayMeetingRoom: 'Relay Meeting Room',
    vcGauntlet: 'VC Gauntlet — pitch practice',
    wargameNexus: 'Wargame Nexus — scenario planning',
    intelligenceSuite: 'Intelligence Suite',
    fileUploads: 'File uploads & document context',
    livingOfficeMemory: 'Living Office Memory',
    unlimitedSync: 'Unlimited staff syncs',
};
