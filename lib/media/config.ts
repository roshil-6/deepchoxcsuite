/* ─── CLAPFETCH MEDIA ENGINE — CONFIGURATION ─── */

import path from 'path';

/** Maximum upload file size in bytes (500 MB) */
export const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024;

/** Maximum ringtone duration in milliseconds */
export const MAX_RINGTONE_DURATION_MS = 30_000; // iPhone M4R limit
export const MAX_ANDROID_RINGTONE_DURATION_MS = 40_000;

/** Maximum AI clip duration in seconds */
export const MAX_AI_CLIP_SECONDS = 30;
export const MIN_AI_CLIP_SECONDS = 5;
export const MAX_AI_CLIP_RESULTS = 3;

/** Temporary file auto-cleanup threshold */
export const TEMP_FILE_MAX_AGE_HOURS = 4;

/** Storage root — local dev uses project-level `storage/` dir */
export const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');
export const UPLOADS_DIR = path.join(STORAGE_ROOT, 'uploads');
export const OUTPUTS_DIR = path.join(STORAGE_ROOT, 'outputs');
export const THUMBNAILS_DIR = path.join(STORAGE_ROOT, 'thumbnails');

/** Allowed MIME types for upload */
export const ALLOWED_MIME_TYPES = new Set([
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',    // .mov
  'video/x-msvideo',    // .avi
  'video/x-matroska',   // .mkv
  // Audio
  'audio/mpeg',         // .mp3
  'audio/mp4',          // .m4a
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
]);

/** Allowed file extensions (fallback if MIME is generic) */
export const ALLOWED_EXTENSIONS = new Set([
  'mp4', 'mov', 'webm', 'avi', 'mkv',
  'mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac',
]);

/** Human-readable format string for the UI */
export const SUPPORTED_FORMATS_DISPLAY = 'MP4, MOV, WebM, MP3, M4A, WAV';

/** Max file size display string */
export const MAX_UPLOAD_DISPLAY = '500 MB';
