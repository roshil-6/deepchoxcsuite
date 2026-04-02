import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ENQUIRY_SOURCES = new Set(['whatsapp', 'email', 'facebook', 'reddit', 'other']);

function normalizeSource(raw: unknown): string {
  const s = String(raw ?? 'other')
    .toLowerCase()
    .trim();
  return ENQUIRY_SOURCES.has(s) ? s : 'other';
}

/**
 * Unified enquiries inbox (WhatsApp, email, social, etc.).
 * Populate via POST (webhooks / integrations) or Prisma Studio while connectors are built.
 */
export async function GET(req: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ connected: false, items: [] as unknown[] });
  }
  try {
    const { searchParams } = new URL(req.url);
    const ventureId = searchParams.get('ventureId');
    const importance = searchParams.get('importance');
    const vid = ventureId != null ? parseInt(ventureId, 10) : NaN;
    const items = await prisma.enquiry.findMany({
      where: {
        ...(Number.isFinite(vid) ? { ventureId: vid } : {}),
        ...(importance && importance !== 'all' ? { importance } : {}),
      },
      orderBy: { receivedAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ connected: true, items });
  } catch (e) {
    console.error('enquiries GET', e);
    return NextResponse.json({ connected: false, items: [], error: 'database_unavailable' });
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured on server' }, { status: 503 });
  }
  try {
    const body = (await req.json()) as {
      source?: string;
      externalId?: string;
      subject?: string;
      body?: string;
      receivedAt?: string;
      importance?: string;
      ventureId?: number | null;
      rawMeta?: object;
    };
    const row = await prisma.enquiry.create({
      data: {
        source: normalizeSource(body.source),
        externalId: body.externalId != null ? String(body.externalId) : null,
        subject: body.subject != null ? String(body.subject) : null,
        body: String(body.body ?? ''),
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
        importance: ['high', 'normal', 'low'].includes(String(body.importance))
          ? String(body.importance)
          : 'normal',
        ventureId:
          body.ventureId != null && String(body.ventureId).trim() !== ''
            ? parseInt(String(body.ventureId), 10)
            : null,
        rawMeta: body.rawMeta ?? undefined,
      },
    });
    return NextResponse.json({ ok: true, enquiry: row });
  } catch (e) {
    console.error('enquiries POST', e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
