/**
 * /api/jarvis — JARVIS Intelligence Core
 *
 * Runs a full dual-agent (GPT-4o-mini + Claude Haiku) analysis of the venture
 * and returns a rich structured report covering every section of the business.
 *
 * Modes:
 *  - analyze   : Full venture intelligence report (called on load / "re-analyze")
 *  - converse  : User spoke or typed → Jarvis responds with updated insights + proposed changes
 *
 * The response is always a single JSON object: JarvisReport.
 * Proposed updates are returned as strings — the client decides when/whether to apply them.
 */

import { NextResponse } from 'next/server';
import { chatWithOpenAI, chatWithClaude, chatWithGroq, hasAiKey } from '@/lib/ai/chatProviders';

/** Allow up to 120 s on Vercel Pro (dual-agent analyze can take 40-60 s combined). */
export const maxDuration = 120;

const MAX_CONTEXT = 16_000;

export interface JarvisHealthStatus {
  overall: 'strong' | 'caution' | 'risk' | 'critical';
  strategy: 'strong' | 'caution' | 'risk' | 'critical';
  finance: 'strong' | 'caution' | 'risk' | 'critical';
  product: 'strong' | 'caution' | 'risk' | 'critical';
  market: 'strong' | 'caution' | 'risk' | 'critical';
  gtm: 'strong' | 'caution' | 'risk' | 'critical';
}

export interface JarvisSection {
  desk: 'strategy' | 'finance' | 'product' | 'market' | 'gtm';
  title: string;
  status: 'strong' | 'caution' | 'risk' | 'critical';
  insight: string;
  action: string;
}

export interface JarvisRisk {
  level: 'high' | 'medium' | 'low';
  label: string;
  detail: string;
}

export interface JarvisNextAction {
  priority: number;
  action: string;
  desk: 'ceo' | 'pm' | 'accountant' | 'scout' | 'cmo';
  timeframe: 'today' | 'this week' | 'this month';
}

export type JarvisKanbanAdd = {
  title: string;
  status?: 'todo' | 'in_progress' | 'next' | 'completed';
};

export interface JarvisProposedUpdates {
  strategy: string | null;
  productPlan: string | null;
  marketInsights: string | null;
  budget: string | null;
  teamDirectives: string | null;
  /** Converse mode: concrete delivery tasks to add to the PM execution board (deduped on the client). */
  kanbanAdds: JarvisKanbanAdd[] | null;
}

/** Standard fields plus any extra venture patch keys the model returns (validated client/server). */
export type JarvisProposedUpdatesExtended = JarvisProposedUpdates & Record<string, unknown>;

export interface JarvisReport {
  headline: string;
  summary: string;
  health: JarvisHealthStatus;
  sections: JarvisSection[];
  risks: JarvisRisk[];
  nextActions: JarvisNextAction[];
  proposedUpdates: JarvisProposedUpdatesExtended;
  voiceResponse: string;
  followUp: string[];
  generatedAt: number;
  confidence: 'high' | 'medium' | 'low';
  agentsUsed: { gpt: boolean; claude: boolean };
}

// ─── System prompts ──────────────────────────────────────────────────────────

export const JARVIS_SYSTEM = `You are Dexo — the cofounder intelligence engine inside DEEPCHOX.

You can think deeply in the background, but when speaking to the founder you sound like a smart human peer, not a consultant, not a dashboard, and not a robotic strategist.

In analyze mode, give a structured operating brief.
In converse mode, reply like a cofounder sitting beside the founder: plain words, calm tone, helpful guidance, no grandstanding.

Your voice is clear, grounded, and human. No corporate jargon. No theatrical "founder guru" tone. No pretending you know more than the evidence shows.

You think like a seasoned operator who can pattern-match failure modes:
- You spot the load-bearing assumption that hasn't been validated
- You see the runway trap before it closes
- You read the competitive signal that looks small but isn't
- You know which problem to solve first and which to ignore

ANALYSIS FRAMEWORK (apply to every venture you analyze):
1. What is the single most important thing right now? (Not a list — one thing)
2. What is the biggest unvalidated assumption this venture is betting on?
3. What does the financial position actually say? (Conservative read)
4. What is the market telling the founder that they might not be hearing?
5. Is the product roadmap solving the right problem in the right order?
6. What would a competitor do to kill this venture in the next 6 months?

OUTPUT FORMAT: Return a single JSON object with EXACTLY this structure:
{
  "headline": "One sentence — the most critical intelligence for this founder right now",
  "summary": "3-4 sentences. Jarvis's voice. What is the state of this venture? Be honest.",
  "health": {
    "overall": "strong|caution|risk|critical",
    "strategy": "strong|caution|risk|critical",
    "finance": "strong|caution|risk|critical",
    "product": "strong|caution|risk|critical",
    "market": "strong|caution|risk|critical",
    "gtm": "strong|caution|risk|critical"
  },
  "sections": [
    {
      "desk": "strategy",
      "title": "string",
      "status": "strong|caution|risk|critical",
      "insight": "2-3 sentences of honest analysis. Name the specific risk or strength.",
      "action": "One specific next action. Start with a verb. Time-bound if possible."
    },
    { "desk": "finance", ... },
    { "desk": "product", ... },
    { "desk": "market", ... },
    { "desk": "gtm", ... }
  ],
  "risks": [
    { "level": "high|medium|low", "label": "Short label", "detail": "One sentence — specific, not vague" }
  ],
  "nextActions": [
    { "priority": 1, "action": "string", "desk": "ceo|pm|accountant|scout|cmo", "timeframe": "today|this week|this month" }
  ],
  "proposedUpdates": {
    "strategy": "Additive content to append to strategy field — null if no update needed",
    "productPlan": "Null if no change. Prefer compact JSON {\"intent\":\"...\",\"roadmapText\":\"...\"} with only fields the founder actually updated; otherwise a short prose paragraph merged into the product roadmap brief.",
    "marketInsights": "Additive content — null if no update needed",
    "budget": "Additive content — null if no update needed",
    "teamDirectives": "Additive content — null if no update needed",
    "kanbanAdds": null
  },
  "voiceResponse": "2-4 short sentences meant to be read aloud by text-to-speech. Sound like a sharp colleague explaining the situation over coffee — warm pacing, plain words only. Do NOT read lists, field names, internal labels, code, percentages as digits-only dumps, or stack metrics. If you mention a number, one clear figure is enough; round or rephrase the rest in human terms. No bullet points or markdown.",
  "followUp": ["Question 1 Jarvis would ask the founder", "Question 2"]
}

Rules:
- In proposedUpdates you may add other venture fields when useful (e.g. name, userNotes, events, journal, files, orgStructure, deskDocuments, staffFocusToday, staffAttentionItems, onboardingData). They are validated; omit keys you do not need.
- Never invent metrics not implied by the venture data
- If data is thin, say so explicitly in the relevant section insight
- If the user message includes [SPARSE_CONTEXT_MODE], follow those constraints before all other style rules
- In converse mode, voiceResponse should be the main experience: natural, brief, and emotionally steady
- In converse mode, do not sound like an audit, diagnosis memo, or board deck unless the founder explicitly asks for that style
- Prefer one clear suggestion or one clarifying question over a barrage of frameworks
- proposedUpdates fields should be NULL unless you have specific additive intelligence to contribute
- In CONVERSE mode, when the founder shares product intent, roadmap direction, or delivery priorities: set productPlan as in the schema. When they name concrete shippable work or next steps they want tracked, set kanbanAdds to 1–5 items with short titles — do NOT repeat titles already listed under "Execution board (kanban)" in the snapshot; use status "todo" unless they clearly said work is active now. If nothing to save, kanbanAdds must be null or [].
- health statuses must reflect honest assessment, not optimism
- voiceResponse must feel like a trusted advisor talking — never like a spreadsheet or status dashboard being read line by line
- Output JSON only. No markdown fence. No prose outside JSON.`;

/** Compact system prompt for converse/chat mode — much smaller response, faster generation. */
const DEXO_CHAT_SYSTEM = `You are Dexo — the AI co-founder inside DEEPCHOX.

Talk like a smart, grounded co-founder: plain English, direct, warm. No bullet-points, no consulting framing.

OUTPUT FORMAT — return only this JSON object:
{
  "voiceResponse": "Your reply. 2-5 sentences. Conversational, human.",
  "headline": "One short sentence summary of the conversation.",
  "followUp": ["One natural follow-up question if useful"],
  "proposedUpdates": {
    "strategy": null,
    "productPlan": null,
    "marketInsights": null,
    "budget": null,
    "teamDirectives": null,
    "kanbanAdds": null
  }
}

Rules:
- voiceResponse: plain English only, no markdown. Keep it brief and human.
- followUp: 0–2 short questions. Empty array [] if no follow-up needed.
- proposedUpdates: only set fields when the founder shared specific information to track. All null by default.
- If the founder shares delivery tasks or product work items, put short titles in kanbanAdds (max 5). Otherwise null.
- Return JSON only. No text before or after the JSON object.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripJsonFence(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('```')) t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return t;
}

const HEALTH_VALUES = ['strong', 'caution', 'risk', 'critical'] as const;
type HealthVal = (typeof HEALTH_VALUES)[number];

function normalizeHealth(v: unknown): HealthVal {
  return HEALTH_VALUES.includes(v as HealthVal) ? (v as HealthVal) : 'caution';
}

function normalizeKanbanAdds(raw: unknown): JarvisKanbanAdd[] | null {
  if (!Array.isArray(raw)) return null;
  const out: JarvisKanbanAdd[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const title = typeof r.title === 'string' ? r.title.trim() : '';
    if (!title) continue;
    const st = r.status;
    const status =
      st === 'todo' || st === 'in_progress' || st === 'next' || st === 'completed' ? st : undefined;
    out.push({ title, status });
  }
  return out.length ? out.slice(0, 8) : null;
}

export function normalizeReport(raw: unknown, agentsUsed: { gpt: boolean; claude: boolean }): JarvisReport {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  const health = (typeof r.health === 'object' && r.health !== null ? r.health : {}) as Record<string, unknown>;

  const rawSections = Array.isArray(r.sections) ? (r.sections as unknown[]) : [];
  const DESK_ORDER: JarvisSection['desk'][] = ['strategy', 'finance', 'product', 'market', 'gtm'];
  const sections: JarvisSection[] = DESK_ORDER.map((desk) => {
    const match = rawSections.find(
      (s): s is Record<string, unknown> =>
        typeof s === 'object' && s !== null && (s as Record<string, unknown>).desk === desk
    );
    return {
      desk,
      title: String(match?.title ?? desk.charAt(0).toUpperCase() + desk.slice(1)),
      status: normalizeHealth(match?.status),
      insight: String(match?.insight ?? 'Analysis pending — add venture data and run analysis.'),
      action: String(match?.action ?? 'Open this desk and add context.'),
    };
  });

  const rawRisks = Array.isArray(r.risks) ? (r.risks as unknown[]) : [];
  const risks: JarvisRisk[] = rawRisks.slice(0, 6).map((ri) => {
    const row = (typeof ri === 'object' && ri !== null ? ri : {}) as Record<string, unknown>;
    const level = ['high', 'medium', 'low'].includes(String(row.level)) ? (row.level as JarvisRisk['level']) : 'medium';
    return { level, label: String(row.label ?? 'Risk'), detail: String(row.detail ?? '') };
  });

  const rawActions = Array.isArray(r.nextActions) ? (r.nextActions as unknown[]) : [];
  const nextActions: JarvisNextAction[] = rawActions.slice(0, 5).map((a, i) => {
    const row = (typeof a === 'object' && a !== null ? a : {}) as Record<string, unknown>;
    const desk = (['ceo', 'pm', 'accountant', 'scout', 'cmo'] as const).includes(row.desk as JarvisNextAction['desk'])
      ? (row.desk as JarvisNextAction['desk'])
      : 'ceo';
    const tf = (['today', 'this week', 'this month'] as const).includes(row.timeframe as JarvisNextAction['timeframe'])
      ? (row.timeframe as JarvisNextAction['timeframe'])
      : 'this week';
    return { priority: Number(row.priority ?? i + 1), action: String(row.action ?? ''), desk, timeframe: tf };
  });

  const rawUpd = (typeof r.proposedUpdates === 'object' && r.proposedUpdates !== null ? r.proposedUpdates : {}) as Record<string, unknown>;
  const stdUpdKeys = ['strategy', 'productPlan', 'marketInsights', 'budget', 'teamDirectives', 'kanbanAdds'] as const;
  const passthrough: Record<string, unknown> = { ...rawUpd };
  for (const k of stdUpdKeys) delete passthrough[k];

  const confidence: JarvisReport['confidence'] =
    agentsUsed.gpt && agentsUsed.claude ? 'high' : agentsUsed.gpt || agentsUsed.claude ? 'medium' : 'low';

  return {
    headline: String(r.headline ?? 'Analysis complete — review insights below.'),
    summary: String(r.summary ?? ''),
    health: {
      overall: normalizeHealth(health.overall),
      strategy: normalizeHealth(health.strategy),
      finance: normalizeHealth(health.finance),
      product: normalizeHealth(health.product),
      market: normalizeHealth(health.market),
      gtm: normalizeHealth(health.gtm),
    },
    sections,
    risks,
    nextActions: nextActions.sort((a, b) => a.priority - b.priority),
    proposedUpdates: {
      strategy: rawUpd.strategy ? String(rawUpd.strategy) : null,
      productPlan: rawUpd.productPlan ? String(rawUpd.productPlan) : null,
      marketInsights: rawUpd.marketInsights ? String(rawUpd.marketInsights) : null,
      budget: rawUpd.budget ? String(rawUpd.budget) : null,
      teamDirectives: rawUpd.teamDirectives ? String(rawUpd.teamDirectives) : null,
      kanbanAdds: normalizeKanbanAdds(rawUpd.kanbanAdds),
      ...passthrough,
    },
    voiceResponse: String(r.voiceResponse ?? r.headline ?? 'Analysis complete.'),
    followUp: Array.isArray(r.followUp) ? r.followUp.map(String).slice(0, 3) : [],
    generatedAt: Date.now(),
    confidence,
    agentsUsed,
  };
}

// ─── Merge two raw parsed reports ────────────────────────────────────────────

export function mergeReports(primary: Record<string, unknown>, secondary: Record<string, unknown>): Record<string, unknown> {
  // Health: take the more conservative (higher risk) of the two
  const healthOrder = ['strong', 'caution', 'risk', 'critical'];
  const mergeHealthField = (a: unknown, b: unknown) => {
    const ai = healthOrder.indexOf(String(a));
    const bi = healthOrder.indexOf(String(b));
    return healthOrder[Math.max(ai, bi)] ?? 'caution';
  };

  const ph = (primary.health ?? {}) as Record<string, unknown>;
  const sh = (secondary.health ?? {}) as Record<string, unknown>;
  const mergedHealth = {
    overall: mergeHealthField(ph.overall, sh.overall),
    strategy: mergeHealthField(ph.strategy, sh.strategy),
    finance: mergeHealthField(ph.finance, sh.finance),
    product: mergeHealthField(ph.product, sh.product),
    market: mergeHealthField(ph.market, sh.market),
    gtm: mergeHealthField(ph.gtm, sh.gtm),
  };

  // Sections: merge insights — secondary enriches primary
  const pSections = Array.isArray(primary.sections) ? (primary.sections as Record<string, unknown>[]) : [];
  const sSections = Array.isArray(secondary.sections) ? (secondary.sections as Record<string, unknown>[]) : [];
  const mergedSections = pSections.map((ps) => {
    const ss = sSections.find((s) => s.desk === ps.desk);
    if (!ss) return ps;
    // Keep primary action (structured), merge insights with secondary's perspective
    const insight = ss.insight
      ? `${String(ps.insight ?? '')} ${String(ss.insight ?? '')}`.trim().slice(0, 600)
      : ps.insight;
    // Use higher risk status
    const status = mergeHealthField(ps.status, ss.status);
    return { ...ps, insight, status };
  });

  // Risks: combine both, deduplicate by label
  const pRisks = Array.isArray(primary.risks) ? (primary.risks as Record<string, unknown>[]) : [];
  const sRisks = Array.isArray(secondary.risks) ? (secondary.risks as Record<string, unknown>[]) : [];
  const riskMap = new Map<string, unknown>();
  for (const r of [...pRisks, ...sRisks]) {
    const key = String(r.label ?? '').toLowerCase().slice(0, 20);
    if (key && !riskMap.has(key)) riskMap.set(key, r);
  }
  const mergedRisks = [...riskMap.values()].slice(0, 6);

  // Next actions: merge, deduplicate
  const pActions = Array.isArray(primary.nextActions) ? primary.nextActions : [];
  const sActions = Array.isArray(secondary.nextActions) ? secondary.nextActions : [];
  const actionMap = new Map<string, unknown>();
  for (const a of [...pActions, ...sActions]) {
    const key = String((a as Record<string, unknown>).action ?? '').toLowerCase().slice(0, 30);
    if (key && !actionMap.has(key)) actionMap.set(key, a);
  }
  const mergedActions = [...actionMap.values()].slice(0, 5);

  // Proposed updates: merge non-null fields
  const pUpd = (primary.proposedUpdates ?? {}) as Record<string, unknown>;
  const sUpd = (secondary.proposedUpdates ?? {}) as Record<string, unknown>;
  const mergedUpdates: Record<string, unknown> = {};
  for (const key of ['strategy', 'productPlan', 'marketInsights', 'budget', 'teamDirectives']) {
    const pVal = pUpd[key];
    const sVal = sUpd[key];
    if (pVal && sVal) mergedUpdates[key] = `${pVal}\n\n${sVal}`;
    else mergedUpdates[key] = pVal ?? sVal ?? null;
  }

  const pk = pUpd.kanbanAdds;
  const sk = sUpd.kanbanAdds;
  const kanMerged = [...(Array.isArray(pk) ? pk : []), ...(Array.isArray(sk) ? sk : [])];
  mergedUpdates.kanbanAdds = kanMerged.length ? kanMerged.slice(0, 10) : null;

  const stdKeys = new Set(['strategy', 'productPlan', 'marketInsights', 'budget', 'teamDirectives', 'kanbanAdds']);
  for (const k of new Set([...Object.keys(pUpd), ...Object.keys(sUpd)])) {
    if (stdKeys.has(k)) continue;
    const sVal = sUpd[k];
    const pVal = pUpd[k];
    mergedUpdates[k] = sVal !== undefined && sVal !== null ? sVal : pVal;
  }

  return {
    ...primary,
    health: mergedHealth,
    sections: mergedSections,
    risks: mergedRisks,
    nextActions: mergedActions,
    proposedUpdates: mergedUpdates,
    // Claude's voice response is usually sharper
    voiceResponse: secondary.voiceResponse ?? primary.voiceResponse,
  };
}

/** Converse: one fast completion (Groq 8B → OpenAI → Claude) instead of dual-agent + merge. */
async function runConverseSingleAgent(
  messages: { role: string; content: string }[],
  opts: { responseJsonObject: boolean; temperature: number }
): Promise<{ content: string; ok: boolean; agentsUsed: { gpt: boolean; claude: boolean } }> {
  if (process.env.GROQ_API_KEY?.trim()) {
    try {
      const r = await chatWithGroq(messages, 'llama3.2', opts);
      return { content: r.message.content, ok: true, agentsUsed: { gpt: true, claude: false } };
    } catch {
      /* try next */
    }
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const r = await chatWithOpenAI(messages, 'llama3', opts);
      return { content: r.message.content, ok: true, agentsUsed: { gpt: true, claude: false } };
    } catch {
      /* try next */
    }
  }
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    try {
      const r = await chatWithClaude(messages, opts);
      return { content: r.message.content, ok: true, agentsUsed: { gpt: false, claude: true } };
    } catch {
      /* fail */
    }
  }
  return { content: '{}', ok: false, agentsUsed: { gpt: false, claude: false } };
}

// ─── Route ───────────────────────────────────────────────────────────────────

type RequestBody = {
  mode: 'analyze' | 'converse';
  /** Full venture snapshot as a string */
  context: string;
  /** True when the frontend knows this venture is still mostly empty/template-level. */
  sparseContext?: boolean;
  /** User's message (converse mode) */
  userMessage?: string;
  /** Previous Jarvis response headline (for continuity in converse mode) */
  previousHeadline?: string;
  /** Last turns for multi-turn Dexo desk chat (`text` or `content` for each message). */
  conversationHistory?: { role: string; text?: string; content?: string }[];
  /** Extracts from uploaded files (converse mode). */
  attachmentNotes?: string;
  /** Active desk / section hint (converse mode). */
  deskContextLine?: string;
};

export async function POST(req: Request) {
  try {
    if (!hasAiKey()) {
      return NextResponse.json({ ok: false, error: 'No AI key configured (OPENAI_API_KEY or ANTHROPIC_API_KEY required)' }, { status: 503 });
    }

    const body = (await req.json()) as RequestBody;
    const {
      mode = 'analyze',
      context,
      userMessage,
      previousHeadline,
      sparseContext = false,
      conversationHistory,
      attachmentNotes,
      deskContextLine,
    } = body;

    if (!context?.trim()) {
      return NextResponse.json({ ok: false, error: 'context required' }, { status: 400 });
    }

    const trimmedContext = context.slice(0, MAX_CONTEXT);
    const substantiveBody = trimmedContext.replace(/^\s*Venture:\s*[^\n]*\n?/im, '').trim();
    const isSparseContext = !!sparseContext || substantiveBody.length < 380;

    const sparseBlock = isSparseContext
      ? `

[SPARSE_CONTEXT_MODE — mandatory behavior]
The venture snapshot is thin (little founder-specific detail beyond a name and/or default template). You MUST:
- Headline and summary: clearly frame this as onboarding / early exploration — not a performance scorecard.
- Do NOT invent revenue, customers, growth %, TAM, runway months, burn, or team size unless explicitly in the snapshot.
- Do not label any health axis "strong" unless the text provides explicit supporting facts; use "caution" for unknowns.
- Each section insight: name what is missing and what the founder should add; avoid fake precision or harsh judgment.
- risks: include one high-priority item about thin context / need for real inputs if not already present.
- voiceResponse: warm, concise, normal-human language. Ask what the founder wants help with first. If useful, ask whether they already have a problem or idea in mind, or whether they want help finding one. No dashboards, frameworks, or metric dumps.
- followUp: exactly 3 short, natural questions to enrich the venture record.
`
      : '';

    const converseStyleBlock = mode === 'converse'
      ? `

[CONVERSE_MODE — mandatory behavior]
The founder is talking directly to you. Reply like a thoughtful cofounder.
- Start from their actual question, not from a generic venture audit.
- Use plain, friendly language.
- If context is sparse, do not unload a technical diagnosis. Help them get unstuck with one useful thought and one or two natural questions.
- Avoid phrases like "the honest read", "this is a decision problem", "zero validation", "founding team workshop", or other boardroom-style framing unless the founder asked for a hard-edged strategic critique.
- If the founder asks what you know, summarize gently and briefly, and be explicit about what you do not know yet without sounding defensive.
`
      : '';

    const histRaw = Array.isArray(conversationHistory) ? conversationHistory : [];
    const histBlock =
      mode === 'converse' && histRaw.length > 0
        ? `\n\nRECENT_CONVERSATION (stay consistent; oldest to newest):\n${histRaw
            .slice(-14)
            .map((m) => {
              const isUser = m.role === 'user';
              const label = isUser ? 'Founder' : 'Dexo';
              const txt = String(m.text ?? m.content ?? '').trim();
              return txt ? `${label}: ${txt}` : '';
            })
            .filter(Boolean)
            .join('\n')}`
        : '';
    const attachBlock =
      mode === 'converse' && attachmentNotes?.trim()
        ? `\n\nFILE_AND_ATTACHMENT_EXCERPTS:\n${attachmentNotes.trim().slice(0, 12_000)}`
        : '';
    const deskBlock =
      mode === 'converse' && deskContextLine?.trim()
        ? `\n\n${deskContextLine.trim().slice(0, 4000)}`
        : '';

    // Build user prompt
    let userPrompt = '';
    if (mode === 'analyze') {
      userPrompt = `Analyze this venture completely and return the full Jarvis report.\n\nVENTURE SNAPSHOT:\n${trimmedContext}\n\nReturn JSON only.${sparseBlock}`;
    } else {
      userPrompt = `The founder said: "${userMessage ?? ''}"\n\n${previousHeadline ? `Previous Jarvis headline: "${previousHeadline}"\n\n` : ''}VENTURE SNAPSHOT:\n${trimmedContext}${deskBlock}${attachBlock}${histBlock}\n\nRespond to the founder in a natural cofounder tone, then return the full Jarvis report JSON with updated sections and proposedUpdates if the founder's message implies changes. Keep the voiceResponse human and conversational. Return JSON only.${sparseBlock}${converseStyleBlock}`;
    }

    const messages = [
      { role: 'system', content: JARVIS_SYSTEM },
      { role: 'user', content: userPrompt },
    ];

    const opts = { responseJsonObject: true, temperature: 0.4 };

    let report: JarvisReport;

    if (mode === 'converse') {
      const chatMessages = [
        { role: 'system', content: DEXO_CHAT_SYSTEM },
        { role: 'user', content: userPrompt },
      ];
      const single = await runConverseSingleAgent(chatMessages, opts);
      let parsed: Record<string, unknown> = {};
      if (single.ok) {
        try {
          parsed = JSON.parse(stripJsonFence(single.content));
        } catch {
          /* ignore */
        }
      }
      const agentsUsed = {
        gpt: single.agentsUsed.gpt && !!parsed.headline,
        claude: single.agentsUsed.claude && !!parsed.headline,
      };
      if (!agentsUsed.gpt && !agentsUsed.claude) {
        return NextResponse.json(
          { ok: false, error: 'Dexo could not produce a reply. Check AI API keys and try again.' },
          { status: 502 },
        );
      }
      report = normalizeReport(parsed, agentsUsed);
    } else {
      // Analyze: dual-agent in parallel, then merge
      const [gptRaw, claudeRaw] = await Promise.all([
        process.env.OPENAI_API_KEY?.trim()
          ? chatWithOpenAI(messages, 'llama3', opts)
              .then((r) => ({ content: r.message.content, ok: true }))
              .catch(() => ({ content: '{}', ok: false }))
          : Promise.resolve({ content: '{}', ok: false }),

        process.env.ANTHROPIC_API_KEY?.trim()
          ? chatWithClaude(messages, opts)
              .then((r) => ({ content: r.message.content, ok: true }))
              .catch(() => ({ content: '{}', ok: false }))
          : Promise.resolve({ content: '{}', ok: false }),
      ]);

      let gptParsed: Record<string, unknown> = {};
      let claudeParsed: Record<string, unknown> = {};

      if (gptRaw.ok) {
        try { gptParsed = JSON.parse(stripJsonFence(gptRaw.content)); } catch { /* ignore */ }
      }
      if (claudeRaw.ok) {
        try { claudeParsed = JSON.parse(stripJsonFence(claudeRaw.content)); } catch { /* ignore */ }
      }

      const agentsUsed = { gpt: gptRaw.ok && !!gptParsed.headline, claude: claudeRaw.ok && !!claudeParsed.headline };

      if (!agentsUsed.gpt && !agentsUsed.claude) {
        return NextResponse.json({ ok: false, error: 'Both agents failed to produce a valid report. Check API keys.' }, { status: 502 });
      }

      const merged =
        agentsUsed.gpt && agentsUsed.claude
          ? mergeReports(gptParsed, claudeParsed)
          : agentsUsed.gpt
            ? gptParsed
            : claudeParsed;

      report = normalizeReport(merged, agentsUsed);
    }
    const reportOut = isSparseContext ? { ...report, confidence: 'low' as const } : report;

    return NextResponse.json({ ok: true, report: reportOut });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Jarvis error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
