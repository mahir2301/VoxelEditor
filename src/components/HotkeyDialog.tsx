import { formatForDisplay } from '@tanstack/react-hotkeys';
import { HOTKEYS } from '../features/editor/hotkeys';
import BaseDialog from './ui/BaseDialog';
import Button from './ui/Button';
import hotkeyStyles from './HotkeyDialog.module.css';
import styles from './ui/BaseDialog.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GROUPS = [
  {
    title: 'Draft',
    items: [
      ['Draw', HOTKEYS.drawTool],
      ['Erase', HOTKEYS.eraseTool],
      ['Fill', HOTKEYS.fillTool],
      ['Fill Erase', HOTKEYS.fillEraseTool]
    ]
  },
  {
    title: 'Paint',
    items: [
      ['Paint', HOTKEYS.paintTool],
      ['Paint Fill', HOTKEYS.paintFillTool]
    ]
  },
  {
    title: 'View',
    items: [
      ['Front', HOTKEYS.viewFront],
      ['Side', HOTKEYS.viewSide],
      ['Top', HOTKEYS.viewTop],
      ['Perspective', HOTKEYS.perspectiveCamera],
      ['Isometric', HOTKEYS.isometricCamera]
    ]
  },
  {
    title: 'Project',
    items: [
      ['Save', HOTKEYS.saveProject],
      ['Export GLB', HOTKEYS.exportGlb],
      ['Undo', HOTKEYS.undo],
      ['Redo', HOTKEYS.redo],
      ['New Piece', HOTKEYS.newPiece],
      ['Push/Done', HOTKEYS.pushOrDonePiece],
      ['Cancel Edit', HOTKEYS.cancelEditing],
      ['Back to Landing', HOTKEYS.backToLanding],
      ['Toggle Help', HOTKEYS.openShortcuts]
    ]
  }
] as const;

export default function HotkeyDialog({ isOpen, onClose }: Props) {
  return (
    <BaseDialog isOpen={isOpen} title="Keyboard Shortcuts" description="" size="wide">
      <div className={hotkeyStyles.grid}>
        {GROUPS.map((group) => (
          <section key={group.title} className={hotkeyStyles.group}>
            <h3 className={hotkeyStyles.groupTitle}>{group.title}</h3>
            <ul className={hotkeyStyles.list}>
              {group.items.map(([label, hotkey]) => (
                <li key={`${group.title}-${label}`} className={hotkeyStyles.row}>
                  <span>{label}</span>
                  <kbd className={hotkeyStyles.hotkey}>{formatForDisplay(hotkey)}</kbd>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className={styles.actions}>
        <Button onPress={onClose}>Close</Button>
      </div>
    </BaseDialog>
  );
}
