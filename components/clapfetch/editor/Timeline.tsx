'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VolumeX } from 'lucide-react';
import type { EditorSource, TimelineClip } from '@/lib/media/types';
import { MIN_CLIP_SEC, clipDuration, clipStarts, totalDuration } from '@/lib/editor/timelineReducer';
import type { Filmstrip } from './useFilmstrips';

interface TimelineProps {
  clips: TimelineClip[];
  sources: EditorSource[];
  filmstrips: Record<string, Filmstrip>;
  selectedIds: string[];
  playhead: number;
  pxPerSec: number;
  onSeek: (t: number) => void;
  onSelect: (ids: string[], additive: boolean) => void;
  onMove: (id: string, toIndex: number) => void;
  onTrim: (id: string, inSec: number, outSec: number) => void;
  onDropSource: (sourceId: string, index: number) => void;
}

type Drag =
  | { kind: 'move'; id: string; startX: number; active: boolean; slot: number; pointerX: number }
  | { kind: 'trim'; id: string; edge: 'l' | 'r'; startX: number; inSec: number; outSec: number }
  | { kind: 'scrub' };

const TRACK_H = 72;
const RULER_H = 26;
const PAD_X = 12;

const COLORS = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

function fmtRuler(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function tickStep(pps: number) {
  const target = 90 / pps; // ~90px between labels
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  return steps.find((s) => s >= target) || 600;
}

export function Timeline(props: TimelineProps) {
  const { clips, sources, filmstrips, selectedIds, playhead, pxPerSec: pps } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [dropSlot, setDropSlot] = useState<number | null>(null);

  const sourceMap = useMemo(() => Object.fromEntries(sources.map((s, i) => [s.id, { s, color: COLORS[i % COLORS.length] }])), [sources]);

  // Apply live trim draft for rendering
  const viewClips = useMemo(() => {
    if (drag?.kind !== 'trim') return clips;
    return clips.map((c) => (c.id === drag.id ? { ...c, inSec: drag.inSec, outSec: drag.outSec } : c));
  }, [clips, drag]);

  const starts = useMemo(() => clipStarts(viewClips), [viewClips]);
  const total = totalDuration(viewClips);
  const contentW = Math.max(total * pps + PAD_X * 2 + 240, 600);

  // Keep playhead visible while playing / seeking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || drag) return;
    const x = PAD_X + playhead * pps;
    if (x < el.scrollLeft + 40 || x > el.scrollLeft + el.clientWidth - 40) {
      el.scrollLeft = Math.max(0, x - el.clientWidth / 3);
    }
  }, [playhead, pps, drag]);

  const timeAtClientX = (clientX: number) => {
    const el = scrollRef.current!;
    const rect = el.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left + el.scrollLeft - PAD_X) / pps);
  };

  const slotAtTime = (t: number, list = clips) => {
    const st = clipStarts(list);
    let slot = 0;
    list.forEach((c, i) => {
      if (t > st[i] + clipDuration(c) / 2) slot = i + 1;
    });
    return slot;
  };

  const beginWindowDrag = (d: Drag) => {
    dragRef.current = d;
    setDrag(d);

    const move = (ev: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      if (cur.kind === 'scrub') {
        props.onSeek(Math.min(totalDuration(clips), timeAtClientX(ev.clientX)));
        return;
      }
      if (cur.kind === 'move') {
        const active = cur.active || Math.abs(ev.clientX - cur.startX) > 5;
        const next: Drag = { ...cur, active, pointerX: ev.clientX, slot: slotAtTime(timeAtClientX(ev.clientX)) };
        dragRef.current = next;
        setDrag(next);
        return;
      }
      // trim
      const clip = clips.find((c) => c.id === cur.id);
      if (!clip) return;
      const src = sourceMap[clip.sourceId]?.s;
      const maxOut = src?.durationSeconds ?? clip.outSec;
      const dt = (ev.clientX - cur.startX) / pps;
      const next: Drag =
        cur.edge === 'l'
          ? { ...cur, inSec: Math.max(0, Math.min(clip.outSec - MIN_CLIP_SEC, clip.inSec + dt)) }
          : { ...cur, outSec: Math.min(maxOut, Math.max(clip.inSec + MIN_CLIP_SEC, clip.outSec + dt)) };
      dragRef.current = next;
      setDrag(next);
    };

    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const cur = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!cur) return;
      if (cur.kind === 'move') {
        if (cur.active) props.onMove(cur.id, cur.slot);
        else props.onSelect([cur.id], ev.shiftKey || ev.ctrlKey || ev.metaKey);
      } else if (cur.kind === 'trim') {
        props.onTrim(cur.id, cur.inSec, cur.outSec);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    props.onSeek(Math.min(total, timeAtClientX(e.clientX)));
    if (!(e.shiftKey || e.ctrlKey)) props.onSelect([], false);
    beginWindowDrag({ kind: 'scrub' });
  };

  const step = tickStep(pps);
  const ticks: number[] = [];
  const tickEnd = Math.max(total, (contentW - PAD_X) / pps);
  for (let t = 0; t <= tickEnd; t += step) ticks.push(t);

  const indicatorSlot = drag?.kind === 'move' && drag.active ? drag.slot : dropSlot;
  const indicatorX = indicatorSlot === null ? null : PAD_X + (indicatorSlot >= clips.length ? totalDuration(clips) : clipStarts(clips)[indicatorSlot]) * pps;

  return (
    <div
      ref={scrollRef}
      className="relative overflow-x-auto overflow-y-hidden rounded-[16px] bg-[#1B1822] border border-[#2A2533] select-none"
      style={{ height: RULER_H + TRACK_H + 28 }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('application/x-clapfetch-source')) return;
        e.preventDefault();
        setDropSlot(slotAtTime(timeAtClientX(e.clientX)));
      }}
      onDragLeave={() => setDropSlot(null)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData('application/x-clapfetch-source');
        const slot = slotAtTime(timeAtClientX(e.clientX));
        setDropSlot(null);
        if (id) {
          e.preventDefault();
          props.onDropSource(id, slot);
        }
      }}
    >
      <div className="relative" style={{ width: contentW, height: '100%' }}>
        {/* Ruler */}
        <div
          className="absolute left-0 right-0 top-0 cursor-pointer border-b border-[#2A2533]"
          style={{ height: RULER_H }}
          onPointerDown={onBackgroundPointerDown}
        >
          {ticks.map((t) => (
            <div key={t} className="absolute top-0 h-full" style={{ left: PAD_X + t * pps }}>
              <div className="w-px h-2 bg-[#5B5466]" />
              <span className="absolute top-2.5 left-1 text-[10px] font-mono text-[#8F879C]">{fmtRuler(t)}</span>
            </div>
          ))}
        </div>

        {/* Track background (click to seek / deselect) */}
        <div
          className="absolute left-0 right-0"
          style={{ top: RULER_H + 8, height: TRACK_H }}
          onPointerDown={onBackgroundPointerDown}
        />

        {/* Clips */}
        {viewClips.map((clip, i) => {
          const meta = sourceMap[clip.sourceId];
          const left = PAD_X + starts[i] * pps;
          const width = Math.max(6, clipDuration(clip) * pps);
          const selected = selectedIds.includes(clip.id);
          const isDragging = drag?.kind === 'move' && drag.active && drag.id === clip.id;
          const strip = filmstrips[clip.sourceId];
          const tileW = 64;
          const tiles = Math.ceil(width / tileW);

          return (
            <div
              key={clip.id}
              className={`absolute rounded-[10px] overflow-hidden group ${isDragging ? 'opacity-40' : ''}`}
              style={{
                left,
                width,
                top: RULER_H + 8,
                height: TRACK_H,
                background: meta?.color || '#7C3AED',
                boxShadow: selected ? '0 0 0 2px #FFFFFF, 0 0 0 4px #A78BFA' : 'inset 0 0 0 1px rgba(255,255,255,0.15)',
                cursor: 'grab',
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                beginWindowDrag({ kind: 'move', id: clip.id, startX: e.clientX, active: false, slot: i, pointerX: e.clientX });
              }}
              title={`${meta?.s.name || 'Clip'} · ${clipDuration(clip).toFixed(2)}s`}
            >
              {/* filmstrip */}
              {strip && strip.frames.length > 0 && (
                <div className="absolute inset-0 flex pointer-events-none opacity-90">
                  {Array.from({ length: tiles }).map((_, k) => {
                    const t = clip.inSec + ((k + 0.5) * tileW) / pps;
                    const fi = Math.min(strip.frames.length - 1, Math.max(0, Math.floor(t / strip.step)));
                    return (
                      <img
                        key={k}
                        src={strip.frames[fi]}
                        alt=""
                        draggable={false}
                        className="h-full object-cover shrink-0"
                        style={{ width: tileW }}
                      />
                    );
                  })}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 px-2 py-0.5 bg-gradient-to-t from-black/75 to-transparent flex items-center gap-1 pointer-events-none">
                {clip.muted && <VolumeX className="w-3 h-3 text-white/90 shrink-0" />}
                <span className="text-[10px] text-white font-medium truncate">{meta?.s.name || 'Clip'}</span>
                <span className="ml-auto text-[10px] font-mono text-white/80 shrink-0">{clipDuration(clip).toFixed(1)}s</span>
              </div>

              {/* trim handles */}
              {(['l', 'r'] as const).map((edge) => (
                <div
                  key={edge}
                  className={`absolute top-0 bottom-0 w-2.5 bg-white/0 hover:bg-white/90 ${selected ? 'bg-white/70' : ''} transition-colors`}
                  style={{ [edge === 'l' ? 'left' : 'right']: 0, cursor: 'ew-resize' } as React.CSSProperties}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    props.onSelect([clip.id], false);
                    beginWindowDrag({ kind: 'trim', id: clip.id, edge, startX: e.clientX, inSec: clip.inSec, outSec: clip.outSec });
                  }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-0.5 h-5 rounded bg-[#6D3FC0]/70" />
                </div>
              ))}
            </div>
          );
        })}

        {clips.length === 0 && (
          <div
            className="absolute flex items-center justify-center text-xs text-[#8F879C] border border-dashed border-[#3A3444] rounded-[10px]"
            style={{ left: PAD_X, right: PAD_X, top: RULER_H + 8, height: TRACK_H }}
          >
            Timeline is empty — add a video from the media bin or drag one here.
          </div>
        )}

        {/* Drop / reorder indicator */}
        {indicatorX !== null && (
          <div className="absolute w-1 rounded bg-[#FBBF24] pointer-events-none" style={{ left: indicatorX - 2, top: RULER_H + 2, height: TRACK_H + 12 }} />
        )}

        {/* Floating drag ghost */}
        {drag?.kind === 'move' && drag.active && scrollRef.current && (() => {
          const c = clips.find((x) => x.id === drag.id);
          if (!c) return null;
          const el = scrollRef.current!;
          const x = drag.pointerX - el.getBoundingClientRect().left + el.scrollLeft;
          return (
            <div
              className="absolute rounded-[10px] border-2 border-white/80 pointer-events-none"
              style={{
                left: x - 30,
                width: Math.max(40, clipDuration(c) * pps),
                top: RULER_H + 4,
                height: TRACK_H,
                background: (sourceMap[c.sourceId]?.color || '#7C3AED') + 'CC',
              }}
            />
          );
        })()}

        {/* Playhead */}
        <div className="absolute top-0 pointer-events-none" style={{ left: PAD_X + playhead * pps - 1, height: '100%' }}>
          <div className="w-0.5 h-full bg-[#F43F5E]" />
          <div className="absolute -top-0 -left-[5px] w-3 h-3 rotate-45 bg-[#F43F5E] rounded-[2px]" />
        </div>
      </div>
    </div>
  );
}
