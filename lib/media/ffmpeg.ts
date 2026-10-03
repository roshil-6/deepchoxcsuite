import ffmpeg from 'fluent-ffmpeg';
import { MediaProbeResult } from '@/lib/media/types';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

export async function probeMedia(filePath: string): Promise<MediaProbeResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      
      const format = metadata.format;
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      const dur = format.duration ? Number(format.duration) : 0;
      resolve({
        durationSeconds: dur,
        duration: dur,
        width: videoStream?.width,
        height: videoStream?.height,
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
        codec: videoStream?.codec_name || audioStream?.codec_name,
        bitrate: format.bit_rate ? Number(format.bit_rate) : 0,
        format: format.format_name || '',
        hasAudio: !!audioStream,
        hasVideo: !!videoStream,
      });
    });
  });
}

export async function generateThumbnail(inputPath: string, outputPath: string, timestampSec?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timestamp = timestampSec !== undefined ? timestampSec : 1;
    ffmpeg(inputPath)
      .inputOptions(['-ss', String(Math.max(0, timestamp))])
      .outputOptions(['-frames:v', '1', '-q:v', '3', '-vf', 'scale=480:-2'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function cutVideo(inputPath: string, outputPath: string, startMs: number, endMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startMs / 1000)
      .setDuration((endMs - startMs) / 1000)
      .outputOptions(['-c copy'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function extractAudio(
  inputPath: string,
  outputPath: string,
  format: 'mp3' | 'wav' | 'aac' | 'flac' | 'm4a',
  bitrate?: number,
  startMs?: number,
  endMs?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath).noVideo();

    if (format === 'mp3') {
      command = command.format('mp3').audioCodec('libmp3lame');
    } else if (format === 'wav') {
      command = command.format('wav');
    } else if (format === 'flac') {
      command = command.format('flac');
    } else if (format === 'm4a' || format === 'aac') {
      command = command.format('mp4').audioCodec('aac');
    } else {
      command = command.format(format);
    }

    if (bitrate && format !== 'wav' && format !== 'flac') {
      command = command.audioBitrate(bitrate);
    } else if (format === 'mp3') {
      command = command.audioBitrate(320);
    }

    if (startMs !== undefined && endMs !== undefined && endMs > startMs) {
      command = command.setStartTime(startMs / 1000).setDuration((endMs - startMs) / 1000);
    }

    command
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function createRingtone(inputPath: string, outputPath: string, startMs: number, endMs: number, target: 'iphone'|'android', fadeIn?: boolean, fadeOut?: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    let duration = (endMs - startMs) / 1000;
    const maxDuration = target === 'iphone' ? 30 : 40;
    if (duration > maxDuration) {
      duration = maxDuration;
    }

    let command = ffmpeg(inputPath)
      .setStartTime(startMs / 1000)
      .setDuration(duration)
      .noVideo();

    const audioFilters = [];
    if (fadeIn) {
      audioFilters.push('afade=t=in:ss=0:d=2');
    }
    if (fadeOut) {
      audioFilters.push(`afade=t=out:st=${duration - 2}:d=2`);
    }

    if (audioFilters.length > 0) {
      command = command.audioFilters(audioFilters);
    }

    if (target === 'iphone') {
      command = command.format('ipod').audioCodec('aac');
    } else {
      command = command.format('mp3').audioCodec('libmp3lame');
    }

    command
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function createReel(inputPath: string, outputPath: string, startMs: number, endMs: number, aspectRatio: '9:16'|'1:1'|'16:9'): Promise<void> {
  return new Promise((resolve, reject) => {
    let filter = '';
    if (aspectRatio === '9:16') {
      filter = 'crop=ih*(9/16):ih';
    } else if (aspectRatio === '1:1') {
      filter = 'crop=ih:ih';
    } else if (aspectRatio === '16:9') {
      filter = 'crop=iw:iw*(9/16)';
    }

    ffmpeg(inputPath)
      .setStartTime(startMs / 1000)
      .setDuration((endMs - startMs) / 1000)
      .videoFilters(filter)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function compressVideo(inputPath: string, outputPath: string, quality: 'smaller'|'balanced'|'higher', resolution?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let crf = 26;
    if (quality === 'smaller') crf = 32;
    if (quality === 'higher') crf = 20;

    let command = ffmpeg(inputPath)
      .videoCodec('libx264')
      .outputOptions([`-crf ${crf}`]);

    if (resolution) {
      command = command.size(resolution);
    }

    command
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function burnSubtitles(inputPath: string, outputPath: string, srtPath: string, fontSize?: number, position?: 'bottom'|'top'|'center'): Promise<void> {
  return new Promise((resolve, reject) => {
    // Basic subtitle burn using subtitles filter. Path needs to be escaped for ffmpeg filter if on windows.
    // For simplicity, standard usage.
    const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    let filter = `subtitles='${escapedSrtPath}'`;
    
    // Note: To properly style subtitles with simple subtitles filter, one might need ASS format.
    // We will just use the standard subtitles filter.
    ffmpeg(inputPath)
      .videoFilters(filter)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function muteVideo(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noAudio()
      .videoCodec('copy')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function grabFrame(inputPath: string, outputPath: string, timestampMs: number, format: 'jpg'|'png' = 'jpg'): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(timestampMs / 1000)
      .frames(1)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

// ─── Timeline renderer ────────────────────────────────

export interface RenderClipInput {
  path: string;
  inSec: number;
  outSec: number;
  muted?: boolean;
  volume?: number;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

function timemarkToSec(t?: string): number {
  if (!t) return 0;
  const [h, m, s] = t.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

/**
 * Render an edited timeline: every clip is trimmed, normalised to a common
 * canvas (first clip's resolution, letterboxed), concatenated in order,
 * optionally cropped (normalised rect) and scaled to an output height.
 * Clips without audio (or muted) get silent audio so concat stays in sync.
 */
export async function renderTimeline(
  clips: RenderClipInput[],
  outputPath: string,
  opts: { crop?: { x: number; y: number; w: number; h: number } | null; outputHeight?: number | null } = {},
  onProgress?: (pct: number) => void
): Promise<void> {
  if (clips.length === 0) throw new Error('Timeline is empty');

  const probes = await Promise.all(clips.map((c) => probeMedia(c.path)));
  const firstVideo = probes.find((p) => p.hasVideo && p.width && p.height);
  if (!firstVideo) throw new Error('Timeline has no video clips');
  probes.forEach((p, i) => {
    if (!p.hasVideo) throw new Error(`Clip ${i + 1} has no video track`);
  });

  const W = even(firstVideo.width!);
  const H = even(firstVideo.height!);
  const total = clips.reduce((s, c) => s + (c.outSec - c.inSec), 0);

  const filters: string[] = [];
  const concatInputs: string[] = [];
  clips.forEach((c, i) => {
    const d = (c.outSec - c.inSec).toFixed(3);
    filters.push(
      `[${i}:v]trim=duration=${d},setpts=PTS-STARTPTS,` +
        `scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
        `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30,format=yuv420p[v${i}]`
    );
    const vol = typeof c.volume === 'number' ? Math.max(0, Math.min(2, c.volume)) : 1;
    if (probes[i].hasAudio && !c.muted && vol > 0) {
      filters.push(
        `[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,` +
          `volume=${vol.toFixed(2)},apad,atrim=duration=${d},asetpts=PTS-STARTPTS[a${i}]`
      );
    } else {
      filters.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${d},aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`);
    }
    concatInputs.push(`[v${i}][a${i}]`);
  });
  filters.push(`${concatInputs.join('')}concat=n=${clips.length}:v=1:a=1[cv][ca]`);

  let last = 'cv';
  const post: string[] = [];
  const crop = opts.crop;
  if (crop && (crop.w < 0.999 || crop.h < 0.999 || crop.x > 0.001 || crop.y > 0.001)) {
    const cw = Math.min(W, even(crop.w * W));
    const ch = Math.min(H, even(crop.h * H));
    const cx = Math.min(W - cw, Math.max(0, Math.round(crop.x * W)));
    const cy = Math.min(H - ch, Math.max(0, Math.round(crop.y * H)));
    post.push(`crop=${cw}:${ch}:${cx}:${cy}`);
  }
  if (opts.outputHeight && opts.outputHeight > 0) {
    post.push(`scale=-2:${even(opts.outputHeight)}`);
  }
  if (post.length) {
    filters.push(`[cv]${post.join(',')},setsar=1[outv]`);
    last = 'outv';
  }

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    clips.forEach((c) => {
      cmd.input(c.path).inputOptions(['-ss', c.inSec.toFixed(3), '-t', (c.outSec - c.inSec + 0.5).toFixed(3)]);
    });
    cmd
      .complexFilter(filters.join(';'))
      .outputOptions([
        '-map', `[${last}]`,
        '-map', '[ca]',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-t', total.toFixed(3),
      ])
      .output(outputPath)
      .on('progress', (p) => {
        if (onProgress && total > 0) {
          const pct = Math.round((timemarkToSec(p.timemark) / total) * 100);
          onProgress(Math.max(1, Math.min(99, pct)));
        }
      })
      .on('end', () => resolve())
      .on('error', (err, _stdout, stderr) => {
        const tail = String(stderr || '').split('\n').filter(Boolean).slice(-3).join(' | ');
        reject(new Error(`${err.message}${tail ? ` — ${tail}` : ''}`));
      })
      .run();
  });
}
