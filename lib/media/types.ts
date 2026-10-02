/* ─── CLAPFETCH MEDIA ENGINE — CORE TYPES ─── */

// ─── Media ─────────────────────────────────────────────

export interface WorkspaceMedia {
  id: string;
  filename: string;
  url: string; // object-URL (upload) or source URL (import)
  title: string;
  mimeType: string;
  fileSize: number; // bytes
  sizeBytes?: number; // alias for fileSize
  durationSeconds: number;
  type?: 'video' | 'audio';
  width?: number;
  height?: number;
  codec?: string;
  bitrate?: number;
  thumbnailUrl?: string;
  source: 'upload' | 'link';
  sourceUrl?: string;
  storagePath?: string;
  youtubeId?: string;
}

// ─── Timeline / Selection ──────────────────────────────

export interface TimelineSelection {
  startSeconds: number;
  endSeconds: number;
}

// ─── Subtitle ──────────────────────────────────────────

export interface SubtitleCue {
  id: string;
  trackId: string;
  startTime: number; // seconds
  endTime: number;   // seconds
  text: string;
  order: number;
}

export interface SubtitleTrack {
  id: string;
  mediaId: string;
  language: string;       // e.g. "en", "es", "ml"
  label: string;          // e.g. "English — Original"
  isOriginal: boolean;
  createdAt: string;      // ISO 8601
  cues: SubtitleCue[];
}

// ─── Processing Jobs ───────────────────────────────────

export type JobType =
  | 'cut'
  | 'audio_extract'
  | 'extract_audio'
  | 'ringtone'
  | 'reel'
  | 'compress'
  | 'mute'
  | 'frame_grab'
  | 'subtitle_burn'
  | 'subtitle';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ProcessingJob {
  id: string;
  mediaId: string;
  type: JobType;
  status: JobStatus;
  progress: number; // 0–100
  params: ProcessingParams;
  outputUrl?: string;
  outputFilename?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Job-specific parameters ───────────────────────────

export interface CutParams {
  startMs: number;
  endMs: number;
  outputFormat?: 'mp4' | 'webm';
}

export interface AudioExtractParams {
  startMs?: number;
  endMs?: number;
  format: 'mp3' | 'wav' | 'aac' | 'flac' | 'm4a';
  bitrate?: number; // kbps
}

export interface RingtoneParams {
  startMs: number;
  endMs: number;
  target: 'iphone' | 'android';
  fadeIn?: boolean;
  fadeOut?: boolean;
}

export interface ReelParams {
  startMs: number;
  endMs: number;
  aspectRatio: '9:16' | '1:1' | '16:9';
}

export interface CompressParams {
  quality: 'smaller' | 'balanced' | 'higher';
  resolution?: string;  // e.g. "1280x720"
  bitrate?: number;     // kbps
}

export interface MuteParams {
  startMs?: number;
  endMs?: number;
}

export interface FrameGrabParams {
  timestampMs: number;
  format: 'jpg' | 'png';
}

export interface SubtitleBurnParams {
  subtitleTrackId?: string;
  srtPath?: string;
  fontSize?: number;
  position?: 'bottom' | 'top' | 'center';
  textColor?: string;
  backgroundColor?: string;
}

export type SubtitleParams = SubtitleBurnParams;

export type ProcessingParams =
  | CutParams
  | AudioExtractParams
  | RingtoneParams
  | ReelParams
  | CompressParams
  | MuteParams
  | FrameGrabParams
  | SubtitleBurnParams;

// ─── Central Workspace State ───────────────────────────

export type WorkspaceTool =
  | 'trim'
  | 'crop'
  | 'reel'
  | 'compress'
  | 'mute'
  | 'frame'
  | 'audio_extract'
  | 'audio_trim'
  | 'ringtone'
  | 'subtitle_generate'
  | 'subtitle_import'
  | 'subtitle_edit'
  | 'subtitle_translate'
  | 'subtitle_export'
  | 'find_clip';

export interface CropSettings {
  aspectRatio: '9:16' | '1:1' | '16:9' | 'original';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'mp3' | 'wav' | 'aac' | 'm4r' | 'srt' | 'vtt';
  quality: 'smaller' | 'balanced' | 'higher';
}

export interface WorkspaceState {
  media: WorkspaceMedia | null;
  currentTime: number;        // seconds
  isPlaying: boolean;
  selectionStart: number;     // seconds
  selectionEnd: number;       // seconds
  activeTool: WorkspaceTool;
  subtitleTracks: SubtitleTrack[];
  activeSubtitleTrackId: string | null;
  crop: CropSettings;
  exportSettings: ExportSettings;
  processingJobs: ProcessingJob[];
}

// ─── AI Clip Finder ────────────────────────────────────

export interface ClipFinderResult {
  start: number;  // seconds
  end: number;    // seconds
  reason: string; // e.g. "Discussion of the cooling failure."
}

// ─── Media Probe ───────────────────────────────────────

export interface MediaProbeResult {
  durationSeconds: number;
  duration?: number; // alias
  width?: number;
  height?: number;
  resolution?: string;
  codec?: string;
  audioCodec?: string;
  bitrate?: number;
  fps?: number;
  format: string;
  hasAudio: boolean;
  hasVideo: boolean;
}
