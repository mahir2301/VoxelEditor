import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Dispatch } from 'react';
import { createEmptyVoxels } from '../domain/voxel/model';
import { reducer, getInitialState, DEFAULT_RESOLUTION } from '../features/editor/state/editorReducer';
import { loadStateFromStorage, saveStateToStorage } from '../features/editor/state/persistence';
import type { EditorAction, EditorState, SerializedProject } from '../features/editor/state/types';

function reviveStoredState(saved: SerializedProject | null): EditorState {
  if (!saved || !saved.resolution) return getInitialState(DEFAULT_RESOLUTION);
  const resolution = saved.resolution;
  const safe = getInitialState(resolution);
  return {
    ...safe,
    ...saved,
    frontGrid: new Uint8Array(saved.frontGrid || safe.frontGrid),
    sideGrid: new Uint8Array(saved.sideGrid || safe.sideGrid),
    topGrid: new Uint8Array(saved.topGrid || safe.topGrid),
    pieceVoxels: createEmptyVoxels(resolution),
    pieces: (saved.pieces || []).map((piece) => ({
      ...piece,
      voxels: new Uint8Array(piece.voxels),
    })),
    modelVoxels: new Uint8Array(saved.modelVoxels || safe.modelVoxels),
    modelColors: new Uint8Array(saved.modelColors || safe.modelColors),
    history: [],
    historyIndex: -1,
    editingPieceId: null,
    pieceCount: saved.pieces?.length || 0,
  };
}

export function useVoxelState() {
  const [state, dispatch] = useReducer(reducer, undefined, () => reviveStoredState(loadStateFromStorage()));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveStateToStorage(state);
    }, 300);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state]);

  const getEffectiveModelVoxels = useCallback(() => {
    if (!state.editingPieceId) return state.modelVoxels;
    const overlay = new Uint8Array(state.modelVoxels);
    for (let i = 0; i < state.pieceVoxels.length; i += 1) {
      if (state.pieceVoxels[i]) overlay[i] = 1;
    }
    return overlay;
  }, [state.editingPieceId, state.modelVoxels, state.pieceVoxels]);

  const getEditingPieceVoxels = useCallback(() => {
    if (!state.editingPieceId) return null;
    return state.pieceVoxels;
  }, [state.editingPieceId, state.pieceVoxels]);

  return {
    state,
    dispatch: dispatch as Dispatch<EditorAction>,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex >= 0 && state.historyIndex < state.history.length - 1,
    getEffectiveModelVoxels,
    getEditingPieceVoxels,
  };
}
