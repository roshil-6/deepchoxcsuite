'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { getPlans, type Plan, type PlanId } from '@/lib/plans';
import { usePricingRegion } from '@/hooks/usePricingRegion';
import {
    PLAN_STORAGE_KEY,
    emitSubscriptionChanged,
} from '@/lib/subscriptionLocal';

function readPlan(): PlanId {
    if (typeof window === 'undefined') return 'free';
    return localStorage.getItem(PLAN_STORAGE_KEY) === 'pro' ? 'pro' : 'free';
}

export interface SubscriptionState {
    plan: Plan;
    planId: PlanId;
    isPro: boolean;
    isPaidPro: boolean;
    can: (feature: keyof Plan['features']) => boolean;
    deactivatePro: () => void;
}

export function useSubscription(): SubscriptionState {
    const { user, isLoaded: clerkLoaded } = useUser();
    const [planId, setPlanId] = useState<PlanId>('free');
    const pricingRegion = usePricingRegion();

    useEffect(() => {
        setPlanId(readPlan());
        const handler = (e: StorageEvent) => {
            if (e.key === PLAN_STORAGE_KEY) setPlanId(readPlan());
        };
        const sameTab = () => { setPlanId(readPlan()); };
        window.addEventListener('deepchox-subscription-changed', sameTab);
        window.addEventListener('storage', handler);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('deepchox-subscription-changed', sameTab);
        };
    }, []);

    /**
     * When the tab becomes visible again (e.g. user returning from Razorpay payment tab),
     * reload the Clerk user to pick up any publicMetadata changes written by the webhook.
     */
    useEffect(() => {
        if (!clerkLoaded || !user) return;
        let t: ReturnType<typeof setTimeout> | null = null;
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            if (t) clearTimeout(t);
            t = setTimeout(() => {
                void user.reload().catch(() => { /* noop */ });
            }, 800);
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            if (t) clearTimeout(t);
        };
    }, [clerkLoaded, user]);

    /** When Clerk confirms no session, clear any stale Pro from localStorage. */
    useEffect(() => {
        if (!clerkLoaded || user) return;
        if (typeof window !== 'undefined' && localStorage.getItem(PLAN_STORAGE_KEY) === 'pro') {
            localStorage.setItem(PLAN_STORAGE_KEY, 'free');
            setPlanId('free');
            emitSubscriptionChanged();
        }
    }, [clerkLoaded, user]);

    /** When Clerk loads, align localStorage with publicMetadata (source of truth after sync). */
    useEffect(() => {
        if (!clerkLoaded || !user) return;
        const meta = user.publicMetadata as { deepchoxPlan?: string };

        let changed = false;

        if (meta.deepchoxPlan === 'pro' && readPlan() !== 'pro') {
            localStorage.setItem(PLAN_STORAGE_KEY, 'pro');
            changed = true;
        }
        // Clerk is the source of truth — if it doesn't say pro, enforce free.
        if (meta.deepchoxPlan !== 'pro' && readPlan() === 'pro') {
            localStorage.setItem(PLAN_STORAGE_KEY, 'free');
            changed = true;
        }

        if (changed) {
            setPlanId(readPlan());
            emitSubscriptionChanged();
        }
    }, [clerkLoaded, user, user?.publicMetadata]);

    const isPaidPro = planId === 'pro';
    const catalog = getPlans(pricingRegion);
    const activePlan = isPaidPro ? catalog.pro : catalog.free;

    const can = useCallback(
        (feature: keyof Plan['features']) => activePlan.features[feature],
        [activePlan],
    );

    const deactivatePro = useCallback(() => {
        // Optimistic local clear
        localStorage.setItem(PLAN_STORAGE_KEY, 'free');
        setPlanId('free');
        emitSubscriptionChanged();
        // Persist to Clerk so the downgrade survives a refresh
        void fetch('/api/user/downgrade', { method: 'POST' }).catch(() => { /* non-fatal */ });
    }, []);

    return {
        plan: activePlan,
        planId,
        isPro: isPaidPro,
        isPaidPro,
        can,
        deactivatePro,
    };
}
