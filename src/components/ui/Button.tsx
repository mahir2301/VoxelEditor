import { Button as AriaButton } from 'react-aria-components';
import type { ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cn } from '../../lib/cn';
import styles from './Button.module.css';

type Variant = 'default' | 'accent' | 'success' | 'danger';

interface Props extends Omit<AriaButtonProps, 'className'> {
  className?: string;
  variant?: Variant;
  isActive?: boolean;
}

export default function Button({ className, variant = 'default', isActive = false, ...props }: Props) {
  const variantClass = variant === 'accent'
    ? styles.accent
    : variant === 'success'
      ? styles.success
      : variant === 'danger'
        ? styles.danger
        : '';

  return (
    <AriaButton
      {...props}
      className={cn(styles.button, variantClass, isActive && styles.active, className)}
    />
  );
}
