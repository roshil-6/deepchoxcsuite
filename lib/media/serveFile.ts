/* ─── CLAPFETCH MEDIA ENGINE — FILE RESPONSE HELPER ─── */

import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.m4r': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.srt': 'application/x-subrip',
  '.vtt': 'text/vtt',
};

export function mimeFor(file: string): string {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function contentDisposition(kind: 'attachment' | 'inline', filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Serve a file from disk. Supports HTTP Range (needed for <video> seeking)
 * and sends an exact Content-Length so browsers never drop the download.
 */
export function serveFile(
  req: Request,
  absPath: string,
  opts: { downloadName?: string; inline?: boolean } = {}
): Response {
  const stat = fs.statSync(absPath);
  const size = stat.size;
  const type = mimeFor(opts.downloadName || absPath);
  const headers: Record<string, string> = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
  };
  if (opts.downloadName) {
    headers['Content-Disposition'] = contentDisposition(opts.inline ? 'inline' : 'attachment', opts.downloadName);
  }

  const range = req.headers.get('range');
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      let start = m[1] ? parseInt(m[1], 10) : 0;
      let end = m[2] ? parseInt(m[2], 10) : size - 1;
      if (!m[1] && m[2]) {
        start = Math.max(0, size - parseInt(m[2], 10));
        end = size - 1;
      }
      if (start >= size || start > end) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      }
      end = Math.min(end, size - 1);
      const stream = fs.createReadStream(absPath, { start, end });
      return new Response(Readable.toWeb(stream) as any, {
        status: 206,
        headers: {
          ...headers,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(end - start + 1),
        },
      });
    }
  }

  const stream = fs.createReadStream(absPath);
  return new Response(Readable.toWeb(stream) as any, {
    status: 200,
    headers: { ...headers, 'Content-Length': String(size) },
  });
}
