import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasDailyBriefEntitlement } from '@/lib/dailyBriefEntitlement';

/**
 * POST /api/dexo/venture-registry
 * Upsert a venture context snapshot so server-side cron can run daily pulses while app is closed.
 */
export async function POST(req: Request) {
  if (!(await hasDailyBriefEntitlement())) {
    return NextResponse.json(
      { ok: false, error: 'pro_required', upgrade: true, message: 'Venture registry (for automated daily briefs) requires Co-Founder Pro.' },
      { status: 403 },
    );
  }

  let body: {
    ventureId?: unknown;
    ventureName?: unknown;
    contextSnapshot?: unknown;
    sparseContext?: unknown;
    isActive?: unknown;
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

  const ventureName = typeof body.ventureName === 'string' ? body.ventureName.slice(0, 180) : null;
  const contextSnapshot = typeof body.contextSnapshot === 'string' ? body.contextSnapshot : '';
  if (!contextSnapshot.trim()) {
    return NextResponse.json({ ok: false, error: 'contextSnapshot required' }, { status: 400 });
  }
  const sparseContext = !!body.sparseContext;
  const isActive = body.isActive === undefined ? true : !!body.isActive;

  try {
    const row = await prisma.ventureRegistry.upsert({
      where: { ventureId },
      create: {
        ventureId,
        ventureName,
        contextSnapshot: contextSnapshot.slice(0, 32000),
        sparseContext,
        isActive,
        lastSeenAt: new Date(),
      },
      update: {
        ventureName,
        contextSnapshot: contextSnapshot.slice(0, 32000),
        sparseContext,
        isActive,
        lastSeenAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, row });
  } catch (e) {
    console.error('[dexo/venture-registry]', e);
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }
}
