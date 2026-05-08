/**
 * /api/research — Tavily-powered live web research
 *
 * POST { query: string, maxResults?: number }
 * → { results, answer, query, timestamp }
 */

import { NextResponse } from 'next/server';

export const maxDuration = 30;

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  score: number;
  publishedDate?: string;
}

export interface ResearchResponse {
  results: ResearchResult[];
  answer: string | null;
  query: string;
  timestamp: number;
}

export async function POST(req: Request) {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: 'TAVILY_API_KEY not configured' }, { status: 503 });
  }

  const body = (await req.json()) as { query?: string; maxResults?: number };
  const { query, maxResults = 8 } = body;

  if (!query?.trim()) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query: query.trim().slice(0, 400),
        search_depth: 'advanced',
        max_results: Math.min(maxResults, 10),
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Tavily request failed' }, { status: 500 });
    }

    const data = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string; score?: number; published_date?: string }[];
      answer?: string;
    };

    const results: ResearchResult[] = (data.results ?? [])
      .filter((r) => r.title?.trim() && r.url?.trim())
      .map((r) => ({
        title: r.title!.trim(),
        url: r.url!.trim(),
        snippet: (r.content ?? '').trim().slice(0, 320),
        score: r.score ?? 0,
        publishedDate: r.published_date,
      }));

    const response: ResearchResponse = {
      results,
      answer: data.answer?.trim() || null,
      query: query.trim(),
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
