import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Dispatch } from 'react';
import { reducer, getInitialState, DEFAULT_RESOLUTION } from '../features/editor/state/editorReducer';
import { saveStateToStorage } from '../features/editor/state/persistence';
import type { EditorAction } from '../features/editor/state/types';

export function useVoxelState() {
  const [state, dispatch] = useReducer(reducer, getInitialState(DEFAULT_RESOLUTION));
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
