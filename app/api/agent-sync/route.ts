/**
 * /api/agent-sync — Full venture staff sync with DUAL AGENTS.
 *
 * GPT-4o-mini runs as "Execution Staff" — kanban tasks, event planning, structured desk updates.
 * Claude Haiku runs as "Strategic Analyst" — market signals, risk flags, strategic coherence.
 *
 * Both fire in TRUE PARALLEL. Their desk outputs are merged: GPT provides base;
 * Claude's sharper strategic/risk insights are prepended to each desk entry.
 * This produces a richer, more balanced sync than a single model.
 */

import { NextResponse } from 'next/server';
import { chatWithOpenAI, chatWithClaude, hasAiKey, hasAnthropicKey } from '@/lib/ai/chatProviders';
import type { AgentSyncPayload, AiSyncTraceStep, SyncProjectDTO } from '@/lib/agentStaffTypes';
import { parseStrategy } from '@/lib/strategyDoc';

// ─── System prompts ────────────────────────────────────────────────────────

const SYNC_SYSTEM_GPT = `You are the combined AI staff of a growing startup: CEO strategy, CTO product & execution, CFO finance, CSO market intel, and CMO GTM. The user pressed "Sync" — you must research across the venture snapshot and public news context, then output ONE JSON object only (no markdown fence).

RULES:
- The venture snapshot may include "ventureOnboarding" (wizard fields merged with name, strategy, phases, product plan, market, budget, directives). Use it as baseline truth; do not ask the user to restate what is already there.
- If the snapshot includes a non-empty "agentCoordinationBrief" string, treat it as the founder's instructions for how the five desks should coordinate (relative emphasis, pacing, risk posture). Honor it when it does not conflict with grounding in real data below.
- Ground everything in the provided venture data and news headlines. Do not invent funding amounts, customer counts, or KPIs not implied by the input.
- If data is missing for a desk, say what is missing in that desk's string (short).
- Propose concrete, dated-feeling next steps where possible.

EXECUTION BOARD (CTO OWNS THIS):
- The CTO desk is "pm" in desks — product, architecture, and **delivery**. The venture **execution board** (kanban in the app) is the CTO's surface: what to build, ship, or fix next.
- **kanbanAdds** MUST be tasks the CTO would own: implementation, releases, integrations, technical milestones, spikes, debt paydown — not generic CEO/CFO/CMO prose. Titles must align with the story in desks.pm (same priorities, ordered for execution).
- Include **1–5** kanbanAdds whenever product, roadmap, tech, or delivery is in scope. The snapshot includes existing **kanban** — add tasks that **extend or update the execution plan**; do not duplicate titles already on the board. status usually "todo"; use "in_progress" or "next" only when the snapshot clearly implies active work.
- max 5 new tasks per sync; clear, actionable titles.
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

/**
 * Claude's strategic analyst system prompt.
 * Focuses on strategic coherence, risk identification, and market signal interpretation.
 * Returns the SAME schema but with a sharper analytical lens.
 */
const SYNC_SYSTEM_CLAUDE = `You are the Strategic Intelligence Analyst for a startup AI operating system. You are running alongside GPT-4o (the execution-focused agent). Your distinct role: surface what the execution agent might miss.

Focus on:
- Strategic coherence: Are the CEO, PM, CFO, CMO, and CSO desks all pointing toward the same goal? Flag any misalignment.
- Risk concentration: What is the single biggest risk in this venture right now? Name it clearly in the CEO desk.
- Market signals: From the headlines provided, what are the 1–2 signals most relevant to this venture's survival or growth? Put them in scout and cmo desks.
- Financial truth: Is the budget strategy realistic given the stage? CFO desk should reflect hard financial truth, not optimism.
- GTM gap: What is the founder NOT doing in go-to-market that they should be? CMO desk.

RULES:
- Same venture snapshot applies — ground everything in provided data.
- Do NOT duplicate the execution agent's kanban tasks or events. Set kanbanAdds and eventAdds to empty arrays.
- attentionItems: 1–3 HIGH-SIGNAL items only. Quality over quantity.
- focusToday: 2–3 strategic priorities that complement (not duplicate) execution tasks.
- desks: Each desk entry should start with a bold signal word like "RISK:", "SIGNAL:", "GAP:", or "ALIGNED:" to make the analytical layer immediately visible.

OUTPUT SCHEMA (exact keys, same as execution agent):
{
  "summary": "1-2 sentences: the strategic picture the execution agent might miss",
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
  "kanbanAdds": [],
  "eventAdds": [],
  "attentionItems": [{ "role": "ceo", "title": "string", "message": "string" }],
  "focusToday": ["string"]
}`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  return s.trim();
}

async function fetchIntelHeadlines(req: Request, project: SyncProjectDTO): Promise<string> {
  try {
    const origin = new URL(req.url).origin;
    const doc = parseStrategy(project.strategy || '');
    const strategicIntent = (doc.strategicIntent || doc.vision || '').trim().slice(0, 600);
    const userNotes = (project.userNotes || '').trim().slice(0, 600);
    const res = await fetch(`${origin}/api/intel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ventureName: project.name.trim(),
        strategicIntent: strategicIntent || undefined,
        userNotes: userNotes || undefined,
        lens: 'all',
        timeWindow: '7d',
      }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { items?: { title: string; source: string }[] };
    const items = data.items?.slice(0, 8) || [];
    return items.map((i) => `- ${i.title} (${i.source})`).join('\n');
  } catch {
    return '';
  }
}

/**
 * Merge GPT (execution) and Claude (strategic) sync payloads.
 * GPT provides the primary structured output; Claude's analytical insights
 * are prepended to each desk entry and high-signal attention items merged in.
 */
function mergeSyncPayloads(gpt: AgentSyncPayload, claude: AgentSyncPayload | null): AgentSyncPayload {
  if (!claude) return gpt;

  const mergeDesk = (key: keyof AgentSyncPayload['desks']) => {
    const gptDesk = String(gpt.desks[key] ?? '').trim();
    const claudeDesk = String(claude.desks[key] ?? '').trim();
    if (!claudeDesk) return gptDesk;
    if (!gptDesk) return claudeDesk;
    return `${claudeDesk}\n\n${gptDesk}`;
  };

  // Merge attention items — keep GPT's 3–8 + Claude's high-signal 1–3 (deduplicate by title)
  const gptItems = Array.isArray(gpt.attentionItems) ? gpt.attentionItems : [];
  const claudeItems = Array.isArray(claude.attentionItems) ? claude.attentionItems : [];
  const allItems = [...gptItems];
  for (const ci of claudeItems) {
    const isDup = allItems.some((ai) => ai.title?.toLowerCase() === ci.title?.toLowerCase());
    if (!isDup) allItems.push({ ...ci, title: `[Strategic] ${ci.title}` });
  }

  // Merge focusToday: keep GPT's execution bullets, prepend Claude's strategic bullets
  const gptFocus = Array.isArray(gpt.focusToday) ? gpt.focusToday : [];
  const claudeFocus = Array.isArray(claude.focusToday) ? claude.focusToday : [];
  const mergedFocus = [...claudeFocus, ...gptFocus].slice(0, 7);

  // Append Claude's market intel to GPT's
  const appendMarket = [
    gpt.appendMarketInsights || '',
    claude.appendMarketInsights ? `\n\n[Strategic Analysis]\n${claude.appendMarketInsights}` : '',
  ]
    .join('')
    .trim();

  return {
    ...gpt,
    summary: gpt.summary,
    desks: {
      ceo: mergeDesk('ceo'),
      pm: mergeDesk('pm'),
      accountant: mergeDesk('accountant'),
      scout: mergeDesk('scout'),
      cmo: mergeDesk('cmo'),
    },
    appendMarketInsights: appendMarket || gpt.appendMarketInsights || '',
    appendBudget: gpt.appendBudget || claude.appendBudget || '',
    attentionItems: allItems.slice(0, 10),
    focusToday: mergedFocus,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    if (!hasAiKey()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'OPENAI_API_KEY or ANTHROPIC_API_KEY is required for staff sync. Set it on the server.',
        },
        { status: 503 }
      );
    }

    const body = (await req.json()) as { project?: SyncProjectDTO };
    const project = body.project;
    if (!project?.id || !project.name?.trim()) {
      return NextResponse.json({ ok: false, error: 'project with id and name required' }, { status: 400 });
    }

    const headlines = await fetchIntelHeadlines(req, project);
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

The JSON "kanban" array in the snapshot is the CTO **execution board** today — new kanbanAdds should align with desks.pm and complement that list.

Respond with the JSON object only.`;

    const opts = { responseJsonObject: true as const, temperature: 0.35 };

    // Fire GPT and Claude in TRUE PARALLEL
    const gptPromise = process.env.OPENAI_API_KEY?.trim()
      ? chatWithOpenAI(
          [{ role: 'system', content: SYNC_SYSTEM_GPT }, { role: 'user', content: userBlock }],
          'llama3',
          opts
        )
          .then((r) => ({ content: r.message.content, ok: true, provider: 'openai' as const }))
          .catch((e) => ({ content: '{}', ok: false, provider: 'openai' as const, error: String(e) }))
      : Promise.resolve({ content: '{}', ok: false, provider: 'openai' as const, error: 'No OpenAI key' });

    const claudePromise = hasAnthropicKey()
      ? chatWithClaude(
          [{ role: 'system', content: SYNC_SYSTEM_CLAUDE }, { role: 'user', content: userBlock }],
          opts
        )
          .then((r) => ({ content: r.message.content, ok: true, provider: 'claude' as const }))
          .catch((e) => ({ content: '{}', ok: false, provider: 'claude' as const, error: String(e) }))
      : Promise.resolve({ content: '{}', ok: false, provider: 'claude' as const, error: 'No Anthropic key' });

    const syncStart = Date.now();
    const [gptRaw, claudeRaw] = await Promise.all([gptPromise, claudePromise]);
    const durationMs = Date.now() - syncStart;

    // Parse GPT (primary)
    let gptParsed: AgentSyncPayload | null = null;
    if (gptRaw.ok) {
      try {
        gptParsed = JSON.parse(stripJsonFence(gptRaw.content)) as AgentSyncPayload;
      } catch { /* fall through */ }
    }

    // Parse Claude (strategic)
    let claudeParsed: AgentSyncPayload | null = null;
    if (claudeRaw.ok) {
      try {
        claudeParsed = JSON.parse(stripJsonFence(claudeRaw.content)) as AgentSyncPayload;
      } catch { /* fall through */ }
    }

    // Require at least one successful parse
    if (!gptParsed && !claudeParsed) {
      return NextResponse.json(
        { ok: false, error: 'Both agents returned non-JSON. Retry sync.', debug: gptRaw.content.slice(0, 300) },
        { status: 422 }
      );
    }

    const primaryParsed = gptParsed ?? claudeParsed!;
    if (!primaryParsed.summary || !primaryParsed.desks) {
      return NextResponse.json({ ok: false, error: 'Invalid sync payload from model' }, { status: 422 });
    }

    // Merge both agent outputs
    const merged = mergeSyncPayloads(primaryParsed, gptParsed ? claudeParsed : null);

    // Normalize
    const desks = merged.desks;
    const attentionRaw = Array.isArray(merged.attentionItems) ? merged.attentionItems.slice(0, 12) : [];
    const focusRaw = Array.isArray(merged.focusToday) ? merged.focusToday.slice(0, 10) : [];

    const normalized: AgentSyncPayload = {
      summary: String(merged.summary),
      desks: {
        ceo: String(desks.ceo ?? ''),
        pm: String(desks.pm ?? ''),
        accountant: String(desks.accountant ?? ''),
        scout: String(desks.scout ?? ''),
        cmo: String(desks.cmo ?? ''),
      },
      appendMarketInsights: merged.appendMarketInsights ? String(merged.appendMarketInsights) : '',
      appendBudget: merged.appendBudget ? String(merged.appendBudget) : '',
      appendTeamDirectives: merged.appendTeamDirectives ? String(merged.appendTeamDirectives) : '',
      appendUserNotes: merged.appendUserNotes ? String(merged.appendUserNotes) : '',
      kanbanAdds: Array.isArray(merged.kanbanAdds) ? merged.kanbanAdds.slice(0, 8) : [],
      eventAdds: Array.isArray(merged.eventAdds) ? merged.eventAdds.slice(0, 8) : [],
      attentionItems: attentionRaw
        .filter((a: { title?: string; message?: string }) => (a?.title || a?.message)?.toString().trim())
        .map((a: { role?: string; title?: string; message?: string }) => ({
          role: String(a.role || 'chief_of_staff'),
          title: String(a.title || 'Staff update').slice(0, 200),
          message: String(a.message || '').slice(0, 1200),
        })),
      focusToday: focusRaw.map((s: unknown) => String(s).trim()).filter(Boolean),
    };

    // Build audit trace
    const trace: AiSyncTraceStep[] = [
      {
        id: 'snapshot',
        label: 'Load venture snapshot',
        detail: `Project: ${project.name} (id ${project.id})`,
      },
      { id: 'intel', label: 'Fetch news headlines', detail: intelDetail },
      {
        id: 'dual-parallel',
        label: 'Dual-agent parallel execution',
        detail: `GPT-4o-mini (Execution Staff) + Claude Haiku (Strategic Analyst) ran simultaneously in ${durationMs}ms. GPT: ${gptRaw.ok ? 'success' : 'failed'}. Claude: ${claudeRaw.ok ? 'success' : 'failed'}.`,
      },
      {
        id: 'merge',
        label: 'Merge & validate dual outputs',
        detail: `Kanban +${(normalized.kanbanAdds ?? []).length}, Events +${(normalized.eventAdds ?? []).length}, Notifications ${(normalized.attentionItems ?? []).length}, Focus bullets ${(normalized.focusToday ?? []).length}`,
      },
    ];

    const deskTrace: { id: string; key: keyof AgentSyncPayload['desks']; label: string }[] = [
      { id: 'desk-ceo', key: 'ceo', label: 'CEO — strategy & narrative' },
      { id: 'desk-pm', key: 'pm', label: 'CTO — product & delivery' },
      { id: 'desk-cfo', key: 'accountant', label: 'CFO — finance & runway' },
      { id: 'desk-scout', key: 'scout', label: 'CSO — market & competitive intel' },
      { id: 'desk-cmo', key: 'cmo', label: 'CMO — GTM & messaging' },
    ];
    for (const d of deskTrace) {
      const text = String(normalized.desks[d.key] ?? '').trim();
      const excerpt =
        text.length > 200 ? `${text.slice(0, 200)}…` : text || '(No desk output — venture data may be thin for this role.)';
      trace.push({ id: d.id, label: d.label, detail: excerpt });
    }
    trace.push({
      id: 'handoff',
      label: 'Merge into venture record',
      detail:
        'Applying append-only intel, directives, notes; CTO execution-board tasks (kanban), calendar events, bell notifications, and your focus list.',
    });

    return NextResponse.json({
      ok: true,
      result: normalized,
      trace,
      dual_agent: {
        gpt: gptRaw.ok,
        claude: claudeRaw.ok,
        durationMs,
      },
    });
  } catch (e) {
    console.error('agent-sync', e);
    const msg = e instanceof Error ? e.message : 'agent-sync failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
