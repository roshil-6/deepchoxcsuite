import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertVentureOwnership, sessionFrom } from '@/lib/ventureApiHelpers';

/**
 * POST /api/dexo/proposals/reject
 */
export async function POST(req: Request) {
  const sessionId = sessionFrom(req);
  if (!sessionId) return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });

  let body: { proposalId?: unknown; ventureId?: unknown; reason?: unknown; actor?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const proposalId = typeof body.proposalId === 'string' ? body.proposalId : '';
  const ventureId = Number(body.ventureId);
  if (!proposalId || !Number.isFinite(ventureId)) {
    return NextResponse.json({ ok: false, error: 'proposalId and ventureId required' }, { status: 400 });
  }

  const ownershipError = await assertVentureOwnership(ventureId, sessionId);
  if (ownershipError) return ownershipError;
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;
  const actor = typeof body.actor === 'string' && body.actor.trim() ? body.actor.trim().slice(0, 64) : 'founder';

  try {
    const row = await prisma.dexoPendingProposal.findFirst({ where: { id: proposalId, ventureId } });
    if (!row) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.dexoPendingProposal.update({
        where: { id: proposalId },
        data: { status: 'rejected', rejectedAt: new Date(), rejectionReason: reason },
      });
      await tx.dexoPatchAuditLog.create({
        data: {
          ventureId,
          proposalId,
          action: 'proposal_rejected',
          actor,
          model: row.model,
          patchJson: (row.patchJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          note: reason ?? undefined,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[dexo/proposals/reject]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}
