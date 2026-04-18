/**
 * Vercel build entry: run migrations only when DATABASE_URL is available.
 * Preview/PR deployments often omit env vars unless duplicated for Preview in the dashboard.
 */
import { execSync } from 'node:child_process';

const dbUrl = process.env.DATABASE_URL?.trim();
const vercelEnv = process.env.VERCEL_ENV?.trim();

if (dbUrl) {
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
