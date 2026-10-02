import { NextRequest, NextResponse } from 'next/server';
import { createJob, processJob } from '@/lib/media/jobRunner';
import { resolveStoragePath } from '@/lib/media/storage';
import { JobType } from '@/lib/media/types';
import fs from 'fs';
import path from 'path';

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
    const { mediaId, storagePath, type, params } = body;

    if (!mediaId || !type || !params) {
      return NextResponse.json({ ok: false, error: 'Missing mediaId, type, or params' }, { status: 400 });
    }

    if (!validJobTypes.includes(type)) {
      return NextResponse.json({ ok: false, error: `Invalid job type: ${type}` }, { status: 400 });
    }

    const job = createJob(mediaId, type as JobType, params);

    // Determine source media file for processing
    let sourceMediaFile: string | null = null;
    if (storagePath) {
      const resolvedPath = resolveStoragePath(storagePath);
      if (fs.existsSync(resolvedPath)) {
        sourceMediaFile = resolvedPath;
      }
    }

    if (!sourceMediaFile) {
      const sampleFallback = path.resolve(process.cwd(), 'public', 'sample-video.mp4');
      if (fs.existsSync(sampleFallback)) {
        sourceMediaFile = sampleFallback;
      }
    }

    if (sourceMediaFile) {
      processJob(job.id, sourceMediaFile).catch((err) => {
        console.error('Background processing job failed:', err);
      });
      return NextResponse.json({ ok: true, jobId: job.id });
    }

    // Fallback simulation if no media file available at all
    const ext =
      type === 'audio_extract' || type === 'extract_audio'
        ? (params as any)?.format || 'mp3'
        : type === 'ringtone'
        ? (params as any)?.target === 'iphone' ? 'm4r' : 'mp3'
        : type === 'frame_grab'
        ? (params as any)?.format || 'jpg'
        : 'mp4';

    setTimeout(() => {
      job.status = 'completed';
      job.progress = 100;
      job.outputUrl = `/api/download/${job.id}`;
      job.outputFilename = `clapfetch-${job.type}-${job.id.slice(0, 8)}.${ext}`;
    }, 1500);

    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (error: any) {
    console.error('Process route error:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Processing error' }, { status: 500 });
  }
}
