import { NextRequest, NextResponse } from 'next/server';

/** Security headers applied to every response. */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

/** Per-IP in-memory rate limit for expensive AI API routes. */
interface RLEntry { count: number; windowStart: number }
const rlStore = new Map<string, RLEntry>();

// AI routes that are expensive and need middleware-level rate limiting.
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

// Prune stale entries every 5 min (edge-compatible setInterval where available).
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

function checkLimit(key: string, limit: number, windowMs: number): { ok: boolean; resetAt: number } {
  const now = Date.now();
  const entry = rlStore.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rlStore.set(key, { count: 1, windowStart: now });
    return { ok: true, resetAt: now + windowMs };
  }
  entry.count++;
  return { ok: entry.count <= limit, resetAt: entry.windowStart + windowMs };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = clientIp(req);

  // Rate limit AI / API routes.
  for (const rule of AI_ROUTE_LIMITS) {
    if (pathname.startsWith(rule.prefix)) {
      const key = `${rule.prefix}:${ip}`;
      const result = checkLimit(key, rule.limit, rule.windowMs);
      if (!result.ok) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests. Please slow down and try again shortly.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
              ...SECURITY_HEADERS,
            },
          }
        );
      }
      break;
    }
  }

  // Apply security headers to every response.
  const res = NextResponse.next();
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(header, value);
  }
  return res;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|deepchox-mark.svg).*)',
  ],
};
