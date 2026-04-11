'use client';

/**
 * useSubscription — single source of truth for the current user's plan.
 *
 * Storage: localStorage key `deepchox_plan` → 'free' | 'pro'
 * When you add real auth/Stripe, replace the localStorage read with an
 * API call and keep every call site exactly the same.
 */

import { useState, useEffect, useCallback } from 'react';
import { PLANS, type Plan, type PlanId } from '@/lib/plans';

const STORAGE_KEY = 'deepchox_plan';

function readPlan(): PlanId {
    if (typeof window === 'undefined') return 'free';
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'pro') return 'pro';
    return 'free';
}

export interface SubscriptionState {
    plan: Plan;
    planId: PlanId;
    isPro: boolean;
    /** Returns true if the feature is available on the current plan */
    can: (feature: keyof Plan['features']) => boolean;
    /** Activate pro (mock — replace with Stripe redirect later) */
    activatePro: () => void;
    /** Downgrade back to free (admin/testing) */
    deactivatePro: () => void;
}

export function useSubscription(): SubscriptionState {
    const [planId, setPlanId] = useState<PlanId>('free');

    useEffect(() => {
        setPlanId(readPlan());
        // Keep in sync across tabs
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) setPlanId(readPlan());
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const plan = PLANS[planId];
    const isPro = planId === 'pro';

    const can = useCallback(
        (feature: keyof Plan['features']) => plan.features[feature],
        [plan],
    );

    const activatePro = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, 'pro');
        setPlanId('pro');
    }, []);

    const deactivatePro = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, 'free');
        setPlanId('free');
    }, []);

    return { plan, planId, isPro, can, activatePro, deactivatePro };
}
