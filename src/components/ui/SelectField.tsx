import { Choice } from './Fields';
interface Props {
  label: string;
  options: { value: number; label: string; color?: string }[];
  value: number;
  onChange: (value: number) => void;
}
export default function SelectField({ label, options, value, onChange }: Props) {
  return (
    <Choice
      label={label}
      value={String(value)}
      options={options.map((option) => ({
        id: String(option.value),
        label: option.label,
        color: option.color
      }))}
      onChange={(key) => onChange(Number(key))}
    />
  );
}
