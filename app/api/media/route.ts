import { NextRequest, NextResponse } from 'next/server';
import { resolveInsideStorage } from '@/lib/media/storage';
import { serveFile } from '@/lib/media/serveFile';

export const runtime = 'nodejs';

/** Stream a stored media file inline (Range-enabled for <video> seeking). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get('path');
  const abs = resolveInsideStorage(p);
  if (!abs) return NextResponse.json({ ok: false, error: 'Media not found' }, { status: 404 });
  return serveFile(req, abs);
}
