import { useCallback, useMemo, useState } from 'react';
import ColorPalette from './components/ColorPalette';
import Grid2D from './components/Grid2D';
import LandingScreen from './components/LandingScreen';
import PieceList from './components/PieceList';
import Toolbar from './components/Toolbar';
import ConfirmDialog from './components/ui/ConfirmDialog';
import Viewport3D from './components/Viewport3D';
import { loadStateFromStorage } from './features/editor/state/persistence';
import type {
  CameraMode,
  CameraView,
  EditorAction,
  EditorTool,
  GridName,
  SerializedProject
} from './features/editor/state/types';
import { useVoxelState } from './hooks/useVoxelState';
import styles from './App.module.css';

function getToolHint(tool: EditorTool): string {
  if (tool === 'paint') {
    return 'Click model voxels to paint.';
  }
  if (tool === 'erase') {
    return 'Click and drag in grids to erase.';
  }
  return 'Click and drag in grids to draw.';
}

export default function App() {
  const { state, dispatch, canUndo, canRedo, effectiveModelVoxels, editingPieceVoxels } =
    useVoxelState();
  const [screen, setScreen] = useState<'landing' | 'editor'>('landing');
  const [landingResolution, setLandingResolution] = useState(16);
  const [hasAutosave, setHasAutosave] = useState(() => Boolean(loadStateFromStorage()));
  const [pendingPieceId, setPendingPieceId] = useState<string | null>(null);
  const [pendingBackToLanding, setPendingBackToLanding] = useState(false);
  const [hasUnsavedManualChanges, setHasUnsavedManualChanges] = useState(false);
  const [pieceCameraView, setPieceCameraView] = useState<CameraView>(() => state.cameraView);
  const [modelCameraView, setModelCameraView] = useState<CameraView>(() =>
    state.cameraMode === 'isometric' ? 'isometric' : state.cameraView
  );

  const hasPieceVoxels = useMemo(() => state.pieceVoxels.some(Boolean), [state.pieceVoxels]);
  const previewPieceOverlayVoxels =
    editingPieceVoxels || (hasPieceVoxels ? state.pieceVoxels : null);

  const markDirty = useCallback(() => setHasUnsavedManualChanges(true), []);
  const markClean = useCallback(() => setHasUnsavedManualChanges(false), []);

  const runAction = useCallback(
    (action: EditorAction, affectsModel = false) => {
      dispatch(action);
      if (affectsModel) {
        markDirty();
      }
    },
    [dispatch, markDirty]
  );

  const syncLocalCameraViews = useCallback((mode: CameraMode, view: CameraView) => {
    const effectiveView = mode === 'isometric' ? 'isometric' : view;
    setPieceCameraView(effectiveView);
    setModelCameraView(effectiveView);
  }, []);

  const setEditorView = useCallback(
    (view: CameraView) => {
      runAction({ type: 'SET_CAMERA_VIEW', view });
      setPieceCameraView(view);
      setModelCameraView(view);
    },
    [runAction]
  );

  const openEditorWithProject = useCallback(
    (project: SerializedProject) => {
      dispatch({ state: project, type: 'LOAD_PROJECT' });
      setLandingResolution(project.resolution || 16);
      syncLocalCameraViews(
        project.cameraMode || 'perspective',
        project.cameraView || 'perspective'
      );
      markClean();
      setScreen('editor');
    },
    [dispatch, markClean, syncLocalCameraViews]
  );

  const handleCreateProject = useCallback(() => {
    if (state.resolution !== landingResolution) {
      runAction({ resolution: landingResolution, type: 'SET_RESOLUTION' });
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

  const handleSetCell = useCallback(
    (grid: GridName, index: number, value: number) => {
      runAction({ grid, index, type: 'SET_CELL', value }, true);
    },
    [runAction]
  );

  const handleLoadPiece = useCallback(
    (pieceId: string) => {
      const hasUnsavedDraft =
        state.frontGrid.some(Boolean) ||
        state.sideGrid.some(Boolean) ||
        state.topGrid.some(Boolean);
      if (hasUnsavedDraft) {
        setPendingPieceId(pieceId);
        return;
      }
      runAction({ pieceId, type: 'LOAD_PIECE_FOR_EDITING' });
    },
    [runAction, state.frontGrid, state.sideGrid, state.topGrid]
  );

  const handleConfirmPieceSwitch = useCallback(() => {
    if (!pendingPieceId) {
      return;
    }
    runAction({ pieceId: pendingPieceId, type: 'LOAD_PIECE_FOR_EDITING' });
    setPendingPieceId(null);
  }, [pendingPieceId, runAction]);

  const handleVoxelClick = useCallback(
    (index: number) => {
      if (state.tool === 'paint') {
        runAction({ colorIndex: state.selectedColor, index, type: 'PAINT_VOXEL' }, true);
        return;
      }
      if (state.tool === 'erase') {
        runAction({ colorIndex: 0, index, type: 'PAINT_VOXEL' }, true);
      }
    },
    [runAction, state.selectedColor, state.tool]
  );

  const finishPieceAction = state.editingPieceId ? 'FINISH_EDITING' : 'PUSH_PIECE';

  const goToLanding = useCallback(() => {
    setHasAutosave(Boolean(loadStateFromStorage()));
    setPendingBackToLanding(false);
    setScreen('landing');
  }, []);

  const handleCancelPendingPiece = useCallback(() => {
    setPendingPieceId(null);
  }, []);

  const handleCancelBackToLanding = useCallback(() => {
    setPendingBackToLanding(false);
  }, []);

  const handleSetTool = useCallback(
    (tool: EditorTool) => {
      runAction({ tool, type: 'SET_TOOL' });
    },
    [runAction]
  );

  const handleSetCameraMode = useCallback(
    (mode: CameraMode) => {
      runAction({ mode, type: 'SET_CAMERA_MODE' });
      setEditorView(mode === 'perspective' ? 'perspective' : 'isometric');
    },
    [runAction, setEditorView]
  );

  const handleNewPiece = useCallback(() => {
    runAction({ type: 'CANCEL_EDITING' });
  }, [runAction]);

  const handlePushOrFinishPiece = useCallback(() => {
    runAction({ type: finishPieceAction }, true);
  }, [finishPieceAction, runAction]);

  const handleCancelEditing = useCallback(() => {
    runAction({ type: 'CANCEL_EDITING' });
  }, [runAction]);

  const handleUndo = useCallback(() => {
    runAction({ type: 'UNDO' }, true);
  }, [runAction]);

  const handleRedo = useCallback(() => {
    runAction({ type: 'REDO' }, true);
  }, [runAction]);

  const handleBackToLanding = useCallback(() => {
    if (hasUnsavedManualChanges) {
      setPendingBackToLanding(true);
      return;
    }
    goToLanding();
  }, [goToLanding, hasUnsavedManualChanges]);

  const handleFrontCellChange = useCallback(
    (index: number, value: number) => {
      handleSetCell('front', index, value);
    },
    [handleSetCell]
  );

  const handleSideCellChange = useCallback(
    (index: number, value: number) => {
      handleSetCell('side', index, value);
    },
    [handleSetCell]
  );

  const handleTopCellChange = useCallback(
    (index: number, value: number) => {
      handleSetCell('top', index, value);
    },
    [handleSetCell]
  );

  const handleFrontView = useCallback(() => {
    setEditorView('front');
  }, [setEditorView]);

  const handleRightView = useCallback(() => {
    setEditorView('right');
  }, [setEditorView]);

  const handleTopView = useCallback(() => {
    setEditorView('top');
  }, [setEditorView]);

  const handleRenamePiece = useCallback(
    (pieceId: string, name: string) => {
      runAction({ name, pieceId, type: 'RENAME_PIECE' }, true);
    },
    [runAction]
  );

  const handleDeletePiece = useCallback(
    (pieceId: string) => {
      runAction({ pieceId, type: 'DELETE_PIECE' }, true);
    },
    [runAction]
  );

  const handleColorSelect = useCallback(
    (colorIndex: number) => {
      runAction({ colorIndex, type: 'SET_COLOR' });
    },
    [runAction]
  );

  const handlePaletteColorChange = useCallback(
    (colorIndex: number, color: string) => {
      runAction({ color, colorIndex, type: 'SET_PALETTE_COLOR' }, true);
    },
    [runAction]
  );

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
        onCancel={handleCancelPendingPiece}
        onConfirm={handleConfirmPieceSwitch}
      />

      <ConfirmDialog
        isOpen={pendingBackToLanding}
        title="Unsaved progress"
        description="You have edits since the last manual save/export. Go back to landing anyway?"
        cancelLabel="Stay"
        confirmLabel="Leave"
        onCancel={handleCancelBackToLanding}
        onConfirm={goToLanding}
      />

      <Toolbar
        state={state}
        canUndo={canUndo}
        canRedo={canRedo}
        hasPieceVoxels={hasPieceVoxels}
        onSetTool={handleSetTool}
        onSetCameraMode={handleSetCameraMode}
        onNewPiece={handleNewPiece}
        onPushOrFinishPiece={handlePushOrFinishPiece}
        onCancelEditing={handleCancelEditing}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onBackToLanding={handleBackToLanding}
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
            onSetCell={handleFrontCellChange}
            onViewClick={handleFrontView}
          />
          <Grid2D
            gridData={state.sideGrid}
            label="Side (ZY)"
            size={state.resolution}
            tool={state.tool}
            view="side"
            modelVoxels={effectiveModelVoxels}
            onSetCell={handleSideCellChange}
            onViewClick={handleRightView}
          />
          <Grid2D
            gridData={state.topGrid}
            label="Top (XZ)"
            size={state.resolution}
            tool={state.tool}
            view="top"
            modelVoxels={effectiveModelVoxels}
            onSetCell={handleTopCellChange}
            onViewClick={handleTopView}
          />

          <div className={styles.piecePreview}>
            <Viewport3D
              mode="piece"
              pieceVoxels={state.pieceVoxels}
              palette={state.palette}
              resolution={state.resolution}
              cameraMode={state.cameraMode}
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
              onRenamePiece={handleRenamePiece}
              onDeletePiece={handleDeletePiece}
            />
          </div>

          <div className={styles.centerBottom}>
            <ColorPalette
              palette={state.palette}
              selectedColor={state.selectedColor}
              onColorSelect={handleColorSelect}
              onColorChange={handlePaletteColorChange}
            />
            <div className={styles.hint}>{getToolHint(state.tool)}</div>
          </div>

          <div className={styles.rightBottom}>
            <Viewport3D
              mode="model"
              modelVoxels={state.modelVoxels}
              editingPieceVoxels={previewPieceOverlayVoxels}
              modelColors={state.modelColors}
              palette={state.palette}
              resolution={state.resolution}
              cameraMode={state.cameraMode}
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
