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

async function syncVentureIdSequence(): Promise<void> {
    await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('ventures', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 1) FROM ventures), 1)
    )
  `);
}

/** POST — upsert one Dexie `projects` row into Postgres with preserved numeric id */
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
        const id = p.id;
        if (typeof id !== 'number' || !Number.isFinite(id) || id < 1) {
            return NextResponse.json({ ok: false, error: 'missing_or_invalid_id' }, { status: 400 });
        }

        const existing = await prisma.venture.findUnique({ where: { id } });
        if (existing && existing.sessionId !== sessionId) {
            return NextResponse.json({ ok: false, error: 'venture_owned_elsewhere' }, { status: 403 });
        }

        const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 240) : 'Imported venture';
        const ts = typeof p.timestamp === 'number' && !Number.isNaN(p.timestamp) ? p.timestamp : Date.now();
        const project: Project = { ...(p as Project), id, name, timestamp: ts };
        let dataJson: Prisma.InputJsonValue;
        try {
            dataJson = projectToDataJson(project) as Prisma.InputJsonValue;
        } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            if (msg === 'project_not_json_serializable') {
                return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
            }
            throw err;
        }

        const row = await prisma.venture.upsert({
            where: { id },
            create: { id, sessionId, name, dataJson },
            update: { sessionId, name, dataJson },
        });

        await syncVentureIdSequence();

        return NextResponse.json({ ok: true, project: rowToProject(row) });
    } catch (e) {
        return responseFromVentureError(e, '[ventures import-legacy]');
    }
}
