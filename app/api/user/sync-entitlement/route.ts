import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * Plan tier (free → pro) MUST only be set by a verified payment-provider webhook —
 * never accepted from the client, to prevent free-to-pro privilege escalation.
 *
 * This endpoint is intentionally a no-op for plan changes.
 * It exists only so old client calls don't 404.
 */
export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    // Intentionally ignore any body — plan changes only via Razorpay webhook.
    void req;
    void clerkClient;

    return NextResponse.json({ ok: true });
}
