import { Button } from 'react-aria-components';
import { cn } from '../lib/cn';
import styles from './ColorPalette.module.css';

interface Props {
  palette: string[];
  selectedColor: number;
  onColorSelect: (index: number) => void;
}

export default function ColorPalette({ palette, selectedColor, onColorSelect }: Props) {
  return (
    <div className={styles.root}>
      {palette.map((color, index) => (
        <Button
          key={color + index}
          className={cn(styles.swatch, selectedColor === index && styles.selected)}
          style={{ backgroundColor: color }}
          onPress={() => onColorSelect(index)}
          aria-label={`Select color ${index}`}
        />
      ))}
    </div>
  );
}
