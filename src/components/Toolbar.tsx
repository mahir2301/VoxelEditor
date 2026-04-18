import { FileTrigger } from 'react-aria-components';
import { exportModelAsGLB, exportProject, importProject, serializeState } from '../utils/exportGLB';
import type { CameraMode, EditorState, EditorTool, SerializedProject } from '../features/editor/state/types';
import Button from './ui/Button';
import SelectField from './ui/SelectField';
import styles from './Toolbar.module.css';

const RESOLUTIONS = [16, 32, 48, 64];

interface Props {
  state: EditorState;
  canUndo: boolean;
  canRedo: boolean;
  hasPieceVoxels: boolean;
  onSetResolution: (resolution: number) => void;
  onSetTool: (tool: EditorTool) => void;
  onSetCameraMode: (mode: CameraMode) => void;
  onImportProject: (project: SerializedProject) => void;
  onNewProject: () => void;
  onNewPiece: () => void;
  onPushOrFinishPiece: () => void;
  onCancelEditing: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export default function Toolbar({
  state,
  canUndo,
  canRedo,
  hasPieceVoxels,
  onSetResolution,
  onSetTool,
  onSetCameraMode,
  onImportProject,
  onNewProject,
  onNewPiece,
  onPushOrFinishPiece,
  onCancelEditing,
  onUndo,
  onRedo,
}: Props) {
  const isEditing = Boolean(state.editingPieceId);

  const handleImport = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const project = await importProject(file);
      onImportProject(project);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      window.alert(`Import failed: ${message}`);
    }
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.group}>
        <SelectField
          label="Resolution"
          value={state.resolution}
          options={RESOLUTIONS.map((value) => ({ value, label: `${value}x${value}` }))}
          onChange={(resolution) => {
            if (resolution === state.resolution) return;
            const shouldReset = window.confirm('Changing resolution starts a new project. Continue?');
            if (shouldReset) onSetResolution(resolution);
          }}
        />
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Tools</span>
        <Button isActive={state.tool === 'draw'} onPress={() => onSetTool('draw')}>Draw</Button>
        <Button isActive={state.tool === 'erase'} onPress={() => onSetTool('erase')}>Erase</Button>
        <Button isActive={state.tool === 'paint'} onPress={() => onSetTool('paint')}>Paint</Button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Camera</span>
        <Button isActive={state.cameraMode === 'perspective'} onPress={() => onSetCameraMode('perspective')}>Perspective</Button>
        <Button isActive={state.cameraMode === 'isometric'} onPress={() => onSetCameraMode('isometric')}>Isometric</Button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Project</span>
        <div className={styles.filePicker}>
          <FileTrigger acceptedFileTypes={['.voxproj', '.json']} onSelect={handleImport}>
            <Button>Import</Button>
          </FileTrigger>
        </div>
        <Button onPress={() => exportProject(serializeState(state))}>Save</Button>
        <Button onPress={onNewProject}>New</Button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Piece</span>
        {isEditing ? (
          <>
            <Button variant="accent" onPress={onPushOrFinishPiece}>Done</Button>
            <Button onPress={onCancelEditing}>Cancel</Button>
          </>
        ) : (
          <>
            <Button onPress={onNewPiece}>New Piece</Button>
            <Button variant="accent" isDisabled={!hasPieceVoxels} onPress={onPushOrFinishPiece}>Push</Button>
          </>
        )}
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>History</span>
        <Button isDisabled={!canUndo} onPress={onUndo}>Undo</Button>
        <Button isDisabled={!canRedo} onPress={onRedo}>Redo</Button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <span className={styles.label}>Export</span>
        <Button
          variant="success"
          onPress={async () => {
            try {
              await exportModelAsGLB(state.modelVoxels, state.modelColors, state.palette, state.resolution);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              window.alert(`Export failed: ${message}`);
            }
          }}
        >
          Export GLB
        </Button>
      </div>
    </div>
  );
}
