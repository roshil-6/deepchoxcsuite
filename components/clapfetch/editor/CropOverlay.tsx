'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { NormalizedCrop } from '@/lib/media/types';

interface CropOverlayProps {
  rect: NormalizedCrop;
  /** Required width/height ratio in NORMALISED units (null = free). */
  ratio: number | null;
  editable: boolean;
  frameW: number;
  frameH: number;
  onCommit: (rect: NormalizedCrop) => void;
}

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

const MIN = 0.05;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Drag/resize crop box drawn over the preview. Coordinates are 0–1. */
export function CropOverlay({ rect, ratio, editable, frameW, frameH, onCommit }: CropOverlayProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<NormalizedCrop>(rect);
  const draftRef = useRef<NormalizedCrop>(rect);
  const dragRef = useRef<{ handle: Handle; x: number; y: number; start: NormalizedCrop } | null>(null);

  useEffect(() => {
    if (!dragRef.current) {
      setDraft(rect);
      draftRef.current = rect;
    }
  }, [rect]);

  const onPointerDown = (handle: Handle) => (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { handle, x: e.clientX, y: e.clientY, start: { ...draftRef.current } };

    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      const box = boxRef.current?.getBoundingClientRect();
      if (!d || !box) return;
      const dx = (ev.clientX - d.x) / box.width;
      const dy = (ev.clientY - d.y) / box.height;
      const s = d.start;
      let next: NormalizedCrop;

      if (d.handle === 'move') {
        next = { ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) };
      } else {
        const left = d.handle === 'nw' || d.handle === 'sw';
        const top = d.handle === 'nw' || d.handle === 'ne';
        // anchor = opposite corner
        const ax = left ? s.x + s.w : s.x;
        const ay = top ? s.y + s.h : s.y;
        let w = clamp(left ? s.w - dx : s.w + dx, MIN, left ? ax : 1 - ax);
        let h = clamp(top ? s.h - dy : s.h + dy, MIN, top ? ay : 1 - ay);
        if (ratio) {
          // keep ratio, limited by available room
          const maxW = left ? ax : 1 - ax;
          const maxH = top ? ay : 1 - ay;
          h = w / ratio;
          if (h > maxH) {
            h = maxH;
            w = h * ratio;
          }
          if (w > maxW) {
            w = maxW;
            h = w / ratio;
          }
          w = Math.max(w, MIN);
          h = Math.max(h, MIN);
        }
        next = { x: left ? ax - w : ax, y: top ? ay - h : ay, w, h };
      }
      draftRef.current = next;
      setDraft(next);
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const d = dragRef.current;
      dragRef.current = null;
      if (d) onCommit(draftRef.current);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const pct = (v: number) => `${v * 100}%`;
  const outW = Math.round(draft.w * frameW);
  const outH = Math.round(draft.h * frameH);

  return (
    <div ref={boxRef} className="absolute inset-0 pointer-events-none select-none">
      {/* dim outside */}
      <div className="absolute bg-black/55" style={{ left: 0, top: 0, right: 0, height: pct(draft.y) }} />
      <div className="absolute bg-black/55" style={{ left: 0, bottom: 0, right: 0, height: pct(1 - draft.y - draft.h) }} />
      <div className="absolute bg-black/55" style={{ left: 0, top: pct(draft.y), width: pct(draft.x), height: pct(draft.h) }} />
      <div className="absolute bg-black/55" style={{ right: 0, top: pct(draft.y), width: pct(1 - draft.x - draft.w), height: pct(draft.h) }} />

      <div
        onPointerDown={onPointerDown('move')}
        className={`absolute border-2 border-white ${editable ? 'pointer-events-auto cursor-move' : ''}`}
        style={{ left: pct(draft.x), top: pct(draft.y), width: pct(draft.w), height: pct(draft.h) }}
      >
        {editable && (
          <>
            {/* rule of thirds */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/40" />
              <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/40" />
              <div className="absolute top-1/3 left-0 right-0 border-t border-white/40" />
              <div className="absolute top-2/3 left-0 right-0 border-t border-white/40" />
            </div>
            {(['nw', 'ne', 'sw', 'se'] as Handle[]).map((h) => (
              <div
                key={h}
                onPointerDown={onPointerDown(h)}
                className="absolute w-4 h-4 bg-white rounded-[3px] shadow border border-[#6D3FC0]"
                style={{
                  left: h.includes('w') ? -8 : undefined,
                  right: h.includes('e') ? -8 : undefined,
                  top: h.includes('n') ? -8 : undefined,
                  bottom: h.includes('s') ? -8 : undefined,
                  cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize',
                }}
              />
            ))}
            <div className="absolute -top-7 left-0 px-2 py-0.5 rounded-[6px] bg-[#6D3FC0] text-white text-[11px] font-mono whitespace-nowrap">
              {outW}×{outH}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
