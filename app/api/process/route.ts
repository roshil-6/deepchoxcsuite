import { NextRequest, NextResponse } from 'next/server';
import { createJob, processJob } from '@/lib/media/jobRunner';
import { resolveInsideStorage } from '@/lib/media/storage';
import { downloadLinkVideo, LinkError } from '@/lib/media/ytdlp';
import { JobType } from '@/lib/media/types';

export const runtime = 'nodejs';
export const maxDuration = 900;

const validJobTypes: string[] = [
  'cut',
  'audio_extract',
  'extract_audio',
  'ringtone',
  'reel',
  'compress',
  'mute',
  'frame_grab',
  'subtitle_burn',
  'subtitle',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mediaId, storagePath, sourceUrl, type, params } = body;

    if (!mediaId || !type || !params) {
      return NextResponse.json({ ok: false, error: 'Missing mediaId, type, or params' }, { status: 400 });
    }
    if (!validJobTypes.includes(type)) {
      return NextResponse.json({ ok: false, error: `Invalid job type: ${type}` }, { status: 400 });
    }

    // Resolve the REAL source file. Never substitute a sample video.
    let sourceMediaFile = resolveInsideStorage(storagePath);
    if (!sourceMediaFile && typeof sourceUrl === 'string' && /^https?:\/\//i.test(sourceUrl)) {
      try {
        sourceMediaFile = await downloadLinkVideo(sourceUrl, '1080');
      } catch (e: any) {
        const status = e instanceof LinkError ? e.status : 500;
        return NextResponse.json({ ok: false, error: e?.message || 'Could not fetch the linked video' }, { status });
      }
    }
    if (!sourceMediaFile) {
      return NextResponse.json(
        { ok: false, error: 'Source media not found on the server. Please re-upload or re-import the video.' },
        { status: 404 }
      );
    }

    const job = createJob(mediaId, type as JobType, params);
    processJob(job.id, sourceMediaFile).catch((err) => console.error('Background processing job failed:', err));
    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (error: any) {
    console.error('Process route error:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Processing error' }, { status: 500 });
  }
}
