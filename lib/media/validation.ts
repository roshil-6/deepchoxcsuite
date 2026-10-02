/* ─── CLAPFETCH MEDIA ENGINE — VALIDATION ─── */

import { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES } from './config';

/**
 * Validate uploaded file type against allowed MIME types.
 * Returns an error string or null if valid.
 */
export function validateFileType(
  mimeType: string,
  filename: string
): string | null {
  // Check MIME type
  if (ALLOWED_MIME_TYPES.has(mimeType)) return null;

  // Fallback: check extension if MIME is generic (e.g. "application/octet-stream")
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return null;

  return `Unsupported file type: ${mimeType}. Supported formats: MP4, MOV, WebM, MP3, M4A, WAV.`;
}

/**
 * Validate file size.
 * Returns an error string or null if valid.
 */
export function validateFileSize(
  sizeBytes: number,
  maxBytes: number = MAX_UPLOAD_SIZE_BYTES
): string | null {
  if (sizeBytes <= 0) {
    return 'File appears to be empty.';
  }
  if (sizeBytes > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    const fileMb = Math.round(sizeBytes / (1024 * 1024));
    return `File is too large (${fileMb} MB). Maximum allowed: ${maxMb} MB.`;
  }
  return null;
}

/**
 * Sanitize a filename to prevent path-traversal and special character issues.
 */
export function sanitizeFilename(name: string): string {
  // Remove path components
  let safe = name.replace(/^.*[\\/]/, '');
  // Remove special characters (keep alphanumeric, dots, hyphens, underscores)
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Collapse multiple underscores
  safe = safe.replace(/_+/g, '_');
  // Ensure it has an extension
  if (!safe.includes('.')) {
    safe = safe + '.bin';
  }
  // Cap length
  if (safe.length > 200) {
    const ext = safe.split('.').pop() || 'bin';
    safe = safe.slice(0, 190) + '.' + ext;
  }
  return safe;
}

/**
 * Basic SSRF protection for URL imports.
 * Blocks private IPs, localhost, and non-HTTP(S) schemes.
 * Returns an error string or null if the URL is safe.
 */
export function validateUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Invalid URL format.';
  }

  // Only allow HTTP/HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Only HTTP and HTTPS URLs are supported.';
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and loopback
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    return 'Local URLs are not allowed.';
  }

  // Block private IP ranges
  const privatePatterns = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/i,
    /^fd/i,
    /^fe80:/i,
  ];

  for (const pattern of privatePatterns) {
    if (pattern.test(hostname)) {
      return 'Private network URLs are not allowed.';
    }
  }

  return null;
}

/**
 * Validate processing job parameters.
 * Returns an error string or null if valid.
 */
export function validateTimeRange(
  startMs: number,
  endMs: number,
  mediaDurationMs: number
): string | null {
  if (startMs < 0) return 'Start time cannot be negative.';
  if (endMs <= startMs) return 'End time must be after start time.';
  if (endMs > mediaDurationMs) return 'End time exceeds media duration.';
  if (endMs - startMs < 100) return 'Selection must be at least 0.1 seconds.';
  return null;
}
