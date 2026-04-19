import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Input, TextField } from 'react-aria-components';
import type { Piece } from '../features/editor/state/types';
import { cn } from '../lib/cn';
import Button from './ui/Button';
import styles from './PieceList.module.css';

interface PieceThumbnailProps {
  voxels: Uint8Array;
  resolution: number;
}

interface Props {
  pieces: Piece[];
  resolution: number;
  editingPieceId: string | null;
  onSelectPiece: (pieceId: string) => void;
  onRenamePiece: (pieceId: string, name: string) => void;
  onDeletePiece: (pieceId: string) => void;
}

interface PieceRowProps {
  piece: Piece;
  resolution: number;
  isEditingPiece: boolean;
  isRenaming: boolean;
  renameValue: string;
  onSelectPiece: (pieceId: string) => void;
  onDeletePiece: (pieceId: string) => void;
  onStartRename: (pieceId: string, name: string) => void;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}

function PieceThumbnail({ voxels, resolution }: PieceThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const size = 40;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = '#0f1a28';
    ctx.fillRect(0, 0, size, size);

    let minX = resolution;
    let maxX = -1;
    let minY = resolution;
    let maxY = -1;

    for (let i = 0; i < voxels.length; i += 1) {
      if (!voxels[i]) {
        continue;
      }
      const x = i % resolution;
      const y = Math.floor(i / resolution) % resolution;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    if (maxX < minX || maxY < minY) {
      return;
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const scale = Math.min(size / width, size / height) * 0.78;
    const offsetX = (size - width * scale) / 2;
    const offsetY = (size - height * scale) / 2;

    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        let occupied = false;
        for (let z = 0; z < resolution; z += 1) {
          const index = x + y * resolution + z * resolution * resolution;
          if (!voxels[index]) {
            continue;
          }
          occupied = true;
          break;
        }
        if (!occupied) {
          continue;
        }

        ctx.fillStyle = '#5ca0d8';
        ctx.fillRect(
          offsetX + (x - minX) * scale,
          offsetY + (y - minY) * scale,
          Math.ceil(scale),
          Math.ceil(scale)
        );
      }
    }
  }, [resolution, voxels]);

  return <canvas className={styles.thumb} ref={canvasRef} />;
}

function PieceRow({
  piece,
  resolution,
  isEditingPiece,
  isRenaming,
  renameValue,
  onSelectPiece,
  onDeletePiece,
  onStartRename,
  onRenameValueChange,
  onCommitRename,
  onCancelRename
}: PieceRowProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handlers = useMemo(
    () => ({
      onDeletePress: () => {
        onDeletePiece(piece.id);
      },
      onEditPress: () => {
        onSelectPiece(piece.id);
      },
      onRenameInputBlur: () => {
        onCommitRename();
      },
      onRenameInputChange: (event: ChangeEvent<HTMLInputElement>) => {
        onRenameValueChange(event.target.value);
      },
      onRenameInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          onCommitRename();
          return;
        }
        if (event.key === 'Escape') {
          onCancelRename();
        }
      },
      onRenamePress: () => {
        onStartRename(piece.id, piece.name);
      }
    }),
    [
      onCancelRename,
      onCommitRename,
      onDeletePiece,
      onRenameValueChange,
      onSelectPiece,
      onStartRename,
      piece.id,
      piece.name
    ]
  );

  return (
    <article className={cn(styles.item, isEditingPiece && styles.itemEditing)}>
      <div className={styles.main}>
        <Button onPress={handlers.onEditPress}>Edit</Button>
        <PieceThumbnail voxels={piece.voxels} resolution={resolution} />

        {isRenaming ? (
          <TextField className={styles.nameField}>
            <Input
              ref={inputRef}
              className={styles.nameInput}
              value={renameValue}
              onChange={handlers.onRenameInputChange}
              onBlur={handlers.onRenameInputBlur}
              onKeyDown={handlers.onRenameInputKeyDown}
            />
          </TextField>
        ) : (
          <span className={styles.name}>{piece.name}</span>
        )}
      </div>

      <div className={styles.actions}>
        <Button onPress={handlers.onRenamePress}>Rename</Button>
        <Button variant="danger" onPress={handlers.onDeletePress}>
          Delete
        </Button>
      </div>
    </article>
  );
}

export default function PieceList({
  pieces,
  resolution,
  editingPieceId,
  onSelectPiece,
  onRenamePiece,
  onDeletePiece
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      onRenamePiece(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  }, [onRenamePiece, renameValue, renamingId]);

  const handleStartRename = useCallback((pieceId: string, name: string) => {
    setRenamingId(pieceId);
    setRenameValue(name);
  }, []);

  const handleCancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  const handleRenameValueChange = useCallback((value: string) => {
    setRenameValue(value);
  }, []);

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <h2 className={styles.title}>Pieces ({pieces.length})</h2>
      </header>

      <div className={styles.list}>
        {pieces.length === 0 && <div className={styles.empty}>No pieces yet.</div>}

        {pieces.map((piece) => (
          <PieceRow
            key={piece.id}
            piece={piece}
            resolution={resolution}
            isEditingPiece={editingPieceId === piece.id}
            isRenaming={renamingId === piece.id}
            renameValue={renameValue}
            onSelectPiece={onSelectPiece}
            onDeletePiece={onDeletePiece}
            onStartRename={handleStartRename}
            onRenameValueChange={handleRenameValueChange}
            onCommitRename={commitRename}
            onCancelRename={handleCancelRename}
          />
        ))}
      </div>
    </section>
  );
}
