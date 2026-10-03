/* ─── CLAPFETCH MEDIA ENGINE — yt-dlp LINK EXTRACTOR ─── */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { STORAGE_ROOT } from './config';

const ffmpegPath: string = require('@ffmpeg-installer/ffmpeg').path;

export const LINK_CACHE_DIR = path.join(STORAGE_ROOT, 'links');

export function getYtdlpPath(): string | null {
  const candidates = [
    process.env.YTDLP_PATH,
    path.resolve(process.cwd(), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'),
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export class LinkError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

function runYtdlp(args: string[], timeoutMs: number): Promise<string> {
  const bin = getYtdlpPath();
  if (!bin) {
    return Promise.reject(
      new LinkError('Link downloader is not installed on the server. Run `node scripts/setup-ytdlp.mjs`.', 503)
    );
  }
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ['--no-warnings', '--no-playlist', '--ffmpeg-location', ffmpegPath, ...args], {
      windowsHide: true,
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new LinkError('The site took too long to respond. Try again or use a shorter video.', 504));
    }, timeoutMs);
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new LinkError(`Could not start downloader: ${e.message}`, 500));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(out);
      reject(new LinkError(friendlyError(err), 422));
    });
  });
}

function friendlyError(stderr: string): string {
  const s = stderr.toLowerCase();
  if (s.includes('unsupported url')) return 'This link is not supported. Paste a direct video page link.';
  if (s.includes('private video') || s.includes('login') || s.includes('sign in'))
    return 'This video is private or requires login, so it cannot be downloaded.';
  if (s.includes('video unavailable') || s.includes('404')) return 'This video is unavailable or was removed.';
  if (s.includes('geo')) return 'This video is blocked in the server region.';
  const line = stderr.split('\n').find((l) => l.startsWith('ERROR:'));
  return line ? line.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/, '').slice(0, 200) : 'Could not read media from this link.';
}

export interface LinkInfo {
  url: string;
  id: string;
  title: string;
  uploader: string;
  uploaderHandle: string;
  durationSeconds: number;
  thumbnail: string;
  extractor: string;
  heights: number[]; // available video heights, descending
  hasVideo: boolean;
  sizeByHeight: Record<number, number | null>; // bytes estimate
  audioSize: number | null;
}

const infoCache = new Map<string, { at: number; info: LinkInfo }>();

export async function getLinkInfo(url: string): Promise<LinkInfo> {
  const cached = infoCache.get(url);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.info;

  const raw = await runYtdlp(['-J', url], 45_000);
  let j: any;
  try {
    j = JSON.parse(raw);
  } catch {
    throw new LinkError('Could not read media information from this link.');
  }
  const formats: any[] = Array.isArray(j.formats) ? j.formats : [];
  const videoFormats = formats.filter((f) => f.vcodec && f.vcodec !== 'none' && f.height);
  const audioFormats = formats.filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'));
  const bestAudio = audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];
  const audioSize = bestAudio ? bestAudio.filesize || bestAudio.filesize_approx || null : null;

  const sizeByHeight: Record<number, number | null> = {};
  for (const f of videoFormats) {
    const sz = f.filesize || f.filesize_approx || null;
    const prev = sizeByHeight[f.height];
    if (prev === undefined || (sz && (!prev || sz > prev))) sizeByHeight[f.height] = sz;
  }
  const heights = Object.keys(sizeByHeight).map(Number).sort((a, b) => b - a);
  // If only a single muxed file (e.g. TikTok/X), height may come from top-level
  if (heights.length === 0 && j.height) {
    heights.push(j.height);
    sizeByHeight[j.height] = j.filesize || j.filesize_approx || null;
  }

  const uploader = j.uploader || j.channel || j.creator || j.extractor_key || 'Unknown creator';
  const info: LinkInfo = {
    url,
    id: String(j.id || ''),
    title: j.title || j.fulltitle || 'Untitled media',
    uploader,
    uploaderHandle: j.uploader_id ? (String(j.uploader_id).startsWith('@') ? j.uploader_id : `@${j.uploader_id}`) : '',
    durationSeconds: Math.round(Number(j.duration) || 0),
    thumbnail: j.thumbnail || (Array.isArray(j.thumbnails) && j.thumbnails.length ? j.thumbnails[j.thumbnails.length - 1].url : ''),
    extractor: String(j.extractor_key || j.extractor || 'generic').toLowerCase(),
    heights,
    hasVideo: heights.length > 0 || (j.vcodec && j.vcodec !== 'none'),
    sizeByHeight,
    audioSize,
  };
  infoCache.set(url, { at: Date.now(), info });
  return info;
}

export type LinkQuality = 'best' | '2160' | '1440' | '1080' | '720' | '480' | '360' | '240' | '144';

function cacheKey(url: string, variant: string) {
  return crypto.createHash('sha1').update(`${url}::${variant}`).digest('hex').slice(0, 20);
}

const inflight = new Map<string, Promise<string>>();

/**
 * Download a link as MP4 video (H.264/AAC preferred) capped at `quality` height.
 * Returns absolute path of the cached MP4. Concurrent requests for the same
 * url+quality share one download.
 */
export function downloadLinkVideo(url: string, quality: LinkQuality = '1080'): Promise<string> {
  const key = cacheKey(url, `v${quality}`);
  const outPath = path.join(LINK_CACHE_DIR, `${key}.mp4`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) return Promise.resolve(outPath);
  const existing = inflight.get(key);
  if (existing) return existing;

  const p = (async () => {
    fs.mkdirSync(LINK_CACHE_DIR, { recursive: true });
    const sort = quality === 'best' ? 'ext:mp4:m4a' : `res:${quality},ext:mp4:m4a`;
    await runYtdlp(
      ['-S', sort, '--merge-output-format', 'mp4', '--remux-video', 'mp4', '-o', path.join(LINK_CACHE_DIR, `${key}.%(ext)s`), url],
      15 * 60_000
    );
    if (!fs.existsSync(outPath)) {
      // yt-dlp may have produced another extension if remux was impossible
      const alt = fs.readdirSync(LINK_CACHE_DIR).find((f) => f.startsWith(key + '.') && !f.includes('.part'));
      if (!alt) throw new LinkError('Download finished but no file was produced.', 500);
      fs.renameSync(path.join(LINK_CACHE_DIR, alt), outPath);
    }
    return outPath;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/**
 * Download only the audio of a link and transcode to mp3/wav/m4a.
 */
export function downloadLinkAudio(url: string, format: 'mp3' | 'wav' | 'm4a', bitrateKbps = 320): Promise<string> {
  const key = cacheKey(url, `a${format}${bitrateKbps}`);
  const outPath = path.join(LINK_CACHE_DIR, `${key}.${format}`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) return Promise.resolve(outPath);
  const existing = inflight.get(key);
  if (existing) return existing;

  const p = (async () => {
    fs.mkdirSync(LINK_CACHE_DIR, { recursive: true });
    const args = ['-f', 'bestaudio/best', '-x', '--audio-format', format];
    if (format !== 'wav') args.push('--audio-quality', `${bitrateKbps}K`);
    args.push('-o', path.join(LINK_CACHE_DIR, `${key}.%(ext)s`), url);
    await runYtdlp(args, 15 * 60_000);
    if (!fs.existsSync(outPath)) throw new LinkError('Audio conversion failed.', 500);
    return outPath;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function safeFilename(title: string, ext: string): string {
  const base = title.replace(/[\\/:*?"<>|\x00-\x1f]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 100) || 'clapfetch';
  return `${base}.${ext}`;
}
