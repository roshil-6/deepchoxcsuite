import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { intelLegacyLabelFromTitle, intelTitleToImpactResult } from '@/lib/impact/adapters/intelAdapter';
import {
    buildMarketIntelQueries,
    buildResearchTopicQueries,
    dedupeIntelItems,
    type MarketIntelLens,
    type MarketResearchTopic,
    type MarketIntelTimeWindow,
} from '@/lib/marketIntelQuery';

const RESEARCH_TOPICS: MarketResearchTopic[] = ['market_lens', 'competition', 'momentum', 'opportunity'];

function isResearchTopic(v: unknown): v is MarketResearchTopic {
    return typeof v === 'string' && (RESEARCH_TOPICS as string[]).includes(v);
}

const RSS_HL = 'en-US';
const RSS_GL = 'US';
const RSS_CEID = 'US:en';

type RawRssItem = { title?: string; link?: string; pubDate?: string };

function rssUrlForQuery(q: string): string {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${RSS_HL}&gl=${RSS_GL}&ceid=${RSS_CEID}`;
}

async function fetchRssItems(searchQueryWithWindow: string): Promise<RawRssItem[]> {
    const url = rssUrlForQuery(searchQueryWithWindow);
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return [];
    const xmlData = await response.text();
    const parser = new XMLParser();
    const jsonObj = parser.parse(xmlData);
    const items = jsonObj?.rss?.channel?.item || [];
    const list = Array.isArray(items) ? items : [items];
    return list.filter(Boolean);
}

function categorizeNews(title: string): 'funding' | 'legal' | 'market' | 'tech' | 'general' {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('funding') || lowerTitle.includes('raised') || lowerTitle.includes('capital')) return 'funding';
    if (lowerTitle.includes('law') || lowerTitle.includes('court') || lowerTitle.includes('policy')) return 'legal';
    if (lowerTitle.includes('market') || lowerTitle.includes('stock') || lowerTitle.includes('trade')) return 'market';
    if (lowerTitle.includes('ai') || lowerTitle.includes('tech') || lowerTitle.includes('software')) return 'tech';
    return 'general';
}

function mapRssItem(item: RawRssItem) {
    let source = 'News';
    let title = typeof item.title === 'string' ? item.title : '';
    const sourceMatch = title.match(/(.*) - (.*)$/);
    if (sourceMatch) {
        title = sourceMatch[1];
        source = sourceMatch[2];
    }
    const link = typeof item.link === 'string' ? item.link : '';
    const pub = item.pubDate ? new Date(item.pubDate) : null;
    const pubTs = pub && !Number.isNaN(pub.getTime()) ? pub.getTime() : 0;
    const time =
        pub && !Number.isNaN(pub.getTime())
            ? pub.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
            : '';

    const legacyImpact = intelLegacyLabelFromTitle(title);
    return {
        title,
        source,
        time,
        link,
        pubTs,
        impact: legacyImpact,
        impactResult: intelTitleToImpactResult(title, source),
        type: categorizeNews(title),
    };
}

/**
 * Venture market scan: Google News RSS only. Headlines are third-party; open links to verify.
 * Supports legacy body `{ query: string }` or structured research `{ ventureName, lens, timeWindow, ... }`.
 */
export async function POST(req: Request) {
    const disclaimer =
        'These headlines come from Google News search (third-party publishers). They are not fact-checked by this app. Open each article and verify claims before using them in decisions.';

    const heuristicNote =
        'Keyword tags and “impact” scores are rough heuristics from headline wording only — not professional analysis.';

    try {
        const body = (await req.json()) as {
            query?: string;
            ventureName?: string;
            strategicIntent?: string;
            userNotes?: string;
            lens?: MarketIntelLens;
            timeWindow?: MarketIntelTimeWindow;
            researchTopic?: MarketResearchTopic;
        };

        let queriesUsed: string[] = [];
        let researchTopicUsed: MarketResearchTopic | null = null;

        if (body.ventureName?.trim()) {
            const timeWindow: MarketIntelTimeWindow = body.timeWindow === '1d' ? '1d' : '7d';
            const vName = body.ventureName.trim();
            const si = body.strategicIntent?.trim();
            const un = body.userNotes?.trim();

            if (isResearchTopic(body.researchTopic)) {
                researchTopicUsed = body.researchTopic;
                queriesUsed = buildResearchTopicQueries({
                    topic: body.researchTopic,
                    ventureName: vName,
                    strategicIntent: si,
                    userNotes: un,
                    timeWindow,
                });
            } else {
                const lens: MarketIntelLens = body.lens ?? 'all';
                queriesUsed = buildMarketIntelQueries({
                    ventureName: vName,
                    strategicIntent: si,
                    userNotes: un,
                    lens,
                    timeWindow,
                });
            }
        } else {
            const searchTerm = (body.query || 'Technology').trim();
            const timeWindow: MarketIntelTimeWindow = body.timeWindow === '1d' ? '1d' : '7d';
            const w = timeWindow === '1d' ? 'when:1d' : 'when:7d';
            queriesUsed = [`${searchTerm} ${w}`.trim()];
        }

        const batch = await Promise.all(queriesUsed.map((q) => fetchRssItems(q)));
        const rawFlat: RawRssItem[] = batch.flat();
        const mapped = rawFlat.map(mapRssItem).filter((x) => x.title && x.link);
        const deduped = dedupeIntelItems(mapped);
        deduped.sort((a, b) => (b.pubTs || 0) - (a.pubTs || 0));
        const newsItems = deduped.slice(0, 20);

        return NextResponse.json({
            items: newsItems,
            meta: {
                source: 'google_news_rss',
                queriesUsed,
                researchTopic: researchTopicUsed,
                fetchedAt: new Date().toISOString(),
                disclaimer,
                heuristicNote,
            },
        });
    } catch (error) {
        console.error('Intel Feed Error:', error);
        return NextResponse.json(
            {
                items: [],
                meta: {
                    source: 'google_news_rss',
                    error: true,
                    disclaimer,
                    heuristicNote,
                },
            },
            { status: 500 }
        );
    }
}
