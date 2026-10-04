import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/media/jobRunner';
import { OUTPUTS_DIR } from '@/lib/media/config';
import { serveFile } from '@/lib/media/serveFile';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const FRIENDLY_PREFIX: Record<string, string> = {
  cut: 'trimmed',
  audio_extract: 'audio',
  extract_audio: 'audio',
  ringtone: 'ringtone',
  reel: 'reel',
  compress: 'compressed',
  mute: 'muted',
  frame_grab: 'frame',
  subtitle_burn: 'subtitled',
  subtitle: 'subtitled',
  timeline_render: 'edit',
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ outputId: string }> | { outputId: string } }
) {
  const { outputId } = await Promise.resolve(context.params);
  if (!outputId || /[\\/]|\.\./.test(outputId)) {
    return NextResponse.json({ ok: false, error: 'Invalid output id' }, { status: 400 });
  }

  const job = getJob(outputId);
  if (!job) {
    return NextResponse.json({ ok: false, error: 'This export no longer exists. Please run the tool again.' }, { status: 404 });
  }
  if (job.status !== 'completed' || !job.outputFilename) {
    return NextResponse.json({ ok: false, error: `Export is ${job.status}` }, { status: 409 });
  }

  const filePath = path.join(OUTPUTS_DIR, job.id, job.outputFilename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ ok: false, error: 'Export file is missing on the server.' }, { status: 404 });
  }

  const ext = path.extname(job.outputFilename);
  const stamp = new Date(job.createdAt).toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const downloadName = `clapfetch-${FRIENDLY_PREFIX[job.type] || job.type}-${stamp}${ext}`;
  return serveFile(req, filePath, { downloadName });
}
