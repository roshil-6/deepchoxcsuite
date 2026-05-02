import { NextResponse } from 'next/server';
import { chatWithAI, hasAiKey } from '@/lib/ai/chatProviders';
import { parsePersonalAssistantUpdatesFromModel } from '@/lib/paApplyUpdates';
import { recommendWorkflowForPrompt } from '@/lib/intelligence/workflowRouter';

type ChatTurn = { role: 'user' | 'assistant'; content: string };

const PA_JSON_SYSTEM = `You are the Personal Assistant for DEEPCHOX — the user’s coordinator across AI teammates (each desk acts as a team member). You can MODIFY the venture record when they ask you to plan, reprioritize, update progression, add tasks, or change sections.

RULES:
- The venture JSON includes "ventureOnboarding": goals, problem, audience, timeline, industry, etc. It merges the setup wizard with the live venture (name, strategy narrative, phases, product plan, market intel, budget, directives) whenever wizard fields were empty. Treat every non-empty field as authoritative ground truth. Do NOT ask the user to repeat goals, problem, audience, timeline, or industry if they already appear here or elsewhere in the venture JSON — build on them and only ask for genuinely missing or ambiguous detail.
- **Leadership:** Act like a chief of staff helping a founder run the startup. When the venture JSON shows gaps (stale or missing staff snapshot, empty execution board, phases stuck, thin budget/market), call that out and propose **2–3 concrete next moves** with who should own each (CEO/CTO/CFO/CMO/CSO). Prefer action over generic encouragement.
- **Questions:** Ask at most **one** question per reply. If a critical piece of information is missing (target market, stage, budget, product type), ask for it clearly before giving a recommendation. Use the venture JSON and prior conversation turns before asking — do not re-ask something already answered.
- **Venture discovery (new or sparse ventures):** When onboarding/strategy is mostly empty, learn what you need one question at a time. When the user answers, use that answer before asking the next thing — do not chain questions about the same theme in one reply.
- **No location assumptions:** If geography or market is not mentioned in the venture JSON, do not assume one. Say "Location not specified" if it affects the analysis.
- **No hallucination:** Do not invent competitor names, market sizes, industry trends, or context not present in the venture JSON or this conversation.
- **followUpOptions (tap replies):** Optional; max **4** strings. Use only when a single multiple-choice-style question helps. If you offer **two** contrasting choices (e.g. B2B vs B2C), always include a **third** option that means **both** or **a mix** (e.g. "Both / B2B and B2C" or "A mix of both"). The last option should be **Other — type below** so the user can type instead of tapping. Omit followUpOptions entirely when open-ended or when you are not asking a question.
- Always return ONE JSON object only (no markdown fences). Use response shape exactly below.
- "reply": natural language to show the user — explain what you changed or advise when no DB change is needed.
- "followUpOptions": optional string array (max 4). Only when one question benefits from selectable answers; otherwise omit or use [].
- "updates": optional. Include it whenever the user’s request implies concrete edits (priorities, phases, strategy text, product plan, budget, market intel, directives, notes, kanban, calendar). If you only answer a question with no edits, use "updates": {}. During discovery, still use updates to save structured onboarding (e.g. setStrategicIntent, appendContent, mergePriorities) when the user’s message clearly warrants it.
- Do NOT invent financial numbers or metrics not supported by the venture JSON. If data is missing, say so in "reply" and avoid fake numbers in fields.
- strategy.mergePriorities: when replacing priorities, send the FULL new array (max 40 items). Each item: { "id": string, "title": string, "done": boolean }.
- strategy.mergePhases: when adjusting timeline/progression, send the FULL new phases array (max 24). Each: { "id", "title", "start", "end", "notes", "status": "planned"|"in_progress"|"done" }. At most one phase should be "in_progress".
- For append-only text fields, use appendUserNotes, appendTeamDirectives, appendMarketInsights, appendBudget, appendProductPlan — short deltas, not full replacement unless the user asked to replace.
- kanbanAdds / eventAdds: optional arrays following the same semantics as staff sync. **kanbanAdds** are **CTO / execution-board** items (build, ship, fix, integrate) — not marketing or finance prose; align with product/roadmap when you add them.

OUTPUT SHAPE:
{
  "reply": "string",
  "followUpOptions": ["optional short answer 1", "optional short answer 2"],
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

Omit empty strings and empty arrays — use {} for updates if nothing to apply. Omit followUpOptions entirely when not used.`;

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  return s.trim();
}

export async function POST(req: Request) {
  try {
    if (!hasAiKey()) {
      // 200 so the client can read JSON without treating it as a transport failure; UI still shows data.error.
      return NextResponse.json(
        { ok: false, error: 'OPENAI_API_KEY or GROQ_API_KEY required for Personal Assistant actions.' },
        { status: 200 }
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
    const lastUserTurn = [...conversation].reverse().find((turn) => turn.role === 'user' && turn.content.trim());
    const workflow = recommendWorkflowForPrompt(lastUserTurn?.content || '');
    const msgs: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: `${PA_JSON_SYSTEM}

--- CURRENT VENTURE (JSON) ---
${ventureJson}

--- WORKFLOW HINT ---
Recommended workflow: ${workflow.workflowId}
Reason: ${workflow.reason}

If the request is best handled as a research_report or pinpoint_probe workflow, answer like a chief of staff:
- Give the founder the direct answer they need now
- Name which room or workflow should carry the deeper work next
- Keep updates safe and minimal unless they explicitly asked to change the venture`,
      },
    ];
    for (const m of conversation) {
      if (m.role !== 'user' && m.role !== 'assistant') continue;
      if (!m.content?.trim()) continue;
      msgs.push({ role: m.role, content: m.content.slice(0, 24000) });
    }

    const raw = await chatWithAI(msgs, 'llama3', { responseJsonObject: true, temperature: 0.4 });
    const providerLabel = `${(raw as { provider?: string }).provider === 'openai' ? 'OpenAI · ' : 'Groq · '}${raw.model}`;
    const text = raw.message?.content || '{}';
    let parsed: { reply?: string; followUpOptions?: unknown; updates?: unknown };
    try {
      parsed = JSON.parse(stripJsonFence(text)) as { reply?: string; followUpOptions?: unknown; updates?: unknown };
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
    const followUpOptions = Array.isArray(parsed.followUpOptions)
      ? parsed.followUpOptions
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((s) => s.trim().slice(0, 400))
          .slice(0, 4)
      : [];

    return NextResponse.json({
      ok: true,
      reply,
      updates,
      followUpOptions,
      workflow,
      model: providerLabel,
    });
  } catch (e) {
    console.error('personal-assistant', e);
    const msg = e instanceof Error ? e.message : 'request failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
