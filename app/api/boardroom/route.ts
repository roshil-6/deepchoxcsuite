/**
 * /api/boardroom — Executive board session with DUAL AGENTS.
 *
 * GPT-4o-mini and Claude Haiku work SIMULTANEOUSLY on the same role brief.
 * GPT acts as the "Execution Architect" — structured, data-driven, decisive.
 * Claude acts as the "Strategic Challenger" — incisive, contrarian, analytical.
 * Their outputs are merged into a single authoritative executive response.
 */
import { NextResponse } from 'next/server';
import { chatWithOpenAI, chatWithClaude, hasAiKey, hasAnthropicKey } from '@/lib/ai/chatProviders';
import { AGENT_DEFINITIONS } from '@/lib/orchestrator/AgentDefinitions';
import { normalizeExecutiveBoardResponse } from '@/lib/orchestrator/boardroomNormalize';
import type { ExecutiveRole } from '@/lib/orchestrator/types';

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

/**
 * Claude's challenger system prompt — complements GPT's execution focus.
 * Claude Haiku challenges assumptions and surfaces blind spots for each role.
 */
const CLAUDE_CHALLENGER_ADDENDUM: Record<ExecutiveRole, string> = {
  CEO: `You are the Strategic Challenger on DEEPCHOX's executive board. Another AI (GPT-4o) will provide the primary strategic recommendation. Your job: be the devil's advocate. What assumptions does the mainstream view miss? What is the one risk nobody wants to name? Where is the strategic logic fragile?

Be brief, precise, and adversarial in a productive way. Return the same JSON schema but surface the contrarian angle in your "reasoning" field.

Output MUST be valid JSON only.`,
  CFO: `You are the Financial Risk Analyst challenging the CFO's base case. Another AI (GPT-4o) provides the primary financial assessment. You stress-test it: What does the downside case look like if key assumptions fail? Where is the burn rate underestimated? What is the one financial lever they haven't thought of?

Return the same JSON schema. Your "numbers_summary" should reflect the stress scenario.

Output MUST be valid JSON only.`,
  CMO: `You are the GTM Challenger on DEEPCHOX's board. Another AI (GPT-4o) provides the primary GTM plan. You interrogate it: Which channel assumption is most likely wrong? What does the ideal customer profile actually look like vs. what the founder assumes? What is the counter-positioning move that flips this market?

Return the same JSON schema with your challenger perspective in "gtm_plan".

Output MUST be valid JSON only.`,
  CTO: `You are the Technical Risk Auditor challenging the CTO's architecture recommendation. Another AI (GPT-4o) provides the primary build plan. You audit it: What is the hidden technical debt? Which dependency creates a single point of failure? What is the simplest thing they should build instead?

Return the same JSON schema. Raise the complexity_score if the plan is under-estimating difficulty.

Output MUST be valid JSON only.`,
  CSO: `You are the Competitive Intelligence Challenger on DEEPCHOX's board. Another AI (GPT-4o) provides the primary competitive map. You challenge it: Which competitor is being underestimated? What market signal is being missed? What is the asymmetric threat — the one that looks small now but isn't?

Return the same JSON schema with your sharper threat assessment.

Output MUST be valid JSON only.`,
};

/**
 * Merge two executive JSON responses into a unified output.
 * GPT provides the primary structured data; Claude's key challenger insight
 * is embedded into the reasoning/narrative fields.
 */
function mergeExecutiveResponses(role: ExecutiveRole, gptParsed: unknown, claudeParsed: unknown): unknown {
  if (!gptParsed || typeof gptParsed !== 'object') return claudeParsed;
  if (!claudeParsed || typeof claudeParsed !== 'object') return gptParsed;

  const gpt = gptParsed as Record<string, unknown>;
  const claude = claudeParsed as Record<string, unknown>;

  switch (role) {
    case 'CEO': {
      const claudeReasoning = String(claude.reasoning ?? '').trim();
      const gptReasoning = String(gpt.reasoning ?? '').trim();
      return {
        ...gpt,
        reasoning: gptReasoning,
        challenger_insight: claudeReasoning || undefined,
        dual_agent: true,
      };
    }
    case 'CFO': {
      const claudeScenarios = Array.isArray(claude.scenario_table) ? claude.scenario_table : [];
      const gptScenarios = Array.isArray(gpt.scenario_table) ? gpt.scenario_table : [];
      // Merge scenario tables: GPT base/upside + Claude stress scenario
      const mergedScenarios = [...gptScenarios];
      for (const s of claudeScenarios) {
        const isDuplicate = mergedScenarios.some(
          (existing: Record<string, unknown>) =>
            String(existing.scenario ?? '').toLowerCase() === String((s as Record<string, unknown>).scenario ?? '').toLowerCase()
        );
        if (!isDuplicate) mergedScenarios.push(s);
      }
      return {
        ...gpt,
        scenario_table: mergedScenarios.slice(0, 5),
        challenger_numbers: String(claude.numbers_summary ?? '').trim() || undefined,
        dual_agent: true,
      };
    }
    case 'CMO': {
      const claudeGtm = String(claude.gtm_plan ?? '').trim();
      const gptGtm = String(gpt.gtm_plan ?? '').trim();
      return {
        ...gpt,
        gtm_plan: gptGtm,
        challenger_gtm: claudeGtm || undefined,
        dual_agent: true,
      };
    }
    case 'CTO': {
      // Use higher complexity score (more conservative = safer for founder)
      const gptScore = Number(gpt.complexity_score ?? 0);
      const claudeScore = Number(claude.complexity_score ?? 0);
      return {
        ...gpt,
        complexity_score: Math.max(gptScore, claudeScore),
        challenger_risk: claude.tech_debt_risk ?? undefined,
        dual_agent: true,
      };
    }
    case 'CSO': {
      const claudeThreat = String(claude.threat_level ?? '').trim();
      const gptThreat = String(gpt.threat_level ?? '').trim();
      // Escalate to higher threat level
      const threatOrder = ['low', 'medium', 'high', 'critical'];
      const gptIdx = threatOrder.indexOf(gptThreat);
      const claudeIdx = threatOrder.indexOf(claudeThreat);
      const finalThreat = threatOrder[Math.max(gptIdx, claudeIdx)] ?? gptThreat;
      return {
        ...gpt,
        threat_level: finalThreat,
        challenger_map: String(claude.competitive_map ?? '').trim() || undefined,
        dual_agent: true,
      };
    }
    default:
      return { ...gpt, dual_agent: true };
  }
}

export async function POST(req: Request) {
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
    if (!hasAiKey()) {
      return NextResponse.json(
        { ok: false, error: 'OPENAI_API_KEY or ANTHROPIC_API_KEY not configured', useMock: true },
        { status: 503 }
      );
    }

    const def = AGENT_DEFINITIONS[role];

    // GPT system: primary execution-focused agent
    const gptSystem = `${def.systemPrompt}

Respond with a single JSON object matching this shape exactly (no markdown, no prose outside JSON):
${def.outputSchema}`;

    // Claude system: challenger agent for same role
    const claudeSystem = `${CLAUDE_CHALLENGER_ADDENDUM[role]}

Respond with a single JSON object matching this shape exactly (no markdown, no prose outside JSON):
${def.outputSchema}`;

    const userContent = `Board directive and venture context:\n\n${context}\n\nReturn JSON only.`;

    const messages = [{ role: 'user', content: userContent }];

    // Launch both agents in TRUE PARALLEL
    const gptPromise = process.env.OPENAI_API_KEY?.trim()
      ? chatWithOpenAI(
          [{ role: 'system', content: gptSystem }, ...messages],
          'llama3',
          { responseJsonObject: true, temperature: 0.35 }
        )
          .then((r) => ({ content: r.message.content, model: r.model, ok: true }))
          .catch((e) => ({ content: '{}', model: 'gpt-4o-mini', ok: false, error: String(e) }))
      : Promise.resolve({ content: '{}', model: 'gpt-4o-mini', ok: false as const, error: 'No OpenAI key' });

    const claudePromise = hasAnthropicKey()
      ? chatWithClaude(
          [{ role: 'system', content: claudeSystem }, ...messages],
          { responseJsonObject: true, temperature: 0.35 }
        )
          .then((r) => ({ content: r.message.content, model: r.model, ok: true }))
          .catch((e) => ({ content: '{}', model: 'claude-haiku', ok: false, error: String(e) }))
      : Promise.resolve({ content: '{}', model: 'claude-haiku', ok: false as const, error: 'No Anthropic key' });

    const startAt = Date.now();
    const [gptResult, claudeResult] = await Promise.all([gptPromise, claudePromise]);
    const durationMs = Date.now() - startAt;

    // Parse both responses
    let gptParsed: unknown = {};
    let claudeParsed: unknown = {};
    try { gptParsed = JSON.parse(stripJsonFence(gptResult.content)); } catch { /* use empty */ }
    try { claudeParsed = JSON.parse(stripJsonFence(claudeResult.content)); } catch { /* use empty */ }

    // Choose primary: GPT if available, else Claude
    const primaryParsed = gptResult.ok ? gptParsed : claudeParsed;

    // Merge both outputs
    const merged = gptResult.ok && claudeResult.ok
      ? mergeExecutiveResponses(role, gptParsed, claudeParsed)
      : primaryParsed;

    const response = normalizeExecutiveBoardResponse(role, merged);
    if (!response) {
      return NextResponse.json({ ok: false, error: 'Could not normalize response', useMock: true }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      response,
      dual_agent: {
        gpt: gptResult.ok ? { model: gptResult.model } : null,
        claude: claudeResult.ok ? { model: claudeResult.model } : null,
        durationMs,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Boardroom agent failed';
    return NextResponse.json({ ok: false, error: msg, useMock: true }, { status: 502 });
  }
}
