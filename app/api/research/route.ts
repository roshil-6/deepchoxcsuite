// Research API - Tavily web search integration
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  score: number;
  publishedDate?: string;
}

export async function POST(req: Request) {
  const key = process.env.TAVILY_API_KEY?.trim();
  
  if (!key) {
    console.error('TAVILY_API_KEY not configured');
    return NextResponse.json({ error: 'TAVILY_API_KEY not configured' }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  
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
      const errorText = await res.text();
      console.error('Tavily API error:', res.status, errorText);
      return NextResponse.json({ error: `Tavily request failed: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();

    const results: ResearchResult[] = (data.results ?? [])
      .filter((r: any) => r.title?.trim() && r.url?.trim())
      .map((r: any) => ({
        title: r.title.trim(),
        url: r.url.trim(),
        snippet: (r.content ?? '').trim().slice(0, 320),
        score: r.score ?? 0,
        publishedDate: r.published_date,
      }));

    return NextResponse.json({
      results,
      answer: data.answer?.trim() || null,
      query: query.trim(),
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Research search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
