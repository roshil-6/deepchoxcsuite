/**
 * Dual-Agent Relay-Critique Protocol
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the intelligence core that makes GPT-4o-mini and Claude Haiku work
 * TOGETHER — not just in parallel, but as genuine peer reviewers of each other.
 *
 * HOW IT WORKS:
 *
 *   Phase 1  (Parallel)
 *   ├── GPT-4o-mini  → "Execution Draft"  — structured, data-driven analysis
 *   └── Claude Haiku → "Strategic Draft"  — analytical, risk-aware, contrarian
 *
 *   Phase 2  (Parallel, after Phase 1 completes)
 *   ├── GPT reviews Claude's draft → what it agrees with, what it challenges
 *   └── Claude reviews GPT's draft → what it agrees with, what it challenges
 *
 *   Synthesis  (deterministic, no extra model call)
 *   └── Merge: Phase1 outputs + Phase2 critique insights
 *       Agreements  → high-confidence signals (shown as "Confirmed")
 *       Conflicts   → uncertainty flags (shown as "Investigate")
 *       Final output enriched with both angles + conflict intelligence
 *
 * WHY THIS IS SUPERIOR TO SINGLE-AGENT:
 *   • GPT's blind spots (strategic nuance, assumption risk) caught by Claude
 *   • Claude's blind spots (execution structure, JSON schema) caught by GPT
 *   • Agreements = strong signals; disagreements = real ambiguity, not just
 *     model hallucination — worth flagging to the founder
 *   • Each critique round improves the other's output quality
 *
 * PERFORMANCE:
 *   Latency = max(P1_gpt, P1_claude) + max(P2_gpt, P2_claude)
 *   ≈ 2× single-agent. Worth it for sync/boardroom. Desk chat stays single-agent.
 */

import { chatWithOpenAI, chatWithClaude } from '@/lib/ai/chatProviders';

// ─── Types ──────────────────────────────��────────────────────��──────────────

export type AgentProvider = 'openai' | 'claude';

export interface PhaseOutput {
  content: string;
  provider: AgentProvider;
  model: string;
  durationMs: number;
  ok: boolean;
  error?: string;
}

export interface CritiqueOutput {
  agreements: string[];   // Key points both models agreed on
  additions: string[];    // Insights the reviewer found missing in the other's output
  challenges: string[];   // Points the reviewer disputes or wants re-examined
  raw: string;            // Full critique text for transparency
  provider: AgentProvider;
  durationMs: number;
  ok: boolean;
}

export interface RelayProtocolResult {
  phase1: { gpt: PhaseOutput | null; claude: PhaseOutput | null };
  phase2: { gptCritique: CritiqueOutput | null; claudeCritique: CritiqueOutput | null };
  synthesis: {
    content: string;
    /** High-confidence findings — both agents agreed */
    confirmedSignals: string[];
    /** Genuine uncertainty — agents disagreed or flagged as risky */
    conflictFlags: string[];
    /** Overall confidence based on agreement level */
    confidence: 'high' | 'medium' | 'low';
  };
  totalDurationMs: number;
  /** Which provider was primary (had better Phase 1 quality) */
  primaryProvider: AgentProvider | null;
}

export interface RelayProtocolOptions {
  /** System prompt for GPT's Phase 1 */
  systemGPT: string;
  /** System prompt for Claude's Phase 1 */
  systemClaude: string;
  /** User message (venture context / question) */
  userContent: string;
  /** Temperature for Phase 1 (default 0.35 for structured output) */
  temperature?: number;
  /** Whether Phase 1 outputs must be JSON */
  responseJsonObject?: boolean;
  /** Max chars for Phase 1 output to pass to Phase 2 (prevent token overflow) */
  maxPhase1CharsForCritique?: number;
  /** Skip Phase 2 if latency is critical */
  skipCritique?: boolean;
}

// ─── Phase 2 critique prompt ────────────────────────────────────────────────

function buildCritiquePrompt(
  reviewerRole: 'gpt' | 'claude',
  myDraft: string,
  peerDraft: string,
  maxChars: number
): string {
  const reviewerLabel = reviewerRole === 'gpt' ? 'GPT-4o-mini (Execution Architect)' : 'Claude Haiku (Strategic Analyst)';
  const peerLabel = reviewerRole === 'gpt' ? 'Claude Haiku' : 'GPT-4o-mini';

  const truncatedPeer = peerDraft.length > maxChars
    ? peerDraft.slice(0, maxChars) + '\n[...truncated for review]'
    : peerDraft;

  return `You are ${reviewerLabel}. You just produced the analysis below (YOUR DRAFT).

You now have access to the parallel analysis produced by ${peerLabel} (PEER DRAFT).

YOUR DRAFT:
${myDraft.slice(0, maxChars)}

PEER DRAFT:
${truncatedPeer}

Compare both analyses and return a JSON object with exactly these keys:
{
  "agreements": ["string — key finding or recommendation both analyses share (max 4 items)"],
  "additions": ["string — specific insight from PEER DRAFT you find valuable and want incorporated (max 4 items)"],
  "challenges": ["string — point in PEER DRAFT you dispute, find optimistic, or believe needs more scrutiny (max 3 items)"]
}

Rules:
- Be specific. No vague agreement like "both mention risk" — name the risk.
- Challenges must be genuine intellectual disputes, not stylistic differences.
- agreements + additions together = the synthesis inputs.
- Output JSON only, no markdown fence.`;
}

// ─── Critique parser ─────────────────────────────────────────────────────────

function parseCritique(raw: string, provider: AgentProvider, durationMs: number): CritiqueOutput {
  let agreements: string[] = [];
  let additions: string[] = [];
  let challenges: string[] = [];

  try {
    let text = raw.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }
    const parsed = JSON.parse(text) as {
      agreements?: unknown[];
      additions?: unknown[];
      challenges?: unknown[];
    };
    agreements = (parsed.agreements ?? []).map(String).filter(Boolean).slice(0, 4);
    additions  = (parsed.additions  ?? []).map(String).filter(Boolean).slice(0, 4);
    challenges = (parsed.challenges ?? []).map(String).filter(Boolean).slice(0, 3);
  } catch {
    // If JSON parse fails, do a heuristic line-based parse
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    let section: 'agreements' | 'additions' | 'challenges' | null = null;
    for (const line of lines) {
      if (/agree/i.test(line)) { section = 'agreements'; continue; }
      if (/add|incorporat/i.test(line)) { section = 'additions'; continue; }
      if (/challeng|disput|scrutin/i.test(line)) { section = 'challenges'; continue; }
      if (section && line.startsWith('-')) {
        const item = line.replace(/^-\s*/, '').trim();
        if (item) {
          if (section === 'agreements' && agreements.length < 4) agreements.push(item);
          if (section === 'additions'  && additions.length  < 4) additions.push(item);
          if (section === 'challenges' && challenges.length < 3) challenges.push(item);
        }
      }
    }
  }

  return { agreements, additions, challenges, raw, provider, durationMs, ok: true };
}

// ─── Synthesis ───────────────────────────────────────────────────────────────

function synthesize(
  gptDraft: string,
  claudeDraft: string,
  gptCritique: CritiqueOutput | null,
  claudeCritique: CritiqueOutput | null
): RelayProtocolResult['synthesis'] {
  // Confirmed signals = things both critiques listed as agreements
  const gptAgreements = new Set(gptCritique?.agreements ?? []);
  const claudeAgreements = new Set(claudeCritique?.agreements ?? []);
  const confirmedSignals: string[] = [];
  // Add GPT agreements (GPT agreeing with Claude's analysis)
  for (const item of gptAgreements) confirmedSignals.push(item);
  // Add Claude agreements that aren't duplicates
  for (const item of claudeAgreements) {
    if (!confirmedSignals.some((s) => s.toLowerCase().includes(item.slice(0, 30).toLowerCase()))) {
      confirmedSignals.push(item);
    }
  }

  // Conflict flags = things one agent challenges that the other didn't flag as agreement
  const conflictFlags: string[] = [];
  for (const challenge of gptCritique?.challenges ?? []) conflictFlags.push(`[GPT questions] ${challenge}`);
  for (const challenge of claudeCritique?.challenges ?? []) conflictFlags.push(`[Claude questions] ${challenge}`);

  // Confidence: high = few conflicts + both succeeded, medium = some conflicts, low = many or only one agent
  const conflictCount = conflictFlags.length;
  const bothSucceeded = gptDraft.length > 20 && claudeDraft.length > 20;
  const confidence: 'high' | 'medium' | 'low' =
    !bothSucceeded ? 'low' :
    conflictCount <= 1 ? 'high' :
    conflictCount <= 3 ? 'medium' :
    'low';

  // Merge content: Claude's strategic layer on top, GPT's execution layer below
  // Additions from each critique are appended as enrichment
  const gptAdditions = gptCritique?.additions ?? [];
  const claudeAdditions = claudeCritique?.additions ?? [];

  let content = '';

  if (claudeDraft.length > 20) {
    content += `${claudeDraft}\n\n`;
  }
  if (gptDraft.length > 20) {
    content += `${gptDraft}`;
  }

  // Append cross-agent additions as enrichment block
  const enrichments = [...gptAdditions, ...claudeAdditions].filter(Boolean);
  if (enrichments.length > 0) {
    content += `\n\n[Cross-agent enrichment]\n${enrichments.map((e) => `• ${e}`).join('\n')}`;
  }

  return {
    content: content.trim(),
    confirmedSignals: confirmedSignals.slice(0, 6),
    conflictFlags: conflictFlags.slice(0, 4),
    confidence,
  };
}

// ─── Main protocol runner ────────────────────────────────────────────────────���

export async function runRelayProtocol(opts: RelayProtocolOptions): Promise<RelayProtocolResult> {
  const {
    systemGPT,
    systemClaude,
    userContent,
    temperature = 0.35,
    responseJsonObject = false,
    maxPhase1CharsForCritique = 3000,
    skipCritique = false,
  } = opts;

  const totalStart = Date.now();

  // ── Phase 1: Both agents analyse independently ──────────────────────────────

  const gptMessages = [
    { role: 'system', content: systemGPT },
    { role: 'user', content: userContent },
  ];
  const claudeMessages = [
    { role: 'system', content: systemClaude },
    { role: 'user', content: userContent },
  ];

  const p1Opts = { responseJsonObject, temperature };

  const [p1GPTRaw, p1ClaudeRaw] = await Promise.all([
    process.env.OPENAI_API_KEY?.trim()
      ? (async () => {
          const t = Date.now();
          try {
            const r = await chatWithOpenAI(gptMessages, 'llama3', p1Opts);
            return { content: r.message.content, model: r.model, durationMs: Date.now() - t, ok: true } as const;
          } catch (e) {
            return { content: '', model: 'gpt-4o-mini', durationMs: Date.now() - t, ok: false, error: String(e) } as const;
          }
        })()
      : Promise.resolve({ content: '', model: 'gpt-4o-mini', durationMs: 0, ok: false, error: 'No OpenAI key' } as const),

    process.env.ANTHROPIC_API_KEY?.trim()
      ? (async () => {
          const t = Date.now();
          try {
            const r = await chatWithClaude(claudeMessages, { ...p1Opts, systemOverride: systemClaude });
            return { content: r.message.content, model: r.model, durationMs: Date.now() - t, ok: true } as const;
          } catch (e) {
            return { content: '', model: 'claude-haiku', durationMs: Date.now() - t, ok: false, error: String(e) } as const;
          }
        })()
      : Promise.resolve({ content: '', model: 'claude-haiku', durationMs: 0, ok: false, error: 'No Anthropic key' } as const),
  ]);

  const phase1: RelayProtocolResult['phase1'] = {
    gpt: p1GPTRaw.ok
      ? { content: p1GPTRaw.content, provider: 'openai', model: p1GPTRaw.model, durationMs: p1GPTRaw.durationMs, ok: true }
      : null,
    claude: p1ClaudeRaw.ok
      ? { content: p1ClaudeRaw.content, provider: 'claude', model: p1ClaudeRaw.model, durationMs: p1ClaudeRaw.durationMs, ok: true }
      : null,
  };

  // If only one agent succeeded, return its output without Phase 2
  if (!phase1.gpt || !phase1.claude || skipCritique) {
    const solo = phase1.gpt?.content ?? phase1.claude?.content ?? '';
    return {
      phase1,
      phase2: { gptCritique: null, claudeCritique: null },
      synthesis: {
        content: solo,
        confirmedSignals: [],
        conflictFlags: [],
        confidence: 'low',
      },
      totalDurationMs: Date.now() - totalStart,
      primaryProvider: phase1.gpt ? 'openai' : phase1.claude ? 'claude' : null,
    };
  }

  // ── Phase 2: Cross-review — each agent critiques the other ──────────────────

  const gptCritiquePrompt = buildCritiquePrompt('gpt', phase1.gpt.content, phase1.claude.content, maxPhase1CharsForCritique);
  const claudeCritiquePrompt = buildCritiquePrompt('claude', phase1.claude.content, phase1.gpt.content, maxPhase1CharsForCritique);

  const critiqueOpts = { responseJsonObject: true, temperature: 0.25 };

  const [p2GPTRaw, p2ClaudeRaw] = await Promise.all([
    (async () => {
      const t = Date.now();
      try {
        const r = await chatWithOpenAI(
          [{ role: 'user', content: gptCritiquePrompt }],
          'llama3',
          critiqueOpts
        );
        return { content: r.message.content, durationMs: Date.now() - t, ok: true };
      } catch {
        return { content: '{}', durationMs: Date.now() - t, ok: false };
      }
    })(),

    (async () => {
      const t = Date.now();
      try {
        const r = await chatWithClaude(
          [{ role: 'user', content: claudeCritiquePrompt }],
          { ...critiqueOpts, systemOverride: '' }
        );
        return { content: r.message.content, durationMs: Date.now() - t, ok: true };
      } catch {
        return { content: '{}', durationMs: Date.now() - t, ok: false };
      }
    })(),
  ]);

  const phase2: RelayProtocolResult['phase2'] = {
    gptCritique: p2GPTRaw.ok
      ? parseCritique(p2GPTRaw.content, 'openai', p2GPTRaw.durationMs)
      : null,
    claudeCritique: p2ClaudeRaw.ok
      ? parseCritique(p2ClaudeRaw.content, 'claude', p2ClaudeRaw.durationMs)
      : null,
  };

  // ── Synthesis ───────────────────────────��──────────────────────���──────────

  const synthesis = synthesize(
    phase1.gpt.content,
    phase1.claude.content,
    phase2.gptCritique,
    phase2.claudeCritique
  );

  return {
    phase1,
    phase2,
    synthesis,
    totalDurationMs: Date.now() - totalStart,
    primaryProvider: synthesis.confidence === 'low' ? (phase1.gpt ? 'openai' : 'claude') : null,
  };
}

// ─── Convenience: run relay and return just the synthesis string ──────────────

export async function runRelayAndGetContent(opts: RelayProtocolOptions): Promise<{
  content: string;
  confirmedSignals: string[];
  conflictFlags: string[];
  confidence: 'high' | 'medium' | 'low';
  totalDurationMs: number;
  phase1Summary: { gptOk: boolean; claudeOk: boolean };
}> {
  const result = await runRelayProtocol(opts);
  return {
    content: result.synthesis.content,
    confirmedSignals: result.synthesis.confirmedSignals,
    conflictFlags: result.synthesis.conflictFlags,
    confidence: result.synthesis.confidence,
    totalDurationMs: result.totalDurationMs,
    phase1Summary: {
      gptOk: result.phase1.gpt?.ok ?? false,
      claudeOk: result.phase1.claude?.ok ?? false,
    },
  };
}
