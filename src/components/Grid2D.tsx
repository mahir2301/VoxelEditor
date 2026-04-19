import { formatForDisplay } from '@tanstack/react-hotkeys';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { HOTKEYS } from '../features/editor/hotkeys';
import type { EditorTool } from '../features/editor/state/types';
import Button from './ui/Button';
import styles from './Grid2D.module.css';

interface HoverCell {
  x: number;
  y: number;
  index: number;
}

interface DrawCanvasInput {
  gridData: Uint8Array;
  size: number;
  canvasDim: number;
  cellSize: number;
  hoverCell: HoverCell | null;
  modelVoxels?: Uint8Array | null;
  view: 'front' | 'side' | 'top';
}

interface Props {
  gridData: Uint8Array;
  label: string;
  size: number;
  onSetCell: (index: number, value: number) => void;
  onFillCell: (index: number, value: number) => void;
  tool: EditorTool;
  onViewClick: () => void;
  modelVoxels?: Uint8Array | null;
  view: 'front' | 'side' | 'top';
}

function drawCanvas(
  ctx: CanvasRenderingContext2D,
  { gridData, size, canvasDim, cellSize, hoverCell, modelVoxels, view }: DrawCanvasInput
): void {
  ctx.fillStyle = '#111b2a';
  ctx.fillRect(0, 0, canvasDim, canvasDim);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = x + y * size;
      if (gridData[index]) {
        ctx.fillStyle = '#5ca0d8';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
      ctx.strokeStyle = '#253851';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  for (const fraction of [0.25, 0.75]) {
    const position = Math.round(size * fraction) * cellSize;
    ctx.strokeStyle = 'rgba(236, 243, 252, 0.26)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, canvasDim);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, position);
    ctx.lineTo(canvasDim, position);
    ctx.stroke();
  }

  const halfPosition = Math.round(size / 2) * cellSize;
  ctx.strokeStyle = 'rgba(236, 243, 252, 0.45)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(halfPosition, 0);
  ctx.lineTo(halfPosition, canvasDim);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, halfPosition);
  ctx.lineTo(canvasDim, halfPosition);
  ctx.stroke();

  if (modelVoxels) {
    const silhouette = new Uint8Array(size * size);
    for (let i = 0; i < modelVoxels.length; i += 1) {
      if (!modelVoxels[i]) {
        continue;
      }
      const x = i % size;
      const y = Math.floor(i / size) % size;
      const z = Math.floor(i / (size * size));
      let col = x;
      let row = z;
      if (view === 'front') {
        row = size - 1 - y;
      }
      if (view === 'side') {
        col = size - 1 - z;
        row = size - 1 - y;
      }
      silhouette[col + row * size] = 1;
    }

    ctx.strokeStyle = 'rgba(232, 178, 95, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (!silhouette[col + row * size]) {
          continue;
        }
        const x1 = col * cellSize;
        const y1 = row * cellSize;
        const x2 = x1 + cellSize;
        const y2 = y1 + cellSize;
        if (col === 0 || !silhouette[col - 1 + row * size]) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1, y2);
        }
        if (col === size - 1 || !silhouette[col + 1 + row * size]) {
          ctx.moveTo(x2, y1);
          ctx.lineTo(x2, y2);
        }
        if (row === 0 || !silhouette[col + (row - 1) * size]) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y1);
        }
        if (row === size - 1 || !silhouette[col + (row + 1) * size]) {
          ctx.moveTo(x1, y2);
          ctx.lineTo(x2, y2);
        }
      }
    }
    ctx.stroke();
  }

  if (hoverCell) {
    ctx.strokeStyle = '#d3e6f8';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(hoverCell.x * cellSize, hoverCell.y * cellSize, cellSize, cellSize);
  }
}

export default function Grid2D({
  gridData,
  label,
  size,
  onSetCell,
  onFillCell,
  tool,
  onViewClick,
  modelVoxels,
  view
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const [hoverCell, setHoverCell] = useState<HoverCell | null>(null);
  const [canvasDim, setCanvasDim] = useState(300);

  useEffect(() => {
    const updateSize = () => {
      if (!wrapRef.current) {
        return;
      }
      const rect = wrapRef.current.getBoundingClientRect();
      const nextDim = Math.max(120, Math.floor(Math.min(rect.width - 8, rect.height - 8)));
      setCanvasDim(nextDim);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (wrapRef.current) {
      observer.observe(wrapRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const cellSize = canvasDim / size;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    drawCanvas(context, { canvasDim, cellSize, gridData, hoverCell, modelVoxels, size, view });
  }, [canvasDim, cellSize, gridData, hoverCell, modelVoxels, size, view]);

  const getCell = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>): HoverCell | null => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((event.clientX - rect.left) * (canvasDim / rect.width)) / cellSize);
      const y = Math.floor(((event.clientY - rect.top) * (canvasDim / rect.height)) / cellSize);
      if (x < 0 || x >= size || y < 0 || y >= size) {
        return null;
      }
      return { index: x + y * size, x, y };
    },
    [canvasDim, cellSize, size]
  );

  const applyTool = useCallback(
    (index: number) => {
      if (tool === 'erase' || tool === 'fillErase') {
        onSetCell(index, 0);
        return;
      }
      if (tool !== 'draw' && tool !== 'fill') {
        return;
      }
      onSetCell(index, 1);
    },
    [onSetCell, tool]
  );

  const handlePointerDown = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      const cell = getCell(event);
      if (!cell) {
        return;
      }
      if (tool === 'fill') {
        onFillCell(cell.index, 1);
        return;
      }
      if (tool === 'fillErase') {
        onFillCell(cell.index, 0);
        return;
      }
      drawingRef.current = true;
      applyTool(cell.index);
    },
    [applyTool, getCell, onFillCell, tool]
  );

  const handlePointerMove = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      const cell = getCell(event);
      setHoverCell(cell);
      if (!drawingRef.current || !cell) {
        return;
      }
      if (tool === 'fill' || tool === 'fillErase') {
        return;
      }
      applyTool(cell.index);
    },
    [applyTool, getCell, tool]
  );

  const handleStopDraw = useCallback(() => {
    drawingRef.current = false;
  }, []);

  const handlePointerLeave = useCallback(() => {
    handleStopDraw();
    setHoverCell(null);
  }, [handleStopDraw]);

  const viewHotkey =
    view === 'front'
      ? formatForDisplay(HOTKEYS.viewFront)
      : view === 'side'
        ? formatForDisplay(HOTKEYS.viewSide)
        : formatForDisplay(HOTKEYS.viewTop);

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <span className={styles.label}>{label}</span>
        <Button onPress={onViewClick}>
          <span className={styles.actionLabel}>
            <span>View</span>
            <kbd className={styles.hotkey}>{viewHotkey}</kbd>
          </span>
        </Button>
      </header>

      <div className={styles.canvasWrap} ref={wrapRef}>
        <canvas
          ref={canvasRef}
          width={canvasDim}
          height={canvasDim}
          className={styles.canvas}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handleStopDraw}
          onMouseLeave={handlePointerLeave}
        />
      </div>
    </section>
  );
}
