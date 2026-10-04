/* ─── CLAPFETCH MEDIA ENGINE — yt-dlp LINK EXTRACTOR ─── */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { STORAGE_ROOT } from './config';

export const LINK_CACHE_DIR = path.join(STORAGE_ROOT, 'links');

function getFfmpegLocation(): string | null {
  try {
    const p = require('@ffmpeg-installer/ffmpeg').path;
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return null;
}

export function getYtdlpPath(): string | null {
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
  const candidates = [
    process.env.YTDLP_PATH,
    path.join(os.tmpdir(), binName),
    path.resolve(process.cwd(), 'bin', binName),
    path.join('/tmp', binName),
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        const stat = fs.statSync(c);
        if (stat.size > 5_000_000) {
          if (!isWin) {
            try { fs.chmodSync(c, 0o755); } catch {}
          }
          return c;
        }
      }
    } catch {}
  }
  return null;
}

let provisioningPromise: Promise<string> | null = null;

/**
 * Automatically provisions yt-dlp if not found on the system.
 * Works seamlessly in local dev, Docker, and serverless environments (e.g. Vercel).
 */
export async function ensureYtdlp(): Promise<string> {
  const existing = getYtdlpPath();
  if (existing) return existing;

  if (provisioningPromise) return provisioningPromise;

  provisioningPromise = (async () => {
    try {
      const isWin = process.platform === 'win32';
      const isMac = process.platform === 'darwin';
      const isArm = process.arch === 'arm64';
      const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
      const tmpTarget = path.join(os.tmpdir(), binName);

      // Check if project bin has it (e.g. bundled during build or Next.js outputFileTracing)
      const projectBin = path.resolve(process.cwd(), 'bin', binName);
      if (fs.existsSync(projectBin)) {
        try {
          const stat = fs.statSync(projectBin);
          if (stat.size > 5_000_000) {
            // In serverless / read-only containers, copy to tmpTarget to ensure execution permission
            if (projectBin !== tmpTarget) {
              fs.copyFileSync(projectBin, tmpTarget);
              if (!isWin) {
                try { fs.chmodSync(tmpTarget, 0o755); } catch {}
              }
              return tmpTarget;
            }
            if (!isWin) {
              try { fs.chmodSync(projectBin, 0o755); } catch {}
            }
            return projectBin;
          }
        } catch (err) {
          console.warn('[clapfetch] Could not use project bin, falling back to download:', err);
        }
      }

      // If not present in project bin, download directly from GitHub release to tmpTarget
      const asset = isWin
        ? 'yt-dlp.exe'
        : isMac
        ? 'yt-dlp_macos'
        : isArm
        ? 'yt-dlp_linux_aarch64'
        : 'yt-dlp_linux';

      const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
      console.log(`[clapfetch] Auto-provisioning yt-dlp binary from ${downloadUrl} to ${tmpTarget}...`);

      const res = await fetch(downloadUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DeepChox/1.0; +https://deepchox.com)',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to download yt-dlp binary: HTTP ${res.status}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 5_000_000) {
        throw new Error(`Downloaded yt-dlp binary is incomplete (${buffer.length} bytes)`);
      }

      fs.writeFileSync(tmpTarget, buffer);
      if (!isWin) {
        try { fs.chmodSync(tmpTarget, 0o755); } catch {}
      }
      console.log(`[clapfetch] Successfully provisioned yt-dlp to ${tmpTarget} (${(buffer.length / 1048576).toFixed(1)} MB)`);
      return tmpTarget;
    } finally {
      provisioningPromise = null;
    }
  })();

  return provisioningPromise;
}

export class LinkError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

async function runYtdlp(args: string[], timeoutMs: number): Promise<string> {
  let bin = getYtdlpPath();
  if (!bin) {
    try {
      bin = await ensureYtdlp();
    } catch (e: any) {
      console.error('[clapfetch] Failed to provision yt-dlp:', e);
      throw new LinkError(
        'Link downloader is initializing or temporarily unavailable. Please try again in a few moments.',
        503
      );
    }
  }

  const ffmpegLoc = getFfmpegLocation();
  const spawnArgs = ['--no-warnings', '--no-playlist'];
  if (ffmpegLoc) {
    spawnArgs.push('--ffmpeg-location', ffmpegLoc);
  }
  spawnArgs.push('--extractor-args', 'youtube:player_client=default,ios,android');
  spawnArgs.push(...args);

  return new Promise((resolve, reject) => {
    const child = spawn(bin!, spawnArgs, {
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
