import { useMemo } from 'react';
import type { CameraMode, EditorState, EditorTool } from '../features/editor/state/types';
import { exportModelAsGLB, exportProject, serializeState } from '../utils/exportGLB';
import Button from './ui/Button';
import styles from './Toolbar.module.css';

interface Props {
  state: EditorState;
  canUndo: boolean;
  canRedo: boolean;
  hasPieceVoxels: boolean;
  onSetTool: (tool: EditorTool) => void;
  onSetCameraMode: (mode: CameraMode) => void;
  onNewPiece: () => void;
  onPushOrFinishPiece: () => void;
  onCancelEditing: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onBackToLanding: () => void;
  onManualCheckpoint: () => void;
}

export default function Toolbar({
  state,
  canUndo,
  canRedo,
  hasPieceVoxels,
  onSetTool,
  onSetCameraMode,
  onNewPiece,
  onPushOrFinishPiece,
  onCancelEditing,
  onUndo,
  onRedo,
  onBackToLanding,
  onManualCheckpoint
}: Props) {
  const isEditing = Boolean(state.editingPieceId);

  const handlers = useMemo(
    () => ({
      exportGlb: async () => {
        try {
          await exportModelAsGLB(
            state.modelVoxels,
            state.modelColors,
            state.palette,
            state.resolution
          );
          onManualCheckpoint();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          window.alert(`Export failed: ${message}`);
        }
      },
      saveProject: () => {
        exportProject(serializeState(state));
        onManualCheckpoint();
      },
      setDrawTool: () => {
        onSetTool('draw');
      },
      setEraseTool: () => {
        onSetTool('erase');
      },
      setIsometricMode: () => {
        onSetCameraMode('isometric');
      },
      setPaintTool: () => {
        onSetTool('paint');
      },
      setPerspectiveMode: () => {
        onSetCameraMode('perspective');
      }
    }),
    [onManualCheckpoint, onSetCameraMode, onSetTool, state]
  );

  return (
    <div className={styles.toolbar}>
      <div className={styles.group}>
        <span className={styles.label}>Tools</span>
        <Button isActive={state.tool === 'draw'} onPress={handlers.setDrawTool}>
          Draw
        </Button>
        <Button isActive={state.tool === 'erase'} onPress={handlers.setEraseTool}>
          Erase
        </Button>
        <Button isActive={state.tool === 'paint'} onPress={handlers.setPaintTool}>
          Paint
        </Button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Camera</span>
        <Button isActive={state.cameraMode === 'perspective'} onPress={handlers.setPerspectiveMode}>
          Perspective
        </Button>
        <Button isActive={state.cameraMode === 'isometric'} onPress={handlers.setIsometricMode}>
          Isometric
        </Button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Piece</span>
        {isEditing ? (
          <>
            <Button variant="accent" onPress={onPushOrFinishPiece}>
              Done
            </Button>
            <Button onPress={onCancelEditing}>Cancel</Button>
          </>
        ) : (
          <>
            <Button onPress={onNewPiece}>New Piece</Button>
            <Button variant="accent" isDisabled={!hasPieceVoxels} onPress={onPushOrFinishPiece}>
              Push
            </Button>
          </>
        )}
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>History</span>
        <Button isDisabled={!canUndo} onPress={onUndo}>
          Undo
        </Button>
        <Button isDisabled={!canRedo} onPress={onRedo}>
          Redo
        </Button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Project</span>
        <Button onPress={handlers.saveProject}>Save</Button>
        <Button variant="success" onPress={handlers.exportGlb}>
          Export GLB
        </Button>
        <Button onPress={onBackToLanding}>Back to Landing</Button>
      </div>
    </div>
  );
}
