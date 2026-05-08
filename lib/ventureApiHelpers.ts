import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function redactConnectionInfo(message: string): string {
    return message.replace(/postgresql:\/\/[^:]+:[^@]+@/gi, 'postgresql://***:***@');
}

function ventureErrorHint(e: unknown): string | undefined {
    if (process.env.NODE_ENV === 'production') return undefined;
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
        return redactConnectionInfo(`[${e.code}] ${e.message}`).slice(0, 1200);
    }
    if (e instanceof Prisma.PrismaClientValidationError) {
        return redactConnectionInfo(e.message).slice(0, 1200);
    }
    if (e instanceof Error) {
        return redactConnectionInfo(e.message).slice(0, 1200);
    }
    return redactConnectionInfo(String(e)).slice(0, 400);
}

/**
 * Extracts the device session id from the `x-deepchox-session` request header.
 * Returns null when the header is absent or too short to be valid.
 */
export function sessionFrom(req: Request): string | null {
    const h = req.headers.get('x-deepchox-session')?.trim();
    return h && h.length >= 8 ? h : null;
}

/**
 * Verifies `ventureId` belongs to `sessionId`.
 * Returns a 403 NextResponse when ownership cannot be confirmed, or `null` when it is safe to proceed.
 * Call this in every Deepchox route after parsing `ventureId` to prevent cross-user IDOR.
 */
export async function assertVentureOwnership(
    ventureId: number,
    sessionId: string,
): Promise<NextResponse | null> {
    const venture = await prisma.venture.findFirst({ where: { id: ventureId, sessionId } });
    if (!venture) {
        return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
    return null;
}

/** Call at the start of venture handlers; returns a 503 response if DB URL is missing. */
export function responseIfDatabaseNotConfigured(): NextResponse | null {
    const url = process.env.DATABASE_URL?.trim();
    if (url) return null;
    console.error('[ventures] DATABASE_URL is missing — add it to .env.local and restart `next dev`');
    return NextResponse.json({ ok: false, error: 'database_not_configured' }, { status: 503 });
}

export function responseFromVentureError(e: unknown, logLabel: string): NextResponse {
    console.error(logLabel, e);
    const hint = ventureErrorHint(e);
    return NextResponse.json(
        { ok: false, error: 'database_unavailable', ...(hint ? { hint } : {}) },
        { status: 503 }
    );
}
