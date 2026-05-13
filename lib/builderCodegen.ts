/**
 * Code/HTML export for the UI Builder (sanitized).
 */

import type { UISchema, UIComponent } from '@/lib/uiSchema';
import { escapeHtml, sanitizeSchemaForUi } from '@/lib/builderSafety';

export function generateStandaloneHTML(schema: UISchema): string {
  const s = sanitizeSchemaForUi(schema);
  const { theme, sections, meta } = s;

  const sectionsHtml = sections.map((section) => {
    const sec = section as unknown as Record<string, unknown> & { type: string };
    if (sec.type === 'hero') {
      return `<section class="hero"><h1>${escapeHtml(String(sec.title ?? 'Untitled'))}</h1><p>${escapeHtml(String(sec.description ?? ''))}</p></section>`;
    }
    if (sec.type === 'features') {
      const items = Array.isArray(sec.items) ? sec.items : [];
      return `<section class="features"><h2>${escapeHtml(String(sec.title ?? 'Features'))}</h2><div class="grid">${items.map((it) => {
        const i = it as Record<string, unknown>;
        return `<article><h3>${escapeHtml(String(i.title ?? 'Feature'))}</h3><p>${escapeHtml(String(i.description ?? ''))}</p></article>`;
      }).join('')}</div></section>`;
    }
    return `<section class="section"><h3>${escapeHtml(String(sec.type || 'section').toUpperCase())}</h3></section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>${escapeHtml(meta?.title || s.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${escapeHtml(theme.fontFamily)};
      background: ${theme.background};
      color: ${theme.text};
      line-height: 1.5;
    }
    .hero, .features, .section { max-width: 1100px; margin: 0 auto; padding: 64px 24px; }
    .hero h1 { font-size: 48px; margin-bottom: 12px; }
    .hero p { color: ${theme.textMuted}; max-width: 720px; }
    .features .grid { margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 16px; }
    .features article { background: ${theme.surface}; border: 1px solid ${theme.textMuted}33; border-radius: 12px; padding: 16px; }
  </style>
</head>
<body>
  ${sectionsHtml}
</body>
</html>`;
}

export function generateReactCode(schema: UISchema): string {
  const s = sanitizeSchemaForUi(schema);
  const asJsExpr = (value: unknown) => `{${JSON.stringify(String(value ?? ''))}}`;

  const renderSection = (section: UIComponent, index: number): string => {
    if (section.type === 'hero') {
      return `<section className="py-20 px-6 text-center">
  <h1 className="text-5xl font-bold tracking-tight">${asJsExpr(section.title)}</h1>
  ${section.description ? `<p className="mt-4 max-w-2xl mx-auto text-zinc-400">${asJsExpr(section.description)}</p>` : ''}
</section>`;
    }
    if (section.type === 'features') {
      return `<section className="py-16 px-6 max-w-6xl mx-auto">
  ${section.title ? `<h2 className="text-3xl font-semibold mb-8">${asJsExpr(section.title)}</h2>` : ''}
  <div className="grid md:grid-cols-3 gap-4">
    ${section.items.map((item) => `<article className="rounded-xl border border-zinc-800 p-4">
      <h3 className="font-medium">${asJsExpr(item.title)}</h3>
      <p className="text-sm text-zinc-400 mt-2">${asJsExpr(item.description)}</p>
    </article>`).join('\n    ')}
  </div>
</section>`;
    }
    if (section.type === 'pricing') {
      return `<section className="py-16 px-6 max-w-6xl mx-auto">
  ${section.title ? `<h2 className="text-3xl font-semibold mb-8">${asJsExpr(section.title)}</h2>` : ''}
  <div className="grid md:grid-cols-3 gap-4">
    ${section.tiers.map((tier) => `<article className="rounded-xl border border-zinc-800 p-6 ${tier.highlighted ? 'ring-2 ring-violet-500' : ''}">
      <h3 className="text-xl font-semibold">${asJsExpr(tier.name)}</h3>
      <p className="text-3xl mt-3">$${tier.price.monthly ?? 0}<span className="text-sm text-zinc-400">/mo</span></p>
      <ul className="mt-4 space-y-2 text-sm text-zinc-300">
        ${tier.features.map((f) => `<li>• ${asJsExpr(f)}</li>`).join('\n        ')}
      </ul>
    </article>`).join('\n    ')}
  </div>
</section>`;
    }
    if (section.type === 'faq') {
      return `<section className="py-16 px-6 max-w-4xl mx-auto">
  ${section.title ? `<h2 className="text-3xl font-semibold mb-6">${asJsExpr(section.title)}</h2>` : ''}
  <div className="space-y-3">
    ${section.questions.map((q) => `<details className="rounded-lg border border-zinc-800 p-4">
      <summary className="font-medium cursor-pointer">${asJsExpr(q.question)}</summary>
      <p className="text-sm text-zinc-400 mt-2">${asJsExpr(q.answer)}</p>
    </details>`).join('\n    ')}
  </div>
</section>`;
    }
    return `<section className="py-10 px-6 border-b border-zinc-800">
  <h3 className="text-sm uppercase tracking-wider text-zinc-500">${section.type}</h3>
  <pre className="text-xs mt-3 text-zinc-400 whitespace-pre-wrap">{JSON.stringify(s.sections[${index}], null, 2)}</pre>
</section>`;
  };

  const body = s.sections.map((section, idx) => renderSection(section as UIComponent, idx)).join('\n\n');

  return `import React from 'react';

// Generated by Deepchox Builder (sanitized)
// Schema ID: ${s.id}

export default function GeneratedUI() {
  return (
    <main className="min-h-screen bg-[#0c0c0e] text-zinc-100">
${body.split('\n').map((line) => `      ${line}`).join('\n')}
    </main>
  );
}`;
}
