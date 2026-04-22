import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasDailyBriefEntitlement } from '@/lib/dailyBriefEntitlement';
import { assertVentureOwnership, sessionFrom } from '@/lib/ventureApiHelpers';

/**
 * GET /api/dexo/daily-reports?ventureId=123&limit=30
 */
export async function GET(req: Request) {
  const sessionId = sessionFrom(req);
  if (!sessionId) return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });

  if (!(await hasDailyBriefEntitlement())) {
    return NextResponse.json(
      { ok: false, error: 'pro_required', upgrade: true, message: 'Dexo daily reports are a Co-Founder Pro feature.' },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const ventureId = Number(url.searchParams.get('ventureId'));
  if (!Number.isFinite(ventureId)) {
    return NextResponse.json({ ok: false, error: 'Invalid ventureId' }, { status: 400 });
  }

  const ownershipError = await assertVentureOwnership(ventureId, sessionId);
  if (ownershipError) return ownershipError;

  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get('limit')) || 30));

  try {
    const reports = await prisma.ventureDailyReport.findMany({
      where: { ventureId },
      orderBy: { reportDay: 'desc' },
      take: limit,
    });
    return NextResponse.json({ ok: true, reports });
  } catch (e) {
    console.error('[dexo/daily-reports GET]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}
