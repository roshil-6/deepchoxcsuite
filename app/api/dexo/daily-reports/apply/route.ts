import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/dexo/daily-reports/apply
 * Call after the client has merged pendingProposedUpdates into the venture. Clears pending state and records approval time.
 */
export async function POST(req: Request) {
  let body: { reportId?: unknown; ventureId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const reportId = typeof body.reportId === 'string' ? body.reportId : '';
  const ventureId = Number(body.ventureId);
  if (!reportId || !Number.isFinite(ventureId)) {
    return NextResponse.json({ ok: false, error: 'reportId and ventureId required' }, { status: 400 });
  }

  try {
    const row = await prisma.ventureDailyReport.findFirst({
      where: { id: reportId, ventureId },
    });
    if (!row) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }
    await prisma.ventureDailyReport.update({
      where: { id: reportId },
      data: {
        userApprovedAt: new Date(),
        pendingProposedUpdates: Prisma.DbNull,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[dexo/daily-reports/apply]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}
