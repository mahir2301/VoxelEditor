import { useMemo } from 'react';
import {
  Button,
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorThumb,
  Dialog,
  DialogTrigger,
  Input,
  Label,
  Popover,
  parseColor,
  SliderTrack,
} from 'react-aria-components';
import SelectField from './ui/SelectField';
import styles from './ColorPalette.module.css';

interface Props {
  palette: string[];
  selectedColor: number;
  onColorSelect: (index: number) => void;
  onColorChange: (index: number, color: string) => void;
}

export default function ColorPalette({ palette, selectedColor, onColorSelect, onColorChange }: Props) {
  const selectedHex = palette[selectedColor] || '#808080';

  const options = useMemo(
    () => palette.map((color, index) => ({ value: index, label: `Slot ${index + 1} - ${color}` })),
    [palette],
  );

  return (
    <div className={styles.root}>
      <SelectField
        label="Palette"
        value={selectedColor}
        options={options}
        onChange={onColorSelect}
      />

      <ColorPicker
        value={parseColor(selectedHex).toFormat('hsb')}
        onChange={(color) => onColorChange(selectedColor, color.toString('hex'))}
      >
        <Label className={styles.label}>Color</Label>
        <DialogTrigger>
          <Button className={styles.trigger}>
            <ColorSwatch className={styles.swatch} />
            <span className={styles.hexText}>{selectedHex}</span>
          </Button>
          <Popover className={styles.popover} placement="top start" offset={8}>
            <Dialog className={styles.dialog}>
              <ColorArea className={styles.colorArea} colorSpace="hsb" xChannel="saturation" yChannel="brightness">
                <ColorThumb className={styles.thumb} />
              </ColorArea>

              <ColorSlider className={styles.hueSlider} channel="hue">
                <SliderTrack className={styles.hueTrack}>
                  <ColorThumb className={styles.thumb} />
                </SliderTrack>
              </ColorSlider>

              <ColorField className={styles.hexField}>
                <Label className={styles.hexLabel}>Hex</Label>
                <Input className={styles.hexInput} />
              </ColorField>
            </Dialog>
          </Popover>
        </DialogTrigger>
      </ColorPicker>
    </div>
  );
}
