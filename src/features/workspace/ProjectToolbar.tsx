import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import styles from './ProjectToolbar.module.css';
interface Props {
  name: string;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
  undo: () => void;
  redo: () => void;
  save: () => void;
  exportGlb: () => void;
  exportMetadata: () => void;
  back: () => void;
}
export default function ProjectToolbar(props: Props) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.brand}>
        <span className={styles.mark}>
          <Icon name="cube" size={24} />
        </span>
        <div>
          <strong>Voxel editor</strong>
          <span>
            {props.name}
            <span className={styles.saveState}>{props.dirty ? 'Unsaved changes' : 'Saved'}</span>
          </span>
        </div>
      </div>
      <div className={styles.actions}>
        <Button aria-label="Undo" onPress={props.undo} isDisabled={!props.canUndo}>
          <Icon name="undo" />
          <span className={styles.optionalLabel}>Undo</span>
        </Button>
        <Button aria-label="Redo" onPress={props.redo} isDisabled={!props.canRedo}>
          <Icon name="redo" />
          <span className={styles.optionalLabel}>Redo</span>
        </Button>
        <span className={styles.divider} />
        <Button variant="quiet" onPress={props.back}>
          <Icon name="folder" />
          Projects
        </Button>
        <Button onPress={props.save} isDisabled={props.busy}>
          <Icon name="save" />
          Save project
        </Button>
        <Button aria-label="Export bindings" onPress={props.exportMetadata} isDisabled={props.busy}>
          <Icon name="file" />
          <span className={styles.optionalLabel}>Export bindings</span>
          <span className={styles.compactLabel}>Bindings</span>
        </Button>
        <Button variant="accent" onPress={props.exportGlb} isDisabled={props.busy}>
          <Icon name="export" />
          {props.busy ? 'Working…' : 'Export GLB'}
        </Button>
      </div>
    </header>
  );
}
