import BaseDialog from '../../components/ui/BaseDialog';
import Button from '../../components/ui/Button';
import ShortcutKeys from '../../components/ui/ShortcutKeys';
import { HOTKEYS } from '../editor/hotkeys';
import styles from './ShortcutsDialog.module.css';

const GROUPS = [
  {
    title: 'Project',
    shortcuts: [
      ['Save project', HOTKEYS.saveProject],
      ['Export GLB', HOTKEYS.exportGlb],
      ['Projects', HOTKEYS.backToLanding],
      ['Keyboard shortcuts', HOTKEYS.openShortcuts]
    ]
  },
  {
    title: 'Editing',
    shortcuts: [
      ['Undo', HOTKEYS.undo],
      ['Redo', HOTKEYS.redo],
      ['Duplicate selection', HOTKEYS.duplicate],
      ['Delete selection', HOTKEYS.deleteSelection],
      ['Cancel transform / reset preview', HOTKEYS.cancelEditing]
    ]
  },
  {
    title: 'Assembly',
    shortcuts: [
      ['Select', HOTKEYS.selectTool],
      ['Move', HOTKEYS.moveTool],
      ['Rotate', HOTKEYS.rotateTool],
      ['Pivot', HOTKEYS.pivotTool],
      ['Paint', HOTKEYS.paintTool],
      ['Paint fill', HOTKEYS.paintFillTool],
      ['Focus', HOTKEYS.focusSelection]
    ]
  },
  {
    title: 'Shape',
    shortcuts: [
      ['Draw', HOTKEYS.drawTool],
      ['Erase', HOTKEYS.eraseTool],
      ['Fill', HOTKEYS.fillTool],
      ['Fill erase', HOTKEYS.fillEraseTool],
      ['Add piece / apply changes', HOTKEYS.pushOrDonePiece]
    ]
  }
] as const;

export default function ShortcutsDialog({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} title="Keyboard shortcuts" size="wide">
      <div className={styles.groups}>
        {GROUPS.map(({ title, shortcuts }) => (
          <section key={title} aria-label={title}>
            <h3 className={styles.heading}>{title}</h3>
            <dl className={styles.list}>
              {shortcuts.map(([label, hotkey]) => (
                <div key={hotkey} className={styles.row}>
                  <dt>{label}</dt>
                  <dd>
                    <ShortcutKeys hotkey={hotkey} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div className={styles.actions}>
        <Button onPress={onClose}>Close</Button>
      </div>
    </BaseDialog>
  );
}
