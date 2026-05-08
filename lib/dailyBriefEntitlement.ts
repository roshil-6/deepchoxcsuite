import { auth } from '@clerk/nextjs/server';

/**
 * Server-side gate for Deepchox daily brief / daily reports APIs.
 * Requires only a valid signed-in session — no plan check.
 */
export async function hasDailyBriefEntitlement(): Promise<boolean> {
    const { userId } = await auth();
    return Boolean(userId);
}
