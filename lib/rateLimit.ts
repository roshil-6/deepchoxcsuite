/**
 * In-memory sliding-window rate limiter.
 * Single-instance only (no Redis). Works correctly on Render Web Service
 * (single dyno). Replace with Redis/Upstash if you scale to multiple instances.
 */

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

// Prune stale entries every 5 minutes to prevent unbounded memory growth.
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store) {
            if (now - entry.windowStart > 120_000) store.delete(key);
        }
    }, 300_000).unref?.();
}

/**
 * Check whether `ip` is within the rate limit.
 * @param ip      Client identifier (IP address or similar).
 * @param limit   Max requests allowed per window.
 * @param windowMs Window length in milliseconds (default 60 s).
 */
export function checkRateLimit(
    ip: string,
    limit: number,
    windowMs = 60_000,
): { ok: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now - entry.windowStart > windowMs) {
        store.set(ip, { count: 1, windowStart: now });
        return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    entry.count++;
    const remaining = Math.max(0, limit - entry.count);
    return {
        ok: entry.count <= limit,
        remaining,
        resetAt: entry.windowStart + windowMs,
    };
}

/** Extract the real client IP from Next.js / proxy headers. */
export function getClientIp(req: Request): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        req.headers.get('x-real-ip') ??
        'unknown'
    );
}

/** Build a 429 Response with standard rate-limit headers. */
export function rateLimitResponse(resetAt: number): Response {
    return new Response(
        JSON.stringify({ error: 'Too many requests. Please slow down and try again shortly.' }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
                'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
            },
        },
    );
}
