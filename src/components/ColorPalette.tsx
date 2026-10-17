import { useCallback } from 'react';
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
  Heading,
  ToggleButtonGroup,
  ToggleButton,
  Input,
  Label,
  Popover,
  SliderTrack,
  parseColor
} from 'react-aria-components';
import Icon from './ui/Icon';
import styles from './ColorPalette.module.css';

interface Props {
  palette: string[];
  selectedColor: number;
  onColorSelect: (index: number) => void;
  onColorChange: (index: number, color: string) => void;
}

export default function ColorPalette({
  palette,
  selectedColor,
  onColorSelect,
  onColorChange
}: Props) {
  const selectedHex = palette[selectedColor] || '#808080';
  const handleColorPickerChange = useCallback(
    (color: { toString: (format: 'hex') => string }) => {
      onColorChange(selectedColor, color.toString('hex'));
    },
    [onColorChange, selectedColor]
  );

  return (
    <div className={styles.root}>
      <ToggleButtonGroup
        aria-label="Palette slots"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[String(selectedColor)]}
        onSelectionChange={(keys) => {
          const key = [...keys][0];
          if (key !== undefined) onColorSelect(Number(key));
        }}
        className={styles.slots}
      >
        {palette
          .map((color, index) => ({ color, id: String(index) }))
          .map(({ color, id }) => (
            <ToggleButton
              key={id}
              id={id}
              aria-label={`Slot ${Number(id) + 1}, ${color}`}
              className={styles.slot}
            >
              <ColorSwatch color={color} className={styles.slotColor} />
            </ToggleButton>
          ))}
      </ToggleButtonGroup>

      <ColorPicker
        value={parseColor(selectedHex).toFormat('hsb')}
        onChange={handleColorPickerChange}
      >
        <Label className={styles.label}>Slot {selectedColor + 1} color</Label>
        <DialogTrigger>
          <Button className={styles.trigger} aria-label={`Edit palette color ${selectedColor + 1}`}>
            <ColorSwatch className={styles.swatch} />
            <span className={styles.hexText}>{selectedHex}</span>
            <Icon name="paint" size={14} />
          </Button>
          <Popover className={styles.popover} placement="top start" offset={8}>
            <Dialog className={styles.dialog}>
              <Heading slot="title" className={styles.title}>
                Edit palette color
              </Heading>
              <ColorArea
                aria-label="Saturation and brightness"
                className={styles.colorArea}
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
              >
                <ColorThumb className={styles.thumb} />
              </ColorArea>

              <ColorSlider aria-label="Hue" className={styles.hueSlider} channel="hue">
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
