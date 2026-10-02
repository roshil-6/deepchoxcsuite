import { NextResponse } from 'next/server';
import { generateSubtitles, translateSubtitles } from '@/lib/ai/mediaAiService';
import { SubtitleCue, SubtitleTrack } from '@/lib/media/types';

function formatSrtTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatVttTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function buildSrt(cues: SubtitleCue[]): string {
  return cues
    .map((c, i) => `${i + 1}\n${formatSrtTime(c.startTime)} --> ${formatSrtTime(c.endTime)}\n${c.text}\n`)
    .join('\n');
}

export function buildVtt(cues: SubtitleCue[]): string {
  const body = cues
    .map((c, i) => `${i + 1}\n${formatVttTime(c.startTime)} --> ${formatVttTime(c.endTime)}\n${c.text}\n`)
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'generate') {
      const { mediaId, durationSeconds, language, contextText } = body;
      if (!mediaId || typeof durationSeconds !== 'number') {
        return NextResponse.json({ ok: false, error: 'mediaId and durationSeconds are required' }, { status: 400 });
      }

      const res = await generateSubtitles({
        mediaId,
        durationSeconds,
        language: language || 'en',
        contextText,
      });

      return NextResponse.json(res);
    }

    if (action === 'translate') {
      const { track, targetLanguage, targetLanguageLabel } = body as {
        track: SubtitleTrack;
        targetLanguage: string;
        targetLanguageLabel: string;
      };

      if (!track || !targetLanguage || !targetLanguageLabel) {
        return NextResponse.json(
          { ok: false, error: 'track, targetLanguage, and targetLanguageLabel are required' },
          { status: 400 }
        );
      }

      const res = await translateSubtitles({
        track,
        targetLanguage,
        targetLanguageLabel,
      });

      return NextResponse.json(res);
    }

    if (action === 'export') {
      const { cues, format, filename = 'subtitles' } = body as {
        cues: SubtitleCue[];
        format: 'srt' | 'vtt' | 'txt';
        filename?: string;
      };

      if (!Array.isArray(cues) || cues.length === 0) {
        return NextResponse.json({ ok: false, error: 'No cues provided to export' }, { status: 400 });
      }

      let content = '';
      let mimeType = 'text/plain; charset=utf-8';
      let ext = 'txt';

      if (format === 'srt') {
        content = buildSrt(cues);
        mimeType = 'application/x-subrip';
        ext = 'srt';
      } else if (format === 'vtt') {
        content = buildVtt(cues);
        mimeType = 'text/vtt';
        ext = 'vtt';
      } else {
        content = cues.map((c) => c.text).join('\n');
      }

      return new Response(content, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}.${ext}"`,
        },
      });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Subtitles API error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Subtitle processing failed' }, { status: 500 });
  }
}
