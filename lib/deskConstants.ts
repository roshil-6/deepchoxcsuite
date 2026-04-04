/** Desk model ids. With GROQ_API_KEY on the server, these map to Groq models (see lib/ai/chatProviders.ts); without it, Ollama names are used as-is. */
export const DESK_AI_MODELS = [
  { id: 'llama3', label: 'Llama 3' },
  { id: 'llama3.2', label: 'Llama 3.2' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'phi3', label: 'Phi-3' },
  { id: 'gemma2', label: 'Gemma 2' },
] as const;

export type DeskModelId = (typeof DESK_AI_MODELS)[number]['id'];

/** Executive / office bar — same ids as desk; labels describe Groq routing when API key is set. */
export const EXEC_CHAT_MODEL_OPTIONS = [
  {
    id: 'llama3' as const,
    label: 'Llama 3.3 70B',
    blurb: 'Best default — reasoning & long context',
  },
  {
    id: 'llama3.2' as const,
    label: 'Llama 3.1 8B',
    blurb: 'Faster, lighter',
  },
  { id: 'mistral' as const, label: 'Mixtral 8×7B', blurb: 'Strong generalist' },
  { id: 'gemma2' as const, label: 'Gemma 2 9B', blurb: 'Google instruction-tuned' },
  { id: 'phi3' as const, label: 'Phi-3 class', blurb: 'Compact / low latency' },
] as const;

export type ExecChatModelId = (typeof EXEC_CHAT_MODEL_OPTIONS)[number]['id'];

export const EXEC_CHAT_MODEL_STORAGE_KEY = 'deepchox-exec-chat-model';

export function isExecChatModelId(id: string): id is ExecChatModelId {
  return EXEC_CHAT_MODEL_OPTIONS.some((o) => o.id === id);
}
