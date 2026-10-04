/* ─── CLAPFETCH TIMELINE EDITOR — PURE STATE LOGIC ───
 * Framework-free reducer so it can be unit-tested in Node.
 */

import type { EditorSource, NormalizedCrop, TimelineClip } from '@/lib/media/types';

export const MIN_CLIP_SEC = 0.1;
const HISTORY_LIMIT = 60;

export type AspectPreset = 'free' | '9:16' | '1:1' | '4:5' | '16:9';

export interface CropState {
  enabled: boolean;
  aspect: AspectPreset;
  rect: NormalizedCrop; // normalised to the canvas frame
}

export interface EditorDoc {
  clips: TimelineClip[];
  crop: CropState;
}

export interface EditorState {
  sources: EditorSource[];
  doc: EditorDoc;
  past: EditorDoc[];
  future: EditorDoc[];
  selectedIds: string[];
  clipboard: TimelineClip[];
}

export type EditorAction =
  | { type: 'ADD_SOURCE'; source: EditorSource; append?: boolean }
  | { type: 'UPDATE_SOURCE'; id: string; patch: Partial<EditorSource> }
  | { type: 'INSERT_SOURCE'; sourceId: string; index: number }
  | { type: 'SPLIT'; time: number }
  | { type: 'DELETE'; ids?: string[] }
  | { type: 'COPY'; ids?: string[] }
  | { type: 'CUT'; ids?: string[] }
  | { type: 'PASTE'; time: number }
  | { type: 'DUPLICATE'; ids?: string[] }
  | { type: 'MOVE'; id: string; toIndex: number }
  | { type: 'TRIM'; id: string; inSec: number; outSec: number }
  | { type: 'SET_CLIP'; id: string; patch: Partial<Pick<TimelineClip, 'muted' | 'volume'>> }
  | { type: 'SET_CROP'; crop: Partial<CropState> }
  | { type: 'SELECT'; ids: string[]; additive?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; sources: EditorSource[] };

let idCounter = 0;
export function newClipId(): string {
  idCounter += 1;
  return `clip_${Date.now().toString(36)}_${idCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

export const clipDuration = (c: TimelineClip) => Math.max(0, c.outSec - c.inSec);
export const totalDuration = (clips: TimelineClip[]) => clips.reduce((s, c) => s + clipDuration(c), 0);

/** Timeline start time of each clip. */
export function clipStarts(clips: TimelineClip[]): number[] {
  const out: number[] = [];
  let t = 0;
  for (const c of clips) {
    out.push(t);
    t += clipDuration(c);
  }
  return out;
}

/** Find the clip under a timeline time. Returns null past the end. */
export function locate(clips: TimelineClip[], time: number): { index: number; clip: TimelineClip; offset: number } | null {
  let t = 0;
  for (let i = 0; i < clips.length; i++) {
    const d = clipDuration(clips[i]);
    if (time < t + d - 1e-6 || (i === clips.length - 1 && time <= t + d + 1e-6)) {
      return { index: i, clip: clips[i], offset: Math.max(0, Math.min(d, time - t)) };
    }
    t += d;
  }
  return null;
}

export const DEFAULT_CROP: CropState = { enabled: false, aspect: 'free', rect: { x: 0, y: 0, w: 1, h: 1 } };

export function initialEditorState(sources: EditorSource[] = []): EditorState {
  return {
    sources,
    doc: {
      clips: sources.map((s) => ({ id: newClipId(), sourceId: s.id, inSec: 0, outSec: s.durationSeconds })),
      crop: { ...DEFAULT_CROP, rect: { ...DEFAULT_CROP.rect } },
    },
    past: [],
    future: [],
    selectedIds: [],
    clipboard: [],
  };
}

/** Apply a document change and push the previous doc to history. */
function commit(state: EditorState, doc: EditorDoc, extra: Partial<EditorState> = {}): EditorState {
  const past = [...state.past, state.doc];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { ...state, ...extra, doc, past, future: [] };
}

function targetIds(state: EditorState, ids?: string[]) {
  return ids && ids.length ? ids : state.selectedIds;
}

/** Split clip list at a timeline time. Returns new clips and the index where the split happened. */
function splitAt(clips: TimelineClip[], time: number): { clips: TimelineClip[]; boundaryIndex: number; didSplit: boolean; rightId?: string } {
  const hit = locate(clips, time);
  if (!hit) return { clips, boundaryIndex: clips.length, didSplit: false };
  const d = clipDuration(hit.clip);
  if (hit.offset < MIN_CLIP_SEC) return { clips, boundaryIndex: hit.index, didSplit: false };
  if (d - hit.offset < MIN_CLIP_SEC) return { clips, boundaryIndex: hit.index + 1, didSplit: false };
  const cut = hit.clip.inSec + hit.offset;
  const left: TimelineClip = { ...hit.clip, outSec: cut };
  const right: TimelineClip = { ...hit.clip, id: newClipId(), inSec: cut };
  const next = [...clips];
  next.splice(hit.index, 1, left, right);
  return { clips: next, boundaryIndex: hit.index + 1, didSplit: true, rightId: right.id };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { doc } = state;

  switch (action.type) {
    case 'RESET':
      return initialEditorState(action.sources);

    case 'ADD_SOURCE': {
      const exists = state.sources.some((s) => s.id === action.source.id);
      const sources = exists ? state.sources : [...state.sources, action.source];
      if (action.append === false) return { ...state, sources };
      const clip: TimelineClip = { id: newClipId(), sourceId: action.source.id, inSec: 0, outSec: action.source.durationSeconds };
      return commit({ ...state, sources }, { ...doc, clips: [...doc.clips, clip] }, { selectedIds: [clip.id] });
    }

    case 'UPDATE_SOURCE': {
      const sources = state.sources.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s));
      const dur = action.patch.durationSeconds;
      if (typeof dur !== 'number' || dur <= 0) return { ...state, sources };
      // Keep clips inside the (possibly corrected) source duration
      const clips = doc.clips.map((c) => {
        if (c.sourceId !== action.id) return c;
        const prevSrc = state.sources.find((s) => s.id === action.id);
        const wasFull = prevSrc && Math.abs(c.outSec - prevSrc.durationSeconds) < 0.05 && c.inSec === 0;
        const outSec = wasFull ? dur : Math.min(c.outSec, dur);
        const inSec = Math.min(c.inSec, Math.max(0, outSec - MIN_CLIP_SEC));
        return { ...c, inSec, outSec };
      });
      return { ...state, sources, doc: { ...doc, clips } };
    }

    case 'INSERT_SOURCE': {
      const src = state.sources.find((s) => s.id === action.sourceId);
      if (!src) return state;
      const clip: TimelineClip = { id: newClipId(), sourceId: src.id, inSec: 0, outSec: src.durationSeconds };
      const clips = [...doc.clips];
      clips.splice(Math.max(0, Math.min(clips.length, action.index)), 0, clip);
      return commit(state, { ...doc, clips }, { selectedIds: [clip.id] });
    }

    case 'SPLIT': {
      const res = splitAt(doc.clips, action.time);
      if (!res.didSplit) return state;
      return commit(state, { ...doc, clips: res.clips }, { selectedIds: res.rightId ? [res.rightId] : state.selectedIds });
    }

    case 'DELETE': {
      const ids = new Set(targetIds(state, action.ids));
      if (!ids.size) return state;
      const clips = doc.clips.filter((c) => !ids.has(c.id));
      if (clips.length === doc.clips.length) return state;
      return commit(state, { ...doc, clips }, { selectedIds: [] });
    }

    case 'COPY': {
      const ids = new Set(targetIds(state, action.ids));
      const clipboard = doc.clips.filter((c) => ids.has(c.id)).map((c) => ({ ...c }));
      return clipboard.length ? { ...state, clipboard } : state;
    }

    case 'CUT': {
      const ids = new Set(targetIds(state, action.ids));
      const clipboard = doc.clips.filter((c) => ids.has(c.id)).map((c) => ({ ...c }));
      if (!clipboard.length) return state;
      const clips = doc.clips.filter((c) => !ids.has(c.id));
      return commit(state, { ...doc, clips }, { clipboard, selectedIds: [] });
    }

    case 'PASTE': {
      if (!state.clipboard.length) return state;
      const pasted = state.clipboard.map((c) => ({ ...c, id: newClipId() }));
      let clips = doc.clips;
      let index: number;
      if (state.selectedIds.length) {
        const sel = new Set(state.selectedIds);
        let last = -1;
        clips.forEach((c, i) => sel.has(c.id) && (last = i));
        index = last + 1;
      } else {
        const res = splitAt(clips, action.time);
        clips = res.clips;
        index = res.boundaryIndex;
      }
      const next = [...clips];
      next.splice(index, 0, ...pasted);
      return commit(state, { ...doc, clips: next }, { selectedIds: pasted.map((c) => c.id) });
    }

    case 'DUPLICATE': {
      const ids = new Set(targetIds(state, action.ids));
      if (!ids.size) return state;
      const next: TimelineClip[] = [];
      const newIds: string[] = [];
      for (const c of doc.clips) {
        next.push(c);
        if (ids.has(c.id)) {
          const copy = { ...c, id: newClipId() };
          newIds.push(copy.id);
          next.push(copy);
        }
      }
      return commit(state, { ...doc, clips: next }, { selectedIds: newIds });
    }

    case 'MOVE': {
      const from = doc.clips.findIndex((c) => c.id === action.id);
      if (from < 0) return state;
      // toIndex is an insertion slot in the ORIGINAL list (0..length)
      let to = Math.max(0, Math.min(doc.clips.length, action.toIndex));
      if (to === from || to === from + 1) return state;
      const clips = [...doc.clips];
      const [moved] = clips.splice(from, 1);
      if (to > from) to -= 1;
      clips.splice(to, 0, moved);
      return commit(state, { ...doc, clips }, { selectedIds: [moved.id] });
    }

    case 'TRIM': {
      const idx = doc.clips.findIndex((c) => c.id === action.id);
      if (idx < 0) return state;
      const clip = doc.clips[idx];
      const src = state.sources.find((s) => s.id === clip.sourceId);
      const maxOut = src ? src.durationSeconds : clip.outSec;
      let inSec = Math.max(0, Math.min(action.inSec, maxOut - MIN_CLIP_SEC));
      let outSec = Math.min(maxOut, Math.max(action.outSec, inSec + MIN_CLIP_SEC));
      inSec = Math.round(inSec * 1000) / 1000;
      outSec = Math.round(outSec * 1000) / 1000;
      if (inSec === clip.inSec && outSec === clip.outSec) return state;
      const clips = [...doc.clips];
      clips[idx] = { ...clip, inSec, outSec };
      return commit(state, { ...doc, clips });
    }

    case 'SET_CLIP': {
      const idx = doc.clips.findIndex((c) => c.id === action.id);
      if (idx < 0) return state;
      const clips = [...doc.clips];
      clips[idx] = { ...clips[idx], ...action.patch };
      return commit(state, { ...doc, clips });
    }

    case 'SET_CROP': {
      const crop = { ...doc.crop, ...action.crop, rect: { ...(action.crop.rect || doc.crop.rect) } };
      return commit(state, { ...doc, crop });
    }

    case 'SELECT': {
      if (!action.additive) return { ...state, selectedIds: action.ids };
      const set = new Set(state.selectedIds);
      action.ids.forEach((id) => (set.has(id) ? set.delete(id) : set.add(id)));
      return { ...state, selectedIds: Array.from(set) };
    }

    case 'UNDO': {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return { ...state, doc: prev, past: state.past.slice(0, -1), future: [state.doc, ...state.future], selectedIds: [] };
    }

    case 'REDO': {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return { ...state, doc: next, past: [...state.past, state.doc], future: rest, selectedIds: [] };
    }

    default:
      return state;
  }
}

/** Compute a centred crop rect for an aspect preset on a W×H frame. */
export function cropRectForAspect(aspect: AspectPreset, frameW: number, frameH: number): NormalizedCrop {
  if (aspect === 'free' || !frameW || !frameH) return { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
  const [a, b] = aspect.split(':').map(Number);
  const target = a / b;
  const frame = frameW / frameH;
  if (target < frame) {
    const w = (frameH * target) / frameW;
    return { x: (1 - w) / 2, y: 0, w, h: 1 };
  }
  const h = frameW / target / frameH;
  return { x: 0, y: (1 - h) / 2, w: 1, h };
}
