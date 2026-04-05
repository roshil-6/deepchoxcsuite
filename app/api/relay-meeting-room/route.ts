import { NextResponse } from 'next/server';
import { chatWithGroq } from '@/lib/ai/chatProviders';
import type { Project } from '@/lib/db';
import { buildHeuristicMeetingPlan, normalizeRelayMeetingGoTo, type RelayMeetingStep } from '@/lib/relayMeetingRoom';

const MEETING_ROOM_SYSTEM = `You are the "Meeting Room" guide inside DeepChox Relay — a founder-facing product. Your job is to read the venture JSON and output a clear, ordered plan of what to do NEXT in the app (which screen / desk), in plain English.

RULES:
- Output ONE JSON object only (no markdown fences).
- "intro": 1–2 sentences, friendly and specific to this venture (use the name).
- "steps": array of 5–9 objects, in the order the founder should actually do things.
- Each step:
  - "order": integer starting at 1
  - "title": short headline (max ~10 words)
  - "why": 2–4 sentences. Say WHAT to do in the app and WHY it matters. Name the area (e.g. CEO desk, Timeline, Suite intelligence, CFO desk). No jargon walls.
  - "goTo": exactly one of: dashboard, ceo, pm, accountant, scout, cmo, chief_of_staff, boardroom, calendar, reports, suite_intelligence, intelligence_diary, dexo, personal_assistant
  - "goToLabel": short button text, e.g. "Open CEO desk", "Open Timeline", "Open Suite intelligence"
- Prefer concrete app navigation over generic advice. If data is missing in JSON, say so in "why" and point to the desk that fills the gap.
- Do NOT invent financial numbers, user counts, or metrics not in the JSON.
- Include at least one step that uses personal_assistant (Relay chat) for something only the assistant can help automate (e.g. drafting, updating multiple areas) when appropriate.
- If venture is sparse, front-load discovery (CEO strategy, then CTO plan, then CFO budget, then Market intel) before polish steps.

OUTPUT SHAPE:
{ "intro": "string", "steps": [ { "order": 1, "title": "", "why": "", "goTo": "ceo", "goToLabel": "" } ] }`;

function stripJsonFence(raw: string): string {
    let s = raw.trim();
    if (s.startsWith('```')) {
        s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }
    return s.trim();
}

function parseSteps(raw: unknown): RelayMeetingStep[] {
    if (!Array.isArray(raw)) return [];
    const out: RelayMeetingStep[] = [];
    for (let i = 0; i < raw.length; i++) {
        const o = raw[i] as Record<string, unknown>;
        if (!o || typeof o !== 'object') continue;
        const title = typeof o.title === 'string' ? o.title.trim().slice(0, 200) : '';
        const why = typeof o.why === 'string' ? o.why.trim().slice(0, 1200) : '';
        if (!title || !why) continue;
        out.push({
            order: typeof o.order === 'number' && Number.isFinite(o.order) ? Math.floor(o.order) : i + 1,
            title,
            why,
            goTo: normalizeRelayMeetingGoTo(typeof o.goTo === 'string' ? o.goTo : ''),
            goToLabel:
                typeof o.goToLabel === 'string' && o.goToLabel.trim()
                    ? o.goToLabel.trim().slice(0, 80)
                    : 'Open',
        });
    }
    out.sort((a, b) => a.order - b.order);
    return out.slice(0, 12);
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as { project?: Record<string, unknown> };
        const project = body.project;
        if (!project?.name) {
            return NextResponse.json({ ok: false, error: 'project required' }, { status: 400 });
        }

        if (!process.env.GROQ_API_KEY?.trim()) {
            const h = buildHeuristicMeetingPlan(project as unknown as Project);
            return NextResponse.json({
                ok: true,
                source: 'heuristic',
                intro: h.intro,
                steps: h.steps,
                message: 'AI suggestions need GROQ_API_KEY — showing a built-in plan from your venture fields.',
            });
        }

        const ventureJson = JSON.stringify(project, null, 2).slice(0, 28000);
        const raw = await chatWithGroq(
            [
                { role: 'system', content: MEETING_ROOM_SYSTEM },
                { role: 'user', content: `Venture JSON:\n${ventureJson}` },
            ],
            'llama3',
            { responseJsonObject: true, temperature: 0.35 }
        );
        const text = raw.message?.content || '{}';
        let parsed: { intro?: string; steps?: unknown };
        try {
            parsed = JSON.parse(stripJsonFence(text)) as { intro?: string; steps?: unknown };
        } catch {
            return NextResponse.json(
                { ok: false, error: 'Model returned invalid JSON.', fallback: text.slice(0, 600) },
                { status: 422 }
            );
        }

        const intro = typeof parsed.intro === 'string' ? parsed.intro.trim().slice(0, 1200) : '';
        let steps = parseSteps(parsed.steps);
        const heuristic = buildHeuristicMeetingPlan(project as unknown as Project);
        if (steps.length === 0) {
            return NextResponse.json({
                ok: true,
                source: 'heuristic',
                intro: heuristic.intro,
                steps: heuristic.steps,
                message: 'Model returned no usable steps — using built-in plan.',
                model: 'Llama 3.3 70B (Groq)',
            });
        }

        return NextResponse.json({
            ok: true,
            source: 'ai',
            intro: intro || heuristic.intro,
            steps,
            model: 'Llama 3.3 70B (Groq)',
        });
    } catch (e) {
        console.error('relay-meeting-room', e);
        const msg = e instanceof Error ? e.message : 'request failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}

/** GET: health / docs only */
export async function GET() {
    return NextResponse.json({ ok: true, service: 'relay-meeting-room' });
}
