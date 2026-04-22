import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertVentureOwnership, sessionFrom } from '@/lib/ventureApiHelpers';

const MAX_MESSAGES = 120;

function parseVentureId(req: Request): number | null {
    const url = new URL(req.url);
    const v = Number(url.searchParams.get('ventureId'));
    return Number.isFinite(v) ? v : null;
}

/**
 * GET /api/dexo-convo?ventureId=123
 */
export async function GET(req: Request) {
    const sessionId = sessionFrom(req);
    if (!sessionId) return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });

    const ventureId = parseVentureId(req);
    if (ventureId === null) {
        return NextResponse.json({ ok: false, error: 'Invalid ventureId' }, { status: 400 });
    }

    const ownershipError = await assertVentureOwnership(ventureId, sessionId);
    if (ownershipError) return ownershipError;

    try {
        const rows = await prisma.dexoConversationMessage.findMany({
            where: { ventureId },
            orderBy: { seq: 'asc' },
        });
        const messages = rows.map((r) => ({
            id: r.clientId,
            role: r.role === 'user' ? ('user' as const) : ('dexo' as const),
            text: r.content,
        }));
        return NextResponse.json({ ok: true, messages });
    } catch (e) {
        console.error('[dexo-convo] GET', e);
        return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
    }
}

type IncomingMsg = { id?: unknown; role?: unknown; text?: unknown };

/**
 * POST /api/dexo-convo — replace full thread (same semantics as client Dexie replace).
 */
export async function POST(req: Request) {
    const sessionId = sessionFrom(req);
    if (!sessionId) return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });

    let body: { ventureId?: unknown; messages?: unknown };
    try {
        body = (await req.json()) as { ventureId?: unknown; messages?: unknown };
    } catch {
        return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }
    const ventureId = Number(body.ventureId);
    if (!Number.isFinite(ventureId)) {
        return NextResponse.json({ ok: false, error: 'Invalid ventureId' }, { status: 400 });
    }

    const ownershipError = await assertVentureOwnership(ventureId, sessionId);
    if (ownershipError) return ownershipError;
    if (!Array.isArray(body.messages)) {
        return NextResponse.json({ ok: false, error: 'messages must be an array' }, { status: 400 });
    }
    const trimmed = (body.messages as IncomingMsg[]).slice(-MAX_MESSAGES);
    const data = trimmed.map((m, seq) => {
        const role = m.role === 'user' ? 'user' : 'dexo';
        const text = typeof m.text === 'string' ? m.text : '';
        const clientId = typeof m.id === 'number' && Number.isFinite(m.id) ? m.id : seq;
        return { ventureId, role, content: text, clientId, seq };
    });
    try {
        await prisma.$transaction(async (tx) => {
            await tx.dexoConversationMessage.deleteMany({ where: { ventureId } });
            if (data.length > 0) {
                await tx.dexoConversationMessage.createMany({ data });
            }
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('[dexo-convo] POST', e);
        return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
    }
}

/**
 * DELETE /api/dexo-convo?ventureId=123
 */
export async function DELETE(req: Request) {
    const sessionId = sessionFrom(req);
    if (!sessionId) return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });

    const ventureId = parseVentureId(req);
    if (ventureId === null) {
        return NextResponse.json({ ok: false, error: 'Invalid ventureId' }, { status: 400 });
    }

    const ownershipError = await assertVentureOwnership(ventureId, sessionId);
    if (ownershipError) return ownershipError;

    try {
        await prisma.dexoConversationMessage.deleteMany({ where: { ventureId } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('[dexo-convo] DELETE', e);
        return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
    }
}
