'use client';

import { useEffect, useRef, useState } from 'react';
import type { EditorSource } from '@/lib/media/types';

export interface Filmstrip {
  step: number;     // seconds between frames
  frames: string[]; // data URLs, frames[i] ≈ time i*step
}

const MAX_FRAMES = 40;
const THUMB_H = 72;

/**
 * Extract thumbnail frames from each source in the browser (hidden <video> +
 * canvas). Sources are processed one at a time to keep the page responsive.
 */
export function useFilmstrips(sources: EditorSource[]): Record<string, Filmstrip> {
  const [strips, setStrips] = useState<Record<string, Filmstrip>>({});
  const doneRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const queue = sources.filter((s) => s.url && s.durationSeconds > 0 && !doneRef.current.has(`${s.id}|${s.url}`));
    if (!queue.length || busyRef.current) return;
    busyRef.current = true;

    (async () => {
      for (const src of queue) {
        if (cancelled) break;
        const key = `${src.id}|${src.url}`;
        doneRef.current.add(key);
        try {
          const strip = await extract(src, (partial) => {
            if (!cancelled) setStrips((prev) => ({ ...prev, [src.id]: partial }));
          });
          if (!cancelled) setStrips((prev) => ({ ...prev, [src.id]: strip }));
        } catch {
          /* filmstrip is cosmetic */
        }
      }
      busyRef.current = false;
    })();

    return () => {
      cancelled = true;
      busyRef.current = false;
    };
  }, [sources]);

  return strips;
}

function extract(src: EditorSource, onPartial: (s: Filmstrip) => void): Promise<Filmstrip> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = src.url;

    const step = Math.max(0.5, src.durationSeconds / MAX_FRAMES);
    const count = Math.max(1, Math.min(MAX_FRAMES, Math.ceil(src.durationSeconds / step)));
    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let i = 0;
    const timeout = setTimeout(() => finish(), 45_000);

    function finish() {
      clearTimeout(timeout);
      video.removeAttribute('src');
      video.load();
      if (frames.length) resolve({ step, frames });
      else reject(new Error('no frames'));
    }

    video.addEventListener('error', () => finish(), { once: true });
    video.addEventListener(
      'loadedmetadata',
      () => {
        const ar = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
        canvas.height = THUMB_H;
        canvas.width = Math.round(THUMB_H * ar);
        video.currentTime = Math.min(0.05, src.durationSeconds / 2);
      },
      { once: true }
    );
    video.addEventListener('seeked', () => {
      try {
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.6));
      } catch {
        return finish(); // tainted canvas etc.
      }
      i += 1;
      if (i % 8 === 0) onPartial({ step, frames: [...frames] });
      if (i >= count) return finish();
      video.currentTime = Math.min(src.durationSeconds - 0.05, i * step + 0.05);
    });
  });
}
