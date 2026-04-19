import type { EditorSnapshot, EditorState } from './types';

const MAX_HISTORY = 200;

export function createSnapshot(state: EditorState): EditorSnapshot {
  return {
    cameraMode: state.cameraMode,
    cameraView: state.cameraView,
    editingPieceId: state.editingPieceId,
    frontGrid: new Uint8Array(state.frontGrid),
    modelColors: new Uint8Array(state.modelColors),
    modelVoxels: new Uint8Array(state.modelVoxels),
    palette: [...state.palette],
    pieceCount: state.pieceCount,
    pieceVoxels: new Uint8Array(state.pieceVoxels),
    pieces: state.pieces.map((piece) => ({
      ...piece,
      voxels: new Uint8Array(piece.voxels)
    })),
    resolution: state.resolution,
    selectedColor: state.selectedColor,
    sideGrid: new Uint8Array(state.sideGrid),
    tool: state.tool,
    topGrid: new Uint8Array(state.topGrid)
  };
}

export function applySnapshot(state: EditorState, snapshot: EditorSnapshot): EditorState {
  return {
    ...state,
    cameraMode: snapshot.cameraMode,
    cameraView: snapshot.cameraView,
    editingPieceId: snapshot.editingPieceId,
    frontGrid: new Uint8Array(snapshot.frontGrid),
    modelColors: new Uint8Array(snapshot.modelColors),
    modelVoxels: new Uint8Array(snapshot.modelVoxels),
    palette: [...snapshot.palette],
    pieceCount: snapshot.pieceCount,
    pieceVoxels: new Uint8Array(snapshot.pieceVoxels),
    pieces: snapshot.pieces.map((piece) => ({
      ...piece,
      voxels: new Uint8Array(piece.voxels)
    })),
    resolution: snapshot.resolution,
    selectedColor: snapshot.selectedColor,
    sideGrid: new Uint8Array(snapshot.sideGrid),
    tool: snapshot.tool,
    topGrid: new Uint8Array(snapshot.topGrid)
  };
}

export function recordHistory(prevState: EditorState, nextState: EditorState): EditorState {
  const base =
    prevState.history.length === 0
      ? [createSnapshot(prevState)]
      : prevState.history.slice(0, prevState.historyIndex + 1);
  const entries = [...base, createSnapshot(nextState)];
  const trimmed = entries.slice(Math.max(0, entries.length - MAX_HISTORY));
  return {
    ...nextState,
    history: trimmed,
    historyIndex: trimmed.length - 1
  };
}
