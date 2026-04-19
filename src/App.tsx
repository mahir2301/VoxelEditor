import { useCallback, useMemo, useState } from 'react';
import Grid2D from './components/Grid2D';
import Viewport3D from './components/Viewport3D';
import PieceList from './components/PieceList';
import ColorPalette from './components/ColorPalette';
import Toolbar from './components/Toolbar';
import ConfirmDialog from './components/ui/ConfirmDialog';
import { useVoxelState } from './hooks/useVoxelState';
import type { CameraMode, CameraView, EditorTool, GridName } from './features/editor/state/types';
import styles from './App.module.css';

function getToolHint(tool: EditorTool): string {
  if (tool === 'paint') return 'Click model voxels to paint.';
  if (tool === 'erase') return 'Click and drag in grids to erase.';
  return 'Click and drag in grids to draw.';
}

export default function App() {
  const { state, dispatch, canUndo, canRedo, getEffectiveModelVoxels, getEditingPieceVoxels } = useVoxelState();
  const [pendingPieceId, setPendingPieceId] = useState<string | null>(null);
  const [pieceCameraView, setPieceCameraView] = useState<CameraView>(() => state.cameraView);
  const [modelCameraView, setModelCameraView] = useState<CameraView>(
    () => (state.cameraMode === 'isometric' ? 'isometric' : state.cameraView),
  );

  const hasPieceVoxels = useMemo(() => state.pieceVoxels.some(Boolean), [state.pieceVoxels]);
  const effectiveModelVoxels = getEffectiveModelVoxels();
  const editingPieceVoxels = getEditingPieceVoxels();

  const handleSetCell = useCallback((grid: GridName, index: number, value: number) => {
    dispatch({ type: 'SET_CELL', grid, index, value });
  }, [dispatch]);

  const handleLoadPiece = useCallback((pieceId: string) => {
    const hasUnsavedDraft = state.frontGrid.some(Boolean) || state.sideGrid.some(Boolean) || state.topGrid.some(Boolean);
    if (hasUnsavedDraft) {
      setPendingPieceId(pieceId);
      return;
    }
    dispatch({ type: 'LOAD_PIECE_FOR_EDITING', pieceId });
  }, [dispatch, state.frontGrid, state.sideGrid, state.topGrid]);

  const handleConfirmPieceSwitch = useCallback(() => {
    if (!pendingPieceId) return;
    dispatch({ type: 'LOAD_PIECE_FOR_EDITING', pieceId: pendingPieceId });
    setPendingPieceId(null);
  }, [dispatch, pendingPieceId]);

  const handleVoxelClick = useCallback((index: number) => {
    if (state.tool === 'paint') {
      dispatch({ type: 'PAINT_VOXEL', index, colorIndex: state.selectedColor });
      return;
    }
    if (state.tool === 'erase') {
      dispatch({ type: 'PAINT_VOXEL', index, colorIndex: 0 });
    }
  }, [dispatch, state.selectedColor, state.tool]);

  const finishPieceAction = state.editingPieceId ? 'FINISH_EDITING' : 'PUSH_PIECE';

  return (
    <div className={styles.app}>
      <ConfirmDialog
        isOpen={Boolean(pendingPieceId)}
        title="Unsaved draft"
        description="You have unsaved grid edits for the current draft piece. Switch anyway?"
        cancelLabel="Cancel"
        confirmLabel="Switch"
        onCancel={() => setPendingPieceId(null)}
        onConfirm={handleConfirmPieceSwitch}
      />

      <Toolbar
        state={state}
        canUndo={canUndo}
        canRedo={canRedo}
        hasPieceVoxels={hasPieceVoxels}
        onSetResolution={(resolution) => {
          dispatch({ type: 'SET_RESOLUTION', resolution });
          setPieceCameraView('perspective');
          setModelCameraView('perspective');
        }}
        onSetTool={(tool: EditorTool) => dispatch({ type: 'SET_TOOL', tool })}
        onSetCameraMode={(mode: CameraMode) => {
          dispatch({ type: 'SET_CAMERA_MODE', mode });
          if (mode === 'perspective') {
            dispatch({ type: 'SET_CAMERA_VIEW', view: 'perspective' });
            setPieceCameraView('perspective');
            setModelCameraView('perspective');
          } else {
            setModelCameraView('isometric');
          }
        }}
        onImportProject={(project) => {
          dispatch({ type: 'LOAD_PROJECT', state: project });
          const importedView = project.cameraMode === 'isometric' ? 'isometric' : (project.cameraView || 'perspective');
          setPieceCameraView(importedView === 'isometric' ? 'perspective' : importedView);
          setModelCameraView(importedView);
        }}
        onNewProject={() => {
          dispatch({ type: 'NEW_PROJECT' });
          setPieceCameraView('perspective');
          setModelCameraView('perspective');
        }}
        onNewPiece={() => dispatch({ type: 'CANCEL_EDITING' })}
        onPushOrFinishPiece={() => dispatch({ type: finishPieceAction })}
        onCancelEditing={() => dispatch({ type: 'CANCEL_EDITING' })}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
      />

      <div className={styles.content}>
        <div className={styles.grids}>
          <Grid2D
            gridData={state.frontGrid}
            label="Front (XY)"
            size={state.resolution}
            tool={state.tool}
            view="front"
            modelVoxels={effectiveModelVoxels}
            onSetCell={(index, value) => handleSetCell('front', index, value)}
            onViewClick={() => {
              dispatch({ type: 'SET_CAMERA_VIEW', view: 'front' });
              setPieceCameraView('front');
              setModelCameraView('front');
            }}
          />
          <Grid2D
            gridData={state.sideGrid}
            label="Side (ZY)"
            size={state.resolution}
            tool={state.tool}
            view="side"
            modelVoxels={effectiveModelVoxels}
            onSetCell={(index, value) => handleSetCell('side', index, value)}
            onViewClick={() => {
              dispatch({ type: 'SET_CAMERA_VIEW', view: 'left' });
              setPieceCameraView('left');
              setModelCameraView('left');
            }}
          />
          <Grid2D
            gridData={state.topGrid}
            label="Top (XZ)"
            size={state.resolution}
            tool={state.tool}
            view="top"
            modelVoxels={effectiveModelVoxels}
            onSetCell={(index, value) => handleSetCell('top', index, value)}
            onViewClick={() => {
              dispatch({ type: 'SET_CAMERA_VIEW', view: 'top' });
              setPieceCameraView('top');
              setModelCameraView('top');
            }}
          />

          <div className={styles.piecePreview}>
            <Viewport3D
              mode="piece"
              pieceVoxels={state.pieceVoxels}
              palette={state.palette}
              resolution={state.resolution}
              cameraView={pieceCameraView}
              onCameraViewChange={setPieceCameraView}
            />
          </div>
        </div>

        <div className={styles.bottom}>
          <div className={styles.leftBottom}>
            <PieceList
              pieces={state.pieces}
              resolution={state.resolution}
              editingPieceId={state.editingPieceId}
              onSelectPiece={handleLoadPiece}
              onRenamePiece={(pieceId, name) => dispatch({ type: 'RENAME_PIECE', pieceId, name })}
              onDeletePiece={(pieceId) => dispatch({ type: 'DELETE_PIECE', pieceId })}
            />
          </div>

          <div className={styles.centerBottom}>
            <ColorPalette
              palette={state.palette}
              selectedColor={state.selectedColor}
              onColorSelect={(colorIndex: number) => dispatch({ type: 'SET_COLOR', colorIndex })}
            />
            <div className={styles.hint}>{getToolHint(state.tool)}</div>
          </div>

          <div className={styles.rightBottom}>
            <Viewport3D
              mode="model"
              modelVoxels={state.modelVoxels}
              editingPieceVoxels={editingPieceVoxels}
              modelColors={state.modelColors}
              palette={state.palette}
              resolution={state.resolution}
              cameraView={modelCameraView}
              onVoxelClick={handleVoxelClick}
              onCameraViewChange={setModelCameraView}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
