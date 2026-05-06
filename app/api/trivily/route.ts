/**
 * /api/trivily — Live Intelligence Feed
 *
 * Powers the Trivily room: fetches real-time news and trends via Tavily,
 * then synthesises a concise analyst briefing with Claude Haiku.
 *
 * POST  { topics: string[], query?: string, ventureName?: string }
 * →     { articles: Article[], synthesis: string, relatedTopics: string[] }
 */

import { NextResponse } from 'next/server';
import { chatWithClaude } from '@/lib/ai/chatProviders';

export const maxDuration = 45;

export interface TrivilyArticle {
    title: string;
    url: string;
    domain: string;
    snippet: string;
    score: number;
    publishedDate?: string;
}

interface TavilyRaw {
    title?: string;
    url?: string;
    content?: string;
    score?: number;
    published_date?: string;
}

async function searchTavily(
    query: string,
    maxResults = 7,
    topic: 'general' | 'news' = 'news',
): Promise<TrivilyArticle[]> {
    const key = process.env.TAVILY_API_KEY?.trim();
    if (!key || !query.trim()) return [];

    try {
        const body: Record<string, unknown> = {
            api_key: key,
            query: query.slice(0, 400),
            search_depth: 'advanced',
            max_results: maxResults,
            include_answer: false,
            include_raw_content: false,
            topic,
        };
        // news topic supports recency filter
        if (topic === 'news') body.days = 7;

        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) return [];

        const data = (await res.json()) as { results?: TavilyRaw[] };
        const rows = Array.isArray(data.results) ? data.results : [];

        return rows
            .filter((r) => r.title?.trim() && r.url?.trim())
            .map((r) => ({
                title: r.title!.trim(),
                url: r.url!.trim(),
                domain: extractDomain(r.url!),
                snippet: (r.content ?? '').trim().slice(0, 320),
                score: r.score ?? 0,
                publishedDate: r.published_date,
            }));
    } catch {
        return [];
    }
}

function extractDomain(url: string): string {
    try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return url.split('/')[2]?.replace(/^www\./, '') ?? url;
    }
}

function deduplicateByUrl(articles: TrivilyArticle[]): TrivilyArticle[] {
    const seen = new Set<string>();
    return articles.filter((a) => {
        if (seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
    });
}

async function synthesise(
    articles: TrivilyArticle[],
    topics: string[],
    ventureName?: string,
): Promise<string> {
    if (articles.length === 0) return '';

    const snippets = articles
        .slice(0, 6)
        .map((a, i) => `[${i + 1}] ${a.title}\n${a.snippet}`)
        .join('\n\n');

    const topicStr = topics.slice(0, 4).join(', ');
    const ventureCtx = ventureName ? ` as it relates to the venture "${ventureName}"` : '';

    try {
        const result = await chatWithClaude(
            [
                {
                    role: 'system',
                    content: `You are a concise intelligence analyst. You will be given recent news articles about ${topicStr}${ventureCtx}. Write a 3-4 sentence briefing that synthesises the key developments. Be specific, factual, and direct. No fluff, no filler phrases like "based on these articles". Start immediately with what is happening.`,
                },
                {
                    role: 'user',
                    content: snippets,
                },
            ],
            { temperature: 0.4 },
        );
        return result.message.content.trim();
    } catch {
        return '';
    }
}

function deriveRelatedTopics(topics: string[], articles: TrivilyArticle[]): string[] {
    // Extract extra keywords from article titles not already in topics
    const topicLower = new Set(topics.map((t) => t.toLowerCase()));
    const extras: string[] = [];

    const COMMON = new Set([
        'ai', 'tech', 'startup', 'funding', 'market', 'growth', 'revenue',
        'product', 'launch', 'series', 'investment', 'billion', 'million',
        'report', 'new', 'latest', 'top', 'best',
    ]);

    for (const a of articles.slice(0, 8)) {
        const words = a.title.split(/\s+/);
        for (const w of words) {
            const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
            if (clean.length > 4 && !topicLower.has(clean) && !COMMON.has(clean)) {
                extras.push(clean);
                if (extras.length >= 5) break;
            }
        }
        if (extras.length >= 5) break;
    }

    return extras;
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as {
            topics?: string[];
            query?: string;
            ventureName?: string;
        };

        const { query, ventureName } = body;
        const topics = Array.isArray(body.topics) && body.topics.length > 0
            ? body.topics.slice(0, 5)
            : ['startup news', 'tech industry', 'venture capital'];

        // Build search queries
        const queries: string[] = [];

        if (query?.trim()) {
            queries.push(query.trim());
            // supplement with first topic
            if (topics[0]) queries.push(`${topics[0]} news`);
        } else {
            // Auto-derive up to 3 queries from topics
            queries.push(`${topics.slice(0, 2).join(' ')} news trends`);
            if (topics[1]) queries.push(`${topics[1]} industry updates`);
            if (topics[2]) queries.push(`${topics[2]} latest developments`);
        }

        // Run searches in parallel (news + general fallback)
        const rawBatches = await Promise.all(
            queries.slice(0, 3).map((q) => searchTavily(q, 7, 'news')),
        );

        // Flatten, dedup, sort
        const flat = deduplicateByUrl(rawBatches.flat());
        flat.sort((a, b) => b.score - a.score);
        const articles = flat.slice(0, 12);

        // AI synthesis (non-blocking — if it fails we still return articles)
        const synthesis = await synthesise(articles, topics, ventureName);
        const relatedTopics = deriveRelatedTopics(topics, articles);

        return NextResponse.json({ articles, synthesis, relatedTopics });
    } catch (err) {
        console.error('[trivily]', err);
        return NextResponse.json(
            { error: 'Intelligence fetch failed', articles: [], synthesis: '', relatedTopics: [] },
            { status: 500 },
        );
    }
}
