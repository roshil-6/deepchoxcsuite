import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runDailyPulseForVenture, todayUtcDay } from '@/lib/dexoDailyPulseService';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h1 = req.headers.get('x-cron-secret')?.trim();
  const h2 = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  return h1 === secret || h2 === secret;
}

/**
 * POST /api/dexo/cron-daily
 * Render cron entrypoint: runs one daily pulse per active venture from server-side registry.
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const reportDay = todayUtcDay();
  try {
    const ventures = await prisma.ventureRegistry.findMany({
      where: { isActive: true },
      orderBy: { lastSeenAt: 'desc' },
      take: 500,
    });
    let processed = 0;
    let failures = 0;
    const results: Array<{ ventureId: number; ok: boolean; error?: string; cached?: boolean }> = [];

    for (const v of ventures) {
      try {
        const out = await runDailyPulseForVenture({
          ventureId: v.ventureId,
          context: v.contextSnapshot,
          sparseContext: v.sparseContext,
          reportDay,
          force: false,
        });
        await prisma.ventureRegistry.update({
          where: { ventureId: v.ventureId },
          data: { lastPulseAt: new Date(), pulseStatus: out.cached ? 'cached' : 'ok' },
        });
        results.push({ ventureId: v.ventureId, ok: true, cached: out.cached });
        processed += 1;
      } catch (e) {
        failures += 1;
        const msg = e instanceof Error ? e.message : 'pulse_failed';
        await prisma.ventureRegistry.update({
          where: { ventureId: v.ventureId },
          data: { pulseStatus: `error:${msg.slice(0, 140)}` },
        });
        results.push({ ventureId: v.ventureId, ok: false, error: msg });
      }
    }

    return NextResponse.json({ ok: true, reportDay, ventures: ventures.length, processed, failures, results });
  } catch (e) {
    console.error('[dexo/cron-daily]', e);
    const msg = e instanceof Error ? e.message : 'cron_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
