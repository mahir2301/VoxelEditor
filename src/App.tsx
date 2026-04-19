import { useHotkeys } from '@tanstack/react-hotkeys';
import type { UseHotkeyDefinition } from '@tanstack/react-hotkeys';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import HotkeyDialog from './components/HotkeyDialog';
import LandingScreen from './components/LandingScreen';
import ConfirmDialog from './components/ui/ConfirmDialog';
import { ToastRegionProvider, toastQueue } from './components/ui/ToastQueue';
import { HOTKEYS } from './features/editor/hotkeys';
import { loadStateFromStorage } from './features/editor/state/persistence';
import { serializeState } from './features/editor/state/serialization';
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

const Toolbar = lazy(() => import('./components/Toolbar'));
const Grid2D = lazy(() => import('./components/Grid2D'));
const PieceList = lazy(() => import('./components/PieceList'));
const ColorPalette = lazy(() => import('./components/ColorPalette'));
const Viewport3D = lazy(() => import('./components/Viewport3D'));
const EDITOR_LOADING_FALLBACK = <div className={styles.loading}>Loading editor...</div>;
const ONBOARDING_KEY = 'voxel-editor-onboarding-v1';
const ONBOARDING_STEPS = [
  'Draw your piece by filling the Front, Side, and Top projection grids.',
  'Push the draft into the model, then create more pieces or edit existing ones.',
  'Use Paint and Paint Fill on the model preview to color visible voxels.'
] as const;

interface PendingDeletePiece {
  id: string;
  name: string;
  voxelCount: number;
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
  const [cameraViewResetToken, setCameraViewResetToken] = useState(0);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isExportingGlb, setIsExportingGlb] = useState(false);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false);
  const [pendingDeletePiece, setPendingDeletePiece] = useState<PendingDeletePiece | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<number>(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY);
    return seen ? -1 : 0;
  });

  const hasPieceVoxels = useMemo(() => state.pieceVoxels.some(Boolean), [state.pieceVoxels]);
  const previewPieceOverlayVoxels =
    editingPieceVoxels || (hasPieceVoxels ? state.pieceVoxels : null);

  const markDirty = useCallback(() => setHasUnsavedManualChanges(true), []);
  const markClean = useCallback(() => setHasUnsavedManualChanges(false), []);
  const closeOperationError = useCallback(() => {
    setOperationError(null);
  }, []);

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
      setCameraViewResetToken((value) => value + 1);
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
      toastQueue.add({ title: 'Project loaded.' }, { timeout: 2400 });
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

  const handleFillCell = useCallback(
    (grid: GridName, index: number, value: number) => {
      runAction({ grid, index, type: 'FILL_CELL', value }, true);
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
      if (state.tool === 'paintFill') {
        runAction({ colorIndex: state.selectedColor, index, type: 'FILL_PAINT_VOXEL' }, true);
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

  const handleOpenHotkeys = useCallback(() => {
    setIsHotkeysOpen(true);
  }, []);

  const handleCloseHotkeys = useCallback(() => {
    setIsHotkeysOpen(false);
  }, []);

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setOnboardingStep(-1);
  }, []);

  const advanceOnboarding = useCallback(() => {
    setOnboardingStep((current) => {
      if (current >= 2) {
        localStorage.setItem(ONBOARDING_KEY, '1');
        return -1;
      }
      return current + 1;
    });
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

  const handleSetDrawTool = useCallback(() => {
    handleSetTool('draw');
  }, [handleSetTool]);

  const handleSetEraseTool = useCallback(() => {
    handleSetTool('erase');
  }, [handleSetTool]);

  const handleSetPaintTool = useCallback(() => {
    handleSetTool('paint');
  }, [handleSetTool]);

  const handleSetFillTool = useCallback(() => {
    handleSetTool('fill');
  }, [handleSetTool]);

  const handleSetFillEraseTool = useCallback(() => {
    handleSetTool('fillErase');
  }, [handleSetTool]);

  const handleSetPaintFillTool = useCallback(() => {
    handleSetTool('paintFill');
  }, [handleSetTool]);

  const handleSetCameraMode = useCallback(
    (mode: CameraMode) => {
      runAction({ mode, type: 'SET_CAMERA_MODE' });
      setEditorView(mode === 'perspective' ? 'perspective' : 'isometric');
    },
    [runAction, setEditorView]
  );

  const handleSetPerspectiveMode = useCallback(() => {
    handleSetCameraMode('perspective');
  }, [handleSetCameraMode]);

  const handleSetIsometricMode = useCallback(() => {
    handleSetCameraMode('isometric');
  }, [handleSetCameraMode]);

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

  const handleSaveProject = useCallback(() => {
    if (isSavingProject || isExportingGlb) {
      return;
    }
    setIsSavingProject(true);
    void import('./utils/exportGLB')
      .then(({ exportProject }) => {
        exportProject(serializeState(state));
        markClean();
        toastQueue.add({ title: 'Project saved.' }, { timeout: 2400 });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setOperationError(`Save failed: ${message}`);
      })
      .finally(() => {
        setIsSavingProject(false);
      });
  }, [isExportingGlb, isSavingProject, markClean, state]);

  const handleExportGlb = useCallback(async () => {
    if (isSavingProject || isExportingGlb) {
      return;
    }
    setIsExportingGlb(true);
    try {
      const { exportModelAsGLB } = await import('./utils/exportGLB');
      await exportModelAsGLB(state.modelVoxels, state.modelColors, state.palette, state.resolution);
      markClean();
      toastQueue.add({ title: 'GLB exported.' }, { timeout: 2400 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setOperationError(`Export failed: ${message}`);
    } finally {
      setIsExportingGlb(false);
    }
  }, [
    isExportingGlb,
    isSavingProject,
    markClean,
    state.modelColors,
    state.modelVoxels,
    state.palette,
    state.resolution
  ]);

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

  const handleFrontCellFill = useCallback(
    (index: number, value: number) => {
      handleFillCell('front', index, value);
    },
    [handleFillCell]
  );

  const handleSideCellFill = useCallback(
    (index: number, value: number) => {
      handleFillCell('side', index, value);
    },
    [handleFillCell]
  );

  const handleTopCellFill = useCallback(
    (index: number, value: number) => {
      handleFillCell('top', index, value);
    },
    [handleFillCell]
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

  const handleResetCameraView = useCallback(() => {
    setCameraViewResetToken((value) => value + 1);
  }, []);

  const handleRenamePiece = useCallback(
    (pieceId: string, name: string) => {
      runAction({ name, pieceId, type: 'RENAME_PIECE' }, true);
    },
    [runAction]
  );

  const handleDeletePiece = useCallback(
    (pieceId: string) => {
      const piece = state.pieces.find((entry) => entry.id === pieceId);
      if (!piece) {
        return;
      }
      let voxelCount = 0;
      for (let index = 0; index < piece.voxels.length; index += 1) {
        if (piece.voxels[index]) {
          voxelCount += 1;
        }
      }
      setPendingDeletePiece({
        id: piece.id,
        name: piece.name,
        voxelCount
      });
    },
    [state.pieces]
  );

  const cancelDeletePiece = useCallback(() => {
    setPendingDeletePiece(null);
  }, []);

  const confirmDeletePiece = useCallback(() => {
    if (!pendingDeletePiece) {
      return;
    }
    runAction({ pieceId: pendingDeletePiece.id, type: 'DELETE_PIECE' }, true);
    setPendingDeletePiece(null);
  }, [pendingDeletePiece, runAction]);

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

  const hotkeys = useMemo<UseHotkeyDefinition[]>(
    () => [
      { callback: handleSetDrawTool, hotkey: HOTKEYS.drawTool },
      { callback: handleSetEraseTool, hotkey: HOTKEYS.eraseTool },
      { callback: handleSetFillTool, hotkey: HOTKEYS.fillTool },
      { callback: handleSetFillEraseTool, hotkey: HOTKEYS.fillEraseTool },
      { callback: handleSetPaintTool, hotkey: HOTKEYS.paintTool },
      { callback: handleSetPaintFillTool, hotkey: HOTKEYS.paintFillTool },
      { callback: handleFrontView, hotkey: HOTKEYS.viewFront },
      { callback: handleRightView, hotkey: HOTKEYS.viewSide },
      { callback: handleTopView, hotkey: HOTKEYS.viewTop },
      { callback: handleSetPerspectiveMode, hotkey: HOTKEYS.perspectiveCamera },
      { callback: handleSetIsometricMode, hotkey: HOTKEYS.isometricCamera },
      { callback: handleNewPiece, hotkey: HOTKEYS.newPiece },
      {
        callback: handlePushOrFinishPiece,
        hotkey: HOTKEYS.pushOrDonePiece,
        options: { enabled: hasPieceVoxels || Boolean(state.editingPieceId) }
      },
      {
        callback: handleCancelEditing,
        hotkey: HOTKEYS.cancelEditing,
        options: { enabled: Boolean(state.editingPieceId) }
      },
      { callback: handleUndo, hotkey: HOTKEYS.undo, options: { enabled: canUndo } },
      { callback: handleRedo, hotkey: HOTKEYS.redo, options: { enabled: canRedo } },
      { callback: handleSaveProject, hotkey: HOTKEYS.saveProject },
      {
        callback: () => {
          void handleExportGlb();
        },
        hotkey: HOTKEYS.exportGlb
      },
      { callback: handleBackToLanding, hotkey: HOTKEYS.backToLanding },
      { callback: handleOpenHotkeys, hotkey: HOTKEYS.openShortcuts }
    ],
    [
      canRedo,
      canUndo,
      handleBackToLanding,
      handleCancelEditing,
      handleFrontView,
      handleNewPiece,
      handlePushOrFinishPiece,
      handleRedo,
      handleRightView,
      handleSetDrawTool,
      handleSetEraseTool,
      handleSetFillEraseTool,
      handleSetFillTool,
      handleSetIsometricMode,
      handleSetPaintFillTool,
      handleSetPaintTool,
      handleSetPerspectiveMode,
      handleSaveProject,
      handleOpenHotkeys,
      handleExportGlb,
      handleTopView,
      handleUndo,
      hasPieceVoxels,
      state.editingPieceId
    ]
  );

  useHotkeys(hotkeys, { enabled: screen === 'editor' });

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

      <ConfirmDialog
        isOpen={Boolean(operationError)}
        title="Operation failed"
        description={operationError || ''}
        cancelLabel="Close"
        onCancel={closeOperationError}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDeletePiece)}
        title="Delete piece"
        description={
          pendingDeletePiece
            ? `Delete "${pendingDeletePiece.name}" (${String(pendingDeletePiece.voxelCount)} voxels)?`
            : ''
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        onCancel={cancelDeletePiece}
        onConfirm={confirmDeletePiece}
      />

      <ConfirmDialog
        isOpen={onboardingStep >= 0}
        title={`Welcome (${String(onboardingStep + 1)}/3)`}
        description={onboardingStep >= 0 ? ONBOARDING_STEPS[onboardingStep] : ''}
        cancelLabel="Skip"
        confirmLabel={onboardingStep >= 2 ? 'Done' : 'Next'}
        confirmVariant="accent"
        onCancel={dismissOnboarding}
        onConfirm={advanceOnboarding}
      />

      <HotkeyDialog isOpen={isHotkeysOpen} onClose={handleCloseHotkeys} />
      <ToastRegionProvider />

      <Suspense fallback={EDITOR_LOADING_FALLBACK}>
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
          onSaveProject={handleSaveProject}
          onExportGlb={handleExportGlb}
          onOpenShortcuts={handleOpenHotkeys}
          hasUnsavedChanges={hasUnsavedManualChanges}
          isSavingProject={isSavingProject}
          isExportingGlb={isExportingGlb}
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
              onFillCell={handleFrontCellFill}
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
              onFillCell={handleSideCellFill}
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
              onFillCell={handleTopCellFill}
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
                viewResetToken={cameraViewResetToken}
                onCameraViewChange={setPieceCameraView}
                onResetView={handleResetCameraView}
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
                viewResetToken={cameraViewResetToken}
                onVoxelClick={handleVoxelClick}
                onCameraViewChange={setModelCameraView}
                onResetView={handleResetCameraView}
              />
            </div>
          </div>
        </div>
      </Suspense>
    </div>
  );
}
