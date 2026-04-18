import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sanitizeDexoPatch } from '@/lib/dexoPatchSchema';

/**
 * POST /api/dexo/proposals/apply
 * Marks proposal as applied after client applied patch to local venture data.
 */
export async function POST(req: Request) {
  let body: { proposalId?: unknown; ventureId?: unknown; appliedPatch?: unknown; actor?: unknown; note?: unknown };
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

  const sanitized = sanitizeDexoPatch(body.appliedPatch);
  if (!sanitized.ok) {
    return NextResponse.json({ ok: false, error: sanitized.error }, { status: 400 });
  }
  const actor = typeof body.actor === 'string' && body.actor.trim() ? body.actor.trim().slice(0, 64) : 'founder';
  const note = typeof body.note === 'string' ? body.note.slice(0, 500) : undefined;

  try {
    const row = await prisma.dexoPendingProposal.findFirst({ where: { id: proposalId, ventureId } });
    if (!row) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.dexoPendingProposal.update({
        where: { id: proposalId },
        data: {
          status: 'applied',
          appliedAt: new Date(),
          patchJson: sanitized.patch as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.dexoPatchAuditLog.create({
        data: {
          ventureId,
          proposalId,
          action: 'proposal_applied',
          actor,
          model: row.model,
          patchJson: sanitized.patch as unknown as Prisma.InputJsonValue,
          note,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[dexo/proposals/apply]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}
