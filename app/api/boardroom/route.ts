import { NextResponse } from 'next/server';
import { chatWithGroq } from '@/lib/ai/chatProviders';
import { AGENT_DEFINITIONS } from '@/lib/orchestrator/AgentDefinitions';
import { normalizeExecutiveBoardResponse } from '@/lib/orchestrator/boardroomNormalize';
import type { ExecutiveRole } from '@/lib/orchestrator/types';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

const ROLES: ExecutiveRole[] = ['CEO', 'CFO', 'CMO', 'CTO', 'CSO'];
const MAX_CONTEXT = 14_000;

function isRole(s: unknown): s is ExecutiveRole {
    return typeof s === 'string' && (ROLES as string[]).includes(s);
}

function stripJsonFence(raw: string): string {
    let t = raw.trim();
    if (t.startsWith('```')) {
        t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }
    return t.trim();
}

// 20 requests per minute per IP.
const RATE_LIMIT = 20;

export async function POST(req: Request) {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`boardroom:${ip}`, RATE_LIMIT);
    if (!rl.ok) return rateLimitResponse(rl.resetAt);

    try {
        const body = (await req.json()) as { role?: string; context?: string };
        const role = body.role;
        const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT) : '';

        if (!isRole(role)) {
            return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 });
        }
        if (!context.trim()) {
            return NextResponse.json({ ok: false, error: 'Context required' }, { status: 400 });
        }

        if (!process.env.GROQ_API_KEY?.trim()) {
            return NextResponse.json({ ok: false, error: 'GROQ_API_KEY not configured', useMock: true }, { status: 503 });
        }

        const def = AGENT_DEFINITIONS[role];
        const system = `${def.systemPrompt}

Respond with a single JSON object matching this shape exactly (no markdown, no prose outside JSON):
${def.outputSchema}`;

        const raw = await chatWithGroq(
            [
                { role: 'system', content: system },
                {
                    role: 'user',
                    content: `Board directive and venture context:\n\n${context}\n\nReturn JSON only.`,
                },
            ],
            'llama3',
            { responseJsonObject: true, temperature: 0.35 }
        );

        const text = raw.message?.content || '{}';
        let parsed: unknown;
        try {
            parsed = JSON.parse(stripJsonFence(text));
        } catch {
            return NextResponse.json({ ok: false, error: 'Model returned invalid JSON', useMock: true }, { status: 502 });
        }

        const response = normalizeExecutiveBoardResponse(role, parsed);
        if (!response) {
            return NextResponse.json({ ok: false, error: 'Could not normalize response', useMock: true }, { status: 502 });
        }

        return NextResponse.json({ ok: true, response });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Boardroom agent failed';
        return NextResponse.json({ ok: false, error: msg, useMock: true }, { status: 502 });
    }
}
