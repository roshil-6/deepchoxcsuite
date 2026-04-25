import { NextResponse } from 'next/server';
import { chatWithAI, chatWithClaude, hasAiKey, hasAnthropicKey } from '@/lib/ai/chatProviders';
import type { FocusBriefingPayload } from '@/types/focusBriefing';
import {
  researchQuickIntel,
  formatQuickIntel,
  extractVentureNameFromContext,
} from '@/lib/tavilyResearch';

function parseBriefing(raw: string): FocusBriefingPayload | null {
    try {
        let s = raw.trim();
        if (s.startsWith('```')) {
            s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
        }
        const o = JSON.parse(s) as Record<string, unknown>;
        const headline = typeof o.headline === 'string' ? o.headline.trim() : '';
        const paragraphs = Array.isArray(o.paragraphs)
            ? o.paragraphs.map((p) => String(p).trim()).filter(Boolean)
            : [];
        const priorities = Array.isArray(o.priorities)
            ? o.priorities.map((p) => String(p).trim()).filter(Boolean)
            : [];
        const voiceNarration = typeof o.voiceNarration === 'string' ? o.voiceNarration.trim() : '';
        if (!headline && !paragraphs.length && !voiceNarration) return null;
        return {
            headline: headline || 'What to focus on',
            paragraphs,
            priorities,
            voiceNarration:
                voiceNarration ||
                [headline, ...paragraphs].filter(Boolean).join('\n\n'),
        };
    } catch {
        return null;
    }
}

export async function POST(req: Request) {
    if (!hasAiKey()) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    'No AI keys in server env. Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY (and optionally GROQ_API_KEY) in .env.local, then restart the dev server.',
            },
            { status: 503 }
        );
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const context = typeof (body as { context?: unknown })?.context === 'string' ? (body as { context: string }).context.trim() : '';
    if (!context) {
        return NextResponse.json({ ok: false, error: 'Missing context' }, { status: 400 });
    }

    const system = `You are DeepChox’s executive focus briefing writer.

Given ONLY the venture context the user sends (it may be sparse), produce a concise briefing: what matters now, what is missing from the record, and what to do next.

Rules:
- Ground every claim in the context. If something is not in the context, say it is unknown or missing — do not invent metrics, customers, or revenue.
- Operator tone: direct, no corporate filler, no “Great question”.
- Return a single JSON object with EXACTLY these keys:
  - "headline": string, one punchy line (max ~120 chars).
  - "paragraphs": array of 2–4 short strings; each 1–3 sentences.
  - "priorities": array of 3–5 strings; each starts with a verb; time-bound when possible.
  - "voiceNarration": one string, 130–260 words, fluent prose for text-to-speech: NO markdown, NO bullet characters, NO list syntax; short sentences; expand acronyms on first use; read like a chief of staff speaking aloud. Do NOT recite raw field names, internal labels, or structured data — interpret what it means in everyday language.`;

    // Pull live web intel for this venture (non-blocking, best-effort)
    let webIntelBlock = '';
    const ventureName = extractVentureNameFromContext(context);
    if (ventureName) {
      try {
        const sources = await researchQuickIntel(ventureName);
        if (sources.length > 0) webIntelBlock = `\n\n${formatQuickIntel(sources)}`;
      } catch {
        /* non-blocking */
      }
    }

    const messages = [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: `Context:\n---\n${context}\n---${webIntelBlock}` },
    ];

    try {
        let content = '';
        try {
            const out = await chatWithAI(messages, 'llama3', { responseJsonObject: true, temperature: 0.35 });
            content = out.message?.content?.trim() ?? '';
        } catch (primaryErr) {
            if (hasAnthropicKey()) {
                const out = await chatWithClaude(messages, { responseJsonObject: true, temperature: 0.35 });
                content = out.message?.content?.trim() ?? '';
            } else {
                throw primaryErr;
            }
        }

        const parsed = parseBriefing(content);
        if (!parsed) {
            return NextResponse.json({ ok: false, error: 'Model returned invalid briefing JSON' }, { status: 502 });
        }
        return NextResponse.json({ ok: true, briefing: parsed });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Briefing failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }
}
