/**
 * Streaming Chat API with SSE
 * Supports real-time LLM responses for human-like voice interaction
 */

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
/** 60 s is enough for streaming; edge runtime only allows 30 s which cuts off long replies. */
export const maxDuration = 60;

// Types for streaming
interface StreamChunk {
  type: 'ack' | 'content' | 'error' | 'done';
  data?: string;
  metadata?: Record<string, unknown>;
}

// Active co-founder system prompt
const COFOUNDER_SYSTEM_PROMPT = `You are a co-founder advisor — direct, practical, and focused on what moves the venture forward.

RULES:
- Base every response on what the founder has told you. Do not invent market conditions, competitor details, or context not provided.
- If a critical piece of information is missing (target market, stage, product type), ask for it clearly. One question at a time.
- Every reply should either ask a question that clarifies the direction, name a specific next action, or flag something specific worth considering.
- Do not use CRITICAL, URGENT, or severity labels. Write plain sentences.
- Be direct. Short sentences. No consultant language.
- If you do not know something, say so clearly rather than filling in with assumptions.

TONE: Clear, direct, practical. Like a co-founder who asks the obvious question when no one else will.`;

// Acknowledgment phrases for instant response
const ACKNOWLEDGMENTS = [
  "Hmm, interesting...",
  "Okay, let me think...",
  "Got it, one second...",
  "I see where you're going...",
  "Wait, that's a key point...",
  "Let me process that...",
  "Okay, here's my take...",
  "You know what, that's worth exploring...",
];

function encodeSSE(chunk: StreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

async function* streamOpenAI(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gpt-4o-mini'
): AsyncGenerator<StreamChunk> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    yield { type: 'error', data: 'OpenAI API key not configured' };
    return;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: COFOUNDER_SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
      temperature: 0.85,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    yield { type: 'error', data: `OpenAI error: ${error}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', data: 'No response body' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: 'content', data: content };
            }
          } catch {
            // Ignore parse errors for malformed chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done' };
}

async function* streamGroq(
  messages: Array<{ role: string; content: string }>,
  model: string = 'llama-3.1-8b-instant'
): AsyncGenerator<StreamChunk> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    yield { type: 'error', data: 'Groq API key not configured' };
    return;
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: COFOUNDER_SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
      temperature: 0.85,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    yield { type: 'error', data: `Groq error: ${error}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', data: 'No response body' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: 'content', data: content };
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, provider = 'groq', model, projectContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Venture context only on the latest user turn (avoid prefixing every history line)
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    const contextualMessages = messages.map((m: { role: string; content: string }, i: number) => {
      if (m.role === 'user' && projectContext && i === lastUserIndex) {
        return {
          role: 'user',
          content: `[Context: Working on ${projectContext.ventureName}${projectContext.phase ? `, currently in "${projectContext.phase}" phase` : ''}]

${m.content}`,
        };
      }
      return m;
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send instant acknowledgment
          const ack = ACKNOWLEDGMENTS[Math.floor(Math.random() * ACKNOWLEDGMENTS.length)];
          controller.enqueue(encoder.encode(encodeSSE({ type: 'ack', data: ack })));

          // Small delay for natural feel
          await new Promise(r => setTimeout(r, 400));

          // Stream main content
          const generator = provider === 'openai'
            ? streamOpenAI(contextualMessages, model)
            : streamGroq(contextualMessages, model);

          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(encodeSSE(chunk)));
          }

          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'stream_error';
          console.error('[chat-stream] stream error:', err);
          try {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'error', data: msg })));
            controller.close();
          } catch {
            controller.error(err);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Streaming chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
