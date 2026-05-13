/**
 * Prompt → structured landing JSON → single-file HTML (exportable).
 * Keeps generation in JSON so we avoid arbitrary model HTML / XSS in preview.
 */

export type SiteAccent = 'teal' | 'indigo' | 'orange' | 'rose' | 'slate';
export type SiteTheme = 'light' | 'dark';

export interface SitePayload {
  title: string;
  headline: string;
  subhead: string;
  primaryCta: string;
  secondaryCta?: string;
  bullets: string[];
  sections: Array<{ heading: string; body: string }>;
  theme: SiteTheme;
  accent: SiteAccent;
}

const ACCENT: Record<SiteAccent, { primary: string; glow: string }> = {
  teal: { primary: '#0d9488', glow: 'rgba(13,148,136,0.35)' },
  indigo: { primary: '#4f46e5', glow: 'rgba(79,70,229,0.35)' },
  orange: { primary: '#ea580c', glow: 'rgba(234,88,12,0.35)' },
  rose: { primary: '#e11d48', glow: 'rgba(225,29,72,0.35)' },
  slate: { primary: '#475569', glow: 'rgba(71,85,105,0.35)' },
};

export function defaultSitePayload(): SitePayload {
  return {
    title: 'Your page',
    headline: 'Describe your product in the prompt',
    subhead: 'We will shape a one-page site you can export as HTML.',
    primaryCta: 'Get started',
    secondaryCta: 'Learn more',
    bullets: ['Fast iteration', 'Founder-focused copy', 'Export anytime'],
    sections: [
      { heading: 'Why it matters', body: 'Generated from your prompt—tune the text and regenerate until it feels right.' },
    ],
    theme: 'light',
    accent: 'teal',
  };
}

export function buildStandaloneHtml(p: SitePayload): string {
  const a = ACCENT[p.accent] ?? ACCENT.teal;
  const dark = p.theme === 'dark';
  const bg = dark ? '#0a0a0b' : '#fafafa';
  const fg = dark ? '#f4f4f5' : '#18181b';
  const muted = dark ? '#a1a1aa' : '#52525b';
  const card = dark ? '#18181b' : '#ffffff';
  const border = dark ? '#27272a' : '#e4e4e7';

  const bullets = (p.bullets ?? [])
    .slice(0, 8)
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join('');

  const sections = (p.sections ?? [])
    .slice(0, 4)
    .map(
      (s) => `
    <section class="block">
      <h3>${escapeHtml(s.heading)}</h3>
      <p>${escapeHtml(s.body)}</p>
    </section>`,
    )
    .join('\n');

  const secBtn = p.secondaryCta?.trim()
    ? `<a class="btn ghost" href="#">${escapeHtml(p.secondaryCta.trim())}</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(p.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      background:${bg}; color:${fg}; line-height: 1.65; letter-spacing:-0.01em; }
    .wrap { max-width: 56rem; margin: 0 auto; padding: 4rem 1.5rem 5rem; }
    .pill { display: inline-flex; align-items:center; gap: .35rem; font-size:.68rem; font-weight:700; letter-spacing:.12em;
      text-transform:uppercase; color:${muted}; border:1px solid ${border}; padding:.35rem .6rem; border-radius:999px; margin-bottom:1.25rem; }
    .hero h1 { font-size: clamp(2rem, 5vw, 3.25rem); line-height:1.08; margin:0 0 1rem; font-weight:800; letter-spacing:-.03em; }
    .hero p.lead { font-size: clamp(1.05rem, 2.2vw, 1.2rem); color:${muted}; max-width: 40rem; margin:0 0 1.75rem; }
    .cta-row { display:flex; flex-wrap:wrap; gap:.75rem; align-items:center; margin-bottom:2.5rem; }
    .btn { display:inline-flex; align-items:center; justify-content:center; padding:.78rem 1.35rem; border-radius:.65rem;
      font-weight:650; font-size:.95rem; text-decoration:none; transition:transform .15s ease, box-shadow .15s ease; cursor:pointer;
      border: none; font-family:inherit; }
    .btn.primary { background:${a.primary}; color:#fff; box-shadow:0 12px 40px -16px ${a.glow}; }
    .btn.primary:hover { transform: translateY(-1px); }
    .btn.ghost { background:transparent; color:${fg}; border:1px solid ${border}; }
    ul.points { list-style:none; padding:0; margin:0 0 2.5rem; display:grid; gap:.55rem; max-width:32rem; }
    ul.points li { position:relative; padding-left:1.35rem; color:${muted}; font-size:.95rem; }
    ul.points li::before { content:''; position:absolute; left:0; top:.55rem; width:.45rem; height:.45rem; border-radius:999px; background:${a.primary}; opacity:.85; }
    .block { padding:1.75rem 0; border-top:1px solid ${border}; }
    .block h3 { margin:0 0 .5rem; font-size:1.15rem; font-weight:700; }
    .block p { margin:0; color:${muted}; font-size:.95rem; max-width:46rem; }
    footer { margin-top:3.5rem; padding-top:1.5rem; border-top:1px solid ${border}; font-size:.8rem; color:${muted}; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="pill">Site preview</div>
    <header class="hero">
      <h1>${escapeHtml(p.headline)}</h1>
      <p class="lead">${escapeHtml(p.subhead)}</p>
      <div class="cta-row">
        <a class="btn primary" href="#">${escapeHtml(p.primaryCta)}</a>
        ${secBtn}
      </div>
    </header>
    <ul class="points">${bullets}</ul>
    ${sections}
    <footer>Generated with Deepchox · Single-file export · Not connected to live forms</footer>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function parseSitePayload(raw: unknown): SitePayload {
  const base = defaultSitePayload();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;

  const title = typeof o.title === 'string' ? o.title.slice(0, 120) : base.title;
  const headline = typeof o.headline === 'string' ? o.headline.slice(0, 280) : base.headline;
  const subhead = typeof o.subhead === 'string' ? o.subhead.slice(0, 480) : base.subhead;
  const primaryCta = typeof o.primaryCta === 'string' ? o.primaryCta.slice(0, 64) : base.primaryCta;
  const secondaryCta =
    typeof o.secondaryCta === 'string' && o.secondaryCta.trim()
      ? o.secondaryCta.trim().slice(0, 64)
      : undefined;

  const bullets = Array.isArray(o.bullets)
    ? o.bullets
        .filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
        .slice(0, 8)
        .map((b) => b.trim().slice(0, 140))
    : base.bullets;

  const sections = Array.isArray(o.sections)
    ? (o.sections as unknown[])
        .filter((row): row is { heading: string; body: string } => {
          if (!row || typeof row !== 'object') return false;
          const r = row as Record<string, unknown>;
          return typeof r.heading === 'string' && typeof r.body === 'string';
        })
        .slice(0, 4)
        .map((r) => ({
          heading: r.heading.trim().slice(0, 80),
          body: r.body.trim().slice(0, 400),
        }))
    : base.sections;

  const theme: SiteTheme = o.theme === 'dark' ? 'dark' : 'light';
  const accentRaw = typeof o.accent === 'string' ? o.accent.toLowerCase() : '';
  const accent: SiteAccent = ['teal', 'indigo', 'orange', 'rose', 'slate'].includes(accentRaw)
    ? (accentRaw as SiteAccent)
    : base.accent;

  return {
    title: title.trim() || base.title,
    headline: headline.trim() || base.headline,
    subhead: subhead.trim() || base.subhead,
    primaryCta: primaryCta.trim() || base.primaryCta,
    secondaryCta,
    bullets: bullets.length ? bullets : base.bullets,
    sections: sections.length ? sections : base.sections,
    theme,
    accent,
  };
}
