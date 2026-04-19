import { type } from 'arktype';
import type { SerializedProject } from './types';

const SerializedPieceSchema = type({
  id: 'string',
  name: 'string',
  voxels: 'number[]'
});

const SerializedProjectSchema = type({
  version: 'number',
  resolution: 'number',
  frontGrid: 'number[]',
  sideGrid: 'number[]',
  topGrid: 'number[]',
  pieces: [SerializedPieceSchema],
  modelVoxels: 'number[]',
  modelColors: 'number[]',
  palette: 'string[]',
  'cameraMode?': "'perspective' | 'isometric'",
  'cameraView?':
    "'front' | 'back' | 'right' | 'left' | 'top' | 'bottom' | 'isometric' | 'perspective'"
});

function toNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry) || 0);
  }
  if (value && typeof value === 'object') {
    const recordValues = Object.values(value).map((entry) => Number(entry) || 0);
    return [...new Uint8Array(recordValues)];
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeProjectShape(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  const data = raw;
  const piecesRaw = Array.isArray(data.pieces) ? data.pieces : [];

  return {
    version: typeof data.version === 'number' ? data.version : 1,
    resolution: typeof data.resolution === 'number' ? data.resolution : 16,
    frontGrid: toNumberArray(data.frontGrid),
    sideGrid: toNumberArray(data.sideGrid),
    topGrid: toNumberArray(data.topGrid),
    modelVoxels: toNumberArray(data.modelVoxels),
    modelColors: toNumberArray(data.modelColors),
    palette: Array.isArray(data.palette)
      ? data.palette.filter((entry: unknown): entry is string => typeof entry === 'string')
      : [],
    cameraMode: data.cameraMode,
    cameraView: data.cameraView,
    pieces: piecesRaw.map((piece) => {
      if (!isRecord(piece)) {
        return { id: 'piece-imported', name: 'Imported Piece', voxels: [] };
      }
      return {
        id: typeof piece.id === 'string' ? piece.id : 'piece-imported',
        name: typeof piece.name === 'string' ? piece.name : 'Imported Piece',
        voxels: toNumberArray(piece.voxels)
      };
    })
  };
}

export function parseSerializedProject(value: unknown): SerializedProject | null {
  try {
    return SerializedProjectSchema.assert(normalizeProjectShape(value));
  } catch {
    return null;
  }
}
