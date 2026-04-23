/**
 * Razorpay Payment Page / Payment Link URLs (from Razorpay Dashboard).
 * Set at least one of the env vars below so "Upgrade" opens checkout in a new tab.
 *
 * - NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK: one link for both toggles (typical for a single plan)
 * - Or set MONTHLY / YEARLY when you have two different payment links
 *
 * Pro unlock after payment: configure Razorpay webhooks + your API to set Clerk/metadata;
 * the app will not call activatePro/upgradeToPro() when a link opened (avoids free Pro without payment).
 */

import type { BillingCycle } from '@/lib/billingConfig';

function pick(v: string | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
}

/**
 * Resolves the checkout URL for monthly or yearly, using the fallback when a specific key is empty.
 */
export function getRazorpayPaymentLinkUrl(cycle: BillingCycle): string | null {
    const fallback = pick(process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK);
    const monthly = pick(process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK_MONTHLY);
    const yearly = pick(process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK_YEARLY);
    if (cycle === 'monthly') return monthly || fallback;
    return yearly || fallback;
}

export function hasRazorpayPaymentLinkForCycle(cycle: BillingCycle): boolean {
    return getRazorpayPaymentLinkUrl(cycle) !== null;
}

/**
 * Opens Razorpay in a new tab. Returns true if a URL was configured and opened.
 *
 * Pass `userId` (Clerk userId) so Razorpay embeds it in the payment notes.
 * The webhook at /api/webhooks/razorpay reads it back to know which user to upgrade.
 * Razorpay payment links accept prefilled notes via ?notes[key]=value query params.
 */
export function openRazorpayPaymentPage(cycle: BillingCycle, userId?: string): boolean {
    if (typeof window === 'undefined') return false;
    const base = getRazorpayPaymentLinkUrl(cycle);
    if (!base) return false;
    let url = base;
    if (userId) {
        // Append as a Razorpay note so the webhook can identify the user.
        const sep = base.includes('?') ? '&' : '?';
        url = `${base}${sep}notes[user_id]=${encodeURIComponent(userId)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
}

/**
 * Tries default monthly link first (or shared fallback), then yearly-specific link.
 * Useful for a single generic "Pay with Razorpay" button.
 */
export function openRazorpayPaymentPageWithFallback(userId?: string): boolean {
    if (openRazorpayPaymentPage('monthly', userId)) return true;
    return openRazorpayPaymentPage('yearly', userId);
}
