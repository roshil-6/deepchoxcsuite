/**
 * Build Google News RSS search strings for venture-scoped market research.
 * Results are unverified headlines from third-party publishers — always confirm at the source.
 */

export type MarketIntelLens = 'all' | 'industry' | 'funding' | 'policy' | 'technology';

export type MarketIntelTimeWindow = '1d' | '7d';

/** CSO desk frames — each maps to dedicated news queries (venture + context keywords). */
export type MarketResearchTopic = 'market_lens' | 'competition' | 'momentum' | 'opportunity';

const STOPWORDS = new Set([
    'the',
    'and',
    'for',
    'are',
    'but',
    'not',
    'you',
    'all',
    'can',
    'her',
    'was',
    'one',
    'our',
    'out',
    'day',
    'get',
    'has',
    'him',
    'his',
    'how',
    'its',
    'may',
    'new',
    'now',
    'old',
    'see',
    'two',
    'who',
    'way',
    'use',
    'her',
    'she',
    'many',
    'then',
    'them',
    'these',
    'some',
    'what',
    'which',
    'when',
    'where',
    'will',
    'with',
    'from',
    'have',
    'this',
    'that',
    'your',
    'into',
    'about',
    'after',
    'also',
    'back',
    'been',
    'being',
    'each',
    'more',
    'most',
    'other',
    'such',
    'than',
    'their',
    'there',
    'they',
    'very',
    'were',
    'would',
]);

/** Pull a few meaningful tokens from strategy / notes to widen search beyond the venture name only. */
export function extractContextKeywords(text: string, max = 5): string[] {
    const t = (text || '')
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/[^\w\s]/g, ' ');
    const words = t.split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
    const seen = new Set<string>();
    const out: string[] = [];
    for (const w of words) {
        if (seen.has(w)) continue;
        seen.add(w);
        out.push(w);
        if (out.length >= max) break;
    }
    return out;
}

function clip(s: string, max: number): string {
    const t = s.trim();
    if (t.length <= max) return t;
    return t.slice(0, max).trim();
}

function withWindow(q: string, window: MarketIntelTimeWindow): string {
    const w = window === '1d' ? 'when:1d' : 'when:7d';
    return `${q} ${w}`.trim();
}

/**
 * Returns 1–3 distinct RSS query strings (each includes the time window).
 * Keeps queries short so Google News RSS stays reliable.
 */
export function buildMarketIntelQueries(opts: {
    ventureName: string;
    strategicIntent?: string;
    userNotes?: string;
    lens: MarketIntelLens;
    timeWindow: MarketIntelTimeWindow;
}): string[] {
    const name = clip(opts.ventureName, 72);
    if (!name) return [withWindow('business market news', opts.timeWindow)];

    const kw = extractContextKeywords(
        [opts.strategicIntent, opts.userNotes].filter(Boolean).join(' ') || '',
        4
    );
    const contextTail = kw.length ? kw.join(' ') : '';

    const q = (inner: string) => withWindow(clip(inner, 200), opts.timeWindow);

    switch (opts.lens) {
        case 'industry':
            return contextTail
                ? [q(`${name} ${contextTail} industry market`), q(`${contextTail} market trends`)]
                : [q(`${name} industry market news`), q(`${name} market analysis`)];
        case 'funding':
            return [q(`${name} startup funding OR investment`), q(`${name} venture capital OR Series`)];
        case 'policy':
            return [
                q(`${name} regulation OR policy`),
                q(`${contextTail ? `${contextTail} ` : ''}government policy industry news`.trim()),
            ];
        case 'technology':
            return contextTail
                ? [q(`${name} ${contextTail} technology`), q(`${contextTail} innovation news`)]
                : [q(`${name} technology innovation`), q(`${name} product launch tech`)];
        case 'all':
        default:
            return contextTail
                ? [
                      q(`${name} ${contextTail} news`),
                      q(`${name} industry OR market`),
                      q(`${contextTail} trends news`),
                  ]
                : [q(`${name} company OR startup news`), q(`${name} industry market`), q(`${name} funding OR growth`)];
    }
}

/**
 * Targeted queries for the four CSO research frames (market lens, competition, momentum, opportunity).
 */
export function buildResearchTopicQueries(opts: {
    topic: MarketResearchTopic;
    ventureName: string;
    strategicIntent?: string;
    userNotes?: string;
    timeWindow: MarketIntelTimeWindow;
}): string[] {
    const name = clip(opts.ventureName, 72);
    if (!name) return [withWindow('business market news', opts.timeWindow)];

    const kw = extractContextKeywords(
        [opts.strategicIntent, opts.userNotes].filter(Boolean).join(' ') || '',
        5
    );
    const ctx = kw.length ? kw.join(' ') : '';
    const q = (inner: string) => withWindow(clip(inner, 200), opts.timeWindow);

    switch (opts.topic) {
        case 'market_lens':
            return ctx
                ? [
                      q(`${name} ${ctx} industry OR sector market`),
                      q(`${name} market landscape OR TAM OR addressable market`),
                      q(`${ctx} industry trends OR market size`),
                  ]
                : [
                      q(`${name} industry sector market overview`),
                      q(`${name} market landscape OR total addressable market`),
                  ];
        case 'competition':
            return ctx
                ? [
                      q(`${name} competitors OR versus OR vs ${ctx}`),
                      q(`${name} competitive landscape OR market share`),
                      q(`${ctx} rivalry OR alternative products`),
                  ]
                : [q(`${name} competitors OR competition`), q(`${name} versus OR vs OR market share`)];
        case 'momentum':
            return ctx
                ? [
                      q(`${name} growth OR demand OR adoption`),
                      q(`${name} ${ctx} momentum OR expansion OR surge`),
                      q(`${ctx} customer demand OR sales trend`),
                  ]
                : [q(`${name} growth momentum demand adoption`), q(`${name} expansion OR scaling OR surge`)];
        case 'opportunity':
        default:
            return ctx
                ? [
                      q(`${name} market opportunity OR whitespace OR emerging`),
                      q(`${name} ${ctx} disruption OR new market OR gap`),
                      q(`${ctx} unmet need OR innovation opportunity`),
                  ]
                : [
                      q(`${name} market opportunity OR emerging market`),
                      q(`${name} disruption OR innovation opportunity`),
                  ];
    }
}

export function dedupeIntelItems<T extends { link?: string; title?: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const it of items) {
        const key = (it.link || '').trim() || (it.title || '').toLowerCase().trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(it);
    }
    return out;
}
