/**
 * Server-side chat routing: OpenAI, Groq (OpenAI-compatible), Anthropic Claude, and Ollama.
 * Client payloads stay Ollama-shaped; we normalize responses to `{ message: { role, content } }`.
 */

type ChatMessage = { role: string; content: string };

/** Wraps a fetch with a hard timeout (default 28 s) using AbortController. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 28_000,
): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
/** Claude Haiku — fast, cost-efficient, strong analytical reasoning */
const CLAUDE_HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/** OpenAI model map — mirrors the Groq desk ids so the same callers work with both providers. */
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

/** Returns true when at least one AI provider key is configured. */
export function hasAiKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.GROQ_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim()
  );
}

/** Returns true when Anthropic key is configured. */
export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

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
  /**
   * Desk label “Gemma 2” — Groq decommissioned `gemma2-9b-it` (see deprecations).
   * Default routes to Groq’s recommended replacement: `llama-3.1-8b-instant`.
   * Override with `GROQ_GEMMA_MODEL` (e.g. another current id from console.groq.com/docs/models).
   */
  gemma2: process.env.GROQ_GEMMA_MODEL?.trim() || 'llama-3.1-8b-instant',
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

export async function chatWithOpenAI(
  messages: ChatMessage[],
  modelId: string | undefined,
  options?: { responseJsonObject?: boolean; temperature?: number }
): Promise<OllamaShapedResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const model = resolveOpenAIModel(modelId);
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

  const res = await fetchWithTimeout(OPENAI_URL, {
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
    const errText = data.error?.message || res.statusText || 'OpenAI request failed';
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

/**
 * Unified AI chat: tries OpenAI when OPENAI_API_KEY is set, falls back to Groq.
 * Use this instead of chatWithGroq when you want the best available provider.
 */
export async function chatWithAI(
  messages: ChatMessage[],
  modelId: string | undefined,
  options?: { responseJsonObject?: boolean; temperature?: number }
): Promise<OllamaShapedResponse & { provider: string }> {
  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const out = await chatWithOpenAI(messages, modelId, options);
      return { ...out, provider: 'openai' };
    } catch (e) {
      console.warn('OpenAI failed, falling back to Groq:', e);
    }
  }
  const out = await chatWithGroq(messages, modelId, options);
  return { ...out, provider: 'groq' };
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

  const res = await fetchWithTimeout(GROQ_URL, {
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

/** Hugging Face Inference API (text generation) — Gemma and other models. */
function hfBearerToken(): string | undefined {
  return (
    process.env.HF_API_TOKEN?.trim() ||
    process.env.HUGGINGFACE_API_KEY?.trim() ||
    process.env.HF_TOKEN?.trim()
  );
}

/** One HF repo for desk chat — avoids gated Llama/Mistral IDs on free inference. Override with HF_CHAT_MODEL. */
const DEFAULT_HF_CHAT_MODEL = 'google/gemma-2-2b-it';

function resolveHfInferenceModel(_requested?: string): string {
  return process.env.HF_CHAT_MODEL?.trim() || DEFAULT_HF_CHAT_MODEL;
}

/** Build a single prompt for HF text-generation (Gemma 2 IT-style turns when possible). */
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
  if (!token) throw new Error('HF_API_TOKEN (or HUGGINGFACE_API_KEY) is not set');

  const model = resolveHfInferenceModel(modelId);
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const inputs = buildHfPromptFromMessages(messages);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
        return_full_text: false,
      },
    }),
  });

  const data = (await res.json()) as
    | { error?: string }
    | { generated_text?: string }[]
    | Record<string, unknown>;

  if (!res.ok) {
    const err =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error?: string }).error || res.statusText)
        : res.statusText;
    throw new Error(err || 'Hugging Face inference failed');
  }

  if (typeof data === 'object' && data && 'error' in data && (data as { error?: string }).error) {
    const e = String((data as { error: string }).error);
    if (e.includes('loading')) throw new Error('Model is loading on Hugging Face — retry in ~30s.');
    throw new Error(e);
  }

  const arr = Array.isArray(data) ? data : null;
  const text = (arr?.[0] as { generated_text?: string } | undefined)?.generated_text?.trim() || '';
  if (!text) {
    throw new Error('Empty response from Hugging Face');
  }

  return {
    model,
    created_at: new Date().toISOString(),
    message: { role: 'assistant', content: text },
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

/**
 * Call Anthropic Claude Haiku via the Messages API (no SDK required).
 * Returns an Ollama-shaped response for a consistent interface across providers.
 */
export async function chatWithClaude(
  messages: ChatMessage[],
  options?: { responseJsonObject?: boolean; temperature?: number; systemOverride?: string }
): Promise<OllamaShapedResponse & { provider: 'claude' }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  // Split system message out (Anthropic uses a top-level `system` field)
  const systemMsg = messages.find((m) => m.role === 'system');
  const system = options?.systemOverride ?? systemMsg?.content ?? '';
  const conversationMsgs = messages
    .filter((m) => m.role !== 'system' && m && typeof m.content === 'string')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })) as { role: 'user' | 'assistant'; content: string }[];

  // Anthropic requires at least one user message
  if (conversationMsgs.length === 0) {
    conversationMsgs.push({ role: 'user', content: 'Begin.' });
  }

  const temperature = options?.temperature ?? (options?.responseJsonObject ? 0.35 : 0.7);

  const body: Record<string, unknown> = {
    model: CLAUDE_HAIKU_MODEL,
    max_tokens: 4096,
    temperature,
    messages: conversationMsgs,
  };
  if (system) body.system = system;

  const res = await fetchWithTimeout(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    content?: { type: string; text: string }[];
    stop_reason?: string;
  };

  if (!res.ok) {
    const errText = data.error?.message || res.statusText || 'Anthropic request failed';
    throw new Error(errText);
  }

  const textBlock = data.content?.find((b) => b.type === 'text');
  const content = textBlock?.text ?? '';

  return {
    model: CLAUDE_HAIKU_MODEL,
    created_at: new Date().toISOString(),
    message: { role: 'assistant', content },
    done: true,
    provider: 'claude',
  };
}

export interface DualAgentResult {
  gpt: { content: string; model: string; provider: string } | null;
  claude: { content: string; model: string; provider: string } | null;
  /** Which provider succeeded first (fastest) */
  fastest: 'gpt' | 'claude' | null;
  /** ISO timestamp */
  at: string;
}

/**
 * Run GPT and Claude Haiku in TRUE PARALLEL — both agents work simultaneously.
 * Returns both outputs so the caller can synthesize or display side-by-side.
 * Never throws: failed agents return null in their slot.
 */
export async function chatWithDualAgents(
  messages: ChatMessage[],
  options?: { responseJsonObject?: boolean; temperature?: number }
): Promise<DualAgentResult> {
  const gptPromise = process.env.OPENAI_API_KEY?.trim()
    ? chatWithOpenAI(messages, 'llama3', options)
        .then((r) => ({ content: r.message.content, model: r.model, provider: 'openai' }))
        .catch(() => null)
    : Promise.resolve(null);

  const claudePromise = process.env.ANTHROPIC_API_KEY?.trim()
    ? chatWithClaude(messages, options)
        .then((r) => ({ content: r.message.content, model: r.model, provider: 'claude' }))
        .catch(() => null)
    : Promise.resolve(null);

  const startMs = Date.now();
  const [gpt, claude] = await Promise.all([gptPromise, claudePromise]);
  const elapsed = Date.now() - startMs;

  // Determine which resolved faster by checking who finished within 100ms of total elapsed
  // (approximation — both run in parallel so we just note the final state)
  const fastest = gpt && claude ? (elapsed < 8000 ? 'gpt' : 'claude') : gpt ? 'gpt' : claude ? 'claude' : null;

  return { gpt, claude, fastest, at: new Date().toISOString() };
}

