import { NextResponse } from 'next/server';
import { getLinkInfo, LinkError } from '@/lib/media/ytdlp';

export const runtime = 'nodejs';
export const maxDuration = 60;

export interface MediaFormat {
  id: string;
  label: string;
  ext: 'mp4' | 'mp3' | 'wav';
  resolution?: string;
  quality: string;
  filesize: string;
  type: 'video' | 'audio';
  downloadUrl: string;
}

export interface DownloaderResponse {
  ok: boolean;
  error?: string;
  data?: {
    url: string;
    platform: string;
    title: string;
    author: string;
    authorHandle: string;
    duration: string;
    durationSeconds: number;
    thumbnail: string;
    viewCount: string;
    formats: MediaFormat[];
  };
}

function fmtDuration(sec: number): string {
  if (!sec) return '--:--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function fmtSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.max(0.1, bytes / 1024 ** 2).toFixed(1)} MB`;
}

function platformName(extractor: string, url: string): string {
  const e = extractor.toLowerCase();
  if (e.includes('youtube')) return 'youtube';
  if (e.includes('tiktok')) return 'tiktok';
  if (e.includes('instagram')) return 'instagram';
  if (e.includes('twitter') || e === 'x') return 'twitter';
  if (e.includes('vimeo')) return 'vimeo';
  if (e.includes('facebook')) return 'facebook';
  if (e.includes('reddit')) return 'reddit';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

const STANDARD_HEIGHTS = [2160, 1440, 1080, 720, 480, 360, 240, 144];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid URL starting with https://' }, { status: 400 });
    }

    const info = await getLinkInfo(url);
    const enc = encodeURIComponent(url);
    const formats: MediaFormat[] = [];

    if (info.hasVideo) {
      // Offer the real heights available for this video (standard rungs only, max 4)
      const offered = STANDARD_HEIGHTS.filter((h) => info.heights.some((x) => x >= h - 8 && x <= h + 8)).slice(0, 4);
      if (offered.length === 0 && info.heights.length) offered.push(info.heights[0]);
      for (const h of offered) {
        const vSize = info.sizeByHeight[h] ?? null;
        const total = vSize ? vSize + (info.audioSize || 0) : null;
        formats.push({
          id: `mp4-${h}p`,
          label: `MP4 ${h}p`,
          ext: 'mp4',
          resolution: `${h}p`,
          quality: h >= 2160 ? '4K Ultra HD' : h >= 1440 ? '2K QHD' : h >= 1080 ? 'Full HD' : h >= 720 ? 'HD' : 'SD',
          filesize: fmtSize(total) || '—',
          type: 'video',
          downloadUrl: `/api/fetch-media?kind=video&q=${h}&url=${enc}`,
        });
      }
    }

    const audioMb = info.audioSize;
    const mp3Bytes = info.durationSeconds ? (320_000 / 8) * info.durationSeconds : audioMb;
    const wavBytes = info.durationSeconds ? 176_400 * info.durationSeconds : null;
    formats.push(
      {
        id: 'mp3-320',
        label: 'MP3 320 kbps',
        ext: 'mp3',
        quality: 'Audio only · 320 kbps',
        filesize: fmtSize(mp3Bytes) || '—',
        type: 'audio',
        downloadUrl: `/api/fetch-media?kind=audio&format=mp3&bitrate=320&url=${enc}`,
      },
      {
        id: 'wav',
        label: 'WAV Lossless',
        ext: 'wav',
        quality: 'Audio only · PCM 16-bit',
        filesize: fmtSize(wavBytes) || '—',
        type: 'audio',
        downloadUrl: `/api/fetch-media?kind=audio&format=wav&url=${enc}`,
      }
    );

    return NextResponse.json({
      ok: true,
      data: {
        url,
        platform: platformName(info.extractor, url),
        title: info.title,
        author: info.uploader,
        authorHandle: info.uploaderHandle,
        duration: fmtDuration(info.durationSeconds),
        durationSeconds: info.durationSeconds,
        thumbnail: info.thumbnail,
        viewCount: '',
        formats,
      },
    });
  } catch (error: any) {
    const status = error instanceof LinkError ? error.status : 500;
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to read this link.' }, { status });
  }
}
