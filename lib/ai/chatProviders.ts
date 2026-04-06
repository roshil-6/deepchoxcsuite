/**
 * Server-side chat routing: Groq (OpenAI-compatible) and Ollama.
 * Client payloads stay Ollama-shaped; we normalize responses to `{ message: { role, content } }`.
 */

type ChatMessage = { role: string; content: string };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Map UI / Ollama-style ids to Groq `model` strings.
 * Keep in sync with https://console.groq.com/docs/deprecations — retired IDs break requests.
 */
const GROQ_MODEL_MAP: Record<string, string> = {
  llama3: 'llama-3.3-70b-versatile',
  'llama3.2': 'llama-3.1-8b-instant',
  /** mixtral-8x7b-32768 retired on Groq; use a current production text model */
  mistral: 'llama-3.3-70b-versatile',
  phi3: 'llama-3.1-8b-instant',
  /** gemma2-9b-it retired Oct 2025 → llama-3.1-8b-instant per Groq */
  gemma2: 'llama-3.1-8b-instant',
};

const GROQ_DESK_IDS = new Set(Object.keys(GROQ_MODEL_MAP));

/**
 * Resolves which Groq model to call.
 * - Desk picker ids (`llama3`, `gemma2`, …) always use the map above (not overridden by `GROQ_MODEL`).
 * - `GROQ_MODEL` is the **default** when no known desk id is sent (e.g. server routes that pass `'llama3'` or omit model).
 */
export function resolveGroqModel(requested?: string): string {
  const fromEnv = process.env.GROQ_MODEL?.trim();
  const raw = (requested || '').trim();

  if (raw && GROQ_DESK_IDS.has(raw)) {
    return GROQ_MODEL_MAP[raw]!;
  }
  return fromEnv || GROQ_MODEL_MAP.llama3;
}

export function toOpenAiMessages(messages: ChatMessage[]): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  return messages
    .filter((m) => m && typeof m.content === 'string' && ['system', 'user', 'assistant'].includes(m.role))
    .map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));
}

export interface OllamaShapedResponse {
  model: string;
  created_at: string;
  message: { role: 'assistant'; content: string };
  done: boolean;
}

export async function chatWithGroq(
  messages: ChatMessage[],
  modelId: string | undefined,
  options?: { responseJsonObject?: boolean; temperature?: number }
): Promise<OllamaShapedResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const model = resolveGroqModel(modelId);
  const temperature = options?.responseJsonObject
    ? (options.temperature ?? 0.35)
    : (options?.temperature ?? 0.7);

  const body: Record<string, unknown> = {
    model,
    messages: toOpenAiMessages(messages),
    temperature,
  };
  if (options?.responseJsonObject) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    choices?: { message?: { role?: string; content?: string } }[];
  };

  if (!res.ok) {
    const errText = data.error?.message || res.statusText || 'Groq request failed';
    throw new Error(errText);
  }

  const content = data.choices?.[0]?.message?.content ?? '';
  return {
    model,
    created_at: new Date().toISOString(),
    message: { role: 'assistant', content },
    done: true,
  };
}

export async function chatWithOllama(messages: ChatMessage[], model: string | undefined): Promise<OllamaShapedResponse> {
  const url = process.env.OLLAMA_URL?.trim() || 'http://127.0.0.1:11434/api/chat';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'llama3',
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API returned ${response.status}`);
  }

  const data = (await response.json()) as OllamaShapedResponse;
  return data;
}

export function simulationResponse(messages: ChatMessage[], model: string | undefined): OllamaShapedResponse {
  const last = messages[messages.length - 1];
  const lastUserMessage = last?.content || '';
  let mockResponse =
    'I am currently disconnected from my neural engine. Set GROQ_API_KEY on the server (e.g. Render) or run Ollama locally.';

  const lower = lastUserMessage.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi')) {
    mockResponse = 'Greetings. Dexo Core is online (Simulation Mode). How can I assist?';
  } else if (lower.includes('investor') || lower.includes('pitch')) {
    mockResponse =
      'I can assist with that. I recommend focusing on your unit economics and clear value proposition. Shall I draft an outline?';
  } else if (model === 'llama3' && messages.some((m) => m.role === 'system' && m.content.includes('Shark'))) {
    mockResponse = JSON.stringify({
      response: 'That answer is vague. I need concrete numbers. What is your CAC vs LTV? (Simulation Mode)',
      rating: 'fail',
    });
  }

  return {
    model: 'simulation-fallback',
    created_at: new Date().toISOString(),
    message: { role: 'assistant', content: mockResponse },
    done: true,
  };
}
