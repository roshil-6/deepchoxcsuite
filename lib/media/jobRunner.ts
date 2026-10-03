import { ProcessingJob, JobType, ProcessingParams, CutParams, AudioExtractParams, RingtoneParams, ReelParams, CompressParams, SubtitleParams, MuteParams, FrameGrabParams, TimelineRenderParams } from '@/lib/media/types';
import { v4 as uuid } from 'uuid';
import { getTempOutputPath, saveOutput } from '@/lib/media/storage';
import { cutVideo, extractAudio, createRingtone, createReel, compressVideo, burnSubtitles, muteVideo, grabFrame, renderTimeline, RenderClipInput } from '@/lib/media/ffmpeg';

const jobs: Map<string, ProcessingJob> =
  (globalThis as any).__clapfetch_jobs__ ||
  ((globalThis as any).__clapfetch_jobs__ = new Map<string, ProcessingJob>());

export function createJob(mediaId: string, type: JobType, params: ProcessingParams): ProcessingJob {
  const job: ProcessingJob = {
    id: uuid(),
    mediaId,
    type,
    params,
    status: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(jobId: string): ProcessingJob | undefined {
  return jobs.get(jobId);
}

export function getAllJobs(): ProcessingJob[] {
  return Array.from(jobs.values());
}

export async function processJob(jobId: string, inputPath: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  job.updatedAt = new Date().toISOString();

  try {
    const ext = getExtensionForJob(job.type, job.params);
    const tempOutputPath = getTempOutputPath(ext);

    switch (job.type) {
      case 'cut': {
        const p = job.params as CutParams;
        await cutVideo(inputPath, tempOutputPath, p.startMs, p.endMs);
        break;
      }
      case 'audio_extract':
      case 'extract_audio': {
        const p = job.params as AudioExtractParams;
        await extractAudio(inputPath, tempOutputPath, p.format, p.bitrate, p.startMs, p.endMs);
        break;
      }
      case 'ringtone': {
        const p = job.params as RingtoneParams;
        await createRingtone(inputPath, tempOutputPath, p.startMs, p.endMs, p.target, p.fadeIn, p.fadeOut);
        break;
      }
      case 'reel': {
        const p = job.params as ReelParams;
        await createReel(inputPath, tempOutputPath, p.startMs, p.endMs, p.aspectRatio);
        break;
      }
      case 'compress': {
        const p = job.params as CompressParams;
        await compressVideo(inputPath, tempOutputPath, p.quality, p.resolution);
        break;
      }
      case 'subtitle_burn':
      case 'subtitle': {
        const p = job.params as SubtitleParams;
        await burnSubtitles(inputPath, tempOutputPath, p.srtPath || '', p.fontSize, p.position);
        break;
      }
      case 'mute': {
        await muteVideo(inputPath, tempOutputPath);
        break;
      }
      case 'frame_grab': {
        const p = job.params as FrameGrabParams;
        await grabFrame(inputPath, tempOutputPath, p.timestampMs, p.format);
        break;
      }
      default:
        throw new Error(`Unsupported job type: ${job.type}`);
    }

    await saveOutput(tempOutputPath, job.id, `${job.id}.${ext}`);
    
    job.status = 'completed';
    job.progress = 100;
    job.outputUrl = `/api/download/${job.id}`;
    job.outputFilename = `${job.id}.${ext}`;
    job.updatedAt = new Date().toISOString();

  } catch (error: any) {
    console.error('Job processing error:', error);
    job.status = 'failed';
    job.errorMessage = error?.message || 'Unknown error occurred';
    job.updatedAt = new Date().toISOString();
  }
}

function getExtensionForJob(type: JobType, params: ProcessingParams): string {
  if (type === 'audio_extract' || type === 'extract_audio') {
    return (params as AudioExtractParams).format || 'mp3';
  }
  if (type === 'ringtone') {
    return (params as RingtoneParams).target === 'iphone' ? 'm4r' : 'mp3';
  }
  if (type === 'frame_grab') {
    return (params as FrameGrabParams).format || 'jpg';
  }
  return 'mp4';
}

/**
 * Run a timeline render job. `clips` must already be resolved to absolute,
 * validated paths by the caller.
 */
export async function processTimelineJob(jobId: string, clips: RenderClipInput[]): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'processing';
  job.progress = 1;
  job.updatedAt = new Date().toISOString();

  try {
    const p = job.params as TimelineRenderParams;
    const tempOutputPath = getTempOutputPath('mp4');
    await renderTimeline(clips, tempOutputPath, { crop: p.crop, outputHeight: p.outputHeight }, (pct) => {
      job.progress = pct;
      job.updatedAt = new Date().toISOString();
    });
    await saveOutput(tempOutputPath, job.id, `${job.id}.mp4`);
    job.status = 'completed';
    job.progress = 100;
    job.outputUrl = `/api/download/${job.id}`;
    job.outputFilename = `${job.id}.mp4`;
    job.updatedAt = new Date().toISOString();
  } catch (error: any) {
    console.error('Timeline render error:', error);
    job.status = 'failed';
    job.errorMessage = error?.message || 'Render failed';
    job.updatedAt = new Date().toISOString();
  }
}
