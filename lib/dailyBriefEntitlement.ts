import { auth, currentUser } from '@clerk/nextjs/server';

/**
 * Server-side gate for Dexo daily brief / daily reports APIs.
 * Uses Clerk `publicMetadata` (synced from the app via `/api/user/sync-entitlement`).
 * Set `DAILY_BRIEF_ALLOW_FREE=1` in env to bypass for local/testing.
 */
export async function hasDailyBriefEntitlement(): Promise<boolean> {
    if (process.env.DAILY_BRIEF_ALLOW_FREE?.trim() === '1') {
        return true;
    }

    const { userId } = await auth();
    if (!userId) return false;

    const user = await currentUser();
    if (!user) return false;

    const meta = user.publicMetadata as {
        deepchoxPlan?: string;
        deepchoxTrialEndsAt?: number | null;
    };

    if (meta.deepchoxPlan === 'pro') return true;

    const end = meta.deepchoxTrialEndsAt;
    if (typeof end === 'number' && end > Date.now()) return true;

    return false;
}
