import { formatForDisplay } from '@tanstack/react-hotkeys';
import type { Hotkey } from '@tanstack/react-hotkeys';
import styles from './ShortcutKeys.module.css';

export default function ShortcutKeys({ hotkey }: { hotkey: Hotkey }) {
  const keys = formatForDisplay(hotkey, { separatorToken: '\u001f' }).split('\u001f');
  return (
    <span
      className={styles.keys}
      role="img"
      aria-label={formatForDisplay(hotkey, { useSymbols: false, separatorToken: ' + ' })}
    >
      {keys.map((key) => (
        <kbd key={key} className={styles.key} aria-hidden="true">
          {key}
        </kbd>
      ))}
    </span>
  );
}
