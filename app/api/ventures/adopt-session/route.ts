import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { responseIfDatabaseNotConfigured, responseFromVentureError } from '@/lib/ventureApiHelpers';

/**
 * POST /api/ventures/adopt-session
 *
 * Called once on first sign-in to re-assign anonymous-session ventures to the
 * user's Clerk userId. This ensures ventures persist across browsers, devices,
 * and ports (localStorage origin changes) for signed-in users.
 *
 * Body: { anonymousSessionId: string }
 *
 * - Authenticated route — Clerk userId is the target session.
 * - Idempotent: safe to call multiple times; second call is a no-op (0 rows updated).
 * - Only adopts if anonymousSessionId ≠ userId (prevents self-assignment).
 */
export async function POST(req: Request) {
    const missing = responseIfDatabaseNotConfigured();
    if (missing) return missing;

    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    let body: { anonymousSessionId?: unknown };
    try {
        body = (await req.json()) as typeof body;
    } catch {
        return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    const anon = typeof body.anonymousSessionId === 'string' ? body.anonymousSessionId.trim() : '';
    if (!anon || anon.length < 8) {
        return NextResponse.json({ ok: false, error: 'invalid_anonymous_session' }, { status: 400 });
    }

    // Nothing to adopt — anonymous session IS the user session (already adopted).
    if (anon === userId) {
        return NextResponse.json({ ok: true, adopted: 0 });
    }

    try {
        const result = await prisma.venture.updateMany({
            where: { sessionId: anon },
            data: { sessionId: userId },
        });
        return NextResponse.json({ ok: true, adopted: result.count });
    } catch (e) {
        return responseFromVentureError(e, '[ventures adopt-session]');
    }
}
