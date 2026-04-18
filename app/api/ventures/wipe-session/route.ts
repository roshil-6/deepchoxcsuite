import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { responseFromVentureError, responseIfDatabaseNotConfigured } from '@/lib/ventureApiHelpers';

function sessionFrom(req: Request): string | null {
    const h = req.headers.get('x-deepchox-session')?.trim();
    return h && h.length >= 8 ? h : null;
}

/** POST — delete all ventures (and Dexo-linked rows) for this device session */
export async function POST(req: Request) {
    const missingDb = responseIfDatabaseNotConfigured();
    if (missingDb) return missingDb;
    const sessionId = sessionFrom(req);
    if (!sessionId) {
        return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 401 });
    }
    try {
        const ventures = await prisma.venture.findMany({
            where: { sessionId },
            select: { id: true },
        });
        const ids = ventures.map((v) => v.id);
        if (ids.length === 0) {
            return NextResponse.json({ ok: true, deletedVentures: 0 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.dexoConversationMessage.deleteMany({ where: { ventureId: { in: ids } } });
            await tx.ventureDailyReport.deleteMany({ where: { ventureId: { in: ids } } });
            await tx.ventureRegistry.deleteMany({ where: { ventureId: { in: ids } } });
            await tx.dexoPendingProposal.deleteMany({ where: { ventureId: { in: ids } } });
            await tx.dexoPatchAuditLog.deleteMany({ where: { ventureId: { in: ids } } });
            await tx.dexoActionQueue.deleteMany({ where: { ventureId: { in: ids } } });
            await tx.enquiry.deleteMany({ where: { ventureId: { in: ids } } });
            await tx.venture.deleteMany({ where: { sessionId } });
        });

        return NextResponse.json({ ok: true, deletedVentures: ids.length });
    } catch (e) {
        return responseFromVentureError(e, '[ventures wipe-session]');
    }
}
