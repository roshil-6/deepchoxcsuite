import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { Project } from '@/lib/projectTypes';
import { responseFromVentureError, responseIfDatabaseNotConfigured } from '@/lib/ventureApiHelpers';
import { projectToDataJson, rowToProject } from '@/lib/ventureRow';

function sessionFrom(req: Request): string | null {
  const h = req.headers.get('x-deepchox-session')?.trim();
  return h && h.length >= 8 ? h : null;
}

/** GET — list ventures for this device session */
export async function GET(req: Request) {
  const missingDb = responseIfDatabaseNotConfigured();
  if (missingDb) return missingDb;
  const sessionId = sessionFrom(req);
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });
  }
  try {
    const rows = await prisma.venture.findMany({
      where: { sessionId },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return NextResponse.json({ ok: true, projects: rows.map(rowToProject) });
  } catch (e) {
    return responseFromVentureError(e, '[ventures GET]');
  }
}

/** POST — create venture */
export async function POST(req: Request) {
  const missingDb = responseIfDatabaseNotConfigured();
  if (missingDb) return missingDb;
  const sessionId = sessionFrom(req);
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });
  }
  try {
    const body = (await req.json()) as { project?: Project };
    const p = body.project;
    if (!p || typeof p !== 'object') {
      return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
    }
    const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 240) : 'New venture';
    const ts =
      typeof p.timestamp === 'number' && !Number.isNaN(p.timestamp) ? p.timestamp : Date.now();
    let dataJson: Prisma.InputJsonValue;
    try {
      dataJson = projectToDataJson({ ...(p as Project), name, timestamp: ts }) as Prisma.InputJsonValue;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'project_not_json_serializable') {
        return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
      }
      throw err;
    }
    const row = await prisma.venture.create({
      data: { sessionId, name, dataJson },
    });
    return NextResponse.json({ ok: true, project: rowToProject(row) });
  } catch (e) {
    return responseFromVentureError(e, '[ventures POST]');
  }
}
