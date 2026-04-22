import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertVentureOwnership, sessionFrom } from '@/lib/ventureApiHelpers';

/**
 * POST /api/dexo/actions/approve
 */
export async function POST(req: Request) {
  const sessionId = sessionFrom(req);
  if (!sessionId) return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });

  let body: { queueId?: unknown; ventureId?: unknown; actor?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const queueId = typeof body.queueId === 'string' ? body.queueId : '';
  const ventureId = Number(body.ventureId);
  if (!queueId || !Number.isFinite(ventureId)) {
    return NextResponse.json({ ok: false, error: 'queueId and ventureId required' }, { status: 400 });
  }

  const ownershipError = await assertVentureOwnership(ventureId, sessionId);
  if (ownershipError) return ownershipError;
  const actor = typeof body.actor === 'string' && body.actor.trim() ? body.actor.trim().slice(0, 64) : 'founder';

  try {
    const row = await prisma.dexoActionQueue.findFirst({ where: { id: queueId, ventureId } });
    if (!row) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.dexoActionQueue.update({
        where: { id: queueId },
        data: { status: 'approved', approvedAt: new Date() },
      });
      await tx.dexoPatchAuditLog.create({
        data: {
          ventureId,
          action: 'action_queue_approved',
          actor,
          note: `${row.kind}${row.previewText ? `: ${row.previewText}` : ''}`,
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[dexo/actions/approve]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}
