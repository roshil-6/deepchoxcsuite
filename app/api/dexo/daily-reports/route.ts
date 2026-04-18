import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/dexo/daily-reports?ventureId=123&limit=30
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ventureId = Number(url.searchParams.get('ventureId'));
  if (!Number.isFinite(ventureId)) {
    return NextResponse.json({ ok: false, error: 'Invalid ventureId' }, { status: 400 });
  }
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
