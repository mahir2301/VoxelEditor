import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import './Grid2D.css';

export default function Grid2D({
  gridData,
  label,
  size,
  onSetCell,
  tool,
  depthLabel,
  depth,
  onDepthChange,
  onViewClick,
  modelVoxels = null,
  view = 'front',
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const isDrawing = useRef(false);
  const drawValue = useRef(1);
  const [hoverCell, setHoverCell] = useState(null);
  const [canvasDim, setCanvasDim] = useState(300);

  // Calculate canvas size to fit container while maintaining aspect ratio
  useEffect(() => {
    const updateSize = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const dim = Math.min(rect.width - 8, rect.height - 8);
      setCanvasDim(Math.max(100, Math.floor(dim)));
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (wrapRef.current) resizeObserver.observe(wrapRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const cellSize = canvasDim / size;

  // Draw the grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasDim, canvasDim);

    // Draw cells
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = x + y * size;
        const filled = gridData[idx] !== 0;

        if (filled) {
          ctx.fillStyle = '#4a9eff';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    // 1/4 and 1/2 subdivision lines
    ctx.lineWidth = 1;
    for (const frac of [0.25, 0.75]) {
      const px = Math.round(frac * size) * cellSize;
      const py = Math.round(frac * size) * cellSize;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvasDim);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvasDim, py);
      ctx.stroke();
    }

    // 1/2 line (brightest)
    const half = Math.round(size / 2) * cellSize;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, canvasDim);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, half);
    ctx.lineTo(canvasDim, half);
    ctx.stroke();

    // Model silhouette outline
    if (modelVoxels) {
      const sil = new Uint8Array(size * size);
      for (let i = 0; i < modelVoxels.length; i++) {
        if (!modelVoxels[i]) continue;
        const mx = i % size;
        const my = Math.floor(i / size) % size;
        const mz = Math.floor(i / (size * size));
        let col, row;
        if (view === 'front') { col = mx; row = size - 1 - my; }
        else if (view === 'side') { col = mz; row = size - 1 - my; }
        else { col = mx; row = mz; }
        if (col >= 0 && col < size && row >= 0 && row < size) {
          sil[col + row * size] = 1;
        }
      }

      ctx.strokeStyle = 'rgba(255, 200, 50, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          if (!sil[col + row * size]) continue;
          const x1 = col * cellSize;
          const y1 = row * cellSize;
          const x2 = x1 + cellSize;
          const y2 = y1 + cellSize;
          if (col === 0 || !sil[col - 1 + row * size]) { ctx.moveTo(x1, y1); ctx.lineTo(x1, y2); }
          if (col === size - 1 || !sil[col + 1 + row * size]) { ctx.moveTo(x2, y1); ctx.lineTo(x2, y2); }
          if (row === 0 || !sil[col + (row - 1) * size]) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); }
          if (row === size - 1 || !sil[col + (row + 1) * size]) { ctx.moveTo(x1, y2); ctx.lineTo(x2, y2); }
        }
      }
      ctx.stroke();
    }

    // Hover highlight
    if (hoverCell) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoverCell.x * cellSize,
        hoverCell.y * cellSize,
        cellSize,
        cellSize
      );
    }

    // Draw depth indicator line
    if (depth !== undefined && depthLabel) {
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      if (depthLabel === 'X') {
        ctx.beginPath();
        ctx.moveTo(depth * cellSize, 0);
        ctx.lineTo(depth * cellSize, canvasDim);
        ctx.stroke();
      } else if (depthLabel === 'Y') {
        ctx.beginPath();
        ctx.moveTo(0, depth * cellSize);
        ctx.lineTo(canvasDim, depth * cellSize);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }, [gridData, size, canvasDim, cellSize, hoverCell, depth, depthLabel, modelVoxels, view]);

  const getCellFromEvent = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasDim / rect.width;
      const scaleY = canvasDim / rect.height;
      const x = Math.floor(((e.clientX - rect.left) * scaleX) / cellSize);
      const y = Math.floor(((e.clientY - rect.top) * scaleY) / cellSize);
      if (x < 0 || x >= size || y < 0 || y >= size) return null;
      return { x, y, index: x + y * size };
    },
    [size, canvasDim, cellSize]
  );

  const handleMouseDown = useCallback(
    (e) => {
      const cell = getCellFromEvent(e);
      if (!cell) return;
      isDrawing.current = true;

      if (tool === 'draw') {
        drawValue.current = gridData[cell.index] ? 0 : 1;
        onSetCell(cell.index, drawValue.current);
      } else if (tool === 'erase') {
        onSetCell(cell.index, 0);
      }
    },
    [getCellFromEvent, gridData, onSetCell, tool]
  );

  const handleMouseMove = useCallback(
    (e) => {
      const cell = getCellFromEvent(e);
      setHoverCell(cell);

      if (!isDrawing.current || !cell) return;

      if (tool === 'draw') {
        onSetCell(cell.index, drawValue.current);
      } else if (tool === 'erase') {
        onSetCell(cell.index, 0);
      }
    },
    [getCellFromEvent, onSetCell, tool]
  );

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDrawing.current = false;
    setHoverCell(null);
  }, []);

  return (
    <div className="grid2d">
      <div className="grid2d-header">
        <span className="grid2d-label">{label}</span>
        {onViewClick && (
          <button className="grid2d-view-btn" onClick={onViewClick} title={`Set ${label} view`}>
            View
          </button>
        )}
      </div>
      <div className="grid2d-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          width={canvasDim}
          height={canvasDim}
          className="grid2d-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      {depthLabel && (
        <div className="grid2d-slider-row">
          <label className="grid2d-slider-label">
            {depthLabel}: {depth}
          </label>
          <input
            type="range"
            min={0}
            max={size - 1}
            value={depth}
            onChange={(e) => onDepthChange(Number(e.target.value))}
            className="grid2d-slider"
          />
        </div>
      )}
    </div>
  );
}
