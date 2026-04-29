import { chatWithAI, chatWithClaude, hasAiKey } from '@/lib/ai/chatProviders';
import { JARVIS_SYSTEM, mergeReports, normalizeReport } from '@/app/api/jarvis/route';
import { formatWebSourcesForPrompt, type DexoWebSource } from '@/lib/dexoWebResearch';
import type { JarvisReport } from '@/app/api/jarvis/route';

function stripJsonFence(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('```')) t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return t;
}

function reportToBodyMd(report: JarvisReport): string {
  const parts = [
    report.summary.trim(),
    '',
    ...report.sections.map(
      (s) => `### ${s.title}\n${s.insight}\n**Move:** ${s.action}`
    ),
  ];
  if (report.risks.length) {
    parts.push('', '### Risks', ...report.risks.map((r) => `- **${r.label}** (${r.level}): ${r.detail}`));
  }
  return parts.join('\n').trim();
}

/**
 * One dual-agent pass: venture snapshot + optional web sources → full Jarvis-shaped report for daily briefs.
 */
export async function runDexoDailyBriefAi(opts: {
  ventureContext: string;
  webSources: DexoWebSource[];
  researchQuery: string;
  sparseContext: boolean;
}): Promise<{ report: JarvisReport; bodyMd: string }> {
  if (!hasAiKey()) {
    throw new Error('No AI key configured');
  }

  const webBlock = formatWebSourcesForPrompt(opts.webSources);
  const sparseBlock = opts.sparseContext
    ? `

[SPARSE_CONTEXT_MODE]
The venture record is still thin. Frame this as an onboarding brief: help the founder clarify direction. Do not invent metrics.`
    : '';

  const userPrompt = `Produce today's Dexo daily research brief for this venture.

RESEARCH_QUERY_USED: ${opts.researchQuery}

${webBlock}

VENTURE_SNAPSHOT:
${opts.ventureContext.slice(0, 14_000)}

[DAILY_BRIEF_RULES]
- Ground external claims in WEB_SOURCES when present; cite [n] matching the list.
- If WEB_SOURCES is empty, state that today's pass has no live web hits and avoid fake headlines.
- This brief will appear in the founder's "Daily brief" tab with sources and date.
- proposedUpdates: only valuable additive suggestions for today. The founder must tap "Apply to venture" to commit them — use null when unsure.
- voiceResponse: 2-4 sentences, warm morning check-in; invite their take on one followUp question.
- followUp: 2-3 short questions for the founder.

Return the full standard Jarvis JSON object (same schema as analyze mode). JSON only.${sparseBlock}`;

  const messages = [
    { role: 'system' as const, content: JARVIS_SYSTEM },
    { role: 'user' as const, content: userPrompt },
  ];

  const aiOpts = { responseJsonObject: true, temperature: 0.35 };

  // "gpt" slot: OpenAI → Groq fallback (chatWithAI handles both)
  // "claude" slot: Anthropic only (skipped when key absent)
  const hasGptOrGroq = Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim());
  const [gptRaw, claudeRaw] = await Promise.all([
    hasGptOrGroq
      ? chatWithAI(messages, 'llama3', aiOpts)
          .then((r) => ({ content: r.message.content, ok: true }))
          .catch(() => ({ content: '{}', ok: false }))
      : Promise.resolve({ content: '{}', ok: false }),
    process.env.ANTHROPIC_API_KEY?.trim()
      ? chatWithClaude(messages, aiOpts)
          .then((r) => ({ content: r.message.content, ok: true }))
          .catch(() => ({ content: '{}', ok: false }))
      : Promise.resolve({ content: '{}', ok: false }),
  ]);

  let gptParsed: Record<string, unknown> = {};
  let claudeParsed: Record<string, unknown> = {};
  if (gptRaw.ok) {
    try {
      gptParsed = JSON.parse(stripJsonFence(gptRaw.content));
    } catch {
      /* ignore */
    }
  }
  if (claudeRaw.ok) {
    try {
      claudeParsed = JSON.parse(stripJsonFence(claudeRaw.content));
    } catch {
      /* ignore */
    }
  }

  const agentsUsed = {
    gpt: gptRaw.ok && !!gptParsed.headline,
    claude: claudeRaw.ok && !!claudeParsed.headline,
  };

  if (!agentsUsed.gpt && !agentsUsed.claude) {
    throw new Error('Daily brief: models returned no valid JSON');
  }

  const merged =
    agentsUsed.gpt && agentsUsed.claude
      ? mergeReports(gptParsed, claudeParsed)
      : agentsUsed.gpt
        ? gptParsed
        : claudeParsed;

  const report = normalizeReport(merged, agentsUsed);
  const bodyMd = reportToBodyMd(report);
  return { report, bodyMd };
}
