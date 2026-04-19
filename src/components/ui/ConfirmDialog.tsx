import BaseDialog from './BaseDialog';
import Button from './Button';
import styles from './BaseDialog.module.css';

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string;
  cancelLabel: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'accent' | 'success' | 'default';
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
  confirmVariant = 'danger',
  onCancel,
  onConfirm
}: Props) {
  return (
    <BaseDialog isOpen={isOpen} title={title} description={description} details={details}>
      <div className={styles.actions}>
        <Button onPress={onCancel}>{cancelLabel}</Button>
        {confirmLabel ? (
          <Button variant={confirmVariant} onPress={onConfirm}>
            {confirmLabel}
          </Button>
        ) : null}
      </div>
    </BaseDialog>
  );
}
