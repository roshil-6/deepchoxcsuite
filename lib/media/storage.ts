/* ─── CLAPFETCH MEDIA ENGINE — STORAGE ─── */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { STORAGE_ROOT, UPLOADS_DIR, OUTPUTS_DIR, THUMBNAILS_DIR, TEMP_FILE_MAX_AGE_HOURS } from './config';

/**
 * Ensure all storage directories exist.
 */
export async function ensureStorageDirs(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(OUTPUTS_DIR, { recursive: true });
  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
}

/**
 * Save an uploaded file to the uploads directory.
 * Returns the relative storage path and absolute path.
 */
export async function saveUpload(
  buffer: Buffer,
  originalFilename: string,
  sessionId: string
): Promise<{ storagePath: string; absolutePath: string }> {
  const sessionDir = path.join(UPLOADS_DIR, sessionId);
  await fs.mkdir(sessionDir, { recursive: true });

  const ext = path.extname(originalFilename) || '.bin';
  const filename = `${uuid()}${ext}`;
  const absolutePath = path.join(sessionDir, filename);
  const storagePath = path.relative(process.cwd(), absolutePath);

  await fs.writeFile(absolutePath, buffer);

  return { storagePath, absolutePath };
}

/**
 * Save a processing output file.
 * Returns the relative storage path and absolute path.
 */
export async function saveOutput(
  sourcePath: string,
  jobId: string,
  outputFilename: string
): Promise<{ storagePath: string; absolutePath: string }> {
  const jobDir = path.join(OUTPUTS_DIR, jobId);
  await fs.mkdir(jobDir, { recursive: true });

  const absolutePath = path.join(jobDir, outputFilename);
  const storagePath = path.relative(process.cwd(), absolutePath);

  // Move from temp to output location
  await fs.copyFile(sourcePath, absolutePath);
  // Remove temp source
  try { await fs.unlink(sourcePath); } catch { /* ignore */ }

  return { storagePath, absolutePath };
}

/**
 * Resolve a storage path to an absolute filesystem path.
 */
export function resolveStoragePath(storagePath: string): string {
  // If already absolute, return as-is
  if (path.isAbsolute(storagePath)) return storagePath;
  return path.resolve(process.cwd(), storagePath);
}

/**
 * Resolve a client-supplied storage path, refusing anything that escapes
 * the storage root (path traversal) or does not exist. Returns null if unsafe.
 */
export function resolveInsideStorage(storagePath: unknown): string | null {
  if (typeof storagePath !== 'string' || !storagePath) return null;
  const fsSync = require('fs');
  const abs = path.resolve(process.cwd(), storagePath);
  const rel = path.relative(STORAGE_ROOT, abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  if (!fsSync.existsSync(abs) || !fsSync.statSync(abs).isFile()) return null;
  return abs;
}

/** URL the browser can use to stream a stored file (supports seeking). */
export function mediaUrlFor(absPath: string): string {
  return `/api/media?path=${encodeURIComponent(path.relative(process.cwd(), absPath))}`;
}

/**
 * Get a temporary file path for FFmpeg output.
 */
export function getTempOutputPath(ext: string): string {
  const fsSync = require('fs');
  if (!fsSync.existsSync(OUTPUTS_DIR)) {
    fsSync.mkdirSync(OUTPUTS_DIR, { recursive: true });
  }
  return path.join(OUTPUTS_DIR, `tmp_${uuid()}.${ext}`);
}

/**
 * Delete a file if it exists.
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File doesn't exist or already deleted
  }
}

/**
 * Clean up expired temporary files older than the configured threshold.
 */
export async function cleanupExpired(
  maxAgeHours: number = TEMP_FILE_MAX_AGE_HOURS
): Promise<number> {
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  let removed = 0;

  for (const dir of [UPLOADS_DIR, OUTPUTS_DIR, THUMBNAILS_DIR]) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        try {
          const stat = await fs.stat(entryPath);
          if (stat.mtimeMs < cutoff) {
            if (entry.isDirectory()) {
              await fs.rm(entryPath, { recursive: true, force: true });
            } else {
              await fs.unlink(entryPath);
            }
            removed++;
          }
        } catch { /* skip inaccessible */ }
      }
    } catch { /* dir might not exist yet */ }
  }

  return removed;
}

/**
 * Get the file size of a stored file.
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath);
  return stat.size;
}
