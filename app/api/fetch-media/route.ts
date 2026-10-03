import { NextRequest, NextResponse } from 'next/server';
import { downloadLinkAudio, downloadLinkVideo, getLinkInfo, LinkError, LinkQuality, safeFilename } from '@/lib/media/ytdlp';
import { serveFile } from '@/lib/media/serveFile';

export const runtime = 'nodejs';
export const maxDuration = 300;

const QUALITIES = new Set(['best', '2160', '1440', '1080', '720', '480', '360', '240', '144']);

/**
 * GET /api/fetch-media?url=<page url>&kind=video&q=720
 * GET /api/fetch-media?url=<page url>&kind=audio&format=mp3
 * Downloads the REAL media behind a link (via yt-dlp) and returns it as an attachment.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const url = (sp.get('url') || '').trim();
  const kind = sp.get('kind') === 'audio' ? 'audio' : 'video';

  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: 'A valid http(s) link is required' }, { status: 400 });
  }

  const prepare = sp.get('prepare') === '1';
  const fs = await import('fs');

  try {
    let title = 'clapfetch';
    try {
      title = (await getLinkInfo(url)).title;
    } catch {
      /* title is cosmetic; the download below reports real errors */
    }

    let file: string;
    let downloadName: string;
    if (kind === 'audio') {
      const fmt = sp.get('format');
      const format: 'mp3' | 'wav' | 'm4a' = fmt === 'wav' ? 'wav' : fmt === 'm4a' ? 'm4a' : 'mp3';
      const br = Math.min(320, Math.max(64, parseInt(sp.get('bitrate') || '320', 10) || 320));
      file = await downloadLinkAudio(url, format, br);
      downloadName = safeFilename(title, format);
    } else {
      const q = sp.get('q') || '1080';
      const quality = (QUALITIES.has(q) ? q : '1080') as LinkQuality;
      file = await downloadLinkVideo(url, quality);
      const suffix = quality === 'best' ? '' : ` (${quality}p)`;
      downloadName = safeFilename(`${title}${suffix}`, 'mp4');
    }

    if (prepare) {
      return NextResponse.json({ ok: true, filename: downloadName, size: fs.statSync(file).size });
    }
    return serveFile(req, file, { downloadName });
  } catch (e: any) {
    const status = e instanceof LinkError ? e.status : 500;
    return NextResponse.json({ ok: false, error: e?.message || 'Download failed' }, { status });
  }
}
