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

function generateMetadataFromUrl(url: string) {
  const platform = detectPlatform(url);
  
  let title = 'Viral Podcast Episode - How To Build 7-Figure Systems';
  let author = 'Alex Hormozi';
  let authorHandle = '@hormozi';
  let thumbnail = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80';
  let duration = '42:15';
  let durationSeconds = 2535;
  let viewCount = '1.4M views';

  if (platform === 'youtube') {
    title = 'Why 99% Of People Never Get Rich (Uncomfortable Truth)';
    author = 'Deep Dive with Ali Abdaal';
    authorHandle = '@aliabdaal';
    thumbnail = 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=80';
    duration = '28:40';
    durationSeconds = 1720;
    viewCount = '890K views';
  } else if (platform === 'tiktok') {
    title = '3 psychological tricks that make anyone listen to you instantly';
    author = 'Creator Studio';
    authorHandle = '@creatorstudio';
    thumbnail = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';
    duration = '01:25';
    durationSeconds = 85;
    viewCount = '4.2M views';
  } else if (platform === 'instagram') {
    title = 'The 1 Habit That Changed Everything in 2026';
    author = 'Mindset Daily';
    authorHandle = '@mindsetdaily';
    thumbnail = 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80';
    duration = '00:58';
    durationSeconds = 58;
    viewCount = '320K views';
  }

  // Parse custom title if URL contains clues
  try {
    const parsed = new URL(url);
    const searchParam = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
    if (searchParam && searchParam.length > 5) {
      title = `${title} [ID: ${searchParam.slice(0, 10)}]`;
    }
  } catch {
    // Keep fallback
  }

  const formats: MediaFormat[] = [
    {
      id: 'mp4-1080p',
      label: 'Full HD Video (1080p)',
      ext: 'mp4',
      resolution: '1920x1080',
      quality: '1080p High Bitrate',
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
      id: 'mp4-480p',
      label: 'Standard Video (480p)',
      ext: 'mp4',
      resolution: '854x480',
      quality: '480p Mobile',
      filesize: '28 MB',
      type: 'video',
      downloadUrl: '#download-480p',
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
    { start: '02:14', end: '02:48', label: 'Insane Hook on Discipline' },
    { start: '08:30', end: '09:12', label: 'The 10x Revenue Rule' },
    { start: '17:40', end: '18:25', label: 'Common Pitfalls Explained' },
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

    const data = generateMetadataFromUrl(trimmedUrl);

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error('Downloader API error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to extract media information.' }, { status: 500 });
  }
}
