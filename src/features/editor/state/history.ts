import type { EditorSnapshot, EditorState } from './types';

const MAX_HISTORY = 200;

export function createSnapshot(state: EditorState): EditorSnapshot {
  return {
    resolution: state.resolution,
    frontGrid: new Uint8Array(state.frontGrid),
    sideGrid: new Uint8Array(state.sideGrid),
    topGrid: new Uint8Array(state.topGrid),
    pieceVoxels: new Uint8Array(state.pieceVoxels),
    pieces: state.pieces.map((piece) => ({
      ...piece,
      voxels: new Uint8Array(piece.voxels),
    })),
    editingPieceId: state.editingPieceId,
    modelVoxels: new Uint8Array(state.modelVoxels),
    modelColors: new Uint8Array(state.modelColors),
    palette: [...state.palette],
    selectedColor: state.selectedColor,
    tool: state.tool,
    cameraMode: state.cameraMode,
    cameraView: state.cameraView,
    pieceCount: state.pieceCount,
  };
}

export function applySnapshot(state: EditorState, snapshot: EditorSnapshot): EditorState {
  return {
    ...state,
    resolution: snapshot.resolution,
    frontGrid: new Uint8Array(snapshot.frontGrid),
    sideGrid: new Uint8Array(snapshot.sideGrid),
    topGrid: new Uint8Array(snapshot.topGrid),
    pieceVoxels: new Uint8Array(snapshot.pieceVoxels),
    pieces: snapshot.pieces.map((piece) => ({
      ...piece,
      voxels: new Uint8Array(piece.voxels),
    })),
    editingPieceId: snapshot.editingPieceId,
    modelVoxels: new Uint8Array(snapshot.modelVoxels),
    modelColors: new Uint8Array(snapshot.modelColors),
    palette: [...snapshot.palette],
    selectedColor: snapshot.selectedColor,
    tool: snapshot.tool,
    cameraMode: snapshot.cameraMode,
    cameraView: snapshot.cameraView,
    pieceCount: snapshot.pieceCount,
  };
}

export function recordHistory(prevState: EditorState, nextState: EditorState): EditorState {
  const base = prevState.history.length === 0
    ? [createSnapshot(prevState)]
    : prevState.history.slice(0, prevState.historyIndex + 1);
  const entries = [...base, createSnapshot(nextState)];
  const trimmed = entries.slice(Math.max(0, entries.length - MAX_HISTORY));
  return {
    ...nextState,
    history: trimmed,
    historyIndex: trimmed.length - 1,
  };
}
