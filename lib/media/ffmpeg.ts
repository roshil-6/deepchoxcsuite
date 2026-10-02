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
      .screenshots({
        timestamps: [timestamp] as any,
        filename: outputPath.split('/').pop() || outputPath.split('\\').pop() || 'thumbnail.jpg',
        folder: outputPath.substring(0, Math.max(outputPath.lastIndexOf('/'), outputPath.lastIndexOf('\\'))) || '.',
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
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

export async function extractAudio(inputPath: string, outputPath: string, format: 'mp3'|'wav'|'aac', bitrate?: number, startMs?: number, endMs?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath).noVideo().format(format);
    
    if (bitrate) {
      command = command.audioBitrate(bitrate);
    } else {
      command = command.audioBitrate('320k');
    }
    
    if (startMs !== undefined && endMs !== undefined) {
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
