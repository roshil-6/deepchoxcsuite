/**
 * Unit tests for the timeline editor reducer (split / cut / copy / paste /
 * duplicate / move / trim / undo / redo). Run: npx tsx scripts/test-editor-reducer.ts
 */
import assert from 'node:assert/strict';
import { editorReducer, initialEditorState, totalDuration, EditorState } from '../lib/editor/timelineReducer';

const src = { id: 'A', name: 'A', url: 'a.mp4', storagePath: 'storage/a.mp4', durationSeconds: 10, width: 1280, height: 720 };
let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✅ ${name}`);
}
const ranges = (s: EditorState) => s.doc.clips.map((c) => `${c.inSec}-${c.outSec}`).join(',');

test('initial state has one full clip', () => {
  const s = initialEditorState([src]);
  assert.equal(ranges(s), '0-10');
});

test('split at 4s', () => {
  const s = editorReducer(initialEditorState([src]), { type: 'SPLIT', time: 4 });
  assert.equal(ranges(s), '0-4,4-10');
  assert.equal(s.selectedIds.length, 1);
});

test('split at edge is ignored', () => {
  const s0 = initialEditorState([src]);
  assert.equal(editorReducer(s0, { type: 'SPLIT', time: 0.01 }), s0);
});

test('move second clip before first', () => {
  let s = editorReducer(initialEditorState([src]), { type: 'SPLIT', time: 4 });
  s = editorReducer(s, { type: 'MOVE', id: s.doc.clips[1].id, toIndex: 0 });
  assert.equal(ranges(s), '4-10,0-4');
  assert.equal(totalDuration(s.doc.clips), 10);
});

test('move first clip to end slot', () => {
  let s = editorReducer(initialEditorState([src]), { type: 'SPLIT', time: 4 });
  s = editorReducer(s, { type: 'MOVE', id: s.doc.clips[0].id, toIndex: 2 });
  assert.equal(ranges(s), '4-10,0-4');
});

test('delete selected clip (ripple)', () => {
  let s = editorReducer(initialEditorState([src]), { type: 'SPLIT', time: 4 });
  s = editorReducer(s, { type: 'DELETE' }); // right half selected after split
  assert.equal(ranges(s), '0-4');
});

test('copy + paste after selection', () => {
  let s = editorReducer(initialEditorState([src]), { type: 'SPLIT', time: 4 });
  s = editorReducer(s, { type: 'SELECT', ids: [s.doc.clips[0].id] });
  s = editorReducer(s, { type: 'COPY' });
  s = editorReducer(s, { type: 'PASTE', time: 0 });
  assert.equal(ranges(s), '0-4,0-4,4-10');
  assert.notEqual(s.doc.clips[0].id, s.doc.clips[1].id);
});

test('cut + paste at playhead splits the target clip', () => {
  let s = editorReducer(initialEditorState([src]), { type: 'SPLIT', time: 2 });
  s = editorReducer(s, { type: 'SELECT', ids: [s.doc.clips[0].id] });
  s = editorReducer(s, { type: 'CUT' }); // timeline: 2-10, clipboard: 0-2
  assert.equal(ranges(s), '2-10');
  s = editorReducer(s, { type: 'PASTE', time: 3 }); // playhead at 3s inside 2-10 → split at source 5s
  assert.equal(ranges(s), '2-5,0-2,5-10');
});

test('duplicate', () => {
  let s = initialEditorState([src]);
  s = editorReducer(s, { type: 'SELECT', ids: [s.doc.clips[0].id] });
  s = editorReducer(s, { type: 'DUPLICATE' });
  assert.equal(ranges(s), '0-10,0-10');
});

test('trim is clamped to source bounds and min length', () => {
  let s = initialEditorState([src]);
  const id = s.doc.clips[0].id;
  s = editorReducer(s, { type: 'TRIM', id, inSec: -5, outSec: 50 });
  assert.equal(s, s); // no-op state allowed
  s = editorReducer(s, { type: 'TRIM', id, inSec: 2, outSec: 7.5 });
  assert.equal(ranges(s), '2-7.5');
  s = editorReducer(s, { type: 'TRIM', id, inSec: 7.49, outSec: 7.5 });
  assert.ok(s.doc.clips[0].outSec - s.doc.clips[0].inSec >= 0.1 - 1e-9);
});

test('undo / redo', () => {
  let s = editorReducer(initialEditorState([src]), { type: 'SPLIT', time: 4 });
  s = editorReducer(s, { type: 'DELETE' });
  assert.equal(ranges(s), '0-4');
  s = editorReducer(s, { type: 'UNDO' });
  assert.equal(ranges(s), '0-4,4-10');
  s = editorReducer(s, { type: 'UNDO' });
  assert.equal(ranges(s), '0-10');
  s = editorReducer(s, { type: 'REDO' });
  assert.equal(ranges(s), '0-4,4-10');
});

test('add second source appends a clip', () => {
  const b = { ...src, id: 'B', durationSeconds: 3 };
  const s = editorReducer(initialEditorState([src]), { type: 'ADD_SOURCE', source: b });
  assert.equal(s.sources.length, 2);
  assert.equal(totalDuration(s.doc.clips), 13);
});

test('crop set is undoable', () => {
  let s = initialEditorState([src]);
  s = editorReducer(s, { type: 'SET_CROP', crop: { enabled: true, aspect: '9:16', rect: { x: 0.3, y: 0, w: 0.3, h: 1 } } });
  assert.equal(s.doc.crop.enabled, true);
  s = editorReducer(s, { type: 'UNDO' });
  assert.equal(s.doc.crop.enabled, false);
});

console.log(`\n${passed} reducer tests passed`);
