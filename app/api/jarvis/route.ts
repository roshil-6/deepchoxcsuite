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
import { chatWithOpenAI, chatWithClaude, hasAiKey } from '@/lib/ai/chatProviders';

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

export interface JarvisProposedUpdates {
  strategy: string | null;
  productPlan: string | null;
  marketInsights: string | null;
  budget: string | null;
  teamDirectives: string | null;
}

export interface JarvisReport {
  headline: string;
  summary: string;
  health: JarvisHealthStatus;
  sections: JarvisSection[];
  risks: JarvisRisk[];
  nextActions: JarvisNextAction[];
  proposedUpdates: JarvisProposedUpdates;
  voiceResponse: string;
  followUp: string[];
  generatedAt: number;
  confidence: 'high' | 'medium' | 'low';
  agentsUsed: { gpt: boolean; claude: boolean };
}

// ─── System prompts ──────────────────────────────────────────────────────────

const JARVIS_SYSTEM = `You are JARVIS — the intelligence core of DEEPCHOX, an AI operating system for founders.

You are not a chat assistant. You are a strategic intelligence system with one job: see the full picture of this venture and tell the founder exactly what matters, what's at risk, and what to do next.

Your voice is direct and intelligent. No hedging. No corporate speak. No "it depends." You give the call, then the reason.

You think like a seasoned operator who has seen 1000 startups and can pattern-match failure modes instantly:
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
    "productPlan": "Additive content — null if no update needed",
    "marketInsights": "Additive content — null if no update needed",
    "budget": "Additive content — null if no update needed",
    "teamDirectives": "Additive content — null if no update needed"
  },
  "voiceResponse": "1-3 sentences Jarvis would say aloud. Conversational but intelligent. No bullet points.",
  "followUp": ["Question 1 Jarvis would ask the founder", "Question 2"]
}

Rules:
- Never invent metrics not implied by the venture data
- If data is thin, say so explicitly in the relevant section insight
- proposedUpdates fields should be NULL unless you have specific additive intelligence to contribute
- health statuses must reflect honest assessment, not optimism
- voiceResponse should feel like a trusted advisor talking, not a report being read
- Output JSON only. No markdown fence. No prose outside JSON.`;

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

function normalizeReport(raw: unknown, agentsUsed: { gpt: boolean; claude: boolean }): JarvisReport {
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
    },
    voiceResponse: String(r.voiceResponse ?? r.headline ?? 'Analysis complete.'),
    followUp: Array.isArray(r.followUp) ? r.followUp.map(String).slice(0, 3) : [],
    generatedAt: Date.now(),
    confidence,
    agentsUsed,
  };
}

// ─── Merge two raw parsed reports ────────────────────────────────────────────

function mergeReports(primary: Record<string, unknown>, secondary: Record<string, unknown>): Record<string, unknown> {
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

// ─── Route ───────────────────────────────────────────────────────────────────

type RequestBody = {
  mode: 'analyze' | 'converse';
  /** Full venture snapshot as a string */
  context: string;
  /** User's message (converse mode) */
  userMessage?: string;
  /** Previous Jarvis response headline (for continuity in converse mode) */
  previousHeadline?: string;
};

export async function POST(req: Request) {
  try {
    if (!hasAiKey()) {
      return NextResponse.json({ ok: false, error: 'No AI key configured (OPENAI_API_KEY or ANTHROPIC_API_KEY required)' }, { status: 503 });
    }

    const body = (await req.json()) as RequestBody;
    const { mode = 'analyze', context, userMessage, previousHeadline } = body;

    if (!context?.trim()) {
      return NextResponse.json({ ok: false, error: 'context required' }, { status: 400 });
    }

    const trimmedContext = context.slice(0, MAX_CONTEXT);

    // Build user prompt
    let userPrompt = '';
    if (mode === 'analyze') {
      userPrompt = `Analyze this venture completely and return the full Jarvis report.\n\nVENTURE SNAPSHOT:\n${trimmedContext}\n\nReturn JSON only.`;
    } else {
      userPrompt = `The founder said: "${userMessage ?? ''}"\n\n${previousHeadline ? `Previous Jarvis headline: "${previousHeadline}"\n\n` : ''}VENTURE SNAPSHOT:\n${trimmedContext}\n\nRespond to their message, update your analysis accordingly, and return the full Jarvis report JSON with updated sections and proposedUpdates if the user's message implies changes. Return JSON only.`;
    }

    const messages = [
      { role: 'system', content: JARVIS_SYSTEM },
      { role: 'user', content: userPrompt },
    ];

    const opts = { responseJsonObject: true, temperature: 0.4 };

    // Run GPT and Claude in parallel
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

    // Merge both analyses
    const merged =
      agentsUsed.gpt && agentsUsed.claude
        ? mergeReports(gptParsed, claudeParsed)
        : agentsUsed.gpt
          ? gptParsed
          : claudeParsed;

    const report = normalizeReport(merged, agentsUsed);

    return NextResponse.json({ ok: true, report });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Jarvis error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
