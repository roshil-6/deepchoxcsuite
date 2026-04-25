/**
 * Tavily Research Backbone — venture-aware live web intelligence.
 *
 * This module is the single source of truth for ALL Tavily calls across the app.
 * It powers: Staff Sync · Jarvis Analyze · Focus Briefing �� Converse (smart lookups)
 *
 * Every major research flow gets fresh, venture-specific web intel automatically.
 * If TAVILY_API_KEY is missing, all functions return empty arrays so downstream AI
 * still runs — it just uses a "no live sources" notice instead.
 */

export type TavilySource = {
  title: string;
  url: string;
  snippet?: string;
  /** Relevance score 0–1 returned by Tavily */
  score?: number;
};

// ─── Core search ─────────────────────────────────────────────────────────────

async function tavilySearch(
  query: string,
  maxResults = 5,
  searchDepth: 'basic' | 'advanced' = 'basic',
): Promise<TavilySource[]> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key || !query.trim()) return [];

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query: query.slice(0, 400),
        search_depth: searchDepth,
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string; score?: number }[];
    };
    const rows = Array.isArray(data.results) ? data.results : [];
    return rows
      .filter((r) => r.title?.trim() && r.url?.trim())
      .map((r) => ({
        title: r.title!.trim(),
        url: r.url!.trim(),
        snippet: typeof r.content === 'string' ? r.content.trim().slice(0, 500) : undefined,
        score: r.score,
      }))
      .slice(0, maxResults);
  } catch {
    return [];
  }
}

// ─── Query builders ───────────────────────────────────────────────────────��───

/** Pull venture name from a context string (e.g. "Venture: FooBar\n...") */
export function extractVentureNameFromContext(context: string): string {
  const m = context.match(/^\s*Venture:\s*(.+)$/im);
  return m?.[1]?.trim().slice(0, 80) || '';
}

/** Pull a rough industry/domain keyword from context for better targeting */
function extractDomainHint(context: string): string {
  const domains = [
    'fintech', 'healthtech', 'medtech', 'edtech', 'proptech', 'legaltech', 'insurtech',
    'saas', 'b2b saas', 'b2c', 'e-commerce', 'ecommerce', 'marketplace', 'platform',
    'ai', 'machine learning', 'blockchain', 'crypto', 'web3', 'defi',
    'logistics', 'supply chain', 'retail', 'food tech', 'agritech', 'cleantech',
    'travel', 'hospitality', 'hr tech', 'devtools', 'cybersecurity', 'iot',
  ];
  const lower = context.toLowerCase();
  return domains.find((d) => lower.includes(d)) ?? '';
}

// ─── Research profiles ────────────────────────────────────────────────────────

/**
 * STAFF SYNC RESEARCH — the biggest research call.
 *
 * Fires 3 parallel Tavily queries, each targeting a different lens:
 *   1. Company/venture news — What is happening with this specific venture or space?
 *   2. Market & competitors  — Who are they competing with? What's the landscape?
 *   3. Industry trends & funding — What is the broader sector doing?
 *
 * Results give BOTH AI agents (GPT Execution + Claude Strategic) grounded,
 * current market signals to reason from — not just the venture's stored data.
 */
export async function researchForStaffSync(opts: {
  ventureName: string;
  strategicIntent?: string;
  industry?: string;
}): Promise<{
  companyNews: TavilySource[];
  marketLandscape: TavilySource[];
  industryTrends: TavilySource[];
  totalSources: number;
}> {
  const name = opts.ventureName.trim();
  const domain = opts.industry || '';
  const year = new Date().getFullYear();

  // Compose targeted queries
  const q1 = opts.strategicIntent
    ? `${name} ${opts.strategicIntent.slice(0, 120)} news ${year}`
    : `${name} startup news latest updates ${year}`;

  const q2 = domain
    ? `${domain} market competitors landscape analysis ${year}`
    : `${name} market competitors industry ${year}`;

  const q3 = domain
    ? `${domain} startup funding trends investors ${year}`
    : `startup funding trends market growth ${year}`;

  const [companyNews, marketLandscape, industryTrends] = await Promise.all([
    tavilySearch(q1, 5),
    tavilySearch(q2, 5),
    tavilySearch(q3, 5),
  ]);

  return {
    companyNews,
    marketLandscape,
    industryTrends,
    totalSources: companyNews.length + marketLandscape.length + industryTrends.length,
  };
}

/**
 * JARVIS ANALYSIS RESEARCH — venture intelligence for the full analyze pass.
 *
 * Fires 2 parallel queries:
 *   1. Venture-specific market news + opportunity signals
 *   2. Competitive landscape — who else is in this space?
 *
 * Injected into the JARVIS_SYSTEM user prompt so both GPT and Claude
 * have live competitive/market context when scoring health and writing sections.
 */
export async function researchForJarvisAnalysis(opts: {
  ventureName: string;
  strategicIntent?: string;
  industry?: string;
}): Promise<{
  marketSignals: TavilySource[];
  competitorIntel: TavilySource[];
  totalSources: number;
}> {
  const name = opts.ventureName.trim();
  const domain = opts.industry || '';
  const year = new Date().getFullYear();

  const q1 = opts.strategicIntent
    ? `${name} ${opts.strategicIntent.slice(0, 150)} market opportunity ${year}`
    : `${name} market news product updates ${year}`;

  const q2 = domain
    ? `${domain} competitive landscape top companies startups ${year}`
    : `${name} competitors alternatives comparison ${year}`;

  const [marketSignals, competitorIntel] = await Promise.all([
    tavilySearch(q1, 6),
    tavilySearch(q2, 5),
  ]);

  return {
    marketSignals,
    competitorIntel,
    totalSources: marketSignals.length + competitorIntel.length,
  };
}

/**
 * QUICK INTEL — lightweight single-query research for Focus Briefing
 * and smart converse lookups when the founder asks market/news questions.
 */
export async function researchQuickIntel(
  ventureName: string,
  contextHint?: string,
): Promise<TavilySource[]> {
  const name = ventureName.trim();
  if (!name) return [];
  const year = new Date().getFullYear();
  const hint = contextHint ? contextHint.slice(0, 120) : '';
  const query = hint
    ? `${name} ${hint} ${year}`
    : `${name} news market update ${year}`;
  return tavilySearch(query, 5);
}

// ─── Prompt formatters ────────────────────────────────────────────────────────

function formatSourceBlock(sources: TavilySource[], indexOffset = 0): string {
  return sources
    .map((s, i) => {
      const idx = indexOffset + i + 1;
      const sn = s.snippet ? ` — ${s.snippet}` : '';
      return `[${idx}] ${s.title} (${s.url})${sn}`;
    })
    .join('\n');
}

/**
 * Format Staff Sync web intel into a structured block for AI prompts.
 * Cite as [N] in AI output; grounds market/competitor claims in real sources.
 */
export function formatSyncWebIntel(data: {
  companyNews: TavilySource[];
  marketLandscape: TavilySource[];
  industryTrends: TavilySource[];
}): string {
  const { companyNews, marketLandscape, industryTrends } = data;
  const total = companyNews.length + marketLandscape.length + industryTrends.length;

  if (total === 0) {
    return 'LIVE_WEB_INTEL: (no results — Tavily key missing or no matches. Do not invent news, competitor claims, or funding data.)';
  }

  const lines: string[] = [
    `LIVE_WEB_INTEL — ${total} live web sources (cite as [N] when using; ground all external claims in these only):`,
  ];

  if (companyNews.length > 0) {
    lines.push('\n[Venture & company signals]');
    lines.push(formatSourceBlock(companyNews, 0));
  }

  if (marketLandscape.length > 0) {
    lines.push('\n[Market & competitive landscape]');
    lines.push(formatSourceBlock(marketLandscape, companyNews.length));
  }

  if (industryTrends.length > 0) {
    const offset = companyNews.length + marketLandscape.length;
    lines.push('\n[Industry & funding trends]');
    lines.push(formatSourceBlock(industryTrends, offset));
  }

  return lines.join('\n');
}

/**
 * Format Jarvis analysis web intel for the analyze-mode user prompt.
 */
export function formatJarvisWebIntel(data: {
  marketSignals: TavilySource[];
  competitorIntel: TavilySource[];
}): string {
  const { marketSignals, competitorIntel } = data;
  const total = marketSignals.length + competitorIntel.length;

  if (total === 0) {
    return 'LIVE_WEB_INTEL: (none — no Tavily key or no results. Do not fabricate market data or competitor comparisons.)';
  }

  const lines: string[] = [
    `LIVE_WEB_INTEL — ${total} live sources (cite as [N] in insight/action fields; ground all market & competitor claims here):`,
  ];

  if (marketSignals.length > 0) {
    lines.push('[Market signals & venture news]');
    lines.push(formatSourceBlock(marketSignals, 0));
  }

  if (competitorIntel.length > 0) {
    lines.push('\n[Competitive landscape]');
    lines.push(formatSourceBlock(competitorIntel, marketSignals.length));
  }

  return lines.join('\n');
}

/**
 * Format a quick intel list for Focus Briefing and converse lookups.
 */
export function formatQuickIntel(sources: TavilySource[]): string {
  if (sources.length === 0) {
    return 'LIVE_WEB_INTEL: (none — focus on venture data only; skip external references.)';
  }
  return `LIVE_WEB_INTEL (cite as [N] if relevant):\n${formatSourceBlock(sources)}`;
}

/**
 * Utility: extract venture name + domain hint from a raw context string,
 * suitable for building Tavily queries on the server without passing extra params.
 */
export function ventureSearchParamsFromContext(context: string): {
  ventureName: string;
  industry: string;
  strategicIntent: string;
} {
  const ventureName = extractVentureNameFromContext(context);
  const industry = extractDomainHint(context);

  // Try to extract strategic intent (first non-empty line after "Strategy:" or similar)
  const intentMatch =
    context.match(/Strategic[_ ]?intent[:\s]+([^\n]{20,300})/i) ??
    context.match(/Vision[:\s]+([^\n]{20,300})/i) ??
    context.match(/Mission[:\s]+([^\n]{20,300})/i);
  const strategicIntent = intentMatch?.[1]?.trim().slice(0, 200) ?? '';

  return { ventureName, industry, strategicIntent };
}
