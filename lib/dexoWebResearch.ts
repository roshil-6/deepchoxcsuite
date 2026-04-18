export type DexoWebSource = {
  title: string;
  url: string;
  snippet?: string;
};

/**
 * Live web search for Dexo daily briefs. Set TAVILY_API_KEY (https://tavily.com) for results.
 * Without a key, returns [] and the model is instructed not to fake fresh headlines.
 */
export async function dexoWebSearch(query: string): Promise<DexoWebSource[]> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key || !query.trim()) return [];

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query: query.slice(0, 400),
        search_depth: 'basic',
        max_results: 8,
        include_answer: false,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
    const rows = Array.isArray(data.results) ? data.results : [];
    const out: DexoWebSource[] = [];
    for (const r of rows) {
      const title = typeof r.title === 'string' ? r.title.trim() : '';
      const url = typeof r.url === 'string' ? r.url.trim() : '';
      if (!title || !url) continue;
      const snippet = typeof r.content === 'string' ? r.content.trim().slice(0, 500) : undefined;
      out.push({ title, url, snippet });
    }
    return out.slice(0, 8);
  } catch {
    return [];
  }
}

export function formatWebSourcesForPrompt(sources: DexoWebSource[]): string {
  if (sources.length === 0) {
    return 'WEB_SOURCES: (none — no search API key or no results. Do not invent breaking news.)';
  }
  const lines = sources.map((s, i) => {
    const sn = s.snippet ? ` — ${s.snippet}` : '';
    return `[${i + 1}] ${s.title} (${s.url})${sn}`;
  });
  return `WEB_SOURCES (cite as [1], [2], … only when using these):\n${lines.join('\n')}`;
}
