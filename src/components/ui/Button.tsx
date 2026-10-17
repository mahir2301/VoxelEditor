import { Button as AriaButton, Tooltip, TooltipTrigger } from 'react-aria-components';
import type { ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cn } from '../../lib/cn';
import styles from './Button.module.css';

type Variant = 'default' | 'accent' | 'success' | 'danger' | 'quiet';

interface Props extends Omit<AriaButtonProps, 'className'> {
  className?: string;
  variant?: Variant;
  isActive?: boolean;
  tooltip?: string;
}

export default function Button({
  className,
  variant = 'default',
  isActive,
  tooltip,
  ...props
}: Props) {
  const variantClass =
    variant === 'accent'
      ? styles.accent
      : variant === 'success'
        ? styles.success
        : variant === 'danger'
          ? styles.danger
          : variant === 'quiet'
            ? styles.quiet
            : '';

  const button = (
    <AriaButton
      {...props}
      aria-pressed={isActive}
      className={cn(styles.button, variantClass, isActive && styles.active, className)}
    />
  );
  return tooltip ? (
    <TooltipTrigger delay={500}>
      {button}
      <Tooltip className={styles.tooltip}>{tooltip}</Tooltip>
    </TooltipTrigger>
  ) : (
    button
  );
}
