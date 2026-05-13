/**
 * Deploy-oriented exports: portable static HTML + Next.js stub + instructions.
 */

import type { UISchema, UIComponent } from '@/lib/uiSchema';
import { escapeHtml, sanitizeHref, sanitizeSchemaForUi } from '@/lib/builderSafety';
import { generateReactCode } from '@/lib/builderCodegen';

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80) || 'landing';
}

/** Single-file static site: Tailwind via CDN. Safe for manual upload to Netlify / Vercel static / S3 / GitHub Pages. */
export function generateStandaloneTailwindHtml(schema: UISchema): string {
  const s = sanitizeSchemaForUi(schema);
  const title = escapeHtml(s.meta?.title || s.name || 'Landing');
  const body = s.sections.map((sec) => sectionToTailwindHtml(sec as UIComponent)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="antialiased min-h-screen bg-zinc-950 text-zinc-100">
  <main class="max-w-6xl mx-auto px-4 sm:px-6">
${body}
  </main>
</body>
</html>`;
}

function sectionToTailwindHtml(section: UIComponent): string {
  switch (section.type) {
    case 'navbar': {
      const logoText = escapeHtml(section.logo?.text || 'Site');
      const links = (section.links || [])
        .map(
          (l) =>
            `<a href="${escapeHtmlAttr(sanitizeHref(l.href))}" class="text-sm text-zinc-400 hover:text-white">${escapeHtml(l.label)}</a>`,
        )
        .join('\n        ');
      return `
    <nav class="flex flex-wrap items-center justify-between gap-4 py-6 border-b border-zinc-800">
      <span class="font-semibold text-lg">${logoText}</span>
      <div class="flex flex-wrap gap-6">${links}</div>
    </nav>`;
    }
    case 'hero':
      return `
    <section class="py-20 text-center">
      <h1 class="text-4xl md:text-6xl font-bold tracking-tight">${escapeHtml(section.title)}</h1>
      ${section.description ? `<p class="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">${escapeHtml(section.description)}</p>` : ''}
    </section>`;
    case 'features': {
      const grid = (section.items || [])
        .map(
          (it) => `
      <article class="rounded-xl border border-zinc-800 p-6 bg-zinc-900/40">
        <h3 class="font-semibold text-lg">${escapeHtml(it.title)}</h3>
        <p class="mt-2 text-sm text-zinc-400">${escapeHtml(it.description)}</p>
      </article>`,
        )
        .join('');
      return `
    <section class="py-16">
      ${section.title ? `<h2 class="text-3xl font-bold mb-10 text-center">${escapeHtml(section.title)}</h2>` : ''}
      <div class="grid md:grid-cols-3 gap-6">${grid}
      </div>
    </section>`;
    }
    case 'pricing': {
      const tiers = (section.tiers || [])
        .map(
          (t) => `
      <article class="rounded-xl border p-6 ${t.highlighted ? 'border-violet-500 ring-2 ring-violet-500/40' : 'border-zinc-800'}">
        <h3 class="text-xl font-semibold">${escapeHtml(t.name)}</h3>
        <p class="text-3xl mt-4">$${Number(t.price.monthly ?? 0)}<span class="text-sm text-zinc-400">/mo</span></p>
        <ul class="mt-4 space-y-2 text-sm text-zinc-400">${(t.features || []).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
      </article>`,
        )
        .join('');
      return `
    <section class="py-16">
      ${section.title ? `<h2 class="text-3xl font-bold mb-10 text-center">${escapeHtml(section.title)}</h2>` : ''}
      <div class="grid md:grid-cols-3 gap-6">${tiers}
      </div>
    </section>`;
    }
    case 'faq': {
      const qs = (section.questions || [])
        .map(
          (q) => `
      <details class="rounded-lg border border-zinc-800 p-4 bg-zinc-900/30">
        <summary class="cursor-pointer font-medium">${escapeHtml(q.question)}</summary>
        <p class="mt-2 text-sm text-zinc-400">${escapeHtml(q.answer)}</p>
      </details>`,
        )
        .join('');
      return `
    <section class="py-16 max-w-3xl mx-auto space-y-4">
      ${section.title ? `<h2 class="text-3xl font-bold mb-6 text-center">${escapeHtml(section.title)}</h2>` : ''}
      ${qs}
    </section>`;
    }
    case 'footer': {
      const cols = (section.columns || [])
        .map(
          (c) => `
      <div>
        <p class="font-semibold text-sm uppercase tracking-wider mb-3">${escapeHtml(c.title)}</p>
        <ul class="space-y-2">${(c.links || []).map((l) => `<li><a href="${escapeHtmlAttr(sanitizeHref(l.href))}" class="text-zinc-400 hover:text-white text-sm">${escapeHtml(l.label)}</a></li>`).join('')}</ul>
      </div>`,
        )
        .join('');
      return `
    <footer class="py-16 mt-20 border-t border-zinc-800 grid md:grid-cols-3 gap-10">
      <div>
        <p class="font-semibold">${escapeHtml(section.logo?.text || '')}</p>
        ${section.tagline ? `<p class="mt-2 text-sm text-zinc-500">${escapeHtml(section.tagline)}</p>` : ''}
      </div>
      ${cols}
    </footer>`;
    }
    default:
      return `
    <section class="py-12 border-b border-zinc-800">
      <p class="text-xs uppercase tracking-widest text-zinc-500">${escapeHtml(section.type)}</p>
      <pre class="mt-4 text-xs text-zinc-600 whitespace-pre-wrap overflow-auto">${escapeHtml(JSON.stringify(section, null, 2))}</pre>
    </section>`;
  }
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s).split('\n').join('');
}

/**
 * Self-contained Next.js App Router page (paste into `app/page.tsx`).
 * Embeds pre-rendered HTML built only from escaped strings (no raw AI HTML).
 */
export function generateNextAppPage(schema: UISchema): string {
  const s = sanitizeSchemaForUi(schema);
  const staticHtml = s.sections.map((sec) => sectionToTailwindHtml(sec as UIComponent)).join('\n');

  return `'use client';

import React from 'react';

/**
 * Generated by Deepchox Builder (sanitized). Replace app/page.tsx in a Next.js App Router project with Tailwind.
 */
export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <main
        className="max-w-6xl mx-auto px-4 sm:px-6"
        dangerouslySetInnerHTML={{ __html: ${JSON.stringify(staticHtml)} }}
      />
    </div>
  );
}
`;
}

export function generateDeployReadme(schema: UISchema): string {
  const s = sanitizeSchemaForUi(schema);
  const slug = slugify(s.name);
  return `# Deploy: ${s.name}

These exports are **sanitized**: links (\`href\`), theme colors (hex-only), images (https or same-site paths).

## Static site (works on Vercel, Netlify, Cloudflare Pages, S3 static hosting)

1. Use **\`${slug}-static.html\`** — rename to \`index.html\` if your host expects that.
2. Drag the folder/file into Netlify Drop, or connect a Git repo that only contains this file.

Uses the Tailwind **CDN** (no npm build). For stricter CSP in production, run Tailwind locally and remove the CDN \`<script>\`.

## Next.js + Vercel

1. \`npx create-next-app@latest my-site --typescript --tailwind --eslint --app\`
2. Copy **\`${slug}-next-app-page.tsx\`** to \`app/page.tsx\` (overwrite).
3. \`npm run build\` locally, then push to GitHub and import into Vercel.

## Customize in code editor

- **\`${slug}-schema.json\`**: Full UI schema — import in your own app.
- **\`${slug}-react-flat.tsx\`**: Flat JSX (no CDN) starter.

---

Schema ID: \`${s.id}\`
`;
}

export function getDeployKitFiles(schema: UISchema): Array<{ filename: string; body: string; mime: string }> {
  const slug = slugify(schema.name);
  const safe = sanitizeSchemaForUi(schema);

  return [
    { filename: `${slug}-DEPLOY.md`, body: generateDeployReadme(safe), mime: 'text/markdown' },
    { filename: `${slug}-schema.json`, body: JSON.stringify(safe, null, 2), mime: 'application/json' },
    { filename: `${slug}-static.html`, body: generateStandaloneTailwindHtml(safe), mime: 'text/html' },
    { filename: `${slug}-next-app-page.tsx`, body: generateNextAppPage(safe), mime: 'text/typescript' },
    { filename: `${slug}-react-flat.tsx`, body: generateReactCode(safe), mime: 'text/typescript' },
  ];
}
