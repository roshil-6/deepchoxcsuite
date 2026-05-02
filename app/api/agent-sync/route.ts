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
import {
  researchForStaffSync,
  formatSyncWebIntel,
} from '@/lib/tavilyResearch';

// ─── System prompts ────────────────────────────────────────────────────────

const SYNC_SYSTEM_GPT = `You are the AI staff for a startup. The founder ran Staff Sync — analyse the venture snapshot and live web context, then return ONE JSON object only (no markdown fence).

GROUNDING RULES — read carefully:
- Use only what is in the venture snapshot. Do NOT invent facts, locations, countries, market sizes, customer counts, funding amounts, or KPIs that are not stated in the snapshot or web sources.
- If the snapshot does not mention a location or country, do NOT assume one. Write "Location not specified" where geography would affect the analysis and leave it at that. Do not guess or reference any country.
- If a field is empty or missing (e.g. no budget, no market research), say what is missing in one short sentence. Example: "No budget information provided." Do NOT analyse around the gap or invent placeholder numbers.
- Do NOT reference previous syncs, conversation history, or prior directives. Analyse only what is in the current snapshot.
- Do NOT use severity labels like CRITICAL, URGENT, HIGH-PRIORITY, RISK:, GAP:, SIGNAL: anywhere in the output — not in titles, not in desk text. Write plain, direct sentences.
- Write like a knowledgeable colleague, not an analyst report. Short sentences. No jargon. No buzzwords.
- If the snapshot includes "agentCoordinationBrief", treat it as the founder's priority instructions for this sync.

DESK RULES:
- Each desk string: 2–5 sentences max. What is the situation, what is the one next action. Nothing more.
- accountant desk: ONLY reference actual monetary figures from the snapshot (budget, expenses, funding). If budget data is absent or empty, write exactly one sentence: "No budget data provided. Add your financials in the Finance desk." Do NOT generate runway estimates, burn rate, allocation percentages, CAC, LTV, or any financial metric. Do NOT analyse around missing financial data. No exceptions.
- scout desk: only reference market/competitor data from the venture snapshot or LIVE_WEB_INTEL. If a web source mentions a country or company, only include it if it is directly relevant to this venture's stated market. Do not surface generic global startup news as if it applies to this venture.
- Every desk: if the venture has no data for a desk's domain (no market research for scout, no roadmap for pm, no GTM plan for cmo), write exactly one sentence naming what is missing. Do not generate placeholder analysis or generic recommendations.

EXECUTION BOARD:
- kanbanAdds: 1–5 tasks the product/tech owner would actually execute. Clear titles. No abstract strategy tasks.
- Do not duplicate kanban titles already in the snapshot.
- eventAdds: max 3. Only if dates/milestones are clearly implied by the snapshot.

OUTPUT RULES:
- attentionItems: 2–5 items. Title = short plain label (e.g. "Budget not set", "Market research missing"). Message = one sentence stating what is needed, nothing more. No CRITICAL/URGENT. No invented history.
- focusToday: 3–5 short action strings. Start with a verb. Keep under 12 words each.
- summary: 2 sentences max. What the research found. What matters right now.

OUTPUT SCHEMA (exact keys, JSON only):
{
  "summary": "string",
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
 * Claude's strategic layer prompt.
 * Adds strategic coherence and market signal checks on top of the execution agent.
 * Same strict grounding rules — no hallucination, no severity labels, no invented details.
 */
const SYNC_SYSTEM_CLAUDE = `You are a strategic advisor reviewing a startup's research sync alongside an execution agent. Your role: check for strategic gaps and market signals the execution agent may have missed.

YOUR FOCUS:
- Are the CEO, product, finance, and marketing directions aligned? If not, note the gap plainly.
- What is the one most important market signal from the web sources that affects this venture? Only include it if it is directly relevant to the venture's stated market or product — not generic startup industry news.
- Is the financial picture realistic for the stage? ONLY if actual monetary figures (budget, expenses, funding amounts) exist in the snapshot. If budget data is absent, write exactly: "No budget data." Do NOT generate runway, burn rate, allocation, or any financial estimates.
- What is the most important thing the founder is not doing yet in go-to-market? Only if GTM data is present.

STRICT RULES — same as execution agent:
- Use only what is in the venture snapshot. Do NOT invent countries, locations, market sizes, or any fact not in the snapshot.
- If location is not in the snapshot, do not mention any country or geography anywhere.
- Do NOT use RISK:, GAP:, SIGNAL:, ALIGNED:, CRITICAL, URGENT, or any severity label anywhere in the output.
- Do NOT reference previous syncs, past conversations, or prior directives. Only the current snapshot.
- Write short plain sentences. No jargon. No analyst language.
- If a field is missing from the snapshot (no budget, no market data), write one sentence: "No [field] provided." Do not analyse around it.
- Do NOT generate financial metrics (runway, burn rate, CAC, LTV, allocation percentages) unless actual monetary figures appear in the snapshot. No financial analysis without financial data. No exceptions.
- Set kanbanAdds and eventAdds to empty arrays — execution agent handles these.
- attentionItems: 1–2 items max. Plain title. One-sentence message. No drama.
- focusToday: 2–3 strategic actions that do not duplicate the execution agent's list.
- desks: 2–3 sentences each. What is the situation, what is the next action.

OUTPUT SCHEMA (exact keys, JSON only):
{
  "summary": "string",
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

/**
 * Fetch live web intelligence via Tavily for the Staff Sync.
 * Returns a formatted LIVE_WEB_INTEL block ready to inject into both AI agent prompts.
 * Falls back gracefully — never blocks the sync from running.
 */
async function fetchSyncWebIntel(project: SyncProjectDTO): Promise<{
  intelBlock: string;
  sourceCount: number;
  summary: string;
}> {
  try {
    const doc = parseStrategy(project.strategy || '');
    const strategicIntent = (doc.strategicIntent || doc.vision || '').trim().slice(0, 200);

    const data = await researchForStaffSync({
      ventureName: project.name.trim(),
      strategicIntent: strategicIntent || undefined,
      // pull a rough industry from userNotes + strategy text
      industry: extractDomainHintFromProject(project),
    });

    const intelBlock = formatSyncWebIntel(data);
    const sourceCount = data.totalSources;
    const summary =
      sourceCount > 0
        ? `${sourceCount} Tavily web source(s) — company news (${data.companyNews.length}), market (${data.marketLandscape.length}), industry trends (${data.industryTrends.length})`
        : 'No Tavily results (key missing or no matches)';

    return { intelBlock, sourceCount, summary };
  } catch {
    return {
      intelBlock: 'LIVE_WEB_INTEL: (fetch error — research continuing without live sources)',
      sourceCount: 0,
      summary: 'Tavily fetch failed gracefully',
    };
  }
}

/** Extract a rough industry/domain hint from venture project fields */
function extractDomainHintFromProject(project: SyncProjectDTO): string | undefined {
  const text = [project.strategy, project.marketInsights, project.userNotes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .slice(0, 2000);

  const domains = [
    'fintech', 'healthtech', 'medtech', 'edtech', 'proptech', 'legaltech', 'insurtech',
    'saas', 'b2b saas', 'b2c', 'e-commerce', 'ecommerce', 'marketplace', 'platform',
    'ai', 'machine learning', 'blockchain', 'crypto', 'web3', 'defi',
    'logistics', 'supply chain', 'retail', 'food tech', 'agritech', 'cleantech',
    'travel', 'hospitality', 'hr tech', 'devtools', 'cybersecurity',
  ];
  return domains.find((d) => text.includes(d));
}

/**
 * Merge GPT (execution) and Claude (strategic) sync payloads.
 * GPT provides the primary structured output; Claude's analytical insights
 * are prepended to each desk entry and high-signal attention items merged in.
 */
function mergeSyncPayloads(gpt: AgentSyncPayload, claude: AgentSyncPayload | null): AgentSyncPayload {
  if (!claude) return gpt;

  const stripSeverityLabels = (text: string) =>
    text.replace(/\*?\*?(CRITICAL|URGENT|HIGH-PRIORITY|RISK:|GAP:|SIGNAL:|ALIGNED:|WARNING)\*?\*?[:\s-]*/gi, '').trim();

  const mergeDesk = (key: keyof AgentSyncPayload['desks']) => {
    const gptDesk = stripSeverityLabels(String(gpt.desks[key] ?? '').trim());
    const claudeDesk = stripSeverityLabels(String(claude.desks[key] ?? '').trim());
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

    const { intelBlock, sourceCount, summary: intelSummary } = await fetchSyncWebIntel(project);
    const intelDetail = intelSummary;

    const userBlock = `VENTURE SNAPSHOT:
${JSON.stringify(project, null, 2)}

${intelBlock}

The JSON "kanban" array in the snapshot is the CTO **execution board** today — new kanbanAdds should align with desks.pm and complement that list.

INSTRUCTIONS FOR LIVE_WEB_INTEL:
- Use the web sources above to ground any market, competitor, or industry claims.
- Cite source numbers (e.g. [3]) when referencing a specific headline or finding.
- Do not invent data not supported by the venture snapshot or web sources above.
- If LIVE_WEB_INTEL shows no results, rely solely on the venture snapshot.

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
          // Strip any severity labels the model ignored instructions about
          title: String(a.title || 'Staff update')
            .replace(/^(CRITICAL|URGENT|HIGH-PRIORITY|RISK:|GAP:|SIGNAL:|ALIGNED:|WARNING)[:\s-]*/i, '')
            .trim()
            .slice(0, 120),
          message: String(a.message || '')
            .replace(/^(CRITICAL|URGENT|HIGH-PRIORITY|RISK:|GAP:|SIGNAL:|ALIGNED:|WARNING)[:\s-]*/i, '')
            .trim()
            .slice(0, 200),
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
      { id: 'intel', label: 'Tavily live web research', detail: intelDetail },
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
