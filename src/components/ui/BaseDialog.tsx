import type { ReactNode } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import styles from './BaseDialog.module.css';

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string;
  size?: 'default' | 'wide';
  children?: ReactNode;
}

export default function BaseDialog({
  isOpen,
  title,
  description,
  details,
  size = 'default',
  children
}: Props) {
  return (
    <ModalOverlay isOpen={isOpen} className={styles.overlay}>
      <Modal className={size === 'wide' ? styles.wide : styles.modal}>
        <Dialog>
          <Heading slot="title" className={styles.title}>
            {title}
          </Heading>
          <p className={styles.description}>{description}</p>
          {details ? (
            <details className={styles.details}>
              <summary className={styles.detailsSummary}>Technical details</summary>
              <pre className={styles.detailsBody}>{details}</pre>
            </details>
          ) : null}
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
