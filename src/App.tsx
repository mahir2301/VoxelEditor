import { useCallback, useMemo, useState } from 'react';
import Grid2D from './components/Grid2D';
import Viewport3D from './components/Viewport3D';
import PieceList from './components/PieceList';
import ColorPalette from './components/ColorPalette';
import Toolbar from './components/Toolbar';
import LandingScreen from './components/LandingScreen';
import ConfirmDialog from './components/ui/ConfirmDialog';
import { useVoxelState } from './hooks/useVoxelState';
import { loadStateFromStorage } from './features/editor/state/persistence';
import type { CameraMode, CameraView, EditorAction, EditorTool, GridName, SerializedProject } from './features/editor/state/types';
import styles from './App.module.css';

function getToolHint(tool: EditorTool): string {
  if (tool === 'paint') return 'Click model voxels to paint.';
  if (tool === 'erase') return 'Click and drag in grids to erase.';
  return 'Click and drag in grids to draw.';
}

export default function App() {
  const { state, dispatch, canUndo, canRedo, getEffectiveModelVoxels, getEditingPieceVoxels } = useVoxelState();
  const [screen, setScreen] = useState<'landing' | 'editor'>('landing');
  const [landingResolution, setLandingResolution] = useState(16);
  const [hasAutosave, setHasAutosave] = useState(() => Boolean(loadStateFromStorage()));
  const [pendingPieceId, setPendingPieceId] = useState<string | null>(null);
  const [pendingBackToLanding, setPendingBackToLanding] = useState(false);
  const [hasUnsavedManualChanges, setHasUnsavedManualChanges] = useState(false);
  const [pieceCameraView, setPieceCameraView] = useState<CameraView>(() => state.cameraView);
  const [modelCameraView, setModelCameraView] = useState<CameraView>(
    () => (state.cameraMode === 'isometric' ? 'isometric' : state.cameraView),
  );

  const hasPieceVoxels = useMemo(() => state.pieceVoxels.some(Boolean), [state.pieceVoxels]);
  const effectiveModelVoxels = getEffectiveModelVoxels();
  const editingPieceVoxels = getEditingPieceVoxels();

  const markDirty = useCallback(() => setHasUnsavedManualChanges(true), []);
  const markClean = useCallback(() => setHasUnsavedManualChanges(false), []);

  const runAction = useCallback((action: EditorAction, affectsModel = false) => {
    dispatch(action);
    if (affectsModel) markDirty();
  }, [dispatch, markDirty]);

  const syncLocalCameraViews = useCallback((mode: CameraMode, view: CameraView) => {
    const effectiveView = mode === 'isometric' ? 'isometric' : view;
    setPieceCameraView(effectiveView === 'isometric' ? 'perspective' : effectiveView);
    setModelCameraView(effectiveView);
  }, []);

  const openEditorWithProject = useCallback((project: SerializedProject) => {
    dispatch({ type: 'LOAD_PROJECT', state: project });
    setLandingResolution(project.resolution || 16);
    syncLocalCameraViews(project.cameraMode || 'perspective', project.cameraView || 'perspective');
    markClean();
    setScreen('editor');
  }, [dispatch, markClean, syncLocalCameraViews]);

  const handleCreateProject = useCallback(() => {
    if (state.resolution !== landingResolution) {
      runAction({ type: 'SET_RESOLUTION', resolution: landingResolution });
    } else {
      runAction({ type: 'NEW_PROJECT' });
    }
    syncLocalCameraViews('perspective', 'perspective');
    markClean();
    setScreen('editor');
  }, [landingResolution, markClean, runAction, state.resolution, syncLocalCameraViews]);

  const handleLoadAutosave = useCallback(() => {
    const autosave = loadStateFromStorage();
    if (!autosave) {
      setHasAutosave(false);
      return;
    }
    openEditorWithProject(autosave);
  }, [openEditorWithProject]);

  const handleSetCell = useCallback((grid: GridName, index: number, value: number) => {
    runAction({ type: 'SET_CELL', grid, index, value }, true);
  }, [runAction]);

  const handleLoadPiece = useCallback((pieceId: string) => {
    const hasUnsavedDraft = state.frontGrid.some(Boolean) || state.sideGrid.some(Boolean) || state.topGrid.some(Boolean);
    if (hasUnsavedDraft) {
      setPendingPieceId(pieceId);
      return;
    }
    runAction({ type: 'LOAD_PIECE_FOR_EDITING', pieceId });
  }, [runAction, state.frontGrid, state.sideGrid, state.topGrid]);

  const handleConfirmPieceSwitch = useCallback(() => {
    if (!pendingPieceId) return;
    runAction({ type: 'LOAD_PIECE_FOR_EDITING', pieceId: pendingPieceId });
    setPendingPieceId(null);
  }, [pendingPieceId, runAction]);

  const handleVoxelClick = useCallback((index: number) => {
    if (state.tool === 'paint') {
      runAction({ type: 'PAINT_VOXEL', index, colorIndex: state.selectedColor }, true);
      return;
    }
    if (state.tool === 'erase') {
      runAction({ type: 'PAINT_VOXEL', index, colorIndex: 0 }, true);
    }
  }, [runAction, state.selectedColor, state.tool]);

  const finishPieceAction = state.editingPieceId ? 'FINISH_EDITING' : 'PUSH_PIECE';

  const goToLanding = useCallback(() => {
    setHasAutosave(Boolean(loadStateFromStorage()));
    setPendingBackToLanding(false);
    setScreen('landing');
  }, []);

  if (screen === 'landing') {
    return (
      <LandingScreen
        resolution={landingResolution}
        hasAutosave={hasAutosave}
        onResolutionChange={setLandingResolution}
        onCreateProject={handleCreateProject}
        onLoadProject={openEditorWithProject}
        onLoadAutosave={handleLoadAutosave}
      />
    );
  }

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

      <ConfirmDialog
        isOpen={pendingBackToLanding}
        title="Unsaved progress"
        description="You have edits since the last manual save/export. Go back to landing anyway?"
        cancelLabel="Stay"
        confirmLabel="Leave"
        onCancel={() => setPendingBackToLanding(false)}
        onConfirm={goToLanding}
      />

      <Toolbar
        state={state}
        canUndo={canUndo}
        canRedo={canRedo}
        hasPieceVoxels={hasPieceVoxels}
        onSetTool={(tool: EditorTool) => runAction({ type: 'SET_TOOL', tool })}
        onSetCameraMode={(mode: CameraMode) => {
          runAction({ type: 'SET_CAMERA_MODE', mode });
          if (mode === 'perspective') {
            runAction({ type: 'SET_CAMERA_VIEW', view: 'perspective' });
            setPieceCameraView('perspective');
            setModelCameraView('perspective');
          } else {
            setModelCameraView('isometric');
          }
        }}
        onNewPiece={() => runAction({ type: 'CANCEL_EDITING' })}
        onPushOrFinishPiece={() => {
          runAction({ type: finishPieceAction }, true);
        }}
        onCancelEditing={() => runAction({ type: 'CANCEL_EDITING' })}
        onUndo={() => runAction({ type: 'UNDO' }, true)}
        onRedo={() => runAction({ type: 'REDO' }, true)}
        onBackToLanding={() => {
          if (hasUnsavedManualChanges) {
            setPendingBackToLanding(true);
            return;
          }
          goToLanding();
        }}
        onManualCheckpoint={markClean}
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
              runAction({ type: 'SET_CAMERA_VIEW', view: 'front' });
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
              runAction({ type: 'SET_CAMERA_VIEW', view: 'left' });
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
              runAction({ type: 'SET_CAMERA_VIEW', view: 'top' });
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
              onRenamePiece={(pieceId, name) => {
                runAction({ type: 'RENAME_PIECE', pieceId, name }, true);
              }}
              onDeletePiece={(pieceId) => {
                runAction({ type: 'DELETE_PIECE', pieceId }, true);
              }}
            />
          </div>

          <div className={styles.centerBottom}>
            <ColorPalette
              palette={state.palette}
              selectedColor={state.selectedColor}
              onColorSelect={(colorIndex: number) => runAction({ type: 'SET_COLOR', colorIndex })}
              onColorChange={(colorIndex, color) => {
                runAction({ type: 'SET_PALETTE_COLOR', colorIndex, color }, true);
              }}
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
