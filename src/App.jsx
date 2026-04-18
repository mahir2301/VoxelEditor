import { useCallback, useState } from 'react';
import { useVoxelState } from './hooks/useVoxelState';
import Grid2D from './components/Grid2D';
import Viewport3D from './components/Viewport3D';
import PieceList from './components/PieceList';
import ColorPalette from './components/ColorPalette';
import Toolbar from './components/Toolbar';
import './App.css';

export default function App() {
  const { state, dispatch, getEffectiveModelVoxels, getEditingPieceVoxels } = useVoxelState();
  const [pendingPieceId, setPendingPieceId] = useState(null);

  const handleToggleCell = useCallback(
    (grid, index) => dispatch({ type: 'TOGGLE_CELL', grid, index }),
    [dispatch]
  );

  const handleSetCell = useCallback(
    (grid, index, value) => dispatch({ type: 'SET_CELL', grid, index, value }),
    [dispatch]
  );

  const handlePushPiece = useCallback(
    () => dispatch({ type: 'PUSH_PIECE' }),
    [dispatch]
  );

  const handleNewPiece = useCallback(
    () => dispatch({ type: 'CANCEL_EDITING' }),
    [dispatch]
  );

  const hasPieceVoxels = state.pieceVoxels.some((v) => v !== 0);

  const handleLoadPiece = useCallback(
    (pieceId) => {
      const hasGridData = state.frontGrid.some(v => v) || state.sideGrid.some(v => v) || state.topGrid.some(v => v);
      if (hasGridData) {
        setPendingPieceId(pieceId);
      } else {
        dispatch({ type: 'LOAD_PIECE_FOR_EDITING', pieceId });
      }
    },
    [dispatch, state.frontGrid, state.sideGrid, state.topGrid]
  );

  const confirmSwitchPiece = useCallback(() => {
    if (pendingPieceId) {
      dispatch({ type: 'LOAD_PIECE_FOR_EDITING', pieceId: pendingPieceId });
      setPendingPieceId(null);
    }
  }, [dispatch, pendingPieceId]);

  const cancelSwitchPiece = useCallback(() => {
    setPendingPieceId(null);
  }, []);

  const handleRenamePiece = useCallback(
    (pieceId, name) => dispatch({ type: 'RENAME_PIECE', pieceId, name }),
    [dispatch]
  );

  const handleDeletePiece = useCallback(
    (pieceId) => dispatch({ type: 'DELETE_PIECE', pieceId }),
    [dispatch]
  );

  const handleUndo = useCallback(
    () => dispatch({ type: 'UNDO' }),
    [dispatch]
  );

  const handleRedo = useCallback(
    () => dispatch({ type: 'REDO' }),
    [dispatch]
  );

  const handleSetTool = useCallback(
    (tool) => dispatch({ type: 'SET_TOOL', tool }),
    [dispatch]
  );

  const handleSetColor = useCallback(
    (colorIndex) => dispatch({ type: 'SET_COLOR', colorIndex }),
    [dispatch]
  );

  const handleSetCameraMode = useCallback(
    (mode) => dispatch({ type: 'SET_CAMERA_MODE', mode }),
    [dispatch]
  );

  const handleSetCameraView = useCallback(
    (view) => dispatch({ type: 'SET_CAMERA_VIEW', view }),
    [dispatch]
  );

  const handleVoxelClick = useCallback(
    (voxelIndex) => {
      if (state.tool === 'paint') {
        dispatch({ type: 'PAINT_VOXEL', index: voxelIndex, colorIndex: state.selectedColor });
      } else if (state.tool === 'erase') {
        dispatch({ type: 'PAINT_VOXEL', index: voxelIndex, colorIndex: 0 });
      }
    },
    [dispatch, state.tool, state.selectedColor]
  );

  const handleNewProject = useCallback(
    (resolution) => dispatch({ type: 'SET_RESOLUTION', resolution }),
    [dispatch]
  );

  const handleImportProject = useCallback(
    (data) => dispatch({ type: 'LOAD_PROJECT', state: data }),
    [dispatch]
  );

  const effectiveModelVoxels = getEffectiveModelVoxels();
  const editingPieceVoxels = getEditingPieceVoxels();

  return (
    <div className="app">
      {pendingPieceId && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <div className="confirm-dialog-text">
              You have unsaved changes on the current piece. Switch anyway?
            </div>
            <div className="confirm-dialog-buttons">
              <button className="confirm-btn confirm-btn-cancel" onClick={cancelSwitchPiece}>
                Cancel
              </button>
              <button className="confirm-btn confirm-btn-ok" onClick={confirmSwitchPiece}>
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      <Toolbar
        state={state}
        onNewProject={handleNewProject}
        onNewPiece={handleNewPiece}
        onPushPiece={handlePushPiece}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSetTool={handleSetTool}
        onSetCameraMode={handleSetCameraMode}
        onImportProject={handleImportProject}
        hasPieceVoxels={hasPieceVoxels}
      />

      <div className="app-content">
        <div className="app-grids">
          <Grid2D
            gridData={state.frontGrid}
            label="Front (XY)"
            size={state.resolution}
            onSetCell={(idx, val) => handleSetCell('front', idx, val)}
            tool={state.tool}
            depthLabel="Z"
            depth={Math.floor(state.resolution / 2)}
            onDepthChange={() => {}}
            onViewClick={() => handleSetCameraView('front')}
            modelVoxels={effectiveModelVoxels}
            view="front"
          />
          <Grid2D
            gridData={state.sideGrid}
            label="Side (ZY)"
            size={state.resolution}
            onSetCell={(idx, val) => handleSetCell('side', idx, val)}
            tool={state.tool}
            depthLabel="X"
            depth={Math.floor(state.resolution / 2)}
            onDepthChange={() => {}}
            onViewClick={() => handleSetCameraView('left')}
            modelVoxels={effectiveModelVoxels}
            view="side"
          />
          <Grid2D
            gridData={state.topGrid}
            label="Top (XZ)"
            size={state.resolution}
            onSetCell={(idx, val) => handleSetCell('top', idx, val)}
            tool={state.tool}
            depthLabel="Y"
            depth={Math.floor(state.resolution / 2)}
            onDepthChange={() => {}}
            onViewClick={() => handleSetCameraView('top')}
            modelVoxels={effectiveModelVoxels}
            view="top"
          />
          <div className="app-piece-preview">
            <Viewport3D
              mode="piece"
              pieceVoxels={state.pieceVoxels}
              palette={state.palette}
              resolution={state.resolution}
              cameraView={state.cameraView}
            />
          </div>
        </div>

        <div className="app-bottom">
          <div className="app-left-bottom">
            <PieceList
              pieces={state.pieces}
              resolution={state.resolution}
              editingPieceId={state.editingPieceId}
              onSelectPiece={handleLoadPiece}
              onRenamePiece={handleRenamePiece}
              onDeletePiece={handleDeletePiece}
            />
          </div>
          <div className="app-center-bottom">
            <ColorPalette
              palette={state.palette}
              selectedColor={state.selectedColor}
              onColorSelect={handleSetColor}
            />
            <div className="app-hint">
              {state.tool === 'paint' && 'Click on model preview to paint voxels'}
              {state.tool === 'draw' && 'Click/drag on grids to draw'}
              {state.tool === 'erase' && 'Click/drag on grids or model to erase'}
            </div>
          </div>
          <div className="app-right-bottom">
            <Viewport3D
              mode="model"
              modelVoxels={state.modelVoxels}
              editingPieceVoxels={editingPieceVoxels}
              modelColors={state.modelColors}
              palette={state.palette}
              resolution={state.resolution}
              cameraMode={state.cameraMode}
              cameraView={state.cameraView}
              onVoxelClick={handleVoxelClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
