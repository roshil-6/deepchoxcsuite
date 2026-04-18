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

function parseId(param: string): number | null {
    const n = Number(param);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const missingDb = responseIfDatabaseNotConfigured();
    if (missingDb) return missingDb;
    const sessionId = sessionFrom(req);
    if (!sessionId) {
        return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });
    }
    const { id: raw } = await ctx.params;
    const id = parseId(raw);
    if (id == null) {
        return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
    }
    try {
        const row = await prisma.venture.findFirst({ where: { id, sessionId } });
        if (!row) {
            return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
        }
        return NextResponse.json({ ok: true, project: rowToProject(row) });
    } catch (e) {
        return responseFromVentureError(e, '[ventures GET id]');
    }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const missingDb = responseIfDatabaseNotConfigured();
    if (missingDb) return missingDb;
    const sessionId = sessionFrom(req);
    if (!sessionId) {
        return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });
    }
    const { id: raw } = await ctx.params;
    const id = parseId(raw);
    if (id == null) {
        return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
    }
    try {
        const existing = await prisma.venture.findFirst({ where: { id, sessionId } });
        if (!existing) {
            return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
        }
        const body = (await req.json()) as { project?: Project };
        const p = body.project;
        if (!p || typeof p !== 'object') {
            return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
        }
        const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 240) : existing.name;
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
        const row = await prisma.venture.update({
            where: { id },
            data: { name, dataJson },
        });
        return NextResponse.json({ ok: true, project: rowToProject(row) });
    } catch (e) {
        return responseFromVentureError(e, '[ventures PUT id]');
    }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const missingDb = responseIfDatabaseNotConfigured();
    if (missingDb) return missingDb;
    const sessionId = sessionFrom(req);
    if (!sessionId) {
        return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });
    }
    const { id: raw } = await ctx.params;
    const id = parseId(raw);
    if (id == null) {
        return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
    }
    try {
        const existing = await prisma.venture.findFirst({ where: { id, sessionId } });
        if (!existing) {
            return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
        }
        const body = (await req.json()) as { field?: string; value?: unknown };
        const field = body.field;
        if (typeof field !== 'string' || !field.trim()) {
            return NextResponse.json({ ok: false, error: 'invalid_field' }, { status: 400 });
        }
        if (field === 'id') {
            return NextResponse.json({ ok: false, error: 'cannot_patch_id' }, { status: 400 });
        }

        const proj = rowToProject(existing);
        (proj as unknown as Record<string, unknown>)[field] = body.value;

        const name =
            typeof proj.name === 'string' && proj.name.trim() ? proj.name.trim().slice(0, 240) : existing.name;
        let dataJson: Prisma.InputJsonValue;
        try {
            dataJson = projectToDataJson({ ...proj, name }) as Prisma.InputJsonValue;
        } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            if (msg === 'project_not_json_serializable') {
                return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
            }
            throw err;
        }
        const row = await prisma.venture.update({
            where: { id },
            data: { name, dataJson },
        });
        return NextResponse.json({ ok: true, project: rowToProject(row) });
    } catch (e) {
        return responseFromVentureError(e, '[ventures PATCH id]');
    }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const missingDb = responseIfDatabaseNotConfigured();
    if (missingDb) return missingDb;
    const sessionId = sessionFrom(req);
    if (!sessionId) {
        return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });
    }
    const { id: raw } = await ctx.params;
    const id = parseId(raw);
    if (id == null) {
        return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
    }
    try {
        const row = await prisma.venture.findFirst({ where: { id, sessionId } });
        if (!row) {
            return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.dexoConversationMessage.deleteMany({ where: { ventureId: id } });
            await tx.ventureDailyReport.deleteMany({ where: { ventureId: id } });
            await tx.ventureRegistry.deleteMany({ where: { ventureId: id } });
            await tx.dexoPendingProposal.deleteMany({ where: { ventureId: id } });
            await tx.dexoPatchAuditLog.deleteMany({ where: { ventureId: id } });
            await tx.dexoActionQueue.deleteMany({ where: { ventureId: id } });
            await tx.enquiry.deleteMany({ where: { ventureId: id } });
            await tx.venture.delete({ where: { id } });
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        return responseFromVentureError(e, '[ventures DELETE id]');
    }
}
