import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { downloadLinkVideo, getLinkInfo, LinkError } from '@/lib/media/ytdlp';
import { probeMedia, generateThumbnail } from '@/lib/media/ffmpeg';
import { mediaUrlFor } from '@/lib/media/storage';
import { THUMBNAILS_DIR } from '@/lib/media/config';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST { url } → downloads the real media behind a link (max 1080p) into
 * server storage so it can be previewed, edited and processed.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ ok: false, error: 'A valid http(s) link is required' }, { status: 400 });
    }

    const info = await getLinkInfo(url).catch(() => null);
    const file = await downloadLinkVideo(url, '1080');
    const probe = await probeMedia(file);

    let thumbnailUrl = info?.thumbnail || undefined;
    if (probe.hasVideo) {
      try {
        fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
        const thumb = path.join(THUMBNAILS_DIR, `${path.basename(file, path.extname(file))}.jpg`);
        if (!fs.existsSync(thumb)) await generateThumbnail(file, thumb, Math.min(1, probe.durationSeconds / 10));
        if (fs.existsSync(thumb)) thumbnailUrl = mediaUrlFor(thumb);
      } catch {
        /* keep remote thumbnail */
      }
    }

    const title = info?.title || 'Imported video';
    return NextResponse.json({
      ok: true,
      media: {
        id: uuid(),
        filename: `${title}.mp4`,
        title,
        url: mediaUrlFor(file),
        mimeType: probe.hasVideo ? 'video/mp4' : 'audio/mp4',
        fileSize: fs.statSync(file).size,
        durationSeconds: probe.durationSeconds,
        width: probe.width,
        height: probe.height,
        codec: probe.codec,
        thumbnailUrl,
        storagePath: path.relative(process.cwd(), file),
        source: 'link',
        sourceUrl: url,
      },
    });
  } catch (e: any) {
    const status = e instanceof LinkError ? e.status : 500;
    return NextResponse.json({ ok: false, error: e?.message || 'Import failed' }, { status });
  }
}
