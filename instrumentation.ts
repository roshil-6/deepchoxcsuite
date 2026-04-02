/**
 * Runs once when the Node server starts (e.g. Render deploy). Check logs for:
 * [deepchox] DATABASE_URL configured: true/false
 * [deepchox] Postgres reachable (SELECT 1 ok) — or connection error
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;

  const hasUrl = Boolean(process.env.DATABASE_URL?.trim());
  console.info(`[deepchox] DATABASE_URL configured: ${hasUrl}`);
  if (!hasUrl) {
    console.warn(
      '[deepchox] No DATABASE_URL — add it on Render: Web Service → Environment → DATABASE_URL = Internal Database URL from your Postgres (then redeploy).'
    );
    return;
  }

  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    console.info('[deepchox] Postgres reachable (SELECT 1 ok)');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[deepchox] Postgres connection failed:', msg);
    console.warn(
      '[deepchox] Check: same Render region, Internal URL on the web service, SSL, and run: npx prisma migrate deploy (with DATABASE_URL set).'
    );
  }
}
