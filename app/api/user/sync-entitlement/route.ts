import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { TRIAL_DURATION_MS } from '@/lib/subscriptionLocal';

/**
 * Only trial lifecycle (start / clear) may be managed client-side.
 * Plan tier (free → pro) MUST only be set by a verified payment-provider webhook —
 * never accepted from the client, to prevent free-to-pro privilege escalation.
 */
type Body = {
    startTrial?: boolean;
    clearTrial?: boolean;
};

/**
 * Mirrors trial state into Clerk `publicMetadata` so server routes can enforce
 * trial windows consistently. Plan tier changes are intentionally NOT accepted here.
 */
export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    let body: Body;
    try {
        body = (await req.json()) as Body;
    } catch {
        return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const prev = { ...(user.publicMetadata as Record<string, unknown>) };
        const next: Record<string, unknown> = { ...prev };

        if (body.startTrial) {
            next.deepchoxTrialEndsAt = Date.now() + TRIAL_DURATION_MS;
        }
        if (body.clearTrial) {
            next.deepchoxTrialEndsAt = null;
        }

        // NOTE: `deepchoxPlan` is intentionally NOT writable from this endpoint.
        // Plan upgrades must go through a payment-provider webhook that verifies
        // the purchase before writing `deepchoxPlan: 'pro'` to Clerk metadata.

        await client.users.updateUser(userId, { publicMetadata: next });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('[sync-entitlement]', e);
        const msg = e instanceof Error ? e.message : 'sync_failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 503 });
    }
}
