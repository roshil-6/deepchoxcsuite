'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { getPlans, type Plan, type PlanId } from '@/lib/plans';
import { usePricingRegion } from '@/hooks/usePricingRegion';
import {
    PLAN_STORAGE_KEY,
    TRIAL_START_KEY,
    TRIAL_DURATION_MS,
    emitSubscriptionChanged,
} from '@/lib/subscriptionLocal';

function readPlan(): PlanId {
    if (typeof window === 'undefined') return 'free';
    return localStorage.getItem(PLAN_STORAGE_KEY) === 'pro' ? 'pro' : 'free';
}

function readTrialStart(): number | null {
    if (typeof window === 'undefined') return null;
    const v = localStorage.getItem(TRIAL_START_KEY);
    if (!v) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
}

function calcTrialState(trialStart: number | null) {
    if (trialStart === null) {
        return { isInTrial: false, hasUsedTrial: false, trialDaysLeft: 0, trialHoursLeft: 0 };
    }
    const msLeft = trialStart + TRIAL_DURATION_MS - Date.now();
    const isInTrial = msLeft > 0;
    return {
        isInTrial,
        hasUsedTrial: true,
        trialDaysLeft: isInTrial ? Math.ceil(msLeft / (24 * 60 * 60 * 1000)) : 0,
        trialHoursLeft: isInTrial ? Math.ceil(msLeft / (60 * 60 * 1000)) : 0,
    };
}

function postSyncEntitlement(body: Record<string, unknown>) {
    void fetch('/api/user/sync-entitlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).catch(() => {
        /* non-fatal; user can retry by toggling plan */
    });
}

export interface SubscriptionState {
    plan: Plan;
    planId: PlanId;
    isPro: boolean;
    isPaidPro: boolean;
    isInTrial: boolean;
    hasUsedTrial: boolean;
    trialDaysLeft: number;
    trialHoursLeft: number;
    can: (feature: keyof Plan['features']) => boolean;
    startTrial: () => void;
    activatePro: () => void;
    deactivatePro: () => void;
}

export function useSubscription(): SubscriptionState {
    const { user, isLoaded: clerkLoaded } = useUser();
    const [planId, setPlanId] = useState<PlanId>('free');
    const [trialStart, setTrialStart] = useState<number | null>(null);
    const pricingRegion = usePricingRegion();

    useEffect(() => {
        setPlanId(readPlan());
        setTrialStart(readTrialStart());
        const handler = (e: StorageEvent) => {
            if (e.key === PLAN_STORAGE_KEY) setPlanId(readPlan());
            if (e.key === TRIAL_START_KEY) setTrialStart(readTrialStart());
        };
        const sameTab = () => {
            setPlanId(readPlan());
            setTrialStart(readTrialStart());
        };
        window.addEventListener('deepchox-subscription-changed', sameTab);
        window.addEventListener('storage', handler);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('deepchox-subscription-changed', sameTab);
        };
    }, []);

    /** When Clerk loads, align localStorage with `publicMetadata` (source of truth after sync). */
    useEffect(() => {
        if (!clerkLoaded || !user) return;
        const meta = user.publicMetadata as {
            deepchoxPlan?: string;
            deepchoxTrialEndsAt?: number | null;
        };

        let changed = false;

        if (meta.deepchoxPlan === 'pro' && readPlan() !== 'pro') {
            localStorage.setItem(PLAN_STORAGE_KEY, 'pro');
            changed = true;
        }
        if (meta.deepchoxPlan === 'free' && readPlan() !== 'free') {
            localStorage.setItem(PLAN_STORAGE_KEY, 'free');
            changed = true;
        }

        const trialEnd = typeof meta.deepchoxTrialEndsAt === 'number' ? meta.deepchoxTrialEndsAt : null;
        if (trialEnd !== null && trialEnd > Date.now()) {
            const desiredStart = trialEnd - TRIAL_DURATION_MS;
            const cur = readTrialStart();
            if (cur === null || Math.abs(cur - desiredStart) > 120_000) {
                localStorage.setItem(TRIAL_START_KEY, String(desiredStart));
                changed = true;
            }
        }

        if (meta.deepchoxTrialEndsAt === null && readTrialStart() !== null && meta.deepchoxPlan !== 'pro') {
            localStorage.removeItem(TRIAL_START_KEY);
            changed = true;
        }

        if (changed) {
            setPlanId(readPlan());
            setTrialStart(readTrialStart());
            emitSubscriptionChanged();
        }
    }, [clerkLoaded, user, user?.publicMetadata]);

    const trial = calcTrialState(trialStart);
    const isPaidPro = planId === 'pro';
    const isPro = isPaidPro || trial.isInTrial;
    const catalog = getPlans(pricingRegion);
    const activePlan = isPro ? catalog.pro : catalog.free;

    const can = useCallback(
        (feature: keyof Plan['features']) => activePlan.features[feature],
        [activePlan],
    );

    const startTrial = useCallback(() => {
        if (trial.hasUsedTrial || isPaidPro) return;
        const now = Date.now();
        localStorage.setItem(TRIAL_START_KEY, String(now));
        setTrialStart(now);
        emitSubscriptionChanged();
        postSyncEntitlement({ startTrial: true });
    }, [trial.hasUsedTrial, isPaidPro]);

    const activatePro = useCallback(() => {
        localStorage.setItem(PLAN_STORAGE_KEY, 'pro');
        localStorage.removeItem(TRIAL_START_KEY);
        setPlanId('pro');
        setTrialStart(null);
        emitSubscriptionChanged();
        postSyncEntitlement({ plan: 'pro' });
    }, []);

    const deactivatePro = useCallback(() => {
        localStorage.setItem(PLAN_STORAGE_KEY, 'free');
        localStorage.removeItem(TRIAL_START_KEY);
        setPlanId('free');
        setTrialStart(null);
        emitSubscriptionChanged();
        postSyncEntitlement({ plan: 'free', clearTrial: true });
    }, []);

    return {
        plan: activePlan,
        planId,
        isPro,
        isPaidPro,
        isInTrial: trial.isInTrial,
        hasUsedTrial: trial.hasUsedTrial,
        trialDaysLeft: trial.trialDaysLeft,
        trialHoursLeft: trial.trialHoursLeft,
        can,
        startTrial,
        activatePro,
        deactivatePro,
    };
}
