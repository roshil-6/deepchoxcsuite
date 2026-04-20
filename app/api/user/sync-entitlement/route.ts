import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { TRIAL_DURATION_MS } from '@/lib/subscriptionLocal';

type Body = {
    plan?: 'pro' | 'free';
    startTrial?: boolean;
    clearTrial?: boolean;
};

/**
 * Mirrors subscription UI (localStorage) into Clerk `publicMetadata` so server routes
 * (daily brief, venture registry) can enforce Pro / trial consistently.
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
        if (body.plan === 'pro' || body.plan === 'free') {
            next.deepchoxPlan = body.plan;
            if (body.plan === 'pro') {
                next.deepchoxTrialEndsAt = null;
            }
        }

        await client.users.updateUser(userId, { publicMetadata: next });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('[sync-entitlement]', e);
        const msg = e instanceof Error ? e.message : 'sync_failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 503 });
    }
}
