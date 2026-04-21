/**
 * Normalizes post-auth redirects for embedded <SignIn /> / <SignUp /> (e.g. `redirect_url` from `auth.protect()`).
 * Keeps host aligned with `NEXT_PUBLIC_SITE_URL` so Clerk allowlists match.
 */

export function getAppOriginForClerkRedirect(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return vercel.startsWith('http') ? vercel.replace(/\/$/, '') : `https://${vercel}`;
  }
  return 'http://127.0.0.1:5555';
}

function alignRedirectHostWithSiteUrl(absoluteUrl: string): string {
  const base = getAppOriginForClerkRedirect();
  try {
    const u = new URL(absoluteUrl);
    const b = new URL(base);
    const uRoot = u.hostname.replace(/^www\./, '');
    const bRoot = b.hostname.replace(/^www\./, '');
    if (uRoot === bRoot) {
      u.protocol = b.protocol;
      u.hostname = b.hostname;
      u.port = b.port;
      return u.toString();
    }
  } catch {
    /* noop */
  }
  return absoluteUrl;
}

function firstSearchParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.length > 0 ? s : undefined;
}

/**
 * Same-origin path (or `/`) for Clerk `fallbackRedirectUrl` / `forceRedirectUrl`.
 * Relative paths avoid brittle allowlist mismatches (trailing slash, www vs apex).
 */
export function clerkPostAuthRedirectPath(
  incoming: Record<string, string | string[] | undefined>
): string {
  const raw = firstSearchParam(incoming.redirect_url);
  const pathOrUrl = raw ?? '/';
  const origin = getAppOriginForClerkRedirect();
  let baseOrigin: string;
  try {
    baseOrigin = new URL(origin).origin;
  } catch {
    return pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  }

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    try {
      const aligned = alignRedirectHostWithSiteUrl(pathOrUrl);
      const u = new URL(aligned);
      if (u.origin === baseOrigin) {
        const p = `${u.pathname}${u.search}${u.hash}`;
        return p.length > 0 ? p : '/';
      }
    } catch {
      /* noop */
    }
    return '/';
  }
  return pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
}
