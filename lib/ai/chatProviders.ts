/**
 * Server-side chat routing: OpenAI, Groq, HuggingFace, Ollama.
 * Client payloads stay Ollama-shaped; we normalize responses to `{ message: { role, content } }`.
 *
 * Provider priority (first available key wins):
 *   1. OPENAI_API_KEY  → OpenAI (gpt-4o-mini by default)
 *   2. GROQ_API_KEY    → Groq (llama-3.3-70b-versatile by default)
 *   3. HF_API_TOKEN    → Hugging Face Inference (gemma-2-2b-it by default)
 *   4. OLLAMA_URL      → local Ollama
 *   5. Simulation      → offline fallback
 */

type ChatMessage = { role: string; content: string };

// ─── Shared helpers ──────────────────────────────────────────────────────────

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

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options?: { responseJsonObject?: boolean; temperature?: number }
): Promise<OllamaShapedResponse> {
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

  const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;

  const res = await fetch(url, {
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
    throw new Error(data.error?.message || res.statusText || 'Request failed');
  }

  const content = data.choices?.[0]?.message?.content ?? '';
  return {
    model,
    created_at: new Date().toISOString(),
    message: { role: 'assistant', content },
    done: true,
  };
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

const OPENAI_MODEL_MAP: Record<string, string> = {
  llama3: 'gpt-4o-mini',
  'llama3.2': 'gpt-4o-mini',
  mistral: 'gpt-4o-mini',
  phi3: 'gpt-4o-mini',
  gemma2: 'gpt-4o-mini',
};

export function resolveOpenAIModel(requested?: string): string {
  const fromEnv = process.env.OPENAI_MODEL?.trim();
  const raw = (requested || '').trim();
  if (raw && OPENAI_MODEL_MAP[raw]) return OPENAI_MODEL_MAP[raw]!;
  return fromEnv || 'gpt-4o-mini';
}

export async function chatWithOpenAI(
  messages: ChatMessage[],
  modelId: string | undefined,
  options?: { responseJsonObject?: boolean; temperature?: number }
): Promise<OllamaShapedResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const model = resolveOpenAIModel(modelId);
  return callOpenAICompatible(OPENAI_BASE_URL, apiKey, model, messages, options);
}

// ─── Groq ─────────────────────────────────────────────────────────────────────

const GROQ_URL = 'https://api.groq.com/openai/v1';

const GROQ_MODEL_MAP: Record<string, string> = {
  llama3: 'llama-3.3-70b-versatile',
  'llama3.2': 'llama-3.1-8b-instant',
  mistral: 'llama-3.3-70b-versatile',
  phi3: 'llama-3.1-8b-instant',
  gemma2: process.env.GROQ_GEMMA_MODEL?.trim() || 'llama-3.1-8b-instant',
};

const GROQ_DESK_IDS = new Set(Object.keys(GROQ_MODEL_MAP));

export function resolveGroqModel(requested?: string): string {
  const fromEnv = process.env.GROQ_MODEL?.trim();
  const raw = (requested || '').trim();
  if (raw && GROQ_DESK_IDS.has(raw)) return GROQ_MODEL_MAP[raw]!;
  return fromEnv || GROQ_MODEL_MAP.llama3;
}

export async function chatWithGroq(
  messages: ChatMessage[],
  modelId: string | undefined,
  options?: { responseJsonObject?: boolean; temperature?: number }
): Promise<OllamaShapedResponse> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const model = resolveGroqModel(modelId);
  return callOpenAICompatible(GROQ_URL, apiKey, model, messages, options);
}

// ─── HuggingFace ──────────────────────────────────────────────────────────────

function hfBearerToken(): string | undefined {
  return (
    process.env.HF_API_TOKEN?.trim() ||
    process.env.HUGGINGFACE_API_KEY?.trim() ||
    process.env.HF_TOKEN?.trim()
  );
}

const DEFAULT_HF_CHAT_MODEL = 'google/gemma-2-2b-it';

function buildHfPromptFromMessages(messages: ChatMessage[]): string {
  const normalized = messages.filter((m) => m && typeof m.content === 'string');
  if (normalized.length === 0) return '<start_of_turn>user\n\n<end_of_turn>\n<start_of_turn>model\n';
  const joined = normalized.map((m) => `${m.role}: ${m.content}`).join('\n\n');
  const clipped = joined.length > 12000 ? joined.slice(0, 11999) + '…' : joined;
  return `<start_of_turn>user\n${clipped}\n<end_of_turn>\n<start_of_turn>model\n`;
}

export async function chatWithHuggingFace(
  messages: ChatMessage[],
  modelId: string | undefined
): Promise<OllamaShapedResponse> {
  const token = hfBearerToken();
  if (!token) throw new Error('HF_API_TOKEN is not set');

  const model = process.env.HF_CHAT_MODEL?.trim() || DEFAULT_HF_CHAT_MODEL;
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const inputs = buildHfPromptFromMessages(messages);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs,
      parameters: { max_new_tokens: 1024, temperature: 0.7, top_p: 0.9, return_full_text: false },
    }),
  });

  const data = (await res.json()) as { error?: string }[] | { error?: string } | Record<string, unknown>;

  if (!res.ok) {
    const err = typeof data === 'object' && data && 'error' in data ? String((data as { error?: string }).error || res.statusText) : res.statusText;
    throw new Error(err || 'Hugging Face inference failed');
  }
  if (typeof data === 'object' && !Array.isArray(data) && (data as { error?: string }).error) {
    const e = String((data as { error: string }).error);
    if (e.includes('loading')) throw new Error('Model is loading on Hugging Face — retry in ~30s.');
    throw new Error(e);
  }

  const arr = Array.isArray(data) ? data : null;
  const text = (arr?.[0] as { generated_text?: string } | undefined)?.generated_text?.trim() || '';
  if (!text) throw new Error('Empty response from Hugging Face');

  return { model, created_at: new Date().toISOString(), message: { role: 'assistant', content: text }, done: true };
}

// ─── Ollama ───────────────────────────────────────────────────────────────────

export async function chatWithOllama(messages: ChatMessage[], model: string | undefined): Promise<OllamaShapedResponse> {
  const url = process.env.OLLAMA_URL?.trim() || 'http://127.0.0.1:11434/api/chat';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || 'llama3', messages, stream: false }),
  });
  if (!response.ok) throw new Error(`Ollama API returned ${response.status}`);
  return (await response.json()) as OllamaShapedResponse;
}

// ─── Simulation fallback ──────────────────────────────────────────────────────

export function simulationResponse(messages: ChatMessage[], model: string | undefined): OllamaShapedResponse {
  const last = messages[messages.length - 1];
  const lower = (last?.content || '').toLowerCase();
  let mockResponse = 'I am currently disconnected. Set OPENAI_API_KEY on the server to activate the AI team.';

  if (lower.includes('hello') || lower.includes('hi')) {
    mockResponse = 'Greetings. Dexo Core is online (Simulation Mode). How can I assist?';
  } else if (lower.includes('investor') || lower.includes('pitch')) {
    mockResponse = 'I can assist with that. I recommend focusing on your unit economics and clear value proposition. Shall I draft an outline?';
  }

  return { model: 'simulation-fallback', created_at: new Date().toISOString(), message: { role: 'assistant', content: mockResponse }, done: true };
}

// ─── resolveChat — auto-selects provider by available keys ───────────────────

export async function resolveChat(
  messages: ChatMessage[],
  modelId?: string,
  options?: { responseJsonObject?: boolean; temperature?: number }
): Promise<OllamaShapedResponse & { _provider: string }> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const hfKey = hfBearerToken();

  if (openaiKey) {
    const out = await chatWithOpenAI(messages, modelId, options);
    return { ...out, _provider: `OpenAI · ${out.model}` };
  }
  if (groqKey) {
    const out = await chatWithGroq(messages, modelId, options);
    return { ...out, _provider: `Groq · ${out.model}` };
  }
  if (hfKey) {
    const out = await chatWithHuggingFace(messages, modelId);
    return { ...out, _provider: `HuggingFace · ${out.model}` };
  }
  try {
    const out = await chatWithOllama(messages, modelId);
    return { ...out, _provider: `Ollama · ${out.model}` };
  } catch {
    const out = simulationResponse(messages, modelId);
    return { ...out, _provider: 'Simulation' };
  }
}
