'use client';

import { useState, useEffect, useCallback } from 'react';
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
    }, [trial.hasUsedTrial, isPaidPro]);

    const activatePro = useCallback(() => {
        localStorage.setItem(PLAN_STORAGE_KEY, 'pro');
        setPlanId('pro');
        emitSubscriptionChanged();
    }, []);

    const deactivatePro = useCallback(() => {
        localStorage.setItem(PLAN_STORAGE_KEY, 'free');
        setPlanId('free');
        emitSubscriptionChanged();
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
