import type { JarvisProposedUpdates } from '@/app/api/jarvis/route';

export type ParsedSection = {
  title: string;
  bullets: string[];
  move: string;
  isRisk?: boolean;
};

export function parseSources(raw: unknown): { title: string; url: string; snippet?: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { title: string; url: string; snippet?: string }[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title : '';
    const url = typeof o.url === 'string' ? o.url : '';
    if (!title || !url) continue;
    const snippet = typeof o.snippet === 'string' ? o.snippet : undefined;
    out.push({ title, url, snippet });
  }
  return out;
}

export function parseFollowUp(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(Boolean).slice(0, 5);
}

export function parseBodyMd(bodyMd: string): { intro: string; sections: ParsedSection[] } {
  const raw = bodyMd || '';
  const parts = raw.split(/\n(?=### )/);
  let intro = '';
  const sections: ParsedSection[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('### ')) {
      const firstNewline = trimmed.indexOf('\n');
      const title = firstNewline === -1 ? trimmed.slice(4).trim() : trimmed.slice(4, firstNewline).trim();
      const body = firstNewline === -1 ? '' : trimmed.slice(firstNewline + 1).trim();
      const isRisk = title.toLowerCase() === 'risks';

      if (isRisk) {
        const bullets = body
          .split('\n')
          .filter((l) => l.trim().startsWith('-'))
          .map((l) => l.replace(/^-\s*/, '').trim())
          .map((l) => l.replace(/\*\*/g, ''))
          .filter(Boolean);
        sections.push({ title: 'Key risks', bullets, move: '', isRisk: true });
      } else {
        let move = '';
        const bodyLines = body.split('\n').filter((l) => {
          if (l.startsWith('**Move:**') || l.startsWith('**Move: **')) {
            move = l.replace(/^\*\*Move:\*?\*?\s*/, '').trim();
            return false;
          }
          return true;
        });

        const insightText = bodyLines.join(' ').replace(/\s+/g, ' ').trim();

        const bullets = insightText
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 8);

        sections.push({ title, bullets, move });
      }
    } else {
      intro = trimmed;
    }
  }

  return { intro, sections };
}

export function hasPendingUpdates(p: unknown): p is JarvisProposedUpdates {
  if (!p || typeof p !== 'object') return false;
  const o = p as JarvisProposedUpdates;
  if (o.strategy?.trim()) return true;
  if (o.productPlan?.trim()) return true;
  if (o.marketInsights?.trim()) return true;
  if (o.budget?.trim()) return true;
  if (o.teamDirectives?.trim()) return true;
  if (Array.isArray(o.kanbanAdds) && o.kanbanAdds.some((k) => k && String(k.title || '').trim())) return true;
  return false;
}
