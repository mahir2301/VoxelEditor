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
  pieces: SerializedPieceSchema.array(),
  modelVoxels: 'number[]',
  modelColors: 'number[]',
  palette: 'string[]',
  'cameraMode?': "'perspective' | 'isometric'",
  'cameraView?':
    "'front' | 'back' | 'right' | 'left' | 'top' | 'bottom' | 'isometric' | 'perspective'"
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Invalid project schema';
}

function findFirstNonBinaryIndex(values: number[]): number {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value !== 0 && value !== 1) {
      return index;
    }
  }
  return -1;
}

function validateProjectConsistency(project: SerializedProject): string | null {
  if (!Number.isInteger(project.resolution) || project.resolution <= 0) {
    return `resolution must be a positive integer (received ${String(project.resolution)}).`;
  }

  const gridCellCount = project.resolution * project.resolution;
  const voxelCellCount = gridCellCount * project.resolution;

  if (project.frontGrid.length !== gridCellCount) {
    return `frontGrid length must be ${String(gridCellCount)} for resolution ${String(project.resolution)} (received ${String(project.frontGrid.length)}).`;
  }
  if (project.sideGrid.length !== gridCellCount) {
    return `sideGrid length must be ${String(gridCellCount)} for resolution ${String(project.resolution)} (received ${String(project.sideGrid.length)}).`;
  }
  if (project.topGrid.length !== gridCellCount) {
    return `topGrid length must be ${String(gridCellCount)} for resolution ${String(project.resolution)} (received ${String(project.topGrid.length)}).`;
  }
  if (project.modelVoxels.length !== voxelCellCount) {
    return `modelVoxels length must be ${String(voxelCellCount)} for resolution ${String(project.resolution)} (received ${String(project.modelVoxels.length)}).`;
  }
  if (project.modelColors.length !== voxelCellCount) {
    return `modelColors length must be ${String(voxelCellCount)} for resolution ${String(project.resolution)} (received ${String(project.modelColors.length)}).`;
  }

  const firstInvalidFront = findFirstNonBinaryIndex(project.frontGrid);
  if (firstInvalidFront >= 0) {
    return `frontGrid[${String(firstInvalidFront)}] must be 0 or 1.`;
  }
  const firstInvalidSide = findFirstNonBinaryIndex(project.sideGrid);
  if (firstInvalidSide >= 0) {
    return `sideGrid[${String(firstInvalidSide)}] must be 0 or 1.`;
  }
  const firstInvalidTop = findFirstNonBinaryIndex(project.topGrid);
  if (firstInvalidTop >= 0) {
    return `topGrid[${String(firstInvalidTop)}] must be 0 or 1.`;
  }
  const firstInvalidModelVoxel = findFirstNonBinaryIndex(project.modelVoxels);
  if (firstInvalidModelVoxel >= 0) {
    return `modelVoxels[${String(firstInvalidModelVoxel)}] must be 0 or 1.`;
  }

  if (project.palette.length === 0) {
    return 'palette must contain at least one color.';
  }

  for (let colorIndex = 0; colorIndex < project.modelColors.length; colorIndex += 1) {
    const value = project.modelColors[colorIndex];
    if (!Number.isInteger(value) || value < 0 || value >= project.palette.length) {
      return `modelColors[${String(colorIndex)}] must reference a valid palette slot (0-${String(project.palette.length - 1)}).`;
    }
  }

  for (let pieceIndex = 0; pieceIndex < project.pieces.length; pieceIndex += 1) {
    const piece = project.pieces[pieceIndex];
    if (piece.voxels.length !== voxelCellCount) {
      return `pieces[${String(pieceIndex)}].voxels length must be ${String(voxelCellCount)} for resolution ${String(project.resolution)} (received ${String(piece.voxels.length)}).`;
    }
    const firstInvalidPieceVoxel = findFirstNonBinaryIndex(piece.voxels);
    if (firstInvalidPieceVoxel >= 0) {
      return `pieces[${String(pieceIndex)}].voxels[${String(firstInvalidPieceVoxel)}] must be 0 or 1.`;
    }
  }

  return null;
}

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
    return parseSerializedProjectOrThrow(value);
  } catch {
    return null;
  }
}

export function parseSerializedProjectOrThrow(value: unknown): SerializedProject {
  let normalized: unknown;
  try {
    normalized = normalizeProjectShape(value);
  } catch (error) {
    throw new Error(`Unable to normalize project: ${getErrorMessage(error)}`, { cause: error });
  }

  let parsed: SerializedProject;
  try {
    parsed = SerializedProjectSchema.assert(normalized);
  } catch (error) {
    throw new Error(`Project schema validation failed: ${getErrorMessage(error)}`, {
      cause: error
    });
  }

  const consistencyError = validateProjectConsistency(parsed);
  if (consistencyError) {
    throw new Error(`Project consistency validation failed: ${consistencyError}`);
  }

  return parsed;
}
