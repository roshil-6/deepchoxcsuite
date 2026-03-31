/** Desk model ids. With GROQ_API_KEY on the server, these map to Groq models (see lib/ai/chatProviders.ts); without it, Ollama names are used as-is. */
export const DESK_AI_MODELS = [
  { id: 'llama3', label: 'Llama 3' },
  { id: 'llama3.2', label: 'Llama 3.2' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'phi3', label: 'Phi-3' },
  { id: 'gemma2', label: 'Gemma 2' },
] as const;

export type DeskModelId = (typeof DESK_AI_MODELS)[number]['id'];
