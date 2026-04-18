import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { executeIntegrationAction } from '@/lib/integrations';

/**
 * POST /api/dexo/actions/execute
 * Executes only approved actions via integration adapters (currently dry-run adapters).
 */
export async function POST(req: Request) {
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
  const actor = typeof body.actor === 'string' && body.actor.trim() ? body.actor.trim().slice(0, 64) : 'founder';

  try {
    const row = await prisma.dexoActionQueue.findFirst({ where: { id: queueId, ventureId } });
    if (!row) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    if (row.status !== 'approved') {
      return NextResponse.json({ ok: false, error: 'action_not_approved' }, { status: 409 });
    }

    const payload = row.payloadJson && typeof row.payloadJson === 'object' ? (row.payloadJson as Record<string, unknown>) : {};
    const result = await executeIntegrationAction(row.kind, payload);
    if (!result.ok) {
      await prisma.$transaction(async (tx) => {
        await tx.dexoActionQueue.update({
          where: { id: row.id },
          data: {
            status: 'failed',
            failedAt: new Date(),
            errorText: result.message.slice(0, 1000),
          },
        });
        await tx.dexoPatchAuditLog.create({
          data: {
            ventureId,
            action: 'action_queue_failed',
            actor,
            note: result.message.slice(0, 1000),
          },
        });
      });
      return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.dexoActionQueue.update({
        where: { id: row.id },
        data: {
          status: 'executed',
          executedAt: new Date(),
          errorText: null,
          payloadJson: {
            ...(payload as Record<string, unknown>),
            _execution: {
              externalId: result.externalId ?? null,
              message: result.message,
              at: new Date().toISOString(),
            },
          } as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.dexoPatchAuditLog.create({
        data: {
          ventureId,
          action: 'action_queue_executed',
          actor,
          note: result.message.slice(0, 1000),
        },
      });
    });
    return NextResponse.json({ ok: true, message: result.message, externalId: result.externalId });
  } catch (e) {
    console.error('[dexo/actions/execute]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}
