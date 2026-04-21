import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

/** Security headers applied to every response. */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Mic must be allowed on self for Dexo / browser speech recognition; camera stays off.
  // Turnstile / Clerk probes may request xr-spatial-tracking; allow * to avoid console policy violations.
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), xr-spatial-tracking=*',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

/** Routes that are always public (no Clerk auth required). */
const isPublicRoute = createRouteMatcher([
  '/',           // landing page
  '/guide',      // public guide
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/sitemap.xml(.*)',
  '/robots.txt(.*)',
  /** Next.js metadata routes for favicons (must not return Clerk HTML to Googlebot). */
  '/icon(.*)',
  '/apple-icon(.*)',
  '/api/health(.*)',
  '/api/clerk-health(.*)',
]);

/** Per-IP in-memory rate limit for expensive AI API routes. */
interface RLEntry { count: number; windowStart: number }
const rlStore = new Map<string, RLEntry>();

const AI_ROUTE_LIMITS: Array<{ prefix: string; limit: number; windowMs: number }> = [
  { prefix: '/api/chat', limit: 30, windowMs: 60_000 },
  { prefix: '/api/chat-stream', limit: 20, windowMs: 60_000 },
  { prefix: '/api/jarvis', limit: 20, windowMs: 60_000 },
  { prefix: '/api/boardroom', limit: 10, windowMs: 60_000 },
  { prefix: '/api/agent-sync', limit: 10, windowMs: 60_000 },
  { prefix: '/api/dual-agent', limit: 10, windowMs: 60_000 },
  { prefix: '/api/dexo', limit: 40, windowMs: 60_000 },
  { prefix: '/api/personal-assistant', limit: 20, windowMs: 60_000 },
  { prefix: '/api/focus-briefing', limit: 15, windowMs: 60_000 },
  { prefix: '/api/relay-meeting-room', limit: 15, windowMs: 60_000 },
  { prefix: '/api/cfo-funding-suggest', limit: 15, windowMs: 60_000 },
  { prefix: '/api/ventures', limit: 60, windowMs: 60_000 },
];

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, e] of rlStore) {
      if (now - e.windowStart > 120_000) rlStore.delete(k);
    }
  }, 300_000);
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  const ip = clientIp(req);
  for (const rule of AI_ROUTE_LIMITS) {
    if (pathname.startsWith(rule.prefix)) {
      const key = `${rule.prefix}:${ip}`;
      const now = Date.now();
      const entry = rlStore.get(key);
      if (!entry || now - entry.windowStart > rule.windowMs) {
        rlStore.set(key, { count: 1, windowStart: now });
      } else {
        entry.count++;
        if (entry.count > rule.limit) {
          const resetAt = entry.windowStart + rule.windowMs;
          return new NextResponse(
            JSON.stringify({ error: 'Too many requests. Please slow down and try again shortly.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil((resetAt - now) / 1000)),
                'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
                ...SECURITY_HEADERS,
              },
            }
          );
        }
      }
      break;
    }
  }
  return null;
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  for (const [h, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(h, v);
  return res;
}

export default clerkMiddleware(async (auth, req) => {
  // Rate limit first (cheapest check).
  const rateLimited = checkRateLimit(req);
  if (rateLimited) return rateLimited;

  // Protect all non-public routes.
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return addSecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and SEO routes (must not run Clerk — else crawlers get HTML sign-in).
    '/((?!_next/static|_next/image|favicon.ico|deepchox-mark.svg|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/(api|trpc)(.*)',
  ],
};
