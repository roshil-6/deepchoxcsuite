/**
 * Streaming Chat API with SSE
 * Supports real-time LLM responses for human-like voice interaction
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Types for streaming
interface StreamChunk {
  type: 'ack' | 'content' | 'error' | 'done';
  data?: string;
  metadata?: Record<string, unknown>;
}

// Active co-founder system prompt
const COFOUNDER_SYSTEM_PROMPT = `You are an active, engaged co-founder - not a passive assistant.

CRITICAL RULES:
1. NEVER give passive responses. Every reply MUST include at least ONE of:
   - A strategic question that challenges thinking
   - A specific next action to take
   - A risk warning or consideration
   - A counter-argument or alternative perspective

2. Be concise but impactful. Use short punchy sentences interspersed with strategic pauses.

3. Speak like a human co-founder in a heated but productive strategy session:
   - "Wait, have we thought about..."
   - "That's interesting, but here's the risk..."
   - "Okay, but what's the actual metric that proves this?"
   - "I see the vision - but how do we defend against..."

4. Always push forward. Never just summarize. Always advance the conversation.

5. Use natural speech patterns with occasional verbal fillers for realism:
   - "Hmm..."
   - "You know what..."
   - "Actually..."
   - "Here's the thing..."

6. When uncertain, express authentic uncertainty: "I'm not sure about that angle - let's pressure-test it."

7. Reference previous context naturally: "This connects to what you said earlier about..."

TONE: Direct, strategic, slightly impatient but supportive. Like a co-founder who respects you but will push back.`;

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
