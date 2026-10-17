import type { ReactNode } from 'react';
import {
  Button,
  Disclosure as AriaDisclosure,
  DisclosurePanel,
  Heading
} from 'react-aria-components';
import Icon from './Icon';
import styles from './Disclosure.module.css';
export default function Disclosure({
  title,
  children,
  defaultExpanded = true
}: {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}) {
  return (
    <AriaDisclosure defaultExpanded={defaultExpanded} className={styles.section}>
      <Heading className={styles.heading}>
        <Button slot="trigger" className={styles.trigger}>
          <Icon name="chevron" size={13} />
          <span>{title}</span>
        </Button>
      </Heading>
      <DisclosurePanel className={styles.content}>{children}</DisclosurePanel>
    </AriaDisclosure>
  );
}
