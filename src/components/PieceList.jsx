import { useState, useRef, useEffect } from 'react';
import './PieceList.css';

function PieceThumbnail({ voxels, resolution }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 40;
    canvas.width = size;
    canvas.height = size;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);

    // Find bounds of the piece
    let minX = resolution, maxX = 0, minY = resolution, maxY = 0;
    for (let i = 0; i < voxels.length; i++) {
      if (!voxels[i]) continue;
      const x = i % resolution;
      const y = Math.floor(i / resolution) % resolution;
      const z = Math.floor(i / (resolution * resolution));
      // Use XY projection for thumbnail
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    if (maxX < minX) return; // Empty piece

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const scale = Math.min(size / w, size / h) * 0.8;
    const offsetX = (size - w * scale) / 2;
    const offsetY = (size - h * scale) / 2;

    // Draw filled cells
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Check if any voxel exists at this XY
        let hasVoxel = false;
        for (let z = 0; z < resolution; z++) {
          const idx = x + y * resolution + z * resolution * resolution;
          if (voxels[idx]) { hasVoxel = true; break; }
        }
        if (hasVoxel) {
          ctx.fillStyle = '#4a9eff';
          ctx.fillRect(
            offsetX + (x - minX) * scale,
            offsetY + (y - minY) * scale,
            Math.ceil(scale),
            Math.ceil(scale)
          );
        }
      }
    }
  }, [voxels, resolution]);

  return <canvas ref={canvasRef} className="piece-thumbnail" />;
}

export default function PieceList({
  pieces,
  resolution,
  editingPieceId,
  onSelectPiece,
  onRenamePiece,
  onDeletePiece,
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  const startRename = (piece) => {
    setRenamingId(piece.id);
    setRenameValue(piece.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenamePiece(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  return (
    <div className="piece-list">
      <div className="piece-list-header">
        <span className="piece-list-title">Pieces ({pieces.length})</span>
      </div>
      <div className="piece-list-items">
        {pieces.length === 0 && (
          <div className="piece-list-empty">No pieces yet</div>
        )}
        {pieces.map((piece) => (
          <div
            key={piece.id}
            className={`piece-list-item ${editingPieceId === piece.id ? 'editing' : ''}`}
          >
            <div
              className="piece-list-item-clickable"
              onClick={() => onSelectPiece(piece.id)}
            >
              <PieceThumbnail voxels={piece.voxels} resolution={resolution} />
              {renamingId === piece.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleKeyDown}
                  className="piece-rename-input"
                />
              ) : (
                <span className="piece-list-item-name">{piece.name}</span>
              )}
            </div>
            <div className="piece-list-item-actions">
              <button
                className="piece-btn rename"
                onClick={() => startRename(piece)}
                title="Rename"
              >
                R
              </button>
              <button
                className="piece-btn delete"
                onClick={() => onDeletePiece(piece.id)}
                title="Delete"
              >
                X
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
