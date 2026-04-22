import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertVentureOwnership, sessionFrom } from '@/lib/ventureApiHelpers';

/**
 * GET /api/dexo/actions/queue?ventureId=123&status=pending
 */
export async function GET(req: Request) {
  const sessionId = sessionFrom(req);
  if (!sessionId) return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });

  const url = new URL(req.url);
  const ventureId = Number(url.searchParams.get('ventureId'));
  if (!Number.isFinite(ventureId)) {
    return NextResponse.json({ ok: false, error: 'Invalid ventureId' }, { status: 400 });
  }

  const ownershipError = await assertVentureOwnership(ventureId, sessionId);
  if (ownershipError) return ownershipError;

  const status = (url.searchParams.get('status') || '').trim();
  const take = Math.min(80, Math.max(1, Number(url.searchParams.get('take')) || 40));
  try {
    const rows = await prisma.dexoActionQueue.findMany({
      where: status ? { ventureId, status } : { ventureId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    console.error('[dexo/actions/queue GET]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}

/**
 * POST /api/dexo/actions/queue
 * Creates a pending, dry-run action proposal.
 */
export async function POST(req: Request) {
  const sessionId = sessionFrom(req);
  if (!sessionId) return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });

  let body: { ventureId?: unknown; kind?: unknown; payloadJson?: unknown; previewText?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const ventureId = Number(body.ventureId);
  if (!Number.isFinite(ventureId)) {
    return NextResponse.json({ ok: false, error: 'Invalid ventureId' }, { status: 400 });
  }

  const ownershipError = await assertVentureOwnership(ventureId, sessionId);
  if (ownershipError) return ownershipError;
  const kind = typeof body.kind === 'string' && body.kind.trim() ? body.kind.trim().slice(0, 80) : '';
  if (!kind) return NextResponse.json({ ok: false, error: 'kind required' }, { status: 400 });
  const previewText = typeof body.previewText === 'string' ? body.previewText.slice(0, 800) : null;
  const payloadJson = body.payloadJson && typeof body.payloadJson === 'object' ? (body.payloadJson as Prisma.InputJsonValue) : Prisma.JsonNull;

  try {
    const row = await prisma.dexoActionQueue.create({
      data: {
        ventureId,
        kind,
        payloadJson,
        previewText,
        status: 'pending',
      },
    });
    await prisma.dexoPatchAuditLog.create({
      data: {
        ventureId,
        action: 'action_queue_created',
        actor: 'founder',
        note: `${kind}${previewText ? `: ${previewText}` : ''}`,
      },
    });
    return NextResponse.json({ ok: true, row });
  } catch (e) {
    console.error('[dexo/actions/queue POST]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}
