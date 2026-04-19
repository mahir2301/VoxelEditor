import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenamePiece(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <h2 className={styles.title}>Pieces ({pieces.length})</h2>
      </header>

      <div className={styles.list}>
        {pieces.length === 0 && <div className={styles.empty}>No pieces yet.</div>}

        {pieces.map((piece) => (
          <article
            key={piece.id}
            className={cn(styles.item, editingPieceId === piece.id && styles.itemEditing)}
          >
            <div className={styles.main}>
              <Button onPress={() => onSelectPiece(piece.id)}>Edit</Button>
              <PieceThumbnail voxels={piece.voxels} resolution={resolution} />

              {renamingId === piece.id ? (
                <TextField className={styles.nameField}>
                  <Input
                    ref={inputRef}
                    className={styles.nameInput}
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === 'Enter') {
                        commitRename();
                      }
                      if (event.key === 'Escape') {
                        setRenamingId(null);
                        setRenameValue('');
                      }
                    }}
                  />
                </TextField>
              ) : (
                <span className={styles.name}>{piece.name}</span>
              )}
            </div>

            <div className={styles.actions}>
              <Button
                onPress={() => {
                  setRenamingId(piece.id);
                  setRenameValue(piece.name);
                }}
              >
                Rename
              </Button>
              <Button variant="danger" onPress={() => onDeletePiece(piece.id)}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
