import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { patchFieldLabels, sanitizeDexoPatch } from '@/lib/dexoPatchSchema';
import { assertVentureOwnership, sessionFrom } from '@/lib/ventureApiHelpers';

/**
 * GET /api/dexo/proposals?ventureId=123&status=pending
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

  const status = (url.searchParams.get('status') || 'pending').trim();
  const take = Math.min(80, Math.max(1, Number(url.searchParams.get('take')) || 40));
  try {
    const proposals = await prisma.dexoPendingProposal.findMany({
      where: { ventureId, status },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return NextResponse.json({ ok: true, proposals });
  } catch (e) {
    console.error('[dexo/proposals GET]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}

/**
 * POST /api/dexo/proposals
 */
export async function POST(req: Request) {
  const sessionId = sessionFrom(req);
  if (!sessionId) return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });

  let body: {
    ventureId?: unknown;
    source?: unknown;
    model?: unknown;
    summary?: unknown;
    patch?: unknown;
    conversationRef?: unknown;
  };
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
  const source = typeof body.source === 'string' && body.source.trim() ? body.source.trim().slice(0, 64) : 'dexo_chat';
  const model = typeof body.model === 'string' ? body.model.slice(0, 120) : null;
  const conversationRef = typeof body.conversationRef === 'string' ? body.conversationRef.slice(0, 120) : null;

  const sanitized = sanitizeDexoPatch(body.patch);
  if (!sanitized.ok) {
    return NextResponse.json({ ok: false, error: sanitized.error }, { status: 400 });
  }

  const label = patchFieldLabels(sanitized.patch).join(', ');
  const summary =
    typeof body.summary === 'string' && body.summary.trim()
      ? body.summary.trim().slice(0, 500)
      : `Pending update: ${label || 'venture changes'}`;

  try {
    const proposal = await prisma.dexoPendingProposal.create({
      data: {
        ventureId,
        source,
        model,
        summary,
        patchJson: sanitized.patch as unknown as Prisma.InputJsonValue,
        conversationRef,
        status: 'pending',
      },
    });
    await prisma.dexoPatchAuditLog.create({
      data: {
        ventureId,
        proposalId: proposal.id,
        action: 'proposal_created',
        actor: 'dexo',
        model,
        patchJson: sanitized.patch as unknown as Prisma.InputJsonValue,
        note: summary,
      },
    });
    return NextResponse.json({ ok: true, proposal });
  } catch (e) {
    console.error('[dexo/proposals POST]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}
