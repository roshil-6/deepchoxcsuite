import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { dexoWebSearch } from '@/lib/dexoWebResearch';
import { runDexoDailyBriefAi } from '@/lib/dexoDailyBriefAi';

export function todayUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function extractVentureName(context: string): string {
  const m = context.match(/^\s*Venture:\s*(.+)$/im);
  return m?.[1]?.trim().slice(0, 120) || 'venture';
}

export async function runDailyPulseForVenture(opts: {
  ventureId: number;
  context: string;
  sparseContext: boolean;
  reportDay?: string;
  force?: boolean;
}) {
  const reportDay = opts.reportDay && /^\d{4}-\d{2}-\d{2}$/.test(opts.reportDay) ? opts.reportDay : todayUtcDay();
  const force = !!opts.force;

  if (!force) {
    const existing = await prisma.ventureDailyReport.findUnique({
      where: { ventureId_reportDay: { ventureId: opts.ventureId, reportDay } },
    });
    if (existing) {
      await prisma.ventureRegistry.updateMany({
        where: { ventureId: opts.ventureId },
        data: { lastPulseAt: new Date(), pulseStatus: 'cached' },
      });
      return { cached: true as const, row: existing, voiceResponse: null as string | null };
    }
  }

  const vname = extractVentureName(opts.context);
  const y = new Date().getFullYear();
  const researchQuery = `${vname} startup company news market trends ${y}`;
  const webSources = await dexoWebSearch(researchQuery);

  const { report, bodyMd } = await runDexoDailyBriefAi({
    ventureContext: opts.context,
    webSources,
    researchQuery,
    sparseContext: opts.sparseContext,
  });

  const pending = report.proposedUpdates as unknown as Prisma.InputJsonValue;
  const row = await prisma.ventureDailyReport.upsert({
    where: { ventureId_reportDay: { ventureId: opts.ventureId, reportDay } },
    create: {
      ventureId: opts.ventureId,
      reportDay,
      headline: report.headline,
      summary: report.summary,
      bodyMd,
      sourcesJson: webSources as unknown as Prisma.InputJsonValue,
      followUpJson: report.followUp as unknown as Prisma.InputJsonValue,
      pendingProposedUpdates: pending,
      researchQuery,
    },
    update: {
      headline: report.headline,
      summary: report.summary,
      bodyMd,
      sourcesJson: webSources as unknown as Prisma.InputJsonValue,
      followUpJson: report.followUp as unknown as Prisma.InputJsonValue,
      pendingProposedUpdates: pending,
      researchQuery,
      userApprovedAt: null,
    },
  });

  await prisma.ventureRegistry.updateMany({
    where: { ventureId: opts.ventureId },
    data: { lastPulseAt: new Date(), pulseStatus: 'ok' },
  });

  return { cached: false as const, row, voiceResponse: report.voiceResponse };
}
