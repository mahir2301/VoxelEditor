import './ColorPalette.css';

export default function ColorPalette({ palette, selectedColor, onColorSelect }) {
  return (
    <div className="color-palette">
      {palette.map((color, idx) => (
        <button
          key={idx}
          className={`color-swatch ${selectedColor === idx ? 'selected' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onColorSelect(idx)}
          title={`Color ${idx}`}
        />
      ))}
    </div>
  );
}
