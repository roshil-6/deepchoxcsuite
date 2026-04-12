'use client';

import { useState, useEffect, useCallback } from 'react';
import { PLANS, type Plan, type PlanId } from '@/lib/plans';

const PLAN_KEY = 'deepchox_plan';
const TRIAL_KEY = 'deepchox_trial_start';
const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

function readPlan(): PlanId {
    if (typeof window === 'undefined') return 'free';
    return localStorage.getItem(PLAN_KEY) === 'pro' ? 'pro' : 'free';
}

function readTrialStart(): number | null {
    if (typeof window === 'undefined') return null;
    const v = localStorage.getItem(TRIAL_KEY);
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

    useEffect(() => {
        setPlanId(readPlan());
        setTrialStart(readTrialStart());
        const handler = (e: StorageEvent) => {
            if (e.key === PLAN_KEY) setPlanId(readPlan());
            if (e.key === TRIAL_KEY) setTrialStart(readTrialStart());
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const trial = calcTrialState(trialStart);
    const isPaidPro = planId === 'pro';
    const isPro = isPaidPro || trial.isInTrial;
    const activePlan = isPro ? PLANS.pro : PLANS.free;

    const can = useCallback(
        (feature: keyof Plan['features']) => activePlan.features[feature],
        [activePlan],
    );

    const startTrial = useCallback(() => {
        if (trial.hasUsedTrial || isPaidPro) return;
        const now = Date.now();
        localStorage.setItem(TRIAL_KEY, String(now));
        setTrialStart(now);
    }, [trial.hasUsedTrial, isPaidPro]);

    const activatePro = useCallback(() => {
        localStorage.setItem(PLAN_KEY, 'pro');
        setPlanId('pro');
    }, []);

    const deactivatePro = useCallback(() => {
        localStorage.setItem(PLAN_KEY, 'free');
        setPlanId('free');
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
