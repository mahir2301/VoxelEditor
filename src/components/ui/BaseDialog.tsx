import type { ReactNode } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import Disclosure from './Disclosure';
import styles from './BaseDialog.module.css';

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string;
  size?: 'default' | 'wide';
  onClose?: () => void;
  children?: ReactNode;
}

export default function BaseDialog({
  isOpen,
  title,
  description,
  details,
  size = 'default',
  children,
  onClose
}: Props) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
      className={styles.overlay}
    >
      <Modal className={size === 'wide' ? styles.wide : styles.modal}>
        <Dialog>
          <Heading slot="title" className={styles.title}>
            {title}
          </Heading>
          <p className={styles.description}>{description}</p>
          {details ? (
            <Disclosure title="Technical details" defaultExpanded={false}>
              <pre className={styles.detailsBody}>{details}</pre>
            </Disclosure>
          ) : null}
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
