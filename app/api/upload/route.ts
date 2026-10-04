import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { validateFileType, validateFileSize, sanitizeFilename } from '@/lib/media/validation';
import { saveUpload, resolveStoragePath, getTempOutputPath, mediaUrlFor } from '@/lib/media/storage';
import { probeMedia, generateThumbnail } from '@/lib/media/ffmpeg';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    const typeError = validateFileType(file.type, file.name);
    if (typeError) {
      return NextResponse.json({ ok: false, error: typeError }, { status: 400 });
    }

    const sizeError = validateFileSize(file.size);
    if (sizeError) {
      return NextResponse.json({ ok: false, error: sizeError }, { status: 400 });
    }

    const id = uuid();
    const sessionId = req.headers.get('X-Session-Id') || 'anon';

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = sanitizeFilename(file.name);
    const { storagePath, absolutePath } = await saveUpload(buffer, `${id}-${filename}`, sessionId);

    let durationSeconds = 60;
    let width: number | undefined;
    let height: number | undefined;
    let codec: string | undefined;
    let thumbnailUrl: string | undefined;

    try {
      const probeResult = await probeMedia(absolutePath);
      durationSeconds = probeResult.durationSeconds || probeResult.duration || 60;
      width = probeResult.width;
      height = probeResult.height;
      codec = probeResult.codec;

      if (probeResult.hasVideo) {
        const tempThumbPath = getTempOutputPath('jpg');
        try {
          await generateThumbnail(absolutePath, tempThumbPath);
          if (fs.existsSync(tempThumbPath)) {
            const thumbBuffer = fs.readFileSync(tempThumbPath);
            const thumbSave = await saveUpload(thumbBuffer, `${id}-thumb.jpg`, sessionId);
            thumbnailUrl = mediaUrlFor(thumbSave.absolutePath);
            try { fs.unlinkSync(tempThumbPath); } catch {}
          }
        } catch (thumbErr) {
          console.warn('Thumbnail generation skipped:', thumbErr);
        }
      }
    } catch (probeErr) {
      console.warn('ffprobe metadata probe failed or skipped:', probeErr);
    }

    return NextResponse.json({
      ok: true,
      media: {
        id,
        filename,
        mimeType: file.type || 'video/mp4',
        fileSize: file.size,
        durationSeconds,
        width,
        height,
        codec,
        thumbnailUrl,
        storagePath,
        serverUrl: mediaUrlFor(absolutePath),
        source: 'upload',
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Upload failed' }, { status: 500 });
  }
}
