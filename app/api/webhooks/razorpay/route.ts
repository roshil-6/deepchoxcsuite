import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * POST /api/webhooks/razorpay
 *
 * Razorpay calls this after a successful payment.
 * We verify the HMAC signature, read the Clerk userId from payment notes,
 * and set deepchoxPlan: 'pro' in their Clerk publicMetadata.
 *
 * Setup in Razorpay Dashboard:
 *   Settings → Webhooks → Add New Webhook
 *   URL: https://your-domain.com/api/webhooks/razorpay
 *   Events: payment.captured
 *   Secret: same value as RAZORPAY_WEBHOOK_SECRET in .env.local
 */

// Tell Next.js to pass the raw body — needed for HMAC signature verification.
export const runtime = 'nodejs';

export async function POST(req: Request) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
    if (!secret) {
        console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set');
        return NextResponse.json({ ok: false, error: 'webhook_not_configured' }, { status: 500 });
    }

    // Read raw body as text (must happen before any .json() call).
    const rawBody = await req.text();

    // Razorpay sends the signature in this header.
    const signature = req.headers.get('x-razorpay-signature') ?? '';

    // Verify: HMAC-SHA256(rawBody, secret) must match the header.
    const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    // timingSafeEqual throws if buffers differ in length — guard explicitly.
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');
    const signatureValid =
        signatureBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, signatureBuf);

    if (!signatureValid) {
        console.warn('[razorpay-webhook] invalid signature — possible spoofed request');
        return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 400 });
    }

    // Parse the event.
    let event: {
        event?: string;
        payload?: {
            payment?: {
                entity?: {
                    id?: string;
                    notes?: Record<string, string>;
                };
            };
        };
    };
    try {
        event = JSON.parse(rawBody) as typeof event;
    } catch {
        return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    // Only care about successful payments.
    if (event.event !== 'payment.captured') {
        // Acknowledge other events without processing.
        return NextResponse.json({ ok: true, skipped: true });
    }

    const payment = event.payload?.payment?.entity;
    const paymentId = payment?.id ?? '(unknown)';

    // The userId was embedded in the payment link URL as ?notes[user_id]=xxx
    const userId = payment?.notes?.user_id ?? payment?.notes?.userId ?? '';

    if (!userId) {
        // Payment captured but no userId in notes — cannot auto-upgrade.
        // This happens if the user paid via a link that wasn't opened through the app.
        // Log it so you can manually upgrade via Razorpay dashboard → Clerk.
        console.warn('[razorpay-webhook] payment.captured with no user_id in notes', { paymentId });
        return NextResponse.json({ ok: true, warning: 'no_user_id_in_notes' });
    }

    // Upgrade the user in Clerk — merge into existing metadata to avoid wiping other keys.
    try {
        const client = await clerkClient();
        const existing = await client.users.getUser(userId);
        const prevMeta = (existing.publicMetadata ?? {}) as Record<string, unknown>;
        await client.users.updateUser(userId, {
            publicMetadata: { ...prevMeta, deepchoxPlan: 'pro' },
        });
        console.log('[razorpay-webhook] upgraded user to Pro', { userId, paymentId });
        return NextResponse.json({ ok: true, upgraded: true });
    } catch (e) {
        console.error('[razorpay-webhook] failed to update Clerk user', { userId, paymentId, error: e });
        return NextResponse.json({ ok: false, error: 'clerk_update_failed' }, { status: 500 });
    }
}
