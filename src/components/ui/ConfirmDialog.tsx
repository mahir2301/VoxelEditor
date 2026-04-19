import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import Button from './Button';
import styles from './ConfirmDialog.module.css';

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string;
  cancelLabel: string;
  confirmLabel?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  details,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm
}: Props) {
  return (
    <ModalOverlay isOpen={isOpen} className={styles.overlay}>
      <Modal className={styles.modal}>
        <Dialog>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>
          {details ? (
            <details className={styles.details}>
              <summary className={styles.detailsSummary}>Technical details</summary>
              <pre className={styles.detailsBody}>{details}</pre>
            </details>
          ) : null}
          <div className={styles.actions}>
            <Button onPress={onCancel}>{cancelLabel}</Button>
            {confirmLabel ? (
              <Button variant="danger" onPress={onConfirm}>
                {confirmLabel}
              </Button>
            ) : null}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
