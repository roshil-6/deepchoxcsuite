/**
 * Client-only plan/trial flags stored in localStorage (demo / pre-billing).
 * Kept separate from token persistence so both can stay in sync.
 */

export const PLAN_STORAGE_KEY = 'deepchox_plan';
export const TRIAL_START_KEY = 'deepchox_trial_start';
export const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

export function readPlanId(): 'free' | 'pro' {
    if (typeof window === 'undefined') return 'free';
    return localStorage.getItem(PLAN_STORAGE_KEY) === 'pro' ? 'pro' : 'free';
}

export function readTrialStartMs(): number | null {
    if (typeof window === 'undefined') return null;
    const v = localStorage.getItem(TRIAL_START_KEY);
    if (!v) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
}

/** True when paid Pro or within the trial window. */
export function readSubscriptionIsPro(): boolean {
    if (typeof window === 'undefined') return false;
    if (readPlanId() === 'pro') return true;
    const start = readTrialStartMs();
    if (start === null) return false;
    return start + TRIAL_DURATION_MS > Date.now();
}

export function emitSubscriptionChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('deepchox-subscription-changed'));
}
