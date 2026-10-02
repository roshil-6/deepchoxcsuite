import { NextResponse } from 'next/server';

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
    platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'vimeo' | 'generic';
    title: string;
    author: string;
    authorHandle: string;
    duration: string;
    durationSeconds: number;
    thumbnail: string;
    videoUrl?: string;
    youtubeId?: string;
    viewCount: string;
    formats: MediaFormat[];
    suggestedClipTimes: { start: string; end: string; label: string }[];
  };
}

function detectPlatform(url: string): 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'vimeo' | 'generic' {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('vimeo.com')) return 'vimeo';
  return 'generic';
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

async function resolveMediaMetadata(url: string) {
  const platform = detectPlatform(url);
  const youtubeId = extractYouTubeId(url);

  let title = 'Imported Web Media';
  let author = 'Online Creator';
  let authorHandle = '@creator';
  let thumbnail = '/sample-video.mp4';
  let duration = '03:45';
  let durationSeconds = 225;
  let viewCount = 'High quality';
  let videoUrl: string | undefined = undefined;

  // 1. If it's a YouTube link, fetch real metadata from YouTube oEmbed API
  if (youtubeId) {
    authorHandle = '@youtube';
    thumbnail = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
    title = `YouTube Video [${youtubeId}]`;

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = await res.json();
        if (json.title) title = json.title;
        if (json.author_name) author = json.author_name;
        if (json.thumbnail_url) thumbnail = json.thumbnail_url;
      }
    } catch {
      // Fallback to defaults
    }
  } else if (/\.(mp4|webm|mov|m4v|mp3|wav|ogg)$/i.test(url.split('?')[0])) {
    // 2. Direct media file URL
    const pathname = new URL(url).pathname;
    const base = pathname.split('/').pop() || 'Media File';
    title = decodeURIComponent(base).replace(/\.[^/.]+$/, '');
    videoUrl = url;
    author = 'Direct Media Stream';
  } else {
    // 3. Generic web page — attempt to read OpenGraph tags
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const html = await res.text();
        const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]
          || html.match(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i)?.[1]
          || html.match(/<title>([^<]+)<\/title>/i)?.[1];
        
        const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
        const ogSite = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i)?.[1];

        if (ogTitle) title = ogTitle.trim();
        if (ogImage) thumbnail = ogImage.trim();
        if (ogSite) author = ogSite.trim();
      }
    } catch {
      // Fallback to URL hostname
      try {
        const host = new URL(url).hostname;
        title = `Media from ${host}`;
        author = host;
      } catch {}
    }
  }

  const formats: MediaFormat[] = [
    {
      id: 'mp4-1080p',
      label: 'Full HD Video (1080p)',
      ext: 'mp4',
      resolution: '1920x1080',
      quality: '1080p Crisp',
      filesize: '148 MB',
      type: 'video',
      downloadUrl: '#download-1080p',
    },
    {
      id: 'mp4-720p',
      label: 'HD Video (720p)',
      ext: 'mp4',
      resolution: '1280x720',
      quality: '720p Fast Stream',
      filesize: '64 MB',
      type: 'video',
      downloadUrl: '#download-720p',
    },
    {
      id: 'mp3-320',
      label: 'Studio Audio (MP3)',
      ext: 'mp3',
      quality: '320 kbps Crisp Audio',
      filesize: '45 MB',
      type: 'audio',
      downloadUrl: '#download-mp3-320',
    },
    {
      id: 'wav-lossless',
      label: 'Lossless Audio (WAV)',
      ext: 'wav',
      quality: '1411 kbps Uncompressed',
      filesize: '120 MB',
      type: 'audio',
      downloadUrl: '#download-wav',
    },
  ];

  const suggestedClipTimes = [
    { start: '00:15', end: '00:45', label: 'Opening Hook' },
    { start: '01:00', end: '01:30', label: 'Key Highlight' },
    { start: '02:00', end: '02:30', label: 'Strongest Moment' },
  ];

  return {
    url,
    platform,
    title,
    author,
    authorHandle,
    duration,
    durationSeconds,
    thumbnail,
    videoUrl,
    youtubeId: youtubeId || undefined,
    viewCount,
    formats,
    suggestedClipTimes,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ ok: false, error: 'A valid video or audio URL is required' }, { status: 400 });
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid URL starting with https://' }, { status: 400 });
    }

    const data = await resolveMediaMetadata(trimmedUrl);

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error('Downloader API error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to extract media information.' }, { status: 500 });
  }
}
