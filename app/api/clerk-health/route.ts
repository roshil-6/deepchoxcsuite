import { NextResponse } from 'next/server';

/**
 * Public sanity check: confirms env vars the **running** server/build actually sees.
 * Dashboard can show variables set while Preview/Production runtimes differ, or a redeploy was missed.
 * No secrets are returned — only prefixes and booleans.
 */
export async function GET() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '';
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? '';
  const hasSecret = Boolean(process.env.CLERK_SECRET_KEY?.trim());
  const vercelUrl = process.env.VERCEL_URL?.trim() ?? '';
  const vercelEnv = process.env.VERCEL_ENV?.trim() ?? '';

  const pkPrefix = pk ? `${pk.slice(0, 10)}…` : '(missing)';
  const issues: string[] = [];
  if (!pk) issues.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is empty at runtime — redeploy after setting it.');
  if (!hasSecret) issues.push('CLERK_SECRET_KEY is empty at runtime — server auth will fail.');
  if (!site) {
    issues.push(
      'NEXT_PUBLIC_SITE_URL is empty — set to your live origin (e.g. https://www.yourdomain.com). Preview deploys need it too if you test on *.vercel.app.'
    );
  }
  if (pk.startsWith('pk_live_') && site.includes('localhost')) {
    issues.push('pk_live_ with localhost in SITE_URL — production keys need your real domain.');
  }

  return NextResponse.json(
    {
      ok: issues.length === 0,
      publishableKeyPrefix: pkPrefix,
      nextPublicSiteUrl: site || null,
      clerkSecretKeyConfigured: hasSecret,
      vercelUrl: vercelUrl || null,
      vercelEnv: vercelEnv || null,
      issues,
      hint: 'Open this URL on the same host where auth fails (production vs preview). If values are wrong here, the problem is hosting env / redeploy, not Clerk dashboard labels alone.',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
