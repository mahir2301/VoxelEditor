import {
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastRegion as ToastRegion,
  UNSTABLE_ToastQueue as ToastQueue
} from 'react-aria-components/Toast';
import styles from './ToastQueue.module.css';

interface EditorToastContent {
  title: string;
}

export const toastQueue = new ToastQueue<EditorToastContent>();

export function ToastRegionProvider() {
  return (
    <ToastRegion queue={toastQueue} className={styles.region}>
      {({ toast }) => (
        <AriaToast toast={toast} className={styles.toast}>
          <ToastContent className={styles.content}>
            <span className={styles.title}>{toast.content.title}</span>
          </ToastContent>
          <button className={styles.close} slot="close" aria-label="Close">
            ✕
          </button>
        </AriaToast>
      )}
    </ToastRegion>
  );
}
