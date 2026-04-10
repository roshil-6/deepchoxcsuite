'use client';

/** Normalise raw model strings from the API into a clean display label. */
function normaliseModel(raw: string): string | null {
    const s = raw.trim().toLowerCase();
    if (!s || s.includes('simulation') || s.includes('offline') || s.includes('ollama')) return null;
    if (s.includes('openai') || s.includes('gpt')) return 'OpenAI · GPT';
    // Groq / HuggingFace / any other internal provider — just brand it
    return 'DEEPCHOX AI';
}

/** Small label under assistant responses. */
export function ModelAttribution({ model }: { model?: string | null }) {
    if (!model) return null;
    const label = normaliseModel(model);
    if (!label) return null;
    return (
        <p className="mt-1.5 text-[10px] text-white/25">
            {label}
        </p>
    );
}
