import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

function redactConnectionInfo(message: string): string {
  return message.replace(/postgresql:\/\/[^:]+:[^@]+@/gi, 'postgresql://***:***@');
}

/**
 * GET /api/health
 *
 * Public response: minimal { ok, timestamp } only.
 * Detailed diagnostics require the HEALTH_TOKEN env var to be set and
 * passed as ?token=<HEALTH_TOKEN> — keeps infra info off the public internet.
 */
export async function GET(req: Request) {
  // Rate-limit the health endpoint to prevent enumeration / hammering.
  const ip = getClientIp(req);
  const rl = checkRateLimit(`health:${ip}`, 60);
  if (!rl.ok) return rateLimitResponse(rl.resetAt);

  const url = new URL(req.url);
  const providedToken = url.searchParams.get('token') ?? '';
  const expectedToken = process.env.HEALTH_TOKEN?.trim() ?? '';

  // Only expose internal details when a HEALTH_TOKEN is configured AND matches.
  const authorized = expectedToken.length > 0 && providedToken === expectedToken;

  if (!authorized) {
    // Public callers (load balancers, uptime monitors) only need a simple ping.
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  }

  // --- Authorized diagnostic check ---
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
    databaseUrlConfigured,
    ...(databaseError ? { databaseError } : {}),
    groqConfigured: Boolean(process.env.GROQ_API_KEY?.trim()),
    ollamaUrl: process.env.OLLAMA_URL || null,
    timestamp: new Date().toISOString(),
  });
}
