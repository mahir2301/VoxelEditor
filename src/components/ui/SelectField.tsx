import { useMemo } from 'react';
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue
} from 'react-aria-components';
import styles from './SelectField.module.css';

interface SelectOption {
  value: number;
  label: string;
}

interface Props {
  label: string;
  options: SelectOption[];
  value: number;
  onChange: (value: number) => void;
}

export default function SelectField({ label, options, value, onChange }: Props) {
  const handlers = useMemo(
    () => ({
      onSelectionChange: (key: string | number | null) => {
        if (key == null) {
          return;
        }
        onChange(Number(key));
      }
    }),
    [onChange]
  );

  return (
    <Select
      className={styles.select}
      selectedKey={String(value)}
      onSelectionChange={handlers.onSelectionChange}
    >
      <Label className={styles.label}>{label}</Label>
      <Button className={styles.trigger}>
        <SelectValue />
        <span aria-hidden>▾</span>
      </Button>
      <Popover className={styles.popover}>
        <ListBox className={styles.list}>
          {options.map((option) => (
            <ListBoxItem
              key={String(option.value)}
              id={String(option.value)}
              textValue={option.label}
              className={styles.option}
            >
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
