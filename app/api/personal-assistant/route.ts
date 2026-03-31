import { NextResponse } from 'next/server';
import { chatWithGroq } from '@/lib/ai/chatProviders';
import { parsePersonalAssistantUpdatesFromModel } from '@/lib/paApplyUpdates';

type ChatTurn = { role: 'user' | 'assistant'; content: string };

const PA_JSON_SYSTEM = `You are the Personal Assistant for DeepChox — the user’s AI chief of staff. You can MODIFY the venture record when they ask you to plan, reprioritize, update progression, add tasks, or change sections.

RULES:
- Always return ONE JSON object only (no markdown fences). Use response shape exactly below.
- "reply": natural language to show the user — explain what you changed or advise when no DB change is needed.
- "updates": optional. Include it whenever the user’s request implies concrete edits (priorities, phases, strategy text, product plan, budget, market intel, directives, notes, kanban, calendar). If you only answer a question with no edits, use "updates": {}.
- Do NOT invent financial numbers or metrics not supported by the venture JSON. If data is missing, say so in "reply" and avoid fake numbers in fields.
- strategy.mergePriorities: when replacing priorities, send the FULL new array (max 40 items). Each item: { "id": string, "title": string, "done": boolean }.
- strategy.mergePhases: when adjusting timeline/progression, send the FULL new phases array (max 24). Each: { "id", "title", "start", "end", "notes", "status": "planned"|"in_progress"|"done" }. At most one phase should be "in_progress".
- For append-only text fields, use appendUserNotes, appendTeamDirectives, appendMarketInsights, appendBudget, appendProductPlan — short deltas, not full replacement unless the user asked to replace.
- kanbanAdds / eventAdds: optional arrays following the same semantics as staff sync.

OUTPUT SHAPE:
{
  "reply": "string",
  "updates": {
    "appendUserNotes": "",
    "appendTeamDirectives": "",
    "appendMarketInsights": "",
    "appendBudget": "",
    "appendProductPlan": "",
    "strategy": {
      "mergePriorities": [],
      "mergePhases": [],
      "setStrategicIntent": "",
      "setVision": "",
      "appendContent": ""
    },
    "kanbanAdds": [{ "title": "", "status": "todo" }],
    "eventAdds": [{ "title": "", "type": "deadline", "daysFromNow": 0 }]
  }
}

Omit empty strings and empty arrays — use {} for updates if nothing to apply.`;

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  return s.trim();
}

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'GROQ_API_KEY required for Personal Assistant actions.' },
        { status: 503 }
      );
    }

    const body = (await req.json()) as {
      project?: Record<string, unknown>;
      conversation?: ChatTurn[];
    };
    const project = body.project;
    const conversation = Array.isArray(body.conversation) ? body.conversation : [];
    if (!project?.name) {
      return NextResponse.json({ ok: false, error: 'project required' }, { status: 400 });
    }

    const ventureJson = JSON.stringify(project, null, 2).slice(0, 32000);
    const msgs: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: `${PA_JSON_SYSTEM}\n\n--- CURRENT VENTURE (JSON) ---\n${ventureJson}` },
    ];
    for (const m of conversation) {
      if (m.role !== 'user' && m.role !== 'assistant') continue;
      if (!m.content?.trim()) continue;
      msgs.push({ role: m.role, content: m.content.slice(0, 24000) });
    }

    const raw = await chatWithGroq(msgs, 'llama3', { responseJsonObject: true, temperature: 0.4 });
    const text = raw.message?.content || '{}';
    let parsed: { reply?: string; updates?: unknown };
    try {
      parsed = JSON.parse(stripJsonFence(text)) as { reply?: string; updates?: unknown };
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'Model returned invalid JSON.',
          fallbackReply: text.slice(0, 800),
        },
        { status: 422 }
      );
    }

    const reply = typeof parsed.reply === 'string' ? parsed.reply : 'Done.';
    const updates = parsePersonalAssistantUpdatesFromModel(parsed.updates);

    return NextResponse.json({ ok: true, reply, updates });
  } catch (e) {
    console.error('personal-assistant', e);
    const msg = e instanceof Error ? e.message : 'request failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
