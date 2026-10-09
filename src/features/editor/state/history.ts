import type { EditorSnapshot, EditorState, ProjectDocument } from './types';
export const MAX_HISTORY = 200;
// Snapshots share immutable typed arrays. Reducers copy only modified buffers.
export function createSnapshot(state: ProjectDocument): EditorSnapshot {
  const {
    version,
    name,
    resolution,
    voxelsPerUnit,
    parts,
    pieces,
    palette,
    frontGrid,
    sideGrid,
    topGrid,
    editingPieceId,
    draftPartId
  } = state;
  return {
    version,
    name,
    resolution,
    voxelsPerUnit,
    parts,
    pieces,
    palette,
    frontGrid,
    sideGrid,
    topGrid,
    editingPieceId,
    draftPartId
  };
}
export function applySnapshot(state: EditorState, snapshot: EditorSnapshot): EditorState {
  return { ...state, ...snapshot };
}
export function recordHistory(previous: EditorState, next: EditorState): EditorState {
  const base = previous.history.length
    ? previous.history.slice(0, previous.historyIndex + 1)
    : [createSnapshot(previous)];
  const history = [...base, createSnapshot(next)].slice(-MAX_HISTORY);
  return { ...next, history, historyIndex: history.length - 1 };
}
