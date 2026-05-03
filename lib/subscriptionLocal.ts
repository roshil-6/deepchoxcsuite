/**
 * Client-only plan flags stored in localStorage.
 * Kept separate from token persistence so both can stay in sync.
 */

export const PLAN_STORAGE_KEY = 'deepchox_plan';

export function readPlanId(): 'free' | 'pro' {
    if (typeof window === 'undefined') return 'free';
    return localStorage.getItem(PLAN_STORAGE_KEY) === 'pro' ? 'pro' : 'free';
}

/** True only when paid Pro (Razorpay webhook → Clerk publicMetadata → localStorage). */
export function readSubscriptionIsPro(): boolean {
    if (typeof window === 'undefined') return false;
    return readPlanId() === 'pro';
}

export function emitSubscriptionChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('deepchox-subscription-changed'));
}
