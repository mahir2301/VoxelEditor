import { useEffect, useMemo, useReducer, useState } from 'react';
import { computePieceVoxels } from '../domain/voxel/model';
import { getInitialState, reducer } from '../features/editor/state/editorReducer';
import { saveStateToStorage } from '../features/editor/state/persistence';
export function useVoxelState(active: boolean) {
  const [state, dispatch] = useReducer(reducer, undefined, () => getInitialState());
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
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
  const document = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );
  useEffect(() => {
    if (!active || state.transaction) return undefined;
    const timer = setTimeout(() => {
      try {
        saveStateToStorage(document);
        setAutosaveError(null);
      } catch {
        setAutosaveError('Autosave unavailable. Save a project file to keep your work.');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [active, document, state.transaction]);
  useEffect(() => {
    if (!active) return undefined;
    const save = () => {
      try {
        saveStateToStorage(document);
      } catch {
        /* Manual save remains available. */
      }
    };
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, [active, document]);
  const pieceVoxels = useMemo(
    () => computePieceVoxels(state.frontGrid, state.sideGrid, state.topGrid, state.resolution),
    [state.frontGrid, state.sideGrid, state.topGrid, state.resolution]
  );
  return {
    state,
    dispatch,
    document,
    pieceVoxels,
    autosaveError,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex >= 0 && state.historyIndex < state.history.length - 1
  };
}
