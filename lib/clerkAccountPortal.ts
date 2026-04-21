/**
 * Clerk hosted Account Portal lives on the Frontend API origin (Dashboard → API Keys → Frontend API URL).
 * Example: https://clerk.northrosc.com
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

export function getClerkAccountPortalOrigin(): string | null {
  const o = process.env.NEXT_PUBLIC_CLERK_ACCOUNT_PORTAL_ORIGIN?.trim().replace(/\/$/, '');
  return o || null;
}

/** Build absolute redirect_url values (must match Clerk Dashboard → Allowed redirect URLs). */
export function absolutizeAppPath(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  const origin = getAppOriginForClerkRedirect();
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin}${p}`;
}

/**
 * Clerk allowlists exact redirect URLs. Middleware often sends www while NEXT_PUBLIC_SITE_URL uses apex (or vice versa) — that mismatch can yield sign_ups/sign_ins 400.
 * Rewrite same-site redirects to match NEXT_PUBLIC_SITE_URL host/protocol.
 */
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

type IncomingSearch = Record<string, string | string[] | undefined>;

/**
 * Build Account Portal URL, forwarding query params from our `/sign-in` or `/sign-up` hop
 * (e.g. `redirect_url` from `auth.protect()`).
 */
export function clerkHostedAuthRedirect(
  portalPath: '/sign-in' | '/sign-up',
  incoming: IncomingSearch
): string | null {
  const portal = getClerkAccountPortalOrigin();
  if (!portal) return null;
  const u = new URL(portalPath, `${portal}/`);

  const redirectRaw = firstSearchParam(incoming.redirect_url);

  for (const [key, raw] of Object.entries(incoming)) {
    if (key === 'redirect_url') continue;
    if (raw === undefined) continue;
    const vals = Array.isArray(raw) ? raw : [raw];
    for (const v of vals) {
      if (v === undefined || v === '') continue;
      u.searchParams.append(key, v);
    }
  }

  const pathOrUrl = redirectRaw ?? '/';
  let absolute =
    pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
      ? pathOrUrl
      : absolutizeAppPath(pathOrUrl);
  absolute = alignRedirectHostWithSiteUrl(absolute);
  u.searchParams.set('redirect_url', absolute);

  return u.toString();
}
