import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function redactConnectionInfo(message: string): string {
  return message.replace(/postgresql:\/\/[^:]+:[^@]+@/gi, 'postgresql://***:***@');
}

export async function GET() {
  const databaseUrlConfigured = Boolean(process.env.DATABASE_URL?.trim());
  let database = false;
  let databaseError: string | undefined;

  if (databaseUrlConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      databaseError = redactConnectionInfo(raw).slice(0, 280);
      console.warn('[deepchox] /api/health database check failed:', databaseError);
    }
  }

  return NextResponse.json({
    ok: true,
    database,
    /** False means Render Web Service does not have DATABASE_URL — add Internal URL from Postgres. */
    databaseUrlConfigured,
    ...(databaseError ? { databaseError } : {}),
    groqConfigured: Boolean(process.env.GROQ_API_KEY?.trim()),
    ollamaUrl: process.env.OLLAMA_URL || null,
    timestamp: new Date().toISOString(),
  });
}
