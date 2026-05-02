import { NextResponse } from 'next/server';
import { chatWithAI, hasAiKey } from '@/lib/ai/chatProviders';

/** Desk-style id passed to `resolveGroqModel` — default Gemma for CFO funding JSON. */
function cfoFundingGroqDeskId(): string {
    return process.env.CFO_FUNDING_MODEL?.trim() || 'gemma2';
}
import type { CfoFundingPayload } from '@/lib/cfoFundingContext';
import { FUNDING_VALUE_KEYS, type FundingValueKey } from '@/lib/ventureFundingStructure';

const KEYS_LINE = FUNDING_VALUE_KEYS.join(', ');

const SYSTEM = `You are a CFO analyst for an early-stage venture. You receive structured context from across the founder's AI team: strategy, product and execution board, market intel, GTM, finance notes, staff sync summaries, onboarding, directives, and founder focus.

Your task: estimate each funding line item as a SHORT string (max 120 characters per field).

RULES:
- Only use numbers grounded in the input text. If a field has no basis in the provided data, use an empty string "".
- Do not invent specific dollar amounts when no financial data is present. Prefer "TBD" or a qualitative note like "depends on team size" over a made-up range.
- If you use a range (e.g. "$200k–$400k"), there must be a basis for it in the input — stage, team size, named costs, or similar context.
- Do not assume a geography or market not mentioned. If location affects the estimate and is not specified, note "location not specified" in the relevant field.
- Do not use CRITICAL, URGENT, or severity labels. Plain language only.

Output ONE JSON object only. Keys must be exactly: ${KEYS_LINE}

Sanity check: total_capital should reflect implied raise or capital needed for build + runway; monthly_burn and runway_months should be roughly consistent with each other when both are filled.

Return JSON only, no markdown fences.`;

function stripJsonFence(raw: string): string {
    let s = raw.trim();
    if (s.startsWith('```')) {
        s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }
    return s.trim();
}

export async function POST(req: Request) {
    if (!hasAiKey()) {
        return NextResponse.json(
            { ok: false, error: 'OPENAI_API_KEY or GROQ_API_KEY not configured on the server.' },
            { status: 503 }
        );
    }

    let body: { payload?: CfoFundingPayload };
    try {
        body = (await req.json()) as { payload?: CfoFundingPayload };
    } catch {
        return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const p = body.payload;
    if (!p || typeof p.ventureName !== 'string' || !p.ventureName.trim()) {
        return NextResponse.json({ ok: false, error: 'payload with ventureName required' }, { status: 400 });
    }

    const userBlock = JSON.stringify(p, null, 2);

    try {
        const raw = await chatWithAI(
            [
                { role: 'system', content: SYSTEM },
                {
                    role: 'user',
                    content: `Analyze this venture and return JSON only for the funding fields.\n\n${userBlock}`,
                },
            ],
            cfoFundingGroqDeskId(),
            { responseJsonObject: true, temperature: 0.25 }
        );

        const text = stripJsonFence(raw.message?.content || '{}');
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(text) as Record<string, unknown>;
        } catch {
            return NextResponse.json({ ok: false, error: 'Model returned invalid JSON' }, { status: 502 });
        }

        const values: Partial<Record<FundingValueKey, string>> = {};
        for (const k of FUNDING_VALUE_KEYS) {
            const v = parsed[k];
            values[k] = typeof v === 'string' ? v.slice(0, 120).trim() : '';
        }

        return NextResponse.json({
            ok: true,
            values,
            model: raw.model,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Groq request failed';
        console.error('[cfo-funding-suggest]', e);
        return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }
}
