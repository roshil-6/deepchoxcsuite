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

export function absolutizeAppPath(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  const origin = getAppOriginForClerkRedirect();
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin}${p}`;
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

/** Absolute URL to send users after sign-in or sign-up when using embedded Clerk on your domain. */
export function clerkEmbeddedFallbackRedirect(
  incoming: Record<string, string | string[] | undefined>
): string {
  const raw = firstSearchParam(incoming.redirect_url);
  const pathOrUrl = raw ?? '/';
  let absolute =
    pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
      ? pathOrUrl
      : absolutizeAppPath(pathOrUrl);
  return alignRedirectHostWithSiteUrl(absolute);
}
