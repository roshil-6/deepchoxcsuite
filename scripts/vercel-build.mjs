/**
 * Vercel build entry: run migrations only when DATABASE_URL is available.
 * Preview/PR deployments often omit env vars unless duplicated for Preview in the dashboard.
 */
import { execSync } from 'node:child_process';

function postgresHostname(databaseUrl) {
  try {
    const normalized = databaseUrl.replace(/^postgresql:\/\//i, 'http://');
    return new URL(normalized).hostname;
  } catch {
    return '';
  }
}

/** Render internal URLs use host `dpg-…-a` with no domain; only reachable inside Render, not from Vercel. */
function isRenderInternalHostname(hostname) {
  if (!hostname || hostname.includes('.')) return false;
  return /^dpg-.+-a$/i.test(hostname);
}

const dbUrl = process.env.DATABASE_URL?.trim();
const vercelEnv = process.env.VERCEL_ENV?.trim();

if (dbUrl) {
  const host = postgresHostname(dbUrl);
  if (isRenderInternalHostname(host)) {
    console.error(
      `[deepchox] DATABASE_URL uses Render INTERNAL host "${host}". Vercel cannot reach it (P1001).\n` +
        'In Render → Postgres → Connect, copy the External Database URL (hostname ends with .render.com) and set that as DATABASE_URL on Vercel (Production + Preview).'
    );
    process.exit(1);
  }
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
} else if (vercelEnv === 'production') {
  console.error('[deepchox] DATABASE_URL is required for production builds (Vercel → Settings → Environment Variables).');
  process.exit(1);
} else {
  console.warn(
    '[deepchox] DATABASE_URL unset — skipping prisma migrate deploy. Add DATABASE_URL for Preview in Vercel if you need migrate + API routes on branch deploys.'
  );
}

execSync('npx next build', { stdio: 'inherit' });
