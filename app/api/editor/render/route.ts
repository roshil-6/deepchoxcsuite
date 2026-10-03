import { NextResponse } from 'next/server';
import { createJob, processTimelineJob } from '@/lib/media/jobRunner';
import { resolveInsideStorage } from '@/lib/media/storage';
import { NormalizedCrop, TimelineRenderParams } from '@/lib/media/types';
import { RenderClipInput } from '@/lib/media/ffmpeg';

export const runtime = 'nodejs';

const MAX_CLIPS = 50;
const MAX_TOTAL_SEC = 3 * 60 * 60;

function validCrop(c: any): NormalizedCrop | null {
  if (!c || typeof c !== 'object') return null;
  const n = (v: any) => (typeof v === 'number' && isFinite(v) ? v : NaN);
  const x = n(c.x), y = n(c.y), w = n(c.w), h = n(c.h);
  if ([x, y, w, h].some(isNaN)) return null;
  if (w <= 0.02 || h <= 0.02 || x < 0 || y < 0 || x + w > 1.0001 || y + h > 1.0001) return null;
  return { x, y, w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) };
}

/**
 * POST /api/editor/render
 * { clips: [{ storagePath, inMs, outMs, muted?, volume? }], crop?, outputHeight? }
 * → { ok, jobId }   (poll /api/process/:jobId, download /api/download/:jobId)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const rawClips = Array.isArray(body?.clips) ? body.clips : null;
    if (!rawClips || rawClips.length === 0) {
      return NextResponse.json({ ok: false, error: 'Add at least one clip to the timeline.' }, { status: 400 });
    }
    if (rawClips.length > MAX_CLIPS) {
      return NextResponse.json({ ok: false, error: `Too many clips (max ${MAX_CLIPS}).` }, { status: 400 });
    }

    const resolved: RenderClipInput[] = [];
    const params: TimelineRenderParams = { clips: [], crop: null, outputHeight: null };
    let total = 0;
    for (let i = 0; i < rawClips.length; i++) {
      const c = rawClips[i];
      const abs = resolveInsideStorage(c?.storagePath);
      if (!abs) {
        return NextResponse.json(
          { ok: false, error: `Clip ${i + 1}: source file is not on the server. Re-upload that video.` },
          { status: 400 }
        );
      }
      const inMs = Number(c.inMs);
      const outMs = Number(c.outMs);
      if (!isFinite(inMs) || !isFinite(outMs) || inMs < 0 || outMs - inMs < 100) {
        return NextResponse.json({ ok: false, error: `Clip ${i + 1}: invalid in/out points.` }, { status: 400 });
      }
      total += (outMs - inMs) / 1000;
      const muted = !!c.muted;
      const volume = typeof c.volume === 'number' ? Math.max(0, Math.min(2, c.volume)) : 1;
      resolved.push({ path: abs, inSec: inMs / 1000, outSec: outMs / 1000, muted, volume });
      params.clips.push({ storagePath: c.storagePath, inMs, outMs, muted, volume });
    }
    if (total > MAX_TOTAL_SEC) {
      return NextResponse.json({ ok: false, error: 'Timeline is longer than 3 hours.' }, { status: 400 });
    }

    params.crop = validCrop(body?.crop);
    const oh = Number(body?.outputHeight);
    params.outputHeight = [2160, 1440, 1080, 720, 480, 360].includes(oh) ? oh : null;

    const job = createJob('timeline', 'timeline_render', params);
    processTimelineJob(job.id, resolved).catch((e) => console.error('Timeline job crashed:', e));
    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Render request failed' }, { status: 500 });
  }
}
