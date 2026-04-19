import { useCallback } from 'react';
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
  color?: string;
}

interface Props {
  label: string;
  options: SelectOption[];
  value: number;
  onChange: (value: number) => void;
}

export default function SelectField({ label, options, value, onChange }: Props) {
  const handleSelectionChange = useCallback(
    (key: string | number | null) => {
      if (key == null) {
        return;
      }
      onChange(Number(key));
    },
    [onChange]
  );

  return (
    <Select
      className={styles.select}
      selectedKey={String(value)}
      onSelectionChange={handleSelectionChange}
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
              <span className={styles.optionContent}>
                {option.color ? (
                  <svg className={styles.swatch} viewBox="0 0 10 10" aria-hidden>
                    <rect x="0" y="0" width="10" height="10" fill={option.color} />
                  </svg>
                ) : null}
                <span>{option.label}</span>
              </span>
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
