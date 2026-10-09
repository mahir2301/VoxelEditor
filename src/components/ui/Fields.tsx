import {
  Button as AriaButton,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  NumberField,
  Popover,
  Select,
  SelectValue,
  TextField
} from 'react-aria-components';
import styles from './Fields.module.css';
export function TextInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField className={styles.field} value={value} onChange={onChange}>
      <Label>{label}</Label>
      <Input />
    </TextField>
  );
}
export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <NumberField
      className={styles.field}
      value={value}
      minValue={min}
      maxValue={max}
      step={step}
      onChange={(v) => {
        if (Number.isFinite(v)) onChange(v);
      }}
    >
      <Label>{label}</Label>
      <Input />
    </NumberField>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      className={styles.field}
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key !== null) onChange(String(key));
      }}
    >
      <Label>{label}</Label>
      <AriaButton className={styles.select}>
        <SelectValue />
        <span>⌄</span>
      </AriaButton>
      <Popover className={styles.popover}>
        <ListBox>
          {options.map((o) => (
            <ListBoxItem id={o.id} key={o.id} textValue={o.label} className={styles.option}>
              {o.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
