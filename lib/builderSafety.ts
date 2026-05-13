/**
 * Sanitize AI/user-controlled builder schema for XSS, open redirects, and CSS injection.
 * Used client-side (preview, export) and can be mirrored server-side in /api/build-ui.
 */

import type { UITheme, UISchema } from '@/lib/uiSchema';
import { DEFAULT_UI_THEME } from '@/lib/uiSchema';

/** HTML entity escape for text nodes and attribute values. */
export function escapeHtml(input: string): string {
  return input
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;');
}

const SAFE_HREF_ALLOW = /^(https?:\/\/|\/|#|mailto:)/i;

/** Block javascript:, data:, vbscript:, etc. */
export function sanitizeHref(raw: string | undefined | null): string {
  if (raw == null || raw === '') return '#';
  const t = String(raw).trim();
  /* Protocol-relative URLs are not treated as paths; disallow open redirects via //evil.example */
  if (t.startsWith('//')) return '#';
  if (t.startsWith('#')) return t.length <= 2000 ? t : '#';
  if (t === '/' || t.startsWith('/') && !t.startsWith('//')) {
    return t.length <= 2000 ? t : '/';
  }
  if (/^mailto:/i.test(t)) {
    const rest = t.slice(7).split('?')[0]!;
    if (rest.length <= 254 && /^[\w%+.-]+@[\w.-]+\.\w{2,}$/i.test(rest)) return `mailto:${rest}`;
    return '#';
  }
  if (!SAFE_HREF_ALLOW.test(t)) return '#';
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '#';
    return u.toString().slice(0, 2048);
  } catch {
    return '#';
  }
}

/**
 * Stable href plus `target`/`rel` for http(s) links (tab-nabbing hardening).
 * Does not wrap relative paths or mailto in a new tab.
 */
export function safeAnchorBindings(raw: string | undefined | null): {
  href: string;
  target?: '_blank';
  rel?: string;
} {
  const href = sanitizeHref(raw);
  if (/^https?:\/\//i.test(href)) {
    return { href, target: '_blank', rel: 'noopener noreferrer' };
  }
  return { href };
}

/** Images / media: https or same-origin paths only; no data: SVG/HTML. */
export function sanitizeMediaUrl(raw: string | undefined | null): string {
  if (raw == null || raw === '') return '';
  const t = String(raw).trim();
  if (t.startsWith('//')) return '';
  if (t.startsWith('/') && !t.startsWith('//')) return t.slice(0, 2048);
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    return u.toString().slice(0, 2048);
  } catch {
    return '';
  }
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function sanitizeCssColor(raw: string | undefined | null, fallback: string): string {
  if (raw == null) return fallback;
  const t = String(raw).trim();
  return HEX_COLOR.test(t) ? t : fallback;
}

/** Prevent font-family CSS injection (e.g. "); background: url(...). */
export function sanitizeFontFamily(raw: string | undefined | null, fallback: string): string {
  if (raw == null) return fallback;
  const t = String(raw).replace(/[;{}<>`]/g, '').trim();
  if (t.length === 0 || t.length > 200) return fallback;
  return t;
}

export function sanitizeTheme(theme: UITheme | undefined): UITheme {
  if (!theme || typeof theme !== 'object') return { ...DEFAULT_UI_THEME };
  return {
    primaryColor: sanitizeCssColor(theme.primaryColor, DEFAULT_UI_THEME.primaryColor),
    secondaryColor: theme.secondaryColor
      ? sanitizeCssColor(theme.secondaryColor, DEFAULT_UI_THEME.secondaryColor!)
      : DEFAULT_UI_THEME.secondaryColor,
    background: sanitizeCssColor(theme.background, DEFAULT_UI_THEME.background),
    surface: sanitizeCssColor(theme.surface, DEFAULT_UI_THEME.surface),
    text: sanitizeCssColor(theme.text, DEFAULT_UI_THEME.text),
    textMuted: sanitizeCssColor(theme.textMuted, DEFAULT_UI_THEME.textMuted),
    fontFamily: sanitizeFontFamily(theme.fontFamily, DEFAULT_UI_THEME.fontFamily),
    borderRadius: theme.borderRadius ?? DEFAULT_UI_THEME.borderRadius,
    spacing: theme.spacing ?? DEFAULT_UI_THEME.spacing,
  };
}

function sanitizeNavLinks(links: unknown): { label: string; href: string; external?: boolean }[] {
  if (!Array.isArray(links)) return [];
  return links.map((l) => {
    const o = l as Record<string, unknown>;
    return {
      label: typeof o.label === 'string' ? o.label.slice(0, 500) : 'Link',
      href: sanitizeHref(typeof o.href === 'string' ? o.href : '#'),
      external: Boolean(o.external),
    };
  });
}

/** Deep-clone and fix known URL / theme fields in a UI schema. */
export function sanitizeSchemaForUi(schema: UISchema): UISchema {
  const theme = sanitizeTheme(schema.theme);
  const sections = (schema.sections ?? []).map((sec) => {
    const s = sec as unknown as Record<string, unknown> & { type: string };
    const t = s.type;
    if (t === 'navbar') {
      return {
        ...s,
        logo: s.logo && typeof s.logo === 'object'
          ? {
              ...(s.logo as object),
              href: sanitizeHref((s.logo as { href?: string }).href),
              image: (() => {
                const u = sanitizeMediaUrl((s.logo as { image?: string }).image);
                return u || undefined;
              })(),
            }
          : s.logo,
        links: sanitizeNavLinks(s.links),
        cta: s.cta && typeof s.cta === 'object'
          ? { ...(s.cta as object), href: sanitizeHref((s.cta as { href?: string }).href) }
          : s.cta,
      };
    }
    if (t === 'footer') {
      const cols = Array.isArray(s.columns)
        ? s.columns.map((c) => {
            const col = c as { title?: string; links?: unknown };
            return {
              title: typeof col.title === 'string' ? col.title.slice(0, 200) : 'Column',
              links: sanitizeNavLinks(col.links),
            };
          })
        : [];
      const br = s.bottomRow as Record<string, unknown> | undefined;
      return {
        ...s,
        logo: s.logo && typeof s.logo === 'object'
          ? {
              ...(s.logo as object),
              image: (() => {
                const u = sanitizeMediaUrl((s.logo as { image?: string }).image);
                return u || undefined;
              })(),
            }
          : s.logo,
        columns: cols,
        bottomRow: br
          ? {
              ...br,
              links: sanitizeNavLinks(br.links),
              socials: Array.isArray(br.socials)
                ? br.socials.map((x) => {
                    const so = x as { platform?: string; href?: string };
                    return {
                      platform: so.platform,
                      href: sanitizeHref(so.href),
                    };
                  })
                : br.socials,
            }
          : s.bottomRow,
      };
    }
    if (t === 'hero') {
      return {
        ...s,
        image: (() => {
          const u = sanitizeMediaUrl(s.image as string);
          return u || undefined;
        })(),
        video: (() => {
          const u = sanitizeMediaUrl(s.video as string);
          return u || undefined;
        })(),
        cta: s.cta && typeof s.cta === 'object'
          ? { ...(s.cta as object), href: sanitizeHref((s.cta as { href?: string }).href) }
          : s.cta,
        secondaryCta: s.secondaryCta && typeof s.secondaryCta === 'object'
          ? { ...(s.secondaryCta as object), href: sanitizeHref((s.secondaryCta as { href?: string }).href) }
          : s.secondaryCta,
      };
    }
    if (t === 'features') {
      const items = Array.isArray(s.items)
        ? s.items.map((item) => {
            const row = item as Record<string, unknown>;
            const imgRaw = sanitizeMediaUrl(row.image as string);
            return {
              ...row,
              image: imgRaw || undefined,
              cta:
                row.cta && typeof row.cta === 'object'
                  ? {
                      ...(row.cta as object),
                      href: sanitizeHref((row.cta as { href?: string }).href),
                    }
                  : row.cta,
            };
          })
        : [];
      return { ...s, items };
    }
    if (t === 'form') {
      return {
        ...s,
        successRedirect:
          typeof s.successRedirect === 'string' ? sanitizeHref(s.successRedirect as string) : undefined,
      };
    }
    if (t === 'testimonials') {
      const quotes = Array.isArray(s.quotes)
        ? s.quotes.map((q) => {
            const row = q as Record<string, unknown>;
            const author = row.author && typeof row.author === 'object' ? (row.author as Record<string, unknown>) : undefined;
            if (!author) return { ...row };
            const imgSrc = sanitizeMediaUrl(author.image as string);
            return {
              ...row,
              author: {
                ...author,
                image: imgSrc || undefined,
              },
            };
          })
        : [];
      return { ...s, quotes };
    }
    if (t === 'pricing') {
      const tiers = Array.isArray(s.tiers)
        ? s.tiers.map((tier) => {
            const tr = tier as Record<string, unknown>;
            return {
              ...tr,
              cta:
                tr.cta && typeof tr.cta === 'object'
                  ? {
                      ...(tr.cta as object),
                      href: sanitizeHref((tr.cta as { href?: string }).href),
                    }
                  : tr.cta,
            };
          })
        : [];
      return { ...s, tiers };
    }
    if (t === 'team') {
      const members = Array.isArray(s.members)
        ? s.members.map((m) => {
            const mem = m as Record<string, unknown>;
            const uImg = sanitizeMediaUrl(mem.image as string);
            return {
              ...mem,
              image: uImg || undefined,
              socials: Array.isArray(mem.socials)
                ? mem.socials.map((x) => {
                    const so = x as { platform?: string; href?: string };
                    return { ...so, href: sanitizeHref(so.href) };
                  })
                : mem.socials,
            };
          })
        : [];
      return { ...s, members };
    }
    if (t === 'gallery') {
      const images = Array.isArray(s.images)
        ? s.images
            .map((im) => {
              const i = im as Record<string, unknown>;
              const src = sanitizeMediaUrl(i.src as string);
              if (!src) return null;
              return { ...i, src };
            })
            .filter((x): x is Record<string, unknown> & { src: string } => x != null)
        : [];
      return { ...s, images };
    }
    if (t === 'logos') {
      const logos = Array.isArray(s.logos)
        ? s.logos.map((lg) => {
            const i = lg as Record<string, unknown>;
            const url = sanitizeMediaUrl(i.image as string);
            return {
              ...i,
              image: url || 'https://placehold.co/160x48/27272a/a1a1aa?text=Logo',
              href: i.href ? sanitizeHref(i.href as string) : undefined,
            };
          })
        : [];
      return { ...s, logos };
    }
    if (t === 'cta') {
      return {
        ...s,
        cta:
          s.cta && typeof s.cta === 'object'
            ? { ...(s.cta as object), href: sanitizeHref((s.cta as { href?: string }).href) }
            : s.cta,
        secondaryCta:
          s.secondaryCta && typeof s.secondaryCta === 'object'
            ? {
                ...(s.secondaryCta as object),
                href: sanitizeHref((s.secondaryCta as { href?: string }).href),
              }
            : s.secondaryCta,
      };
    }
    return { ...s };
  });

  const meta = schema.meta
    ? {
        ...schema.meta,
        title: schema.meta.title?.slice(0, 300),
        ogImage: sanitizeMediaUrl(schema.meta.ogImage),
        favicon: sanitizeMediaUrl(schema.meta.favicon),
      }
    : undefined;

  return {
    ...schema,
    name: typeof schema.name === 'string' ? schema.name.slice(0, 200) : 'Untitled UI',
    description: typeof schema.description === 'string' ? schema.description.slice(0, 2000) : '',
    theme,
    sections: sections as UISchema['sections'],
    meta,
  };
}
