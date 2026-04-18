import { NextResponse } from 'next/server';
import { runDailyPulseForVenture, todayUtcDay } from '@/lib/dexoDailyPulseService';

/**
 * POST /api/dexo/daily-pulse
 * Generates or returns today's Dexo daily brief (web research + dual-agent report). Requires Postgres.
 */
export async function POST(req: Request) {
  let body: {
    ventureId?: unknown;
    reportDay?: unknown;
    context?: unknown;
    sparseContext?: unknown;
    force?: unknown;
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

  const reportDay =
    typeof body.reportDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.reportDay)
      ? body.reportDay
      : todayUtcDay();

  const context = typeof body.context === 'string' ? body.context : '';
  if (!context.trim()) {
    return NextResponse.json({ ok: false, error: 'context required' }, { status: 400 });
  }

  const sparseContext = !!body.sparseContext;
  const force = !!body.force;

  try {
    const out = await runDailyPulseForVenture({
      ventureId,
      context,
      sparseContext,
      reportDay,
      force,
    });
    return NextResponse.json({ ok: true, cached: out.cached, report: out.row, voiceResponse: out.voiceResponse });
  } catch (e) {
    console.error('[dexo/daily-pulse]', e);
    const msg = e instanceof Error ? e.message : 'daily_pulse_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
