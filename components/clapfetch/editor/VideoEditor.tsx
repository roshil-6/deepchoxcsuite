'use client';

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  CopyPlus,
  Undo2,
  Redo2,
  Crop as CropIcon,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  Link2,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle2,
  Film,
  Volume2,
  VolumeX,
  Keyboard,
  Maximize,
} from 'lucide-react';
import type { EditorSource, WorkspaceMedia } from '@/lib/media/types';
import {
  AspectPreset,
  clipDuration,
  clipStarts,
  cropRectForAspect,
  editorReducer,
  initialEditorState,
  locate,
  totalDuration,
} from '@/lib/editor/timelineReducer';
import { Timeline } from './Timeline';
import { CropOverlay } from './CropOverlay';
import { useFilmstrips } from './useFilmstrips';

interface VideoEditorProps {
  media: WorkspaceMedia;
}

const FPS = 30;

function fmt(t: number) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const f = Math.floor((t % 1) * FPS);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

function sourceFromMedia(media: WorkspaceMedia): EditorSource {
  return {
    id: `src_${media.id}`,
    name: media.title || media.filename || 'Video',
    url: media.url,
    storagePath: media.storagePath,
    durationSeconds: Math.max(0.2, media.durationSeconds || 0),
    width: media.width,
    height: media.height,
    thumbnailUrl: media.thumbnailUrl,
  };
}

async function readDuration(url: string): Promise<{ d: number; w?: number; h?: number }> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = url;
    const done = (d = 0) => resolve({ d, w: v.videoWidth || undefined, h: v.videoHeight || undefined });
    v.onloadedmetadata = () => done(isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => done(0);
    setTimeout(() => done(0), 8000);
  });
}

export function VideoEditor({ media }: VideoEditorProps) {
  const [state, dispatch] = useReducer(editorReducer, undefined, () => initialEditorState([sourceFromMedia(media)]));
  const { sources, doc, selectedIds, clipboard } = state;
  const { clips, crop } = doc;

  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(40);
  const [cropMode, setCropMode] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [showKeys, setShowKeys] = useState(false);

  // Export state
  const [outputHeight, setOutputHeight] = useState<number | 0>(0);
  const [render, setRender] = useState<{ status: 'idle' | 'running' | 'done' | 'failed'; progress: number; url?: string; error?: string }>({
    status: 'idle',
    progress: 0,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineWrapRef = useRef<HTMLDivElement>(null);
  const clipsRef = useRef(clips);
  clipsRef.current = clips;
  const sourceMap = useMemo(() => Object.fromEntries(sources.map((s) => [s.id, s])), [sources]);
  const sourceMapRef = useRef(sourceMap);
  sourceMapRef.current = sourceMap;
  const curIdxRef = useRef(-1);
  const switchingRef = useRef(false);
  const playingRef = useRef(false);
  playingRef.current = playing;

  const filmstrips = useFilmstrips(sources);
  const total = totalDuration(clips);

  // Canvas = first clip's source resolution (matches the server render)
  const canvasSrc = clips.length ? sourceMap[clips[0].sourceId] : sources[0];
  const frameW = canvasSrc?.width || 1280;
  const frameH = canvasSrc?.height || 720;

  // ─── Initial media: make sure it exists on the server ───
  useEffect(() => {
    const first = sources[0];
    if (!first) return;
    if (!first.width || !first.height || !media.durationSeconds) {
      readDuration(first.url).then(({ d, w, h }) => {
        dispatch({ type: 'UPDATE_SOURCE', id: first.id, patch: { ...(d ? { durationSeconds: d } : {}), width: w, height: h } });
      });
    }
    if (!first.storagePath && media.sourceUrl) {
      importLink(media.sourceUrl, first.id);
    } else if (!first.storagePath) {
      setNotice({ kind: 'error', text: 'This video is not on the server yet, so it cannot be exported. Re-upload it with "Add video".' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  // ─── Preview engine ───
  const loadAt = useCallback((t: number, autoplay: boolean) => {
    const v = videoRef.current;
    const list = clipsRef.current;
    if (!v || !list.length) return;
    const hit = locate(list, Math.min(t, totalDuration(list)));
    if (!hit) return;
    const src = sourceMapRef.current[hit.clip.sourceId];
    if (!src) return;
    curIdxRef.current = hit.index;
    const target = hit.clip.inSec + hit.offset;
    v.muted = !!hit.clip.muted;
    v.volume = Math.max(0, Math.min(1, hit.clip.volume ?? 1));

    const seekAndPlay = () => {
      switchingRef.current = true;
      const onSeeked = () => {
        switchingRef.current = false;
        if (autoplay) v.play().catch(() => setPlaying(false));
      };
      v.addEventListener('seeked', onSeeked, { once: true });
      v.currentTime = Math.max(0, target);
    };

    if (v.dataset.srcId !== src.id || v.dataset.srcUrl !== src.url) {
      v.dataset.srcId = src.id;
      v.dataset.srcUrl = src.url;
      switchingRef.current = true;
      v.src = src.url;
      v.addEventListener('loadedmetadata', seekAndPlay, { once: true });
    } else {
      seekAndPlay();
    }
  }, []);

  // RAF loop while playing
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      const list = clipsRef.current;
      const idx = curIdxRef.current;
      const clip = list[idx];
      if (!v || !clip) {
        setPlaying(false);
        return;
      }
      if (!switchingRef.current && v.readyState >= 2) {
        const starts = clipStarts(list);
        if (v.currentTime >= clip.outSec - 0.015 || v.ended) {
          if (idx + 1 < list.length) {
            const next = list[idx + 1];
            // Seamless continue when the next clip starts where this one ends
            if (next.sourceId === clip.sourceId && Math.abs(next.inSec - clip.outSec) < 0.05) {
              curIdxRef.current = idx + 1;
              v.muted = !!next.muted;
              v.volume = Math.max(0, Math.min(1, next.volume ?? 1));
            } else {
              v.pause();
              loadAt(starts[idx + 1] + 0.0001, true);
            }
          } else {
            v.pause();
            setPlaying(false);
            setPlayhead(totalDuration(list));
            return;
          }
        } else {
          setPlayhead(starts[idx] + Math.max(0, v.currentTime - clip.inSec));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, loadAt]);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(t, totalDuration(clipsRef.current)));
      setPlayhead(clamped);
      loadAt(clamped, playingRef.current);
    },
    [loadAt]
  );

  // Re-sync preview when the edit changes while paused
  useEffect(() => {
    if (playingRef.current) {
      videoRef.current?.pause();
      setPlaying(false);
    }
    const t = Math.min(playhead, total);
    if (t !== playhead) setPlayhead(t);
    loadAt(t, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips, sources]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || !clipsRef.current.length) return;
    if (playingRef.current) {
      v.pause();
      setPlaying(false);
    } else {
      const start = playhead >= total - 0.05 ? 0 : playhead;
      setPlayhead(start);
      setPlaying(true);
      loadAt(start, true);
    }
  }, [playhead, total, loadAt]);

  // ─── Sources: upload / link import ───
  const uploadFile = async (file: File) => {
    const id = `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const blobUrl = URL.createObjectURL(file);
    const meta = await readDuration(blobUrl);
    if (!meta.d) {
      setNotice({ kind: 'error', text: `"${file.name}" is not a playable video.` });
      return;
    }
    dispatch({
      type: 'ADD_SOURCE',
      source: { id, name: file.name.replace(/\.[^.]+$/, ''), url: blobUrl, durationSeconds: meta.d, width: meta.w, height: meta.h },
    });
    setBusy(`Uploading ${file.name}…`);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Upload failed');
      dispatch({
        type: 'UPDATE_SOURCE',
        id,
        patch: { storagePath: data.media.storagePath, width: data.media.width || meta.w, height: data.media.height || meta.h, thumbnailUrl: data.media.thumbnailUrl },
      });
    } catch (e: any) {
      setNotice({ kind: 'error', text: `Upload failed for ${file.name}: ${e?.message || 'network error'}` });
    } finally {
      setBusy(null);
    }
  };

  const importLink = async (url: string, replaceId?: string) => {
    setBusy('Downloading video from link… (large videos can take a minute)');
    setNotice(null);
    try {
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Import failed');
      const m = data.media;
      const patch: Partial<EditorSource> = {
        name: m.title,
        url: m.url,
        storagePath: m.storagePath,
        durationSeconds: m.durationSeconds,
        width: m.width,
        height: m.height,
        thumbnailUrl: m.thumbnailUrl,
      };
      if (replaceId) dispatch({ type: 'UPDATE_SOURCE', id: replaceId, patch });
      else dispatch({ type: 'ADD_SOURCE', source: { ...(patch as EditorSource), id: `src_${m.id}` } });
      setLinkInput('');
    } catch (e: any) {
      setNotice({ kind: 'error', text: e?.message || 'Could not import this link.' });
    } finally {
      setBusy(null);
    }
  };

  // ─── Edit commands ───
  const cmd = {
    split: () => dispatch({ type: 'SPLIT', time: playhead }),
    del: () => dispatch({ type: 'DELETE' }),
    copy: () => {
      dispatch({ type: 'COPY' });
      if (selectedIds.length) setNotice({ kind: 'info', text: `Copied ${selectedIds.length} clip(s). Move the playhead and press Paste.` });
    },
    cut: () => dispatch({ type: 'CUT' }),
    paste: () => dispatch({ type: 'PASTE', time: playhead }),
    duplicate: () => dispatch({ type: 'DUPLICATE' }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
  };
  const cmdRef = useRef(cmd);
  cmdRef.current = cmd;

  const step = useCallback((dt: number) => {
    if (playingRef.current) {
      videoRef.current?.pause();
      setPlaying(false);
    }
    setPlayhead((p) => {
      const t = Math.max(0, Math.min(totalDuration(clipsRef.current), p + dt));
      loadAt(t, false);
      return t;
    });
  }, [loadAt]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const c = cmdRef.current;
      let handled = true;
      if (k === ' ') togglePlay();
      else if (mod && k === 'z' && e.shiftKey) c.redo();
      else if (mod && k === 'z') c.undo();
      else if (mod && k === 'y') c.redo();
      else if (mod && k === 'c') c.copy();
      else if (mod && k === 'x') c.cut();
      else if (mod && k === 'v') c.paste();
      else if (mod && k === 'd') c.duplicate();
      else if ((mod && k === 'b') || (!mod && k === 's')) c.split();
      else if (k === 'delete' || k === 'backspace') c.del();
      else if (k === 'arrowleft') step(e.shiftKey ? -1 : -1 / FPS);
      else if (k === 'arrowright') step(e.shiftKey ? 1 : 1 / FPS);
      else if (k === 'home') seek(0);
      else if (k === 'end') seek(totalDuration(clipsRef.current));
      else if (k === 'escape') {
        dispatch({ type: 'SELECT', ids: [] });
        setCropMode(false);
      } else handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, step, seek]);

  // ─── Zoom ───
  const fitZoom = useCallback(() => {
    const w = timelineWrapRef.current?.clientWidth || 800;
    if (total > 0) setPxPerSec(Math.max(2, Math.min(400, (w - 80) / total)));
  }, [total]);
  const didFit = useRef(false);
  useEffect(() => {
    if (!didFit.current && total > 0.3) {
      didFit.current = true;
      fitZoom();
    }
  }, [total, fitZoom]);

  // ─── Crop ───
  const ratioFor = (aspect: AspectPreset) => {
    if (aspect === 'free') return null;
    const [a, b] = aspect.split(':').map(Number);
    return a / b / (frameW / frameH);
  };
  const setAspect = (aspect: AspectPreset) => {
    dispatch({ type: 'SET_CROP', crop: { enabled: true, aspect, rect: cropRectForAspect(aspect, frameW, frameH) } });
    setCropMode(true);
  };

  // ─── Render / export ───
  const startRender = async () => {
    const missing = clips.find((c) => !sourceMap[c.sourceId]?.storagePath);
    if (missing) {
      setRender({ status: 'failed', progress: 0, error: 'A video is still uploading/importing. Wait for it to finish, then export.' });
      return;
    }
    if (!clips.length) return;
    setRender({ status: 'running', progress: 1 });
    try {
      const res = await fetch('/api/editor/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: clips.map((c) => ({
            storagePath: sourceMap[c.sourceId].storagePath,
            inMs: Math.round(c.inSec * 1000),
            outMs: Math.round(c.outSec * 1000),
            muted: !!c.muted,
            volume: c.volume ?? 1,
          })),
          crop: crop.enabled ? crop.rect : null,
          outputHeight: outputHeight || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Render failed to start');
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/process/${data.jobId}`);
          const j = await r.json();
          if (!j.ok) return;
          if (j.job.status === 'completed') {
            clearInterval(pollRef.current!);
            setRender({ status: 'done', progress: 100, url: j.job.outputUrl });
          } else if (j.job.status === 'failed') {
            clearInterval(pollRef.current!);
            setRender({ status: 'failed', progress: 0, error: j.job.errorMessage || 'Render failed' });
          } else {
            setRender((cur) => ({ ...cur, progress: Math.max(cur.progress, j.job.progress || 1) }));
          }
        } catch {
          /* retry next tick */
        }
      }, 700);
    } catch (e: any) {
      setRender({ status: 'failed', progress: 0, error: e?.message || 'Render failed' });
    }
  };

  // Any edit after a finished render invalidates it
  useEffect(() => {
    setRender((r) => (r.status === 'done' || r.status === 'failed' ? { status: 'idle', progress: 0 } : r));
  }, [doc]);

  const selectedClip = selectedIds.length === 1 ? clips.find((c) => c.id === selectedIds[0]) : undefined;
  const hasSel = selectedIds.length > 0;
  const outDims = (() => {
    let w = crop.enabled ? crop.rect.w * frameW : frameW;
    let h = crop.enabled ? crop.rect.h * frameH : frameH;
    if (outputHeight) {
      w = (w / h) * outputHeight;
      h = outputHeight;
    }
    return `${Math.round(w / 2) * 2}×${Math.round(h / 2) * 2}`;
  })();

  const ToolBtn = ({ icon: Icon, label, keys, onClick, disabled, active }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={`${label}${keys ? ` (${keys})` : ''}`}
      className={`h-9 px-2.5 rounded-[10px] flex items-center gap-1.5 text-xs font-medium transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
        active ? 'bg-[#6D3FC0] text-white' : 'bg-white border border-[#E9E4EF] text-[#211D25] hover:border-[#8061C9] hover:text-[#6D3FC0]'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* ─── Toolbar ─── */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-[14px] bg-[#FAF8FD] border border-[#E9E4EF]">
        <ToolBtn icon={Scissors} label="Split" keys="S" onClick={cmd.split} disabled={!clips.length} />
        <ToolBtn icon={Scissors} label="Cut" keys="Ctrl+X" onClick={cmd.cut} disabled={!hasSel} />
        <ToolBtn icon={Copy} label="Copy" keys="Ctrl+C" onClick={cmd.copy} disabled={!hasSel} />
        <ToolBtn icon={ClipboardPaste} label="Paste" keys="Ctrl+V" onClick={cmd.paste} disabled={!clipboard.length} />
        <ToolBtn icon={CopyPlus} label="Duplicate" keys="Ctrl+D" onClick={cmd.duplicate} disabled={!hasSel} />
        <ToolBtn icon={Trash2} label="Delete" keys="Del" onClick={cmd.del} disabled={!hasSel} />
        <div className="w-px h-6 bg-[#E9E4EF] mx-1" />
        <ToolBtn icon={Undo2} label="Undo" keys="Ctrl+Z" onClick={cmd.undo} disabled={!state.past.length} />
        <ToolBtn icon={Redo2} label="Redo" keys="Ctrl+Shift+Z" onClick={cmd.redo} disabled={!state.future.length} />
        <div className="w-px h-6 bg-[#E9E4EF] mx-1" />
        <ToolBtn icon={CropIcon} label="Crop" onClick={() => {
          if (!crop.enabled) setAspect('free');
          else setCropMode((m) => !m);
        }} active={cropMode} />
        <div className="ml-auto flex items-center gap-1.5">
          <ToolBtn icon={ZoomOut} label="" onClick={() => setPxPerSec((p) => Math.max(2, p / 1.5))} />
          <ToolBtn icon={Maximize} label="Fit" onClick={fitZoom} />
          <ToolBtn icon={ZoomIn} label="" onClick={() => setPxPerSec((p) => Math.min(400, p * 1.5))} />
          <ToolBtn icon={Keyboard} label="" onClick={() => setShowKeys((s) => !s)} active={showKeys} />
        </div>
      </div>

      {showKeys && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 p-3 rounded-[12px] bg-white border border-[#E9E4EF] text-[11px] text-[#4A4453]">
          {[
            ['Space', 'Play / pause'], ['S', 'Split at playhead'], ['Del', 'Delete clip'], ['Ctrl+C / X / V', 'Copy / cut / paste'],
            ['Ctrl+D', 'Duplicate'], ['Ctrl+Z', 'Undo'], ['Ctrl+Shift+Z', 'Redo'], ['← / →', 'Step 1 frame (Shift = 1s)'],
            ['Shift+Click', 'Multi-select'], ['Drag clip', 'Reorder'], ['Drag clip edge', 'Trim'], ['Esc', 'Deselect / close crop'],
          ].map(([k, d]) => (
            <div key={k} className="flex gap-2"><span className="font-mono font-semibold text-[#6D3FC0] min-w-[88px]">{k}</span><span>{d}</span></div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* ─── Media bin ─── */}
        <aside className="space-y-3 order-2 lg:order-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#69636E]">Media</h4>
            <span className="text-[11px] text-[#918B95]">{sources.length} file(s)</span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {sources.map((s) => (
              <div
                key={s.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-clapfetch-source', s.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="group flex items-center gap-2 p-1.5 rounded-[10px] bg-white border border-[#E9E4EF] hover:border-[#8061C9] cursor-grab"
                title="Drag onto the timeline, or click + to append"
              >
                <div className="w-14 h-9 rounded-[6px] bg-[#18161D] overflow-hidden shrink-0">
                  {(filmstrips[s.id]?.frames[0] || s.thumbnailUrl) ? (
                    <img src={filmstrips[s.id]?.frames[0] || s.thumbnailUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <Film className="w-4 h-4 text-white/50 m-auto mt-2.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-[#211D25] truncate">{s.name}</p>
                  <p className="text-[10px] text-[#918B95] font-mono">
                    {fmt(s.durationSeconds).slice(0, 5)}
                    {!s.storagePath && <span className="ml-1 text-amber-600">· uploading</span>}
                  </p>
                </div>
                <button
                  onClick={() => dispatch({ type: 'INSERT_SOURCE', sourceId: s.id, index: clips.length })}
                  className="w-6 h-6 rounded-[6px] bg-[#F5F1FA] text-[#6D3FC0] hover:bg-[#6D3FC0] hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
                  title="Append to end of timeline"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <label className="flex items-center justify-center gap-2 h-9 rounded-[10px] bg-[#6D3FC0] text-white text-xs font-semibold hover:bg-[#5C35A3] cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            Add video
            <input
              type="file"
              accept="video/*,.mp4,.mov,.webm,.mkv"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                e.target.value = '';
                files.reduce((p, f) => p.then(() => uploadFile(f)), Promise.resolve());
              }}
            />
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (/^https?:\/\//i.test(linkInput.trim())) importLink(linkInput.trim());
            }}
            className="flex gap-1.5"
          >
            <div className="flex-1 flex items-center gap-1.5 h-9 px-2 rounded-[10px] bg-white border border-[#E9E4EF] focus-within:border-[#6D3FC0]">
              <Link2 className="w-3.5 h-3.5 text-[#918B95] shrink-0" />
              <input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Add from link…"
                className="w-full text-[11px] outline-none bg-transparent"
              />
            </div>
            <button disabled={!!busy || !linkInput.trim()} className="h-9 px-2.5 rounded-[10px] bg-white border border-[#E9E4EF] text-[11px] font-semibold text-[#6D3FC0] disabled:opacity-40 cursor-pointer">
              Add
            </button>
          </form>

          {/* Clip inspector */}
          {selectedClip && (
            <div className="p-3 rounded-[12px] bg-white border border-[#E9E4EF] space-y-2.5">
              <h4 className="text-xs font-semibold text-[#211D25]">Selected clip</h4>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-[#4A4453]">
                <span>In {fmt(selectedClip.inSec)}</span>
                <span>Out {fmt(selectedClip.outSec)}</span>
                <span className="col-span-2">Length {clipDuration(selectedClip).toFixed(2)}s</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dispatch({ type: 'SET_CLIP', id: selectedClip.id, patch: { muted: !selectedClip.muted } })}
                  className={`w-8 h-8 rounded-[8px] flex items-center justify-center cursor-pointer ${selectedClip.muted ? 'bg-red-50 text-red-600' : 'bg-[#F5F1FA] text-[#6D3FC0]'}`}
                  title={selectedClip.muted ? 'Unmute clip' : 'Mute clip'}
                >
                  {selectedClip.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  disabled={selectedClip.muted}
                  value={Math.round((selectedClip.volume ?? 1) * 100)}
                  onChange={(e) => dispatch({ type: 'SET_CLIP', id: selectedClip.id, patch: { volume: Number(e.target.value) / 100 } })}
                  className="flex-1 accent-[#6D3FC0]"
                />
                <span className="text-[10px] font-mono w-9 text-right">{Math.round((selectedClip.volume ?? 1) * 100)}%</span>
              </div>
            </div>
          )}
        </aside>

        {/* ─── Preview ─── */}
        <section className="order-1 lg:order-2 space-y-2">
          <div className="relative mx-auto bg-[#0F0D13] rounded-[16px] overflow-hidden flex items-center justify-center" style={{ maxHeight: 460 }}>
            <div className="relative w-full" style={{ aspectRatio: `${frameW} / ${frameH}`, maxHeight: 460, maxWidth: `${(460 * frameW) / frameH}px` }}>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain bg-black"
                playsInline
                preload="auto"
                onClick={() => !cropMode && togglePlay()}
                onError={() => setNotice({ kind: 'error', text: 'Preview could not load this video in the browser.' })}
              />
              {crop.enabled && (
                <CropOverlay
                  rect={crop.rect}
                  ratio={ratioFor(crop.aspect)}
                  editable={cropMode}
                  frameW={frameW}
                  frameH={frameH}
                  onCommit={(rect) => dispatch({ type: 'SET_CROP', crop: { rect } })}
                />
              )}
              {!clips.length && (
                <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">Add a clip to start editing</div>
              )}
            </div>
          </div>

          {/* transport */}
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => seek(0)} className="w-8 h-8 rounded-full hover:bg-[#F5F1FA] text-[#4A4453] flex items-center justify-center cursor-pointer" title="Go to start (Home)"><SkipBack className="w-4 h-4" /></button>
            <button onClick={() => step(-1 / FPS)} className="w-8 h-8 rounded-full hover:bg-[#F5F1FA] text-[#4A4453] flex items-center justify-center cursor-pointer" title="Previous frame (←)"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={togglePlay} className="w-11 h-11 rounded-full bg-[#6D3FC0] text-white flex items-center justify-center hover:bg-[#5C35A3] cursor-pointer" title="Play / pause (Space)">
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={() => step(1 / FPS)} className="w-8 h-8 rounded-full hover:bg-[#F5F1FA] text-[#4A4453] flex items-center justify-center cursor-pointer" title="Next frame (→)"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => seek(total)} className="w-8 h-8 rounded-full hover:bg-[#F5F1FA] text-[#4A4453] flex items-center justify-center cursor-pointer" title="Go to end (End)"><SkipForward className="w-4 h-4" /></button>
            <span className="ml-3 font-mono text-xs text-[#211D25] tabular-nums">{fmt(playhead)} <span className="text-[#918B95]">/ {fmt(total)}</span></span>
          </div>

          {/* crop presets */}
          {cropMode && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 p-2 rounded-[12px] bg-white border border-[#E9E4EF]">
              <span className="text-[11px] font-semibold text-[#69636E] mr-1">Crop</span>
              {(['free', '9:16', '1:1', '4:5', '16:9'] as AspectPreset[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAspect(a)}
                  className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold cursor-pointer ${crop.aspect === a ? 'bg-[#6D3FC0] text-white' : 'bg-[#F5F1FA] text-[#4A4453] hover:text-[#6D3FC0]'}`}
                >
                  {a === 'free' ? 'Free' : a}
                </button>
              ))}
              <button
                onClick={() => {
                  dispatch({ type: 'SET_CROP', crop: { enabled: false, aspect: 'free', rect: { x: 0, y: 0, w: 1, h: 1 } } });
                  setCropMode(false);
                }}
                className="px-2.5 py-1 rounded-[8px] text-[11px] font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
              >
                Remove crop
              </button>
              <button onClick={() => setCropMode(false)} className="px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-[#211D25] text-white cursor-pointer">
                Done
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ─── Timeline ─── */}
      <div ref={timelineWrapRef}>
        <Timeline
          clips={clips}
          sources={sources}
          filmstrips={filmstrips}
          selectedIds={selectedIds}
          playhead={playhead}
          pxPerSec={pxPerSec}
          onSeek={seek}
          onSelect={(ids, additive) => dispatch({ type: 'SELECT', ids, additive })}
          onMove={(id, toIndex) => dispatch({ type: 'MOVE', id, toIndex })}
          onTrim={(id, inSec, outSec) => dispatch({ type: 'TRIM', id, inSec, outSec })}
          onDropSource={(sourceId, index) => dispatch({ type: 'INSERT_SOURCE', sourceId, index })}
        />
        <p className="mt-1.5 text-[11px] text-[#918B95]">
          {clips.length} clip(s) · drag clips to reorder · drag edges to trim · click the ruler to move the playhead
        </p>
      </div>

      {/* ─── Status ─── */}
      {busy && (
        <div className="p-3 rounded-[12px] bg-[#F5F1FA] border border-[#E9E4EF] text-xs text-[#4A4453] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#6D3FC0]" /> {busy}
        </div>
      )}
      {notice && (
        <div className={`p-3 rounded-[12px] text-xs flex items-center gap-2 ${notice.kind === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-[#F5F1FA] border border-[#E9E4EF] text-[#4A4453]'}`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-semibold cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* ─── Export ─── */}
      <div className="p-4 rounded-[16px] bg-white border border-[#E9E4EF] flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-[#211D25]">Export edited video</h4>
          <p className="text-[11px] text-[#918B95]">MP4 · H.264 + AAC · {outDims} · {total.toFixed(1)}s</p>
        </div>
        <select
          value={outputHeight}
          onChange={(e) => setOutputHeight(Number(e.target.value))}
          className="h-9 px-2 rounded-[10px] border border-[#E9E4EF] text-xs bg-white"
        >
          <option value={0}>Original resolution</option>
          <option value={1080}>1080p</option>
          <option value={720}>720p</option>
          <option value={480}>480p</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          {render.status === 'running' && (
            <div className="flex items-center gap-2 text-xs text-[#4A4453]">
              <div className="w-40 h-2 rounded-full bg-[#F0EAF8] overflow-hidden">
                <div className="h-full bg-[#6D3FC0] transition-all" style={{ width: `${render.progress}%` }} />
              </div>
              <span className="font-mono w-9">{render.progress}%</span>
            </div>
          )}
          {render.status === 'done' && render.url && (
            <a href={render.url} className="h-10 px-4 rounded-[12px] bg-emerald-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4" /> Download MP4
            </a>
          )}
          <button
            onClick={startRender}
            disabled={render.status === 'running' || !clips.length}
            className="h-10 px-5 rounded-[12px] bg-[#6D3FC0] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#5C35A3] disabled:opacity-40 cursor-pointer"
          >
            {render.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {render.status === 'running' ? 'Rendering…' : render.status === 'done' ? 'Render again' : 'Render video'}
          </button>
        </div>
        {render.status === 'failed' && (
          <p className="w-full text-xs text-red-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {render.error}</p>
        )}
      </div>
    </div>
  );
}
