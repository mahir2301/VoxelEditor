import { formatForDisplay } from '@tanstack/react-hotkeys';
import { useCallback } from 'react';
import { HOTKEYS } from '../features/editor/hotkeys';
import type { CameraMode, EditorState, EditorTool } from '../features/editor/state/types';
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
  onSaveProject: () => void;
  onExportGlb: () => void;
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
  onSaveProject,
  onExportGlb
}: Props) {
  const isEditing = Boolean(state.editingPieceId);

  const handleSetDrawTool = useCallback(() => {
    onSetTool('draw');
  }, [onSetTool]);

  const handleSetEraseTool = useCallback(() => {
    onSetTool('erase');
  }, [onSetTool]);

  const handleSetPaintTool = useCallback(() => {
    onSetTool('paint');
  }, [onSetTool]);

  const handleSetPerspectiveMode = useCallback(() => {
    onSetCameraMode('perspective');
  }, [onSetCameraMode]);

  const handleSetIsometricMode = useCallback(() => {
    onSetCameraMode('isometric');
  }, [onSetCameraMode]);

  const formattedHotkeys = useCallback((hotkey: string) => formatForDisplay(hotkey), []);

  const actionLabel = useCallback(
    (label: string, hotkey: string) => (
      <span className={styles.actionLabel}>
        <span>{label}</span>
        <kbd className={styles.hotkey}>{formattedHotkeys(hotkey)}</kbd>
      </span>
    ),
    [formattedHotkeys]
  );

  return (
    <div className={styles.toolbar}>
      <div className={styles.group}>
        <span className={styles.label}>Tools</span>
        <Button isActive={state.tool === 'draw'} onPress={handleSetDrawTool}>
          {actionLabel('Draw', HOTKEYS.drawTool)}
        </Button>
        <Button isActive={state.tool === 'erase'} onPress={handleSetEraseTool}>
          {actionLabel('Erase', HOTKEYS.eraseTool)}
        </Button>
        <Button isActive={state.tool === 'paint'} onPress={handleSetPaintTool}>
          {actionLabel('Paint', HOTKEYS.paintTool)}
        </Button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Camera</span>
        <Button isActive={state.cameraMode === 'perspective'} onPress={handleSetPerspectiveMode}>
          {actionLabel('Perspective', HOTKEYS.perspectiveCamera)}
        </Button>
        <Button isActive={state.cameraMode === 'isometric'} onPress={handleSetIsometricMode}>
          {actionLabel('Isometric', HOTKEYS.isometricCamera)}
        </Button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Piece</span>
        {isEditing ? (
          <>
            <Button variant="accent" onPress={onPushOrFinishPiece}>
              {actionLabel('Done', HOTKEYS.pushOrDonePiece)}
            </Button>
            <Button onPress={onCancelEditing}>
              {actionLabel('Cancel', HOTKEYS.cancelEditing)}
            </Button>
          </>
        ) : (
          <>
            <Button onPress={onNewPiece}>{actionLabel('New Piece', HOTKEYS.newPiece)}</Button>
            <Button variant="accent" isDisabled={!hasPieceVoxels} onPress={onPushOrFinishPiece}>
              {actionLabel('Push', HOTKEYS.pushOrDonePiece)}
            </Button>
          </>
        )}
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>History</span>
        <Button isDisabled={!canUndo} onPress={onUndo}>
          {actionLabel('Undo', HOTKEYS.undo)}
        </Button>
        <Button isDisabled={!canRedo} onPress={onRedo}>
          {actionLabel('Redo', HOTKEYS.redo)}
        </Button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Project</span>
        <Button onPress={onSaveProject}>{actionLabel('Save', HOTKEYS.saveProject)}</Button>
        <Button variant="success" onPress={onExportGlb}>
          {actionLabel('Export GLB', HOTKEYS.exportGlb)}
        </Button>
        <Button onPress={onBackToLanding}>{actionLabel('Back', HOTKEYS.backToLanding)}</Button>
      </div>
    </div>
  );
}
