import { chatWithOpenAI, chatWithClaude, hasAiKey } from '@/lib/ai/chatProviders';
import { JARVIS_SYSTEM, mergeReports, normalizeReport } from '@/app/api/jarvis/route';
import { formatWebSourcesForPrompt, type DexoWebSource } from '@/lib/dexoWebResearch';
import type { JarvisReport } from '@/app/api/jarvis/route';
// Priority instruction is already embedded inside ventureContext via buildDexoJarvisVentureContext

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

  const userPrompt = `Produce today's Dexo daily research breakdown for this venture.

RESEARCH_QUERY_USED: ${opts.researchQuery}

${webBlock}

VENTURE_SNAPSHOT:
${opts.ventureContext.slice(0, 14_000)}

[DAILY_RESEARCH_RULES]
- Each section insight: write 2-3 SHORT, standalone sentences. No long paragraphs. Each sentence should be a self-contained point the founder can act on.
- Ground external claims in WEB_SOURCES when present; cite [n] inline.
- If WEB_SOURCES is empty, note no live web hits and stick to venture data.
- section action (the "Move"): one crisp verb-first sentence. Time-bound if possible.
- summary: 1-2 sentences spoken as Dexo — direct, first-person, warm. E.g. "Here's what I found today on [topic]."
- headline: sharp and specific — name the actual insight, not a generic title.
- proposedUpdates: only high-value additive suggestions. Null when unsure.
- voiceResponse: 2-3 sentences, casual check-in, invite reaction to one followUp question.
- followUp: 2-3 short direct questions for the founder.
- risks: 2-3 items max, each named concisely with a clear level (low/medium/high).

Return the full standard Jarvis JSON object (same schema as analyze mode). JSON only.${sparseBlock}`;

  const messages = [
    { role: 'system' as const, content: JARVIS_SYSTEM },
    { role: 'user' as const, content: userPrompt },
  ];

  const aiOpts = { responseJsonObject: true, temperature: 0.35 };

  const [gptRaw, claudeRaw] = await Promise.all([
    process.env.OPENAI_API_KEY?.trim()
      ? chatWithOpenAI(messages, 'llama3', aiOpts)
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
