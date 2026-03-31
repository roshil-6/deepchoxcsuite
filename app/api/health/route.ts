import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  let database = false;
  if (process.env.DATABASE_URL?.trim()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch (e) {
      console.warn('Database health check failed:', e);
    }
  }

  return NextResponse.json({
    ok: true,
    database,
    groqConfigured: Boolean(process.env.GROQ_API_KEY?.trim()),
    ollamaUrl: process.env.OLLAMA_URL || null,
    timestamp: new Date().toISOString(),
  });
}
