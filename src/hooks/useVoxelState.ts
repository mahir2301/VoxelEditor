import { useEffect, useMemo, useReducer, useRef } from 'react';
import {
  DEFAULT_RESOLUTION,
  getInitialState,
  reducer
} from '../features/editor/state/editorReducer';
import { saveStateToStorage } from '../features/editor/state/persistence';

export function useVoxelState() {
  const [state, dispatch] = useReducer(reducer, getInitialState(DEFAULT_RESOLUTION));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveStateToStorage(state);
    }, 300);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state]);

  const effectiveModelVoxels = useMemo(() => {
    if (!state.editingPieceId) {
      return state.modelVoxels;
    }
    const overlay = new Uint8Array(state.modelVoxels);
    for (let i = 0; i < state.pieceVoxels.length; i += 1) {
      if (state.pieceVoxels[i]) {
        overlay[i] = 1;
      }
    }
    return overlay;
  }, [state.editingPieceId, state.modelVoxels, state.pieceVoxels]);

  const editingPieceVoxels = useMemo(
    () => (state.editingPieceId ? state.pieceVoxels : null),
    [state.editingPieceId, state.pieceVoxels]
  );

  return {
    canRedo: state.historyIndex >= 0 && state.historyIndex < state.history.length - 1,
    canUndo: state.historyIndex > 0,
    dispatch,
    editingPieceVoxels,
    effectiveModelVoxels,
    state
  };
}
