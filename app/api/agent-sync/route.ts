import { NextResponse } from 'next/server';
import { chatWithGroq } from '@/lib/ai/chatProviders';
import type { AgentSyncPayload, AiSyncTraceStep, SyncProjectDTO } from '@/lib/agentStaffTypes';

const SYNC_SYSTEM = `You are the combined AI staff of a growing startup: CEO strategy, CTO product, CFO finance, CSO market intel, and CMO GTM. The user pressed "Sync" — you must research across the venture snapshot and public news context, then output ONE JSON object only (no markdown fence).

RULES:
- Ground everything in the provided venture data and news headlines. Do not invent funding amounts, customer counts, or KPIs not implied by the input.
- If data is missing for a desk, say what is missing in that desk's string (short).
- Propose concrete, dated-feeling next steps where possible.
- kanbanAdds: max 5 new tasks with clear titles; status usually "todo".
- eventAdds: max 5 suggestions; daysFromNow 0 means today; type one of: milestone, meeting, launch, deadline, task.
- append* fields: only non-empty when you have additive intel; keep each under ~600 words; plain text or light markdown bullets.
- attentionItems: 3–8 items. Each is a human notification like a colleague waiting: role MUST be one of: ceo, pm, accountant, scout, cmo, chief_of_staff. Title is short (e.g. "CFO — discuss runway"). Message is one or two sentences (e.g. waiting to discuss latest market moves and funding sensitivity).
- focusToday: exactly 3–7 short bullet strings the founder should prioritize today (action-oriented).

OUTPUT SCHEMA (exact keys):
{
  "summary": "2-4 sentences: what changed, what matters now",
  "desks": {
    "ceo": "string",
    "pm": "string",
    "accountant": "string",
    "scout": "string",
    "cmo": "string"
  },
  "appendMarketInsights": "string or empty",
  "appendBudget": "string or empty",
  "appendTeamDirectives": "string or empty",
  "appendUserNotes": "string or empty",
  "kanbanAdds": [{ "title": "string", "status": "todo" }],
  "eventAdds": [{ "title": "string", "type": "deadline", "daysFromNow": 0 }],
  "attentionItems": [{ "role": "accountant", "title": "string", "message": "string" }],
  "focusToday": ["string", "string"]
}`;

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  return s.trim();
}

async function fetchIntelHeadlines(req: Request, ventureName: string): Promise<string> {
  try {
    const origin = new URL(req.url).origin;
    const res = await fetch(`${origin}/api/intel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `${ventureName} startup industry` }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { items?: { title: string; source: string }[] };
    const items = data.items?.slice(0, 8) || [];
    return items.map((i) => `- ${i.title} (${i.source})`).join('\n');
  } catch {
    return '';
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'GROQ_API_KEY is required for staff sync. Set it on the server.',
        },
        { status: 503 }
      );
    }

    const body = (await req.json()) as { project?: SyncProjectDTO };
    const project = body.project;
    if (!project?.id || !project.name?.trim()) {
      return NextResponse.json({ ok: false, error: 'project with id and name required' }, { status: 400 });
    }

    const headlines = await fetchIntelHeadlines(req, project.name);
    const headlineLines = headlines
      ? headlines.split('\n').filter((l) => l.trim().length > 0)
      : [];
    const intelDetail =
      headlineLines.length > 0
        ? `${headlineLines.length} headline(s) from the intel feed`
        : 'No headlines (intel API empty or failed)';

    const userBlock = `VENTURE SNAPSHOT:
${JSON.stringify(project, null, 2)}

RECENT HEADLINES (automated RSS — verify mentally):
${headlines || '(none fetched)'}

Respond with the JSON object only.`;

    const raw = await chatWithGroq(
      [
        { role: 'system', content: SYNC_SYSTEM },
        { role: 'user', content: userBlock },
      ],
      'llama3',
      { responseJsonObject: true, temperature: 0.35 }
    );

    const text = raw.message?.content || '{}';
    let parsed: AgentSyncPayload;
    try {
      parsed = JSON.parse(stripJsonFence(text)) as AgentSyncPayload;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'Model returned non-JSON. Retry sync.',
          debug: text.slice(0, 400),
        },
        { status: 422 }
      );
    }

    if (!parsed.summary || !parsed.desks) {
      return NextResponse.json({ ok: false, error: 'Invalid sync payload from model' }, { status: 422 });
    }

    const desks = parsed.desks;
    const attentionRaw = Array.isArray(parsed.attentionItems) ? parsed.attentionItems.slice(0, 12) : [];
    const focusRaw = Array.isArray(parsed.focusToday) ? parsed.focusToday.slice(0, 10) : [];

    const normalized: AgentSyncPayload = {
      summary: String(parsed.summary),
      desks: {
        ceo: String(desks.ceo ?? ''),
        pm: String(desks.pm ?? ''),
        accountant: String(desks.accountant ?? ''),
        scout: String(desks.scout ?? ''),
        cmo: String(desks.cmo ?? ''),
      },
      appendMarketInsights: parsed.appendMarketInsights ? String(parsed.appendMarketInsights) : '',
      appendBudget: parsed.appendBudget ? String(parsed.appendBudget) : '',
      appendTeamDirectives: parsed.appendTeamDirectives ? String(parsed.appendTeamDirectives) : '',
      appendUserNotes: parsed.appendUserNotes ? String(parsed.appendUserNotes) : '',
      kanbanAdds: Array.isArray(parsed.kanbanAdds) ? parsed.kanbanAdds.slice(0, 8) : [],
      eventAdds: Array.isArray(parsed.eventAdds) ? parsed.eventAdds.slice(0, 8) : [],
      attentionItems: attentionRaw
        .filter((a: { title?: string; message?: string }) => (a?.title || a?.message)?.toString().trim())
        .map((a: { role?: string; title?: string; message?: string }) => ({
          role: String(a.role || 'chief_of_staff'),
          title: String(a.title || 'Staff update').slice(0, 200),
          message: String(a.message || '').slice(0, 1200),
        })),
      focusToday: focusRaw.map((s: unknown) => String(s).trim()).filter(Boolean),
    };

    const trace: AiSyncTraceStep[] = [
      {
        id: 'snapshot',
        label: 'Load venture snapshot',
        detail: `Project: ${project.name} (id ${project.id})`,
      },
      { id: 'intel', label: 'Fetch news headlines', detail: intelDetail },
      {
        id: 'groq',
        label: 'Call Groq (structured JSON)',
        detail: 'Model llama3 → llama-3.3-70b-versatile, temperature 0.35, one JSON object (desks + appends + kanban + events + attention + focus)',
      },
      {
        id: 'merge',
        label: 'Parse & validate response',
        detail: `Kanban +${(normalized.kanbanAdds ?? []).length}, Events +${(normalized.eventAdds ?? []).length}, Notifications ${(normalized.attentionItems ?? []).length}, Focus bullets ${(normalized.focusToday ?? []).length}`,
      },
    ];

    return NextResponse.json({ ok: true, result: normalized, trace });
  } catch (e) {
    console.error('agent-sync', e);
    const msg = e instanceof Error ? e.message : 'agent-sync failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
