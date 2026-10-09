import Button from '../../components/ui/Button';
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
  help: () => void;
}
export default function ProjectToolbar(props: Props) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.brand}>
        <span className={styles.mark}>▣</span>
        <div>
          <strong>VOXEL EDITOR</strong>
          <span>
            {props.name} · {props.dirty ? 'Unsaved changes' : 'Project saved'}
          </span>
        </div>
      </div>
      <div className={styles.actions}>
        <Button onPress={props.undo} isDisabled={!props.canUndo}>
          Undo
        </Button>
        <Button onPress={props.redo} isDisabled={!props.canRedo}>
          Redo
        </Button>
        <span className={styles.divider} />
        <Button onPress={props.help}>Shortcuts</Button>
        <Button onPress={props.back}>Projects</Button>
        <Button onPress={props.save} isDisabled={props.busy}>
          Save project
        </Button>
        <Button onPress={props.exportMetadata} isDisabled={props.busy}>
          Export bindings
        </Button>
        <Button variant="accent" onPress={props.exportGlb} isDisabled={props.busy}>
          {props.busy ? 'Working…' : 'Export GLB'}
        </Button>
      </div>
    </header>
  );
}
