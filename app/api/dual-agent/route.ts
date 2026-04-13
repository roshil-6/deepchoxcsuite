/**
 * /api/dual-agent — Run GPT-4o-mini and Claude Haiku in TRUE PARALLEL.
 *
 * Both agents receive the same messages simultaneously. Neither waits for the other.
 * The response includes both agents' raw outputs + a "synthesis" that blends them.
 *
 * Used by: boardroom (multi-role plans), agent-sync (richer desk outputs), and
 * any desk that wants dual-perspective intelligence.
 */

import { NextResponse } from 'next/server';
import {
  chatWithOpenAI,
  chatWithClaude,
  hasAiKey,
  hasAnthropicKey,
  toOpenAiMessages,
} from '@/lib/ai/chatProviders';

type ChatMessage = { role: string; content: string };

type Body = {
  messages: ChatMessage[];
  /** Optional separate system prompt for GPT (overrides system in messages) */
  systemGPT?: string;
  /** Optional separate system prompt for Claude (overrides system in messages) */
  systemClaude?: string;
  /** Caller label — e.g. "CEO", "CFO" — used only for tracing */
  role?: string;
  responseJsonObject?: boolean;
  temperature?: number;
};

function buildMessagesWithSystem(messages: ChatMessage[], systemOverride?: string): ChatMessage[] {
  if (!systemOverride) return messages;
  return [
    { role: 'system', content: systemOverride },
    ...messages.filter((m) => m.role !== 'system'),
  ];
}

/**
 * Synthesize two AI responses into a single cohesive output.
 * We do a lightweight client-side merge instead of a third model call to keep latency low.
 */
function synthesizeResponses(
  role: string | undefined,
  gptContent: string,
  claudeContent: string
): string {
  // For JSON outputs: try to merge fields from both
  const trimGpt = gptContent.trim();
  const trimClaude = claudeContent.trim();

  // If both look like JSON, merge them
  if (
    (trimGpt.startsWith('{') || trimGpt.startsWith('[')) &&
    (trimClaude.startsWith('{') || trimClaude.startsWith('['))
  ) {
    try {
      const gptParsed = JSON.parse(trimGpt);
      const claudeParsed = JSON.parse(trimClaude);
      // Merge: Claude's keys override GPT's where both exist (Claude is analytical challenger)
      const merged = { ...gptParsed, ...claudeParsed, _dual_gpt: gptParsed, _dual_claude: claudeParsed };
      return JSON.stringify(merged);
    } catch {
      // Fall through to text merge
    }
  }

  // Text synthesis: structure it so both voices are preserved
  return `[GPT-4o Perspective]\n${gptContent}\n\n[Claude Haiku Perspective]\n${claudeContent}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { messages, systemGPT, systemClaude, role, responseJsonObject, temperature } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    if (!hasAiKey()) {
      return NextResponse.json({ error: 'No AI key configured' }, { status: 503 });
    }

    const opts = { responseJsonObject: responseJsonObject ?? false, temperature: temperature ?? 0.4 };

    const gptMessages = buildMessagesWithSystem(messages, systemGPT);
    const claudeMessages = buildMessagesWithSystem(messages, systemClaude);

    // Fire both agents simultaneously — true parallel execution
    const gptPromise = process.env.OPENAI_API_KEY?.trim()
      ? chatWithOpenAI(gptMessages, 'llama3', opts)
          .then((r) => ({ content: r.message.content, model: r.model, provider: 'openai', ok: true }))
          .catch((e) => ({ content: '', model: 'gpt-4o-mini', provider: 'openai', ok: false, error: String(e) }))
      : Promise.resolve({ content: '', model: '', provider: 'openai', ok: false, error: 'No OpenAI key' });

    const claudePromise = hasAnthropicKey()
      ? chatWithClaude(claudeMessages, { ...opts, systemOverride: systemClaude })
          .then((r) => ({ content: r.message.content, model: r.model, provider: 'claude', ok: true }))
          .catch((e) => ({ content: '', model: CLAUDE_HAIKU_MODEL, provider: 'claude', ok: false, error: String(e) }))
      : Promise.resolve({ content: '', model: '', provider: 'claude', ok: false, error: 'No Anthropic key' });

    const startAt = Date.now();
    const [gpt, claude] = await Promise.all([gptPromise, claudePromise]);
    const durationMs = Date.now() - startAt;

    // Build synthesis only when both succeeded
    const synthesis =
      gpt.ok && claude.ok
        ? synthesizeResponses(role, gpt.content, claude.content)
        : gpt.ok
          ? gpt.content
          : claude.content;

    return NextResponse.json({
      ok: true,
      role: role ?? null,
      gpt: gpt.ok ? { content: gpt.content, model: gpt.model } : null,
      claude: claude.ok ? { content: claude.content, model: claude.model } : null,
      synthesis,
      durationMs,
      at: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'dual-agent error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Keep the model constant available in module scope for the error handler
const CLAUDE_HAIKU_MODEL = 'claude-haiku-4-5-20251001';
