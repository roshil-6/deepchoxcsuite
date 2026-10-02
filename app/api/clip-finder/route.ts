import { NextResponse } from 'next/server';
import { findMoment } from '@/lib/ai/mediaAiService';

export interface ViralClip {
  id: string;
  title: string;
  hook: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  viralityScore: number;
  reason: string;
  category: string;
  captionSnippet: string;
  suggestedHashtags: string[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      query,
      durationSeconds = 180,
      transcriptOrDescription,
      videoTitle,
      transcript,
      maxResults = 3,
    } = body;

    const searchQuery = (query || transcript || videoTitle || '').trim();

    if (!searchQuery) {
      return NextResponse.json(
        { ok: false, error: 'Please describe the moment you are looking for' },
        { status: 400 }
      );
    }

    const res = await findMoment({
      query: searchQuery,
      durationSeconds: Number(durationSeconds) || 180,
      transcriptOrDescription: transcriptOrDescription || transcript,
      maxResults: Number(maxResults) || 1,
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error || 'Failed to locate moment' }, { status: 400 });
    }

    // Map to formatted response
    const formatMmSs = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formattedResults = res.results.map((r, i) => ({
      id: `moment-${i + 1}`,
      start: r.start,
      end: r.end,
      startTime: formatMmSs(r.start),
      endTime: formatMmSs(r.end),
      durationSeconds: Math.round((r.end - r.start) * 10) / 10,
      reason: r.reason,
    }));

    // Backwards-compatible clips array for callers that read data.clips
    const clips = formattedResults.map((r) => ({
      id: r.id,
      title: r.reason.slice(0, 40),
      hook: r.reason,
      startTime: r.startTime,
      endTime: r.endTime,
      durationSeconds: r.durationSeconds,
      viralityScore: 92,
      reason: r.reason,
      category: 'key-moment',
      captionSnippet: r.reason,
      suggestedHashtags: ['#highlight', '#moment'],
    }));

    return NextResponse.json({
      ok: true,
      results: formattedResults,
      clips,
    });
  } catch (err: any) {
    console.error('Find a moment API error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Search failed' }, { status: 500 });
  }
}
