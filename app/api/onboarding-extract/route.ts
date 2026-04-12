import { NextResponse } from 'next/server';
import { chatWithAI as chatWithGroq } from '@/lib/ai/chatProviders';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

const SYSTEM = `You are helping founders onboard into a venture workspace. From the user's text (notes, pitch paste, voice transcript, or document text), extract structured fields.

Return ONE JSON object only (no markdown fence) with exactly these keys:
- projectName: string (concise venture name)
- strategicIntent: string (2–4 sentences: what they are building, for whom, why now, what success looks like in 6–12 months — empty if not inferable)
- industry: string
- problemStatement: string (the core problem / friction)
- targetAudience: string (who it's for)
- primaryGoal: string (main objective)
- timeline: string — MUST be exactly one of: "Q1 (Early Stage)", "Q2 (Launch)", "Q3 (Growth)", "12+ Months" (pick best fit)
- resources: string (team, capital, assets mentioned — or empty)
- valueProposition: string (why it matters — or empty)
- challenges: string (risks/blockers — or empty)

Use empty string "" for anything not inferable. Keep each field under 800 characters.`;

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  return s.trim();
}

// 20 requests per minute per IP.
const RATE_LIMIT = 20;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`onboarding:${ip}`, RATE_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.resetAt);

  try {
    if (!process.env.OPENAI_API_KEY?.trim() && !process.env.GROQ_API_KEY?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'No AI provider key is configured on the server.' },
        { status: 503 }
      );
    }

    const body = (await req.json()) as { text?: string };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return NextResponse.json({ ok: false, error: 'text is required' }, { status: 400 });
    }

    const clipped = text.slice(0, 14000);
    const raw = await chatWithGroq(
      [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: clipped },
      ],
      'llama3',
      { responseJsonObject: true, temperature: 0.25 }
    );

    const content = raw.message?.content || '{}';
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(stripJsonFence(content)) as Record<string, string>;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Model returned invalid JSON. Try again with clearer text.' },
        { status: 422 }
      );
    }

    const keys = [
      'projectName',
      'strategicIntent',
      'industry',
      'problemStatement',
      'targetAudience',
      'primaryGoal',
      'timeline',
      'resources',
      'valueProposition',
      'challenges',
    ] as const;

    const data: Record<string, string> = {};
    for (const k of keys) {
      const v = parsed[k];
      data[k] = typeof v === 'string' ? v : v != null ? String(v) : '';
    }

    const allowed = ['Q1 (Early Stage)', 'Q2 (Launch)', 'Q3 (Growth)', '12+ Months'];
    if (!allowed.includes(data.timeline)) {
      data.timeline = data.timeline?.includes('12') ? '12+ Months' : 'Q1 (Early Stage)';
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error('onboarding-extract', e);
    const msg = e instanceof Error ? e.message : 'extraction failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
