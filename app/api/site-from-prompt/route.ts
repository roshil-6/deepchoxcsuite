import { NextResponse } from 'next/server';
import { chatWithAI, chatWithClaude, hasAiKey } from '@/lib/ai/chatProviders';
import { parseSitePayload, type SitePayload } from '@/lib/siteFromPrompt';

export const maxDuration = 90;

/** Avoid DevTools/extension GET probes showing misleading 404s on a POST-only API. */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/site-from-prompt',
    method: 'POST',
    body: { prompt: 'string (≥8 chars)', preset: 'optional: startup | minimal | saas | agency' },
  });
}

function extractJsonObject(raw: string): unknown {
  const t = raw.trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
  }
  throw new Error('Could not parse model JSON');
}

async function generateWithAi(userPrompt: string, presetHints: string): Promise<SitePayload> {
  const system = `You output ONLY valid JSON for a single-page marketing site. No markdown fences, no commentary.

Schema (all strings plain text, no HTML tags in values):
{
  "title": "browser tab title, short",
  "headline": "hero H1, punchy, <= 12 words",
  "subhead": "hero supporting line, 1-2 sentences",
  "primaryCta": "button label",
  "secondaryCta": "optional second button or empty string",
  "bullets": ["3-6 short value props, each under 12 words"],
  "sections": [
    { "heading": "section title", "body": "2-4 sentences" }
  ],
  "theme": "light" | "dark",
  "accent": "teal" | "indigo" | "orange" | "rose" | "slate"
}

Rules:
- Match the user's product, audience, and tone from their prompt.
- ${presetHints}
- sections: include 1-3 blocks (e.g. problem/solution, how it works, social proof placeholder).
- Keep copy concrete; avoid generic "Lorem".`;

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: `Build the JSON for this site request:\n\n${userPrompt.slice(0, 6000)}` },
  ];

  try {
    const r = await chatWithAI(messages, 'llama3', { responseJsonObject: true, temperature: 0.45 });
    return parseSitePayload(extractJsonObject(r.message.content));
  } catch (e1) {
    console.warn('[site-from-prompt] chatWithAI failed, trying Claude:', e1);
    const r2 = await chatWithClaude(messages, { responseJsonObject: false, temperature: 0.4 });
    return parseSitePayload(extractJsonObject(r2.message.content));
  }
}

const PRESET_COPY: Record<string, string> = {
  minimal: 'Visual direction: lots of whitespace, restrained tone, almost monochrome; prefer slate accent.',
  startup: 'Visual direction: confident startup; bold headline; accent teal or indigo; energetic but not hypey.',
  saas: 'Visual direction: B2B SaaS trustworthy; indigo or slate; clarity and outcomes over buzzwords.',
  agency: 'Visual direction: creative studio; rose or orange accent; portfolio-friendly voice.',
};

export async function POST(req: Request) {
  if (!hasAiKey()) {
    return NextResponse.json({ error: 'No AI provider configured (set OPENAI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY).' }, { status: 503 });
  }

  let body: { prompt?: string; preset?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length < 8) {
    return NextResponse.json({ error: 'prompt must be at least 8 characters' }, { status: 400 });
  }

  const presetKey = typeof body.preset === 'string' ? body.preset.toLowerCase() : 'startup';
  const presetHints = PRESET_COPY[presetKey] ?? PRESET_COPY.startup;

  try {
    const payload = await generateWithAi(prompt, presetHints);
    return NextResponse.json({ payload, preset: presetKey });
  } catch (e) {
    console.error('[site-from-prompt]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Generation failed' }, { status: 500 });
  }
}
