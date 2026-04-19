import type { Piece } from '../../features/editor/state/types';

export const DEFAULT_PALETTE = [
  '#808080',
  '#ff4444',
  '#44ff44',
  '#4444ff',
  '#ffff44',
  '#ff44ff',
  '#44ffff',
  '#ff8844',
  '#8844ff',
  '#44ff88',
  '#ffffff',
  '#000000',
  '#ff8888',
  '#88ff88',
  '#8888ff',
  '#884400'
];

export function createEmptyGrid(resolution: number): Uint8Array {
  return new Uint8Array(resolution * resolution);
}

export function createEmptyVoxels(resolution: number): Uint8Array {
  return new Uint8Array(resolution * resolution * resolution);
}

function voxelIndexToXYZ(index: number, resolution: number): { x: number; y: number; z: number } {
  return {
    x: index % resolution,
    y: Math.floor(index / resolution) % resolution,
    z: Math.floor(index / (resolution * resolution))
  };
}

function frontIndexFromXY(x: number, y: number, resolution: number): number {
  return x + (resolution - 1 - y) * resolution;
}

function sideIndexFromZY(z: number, y: number, resolution: number): number {
  return resolution - 1 - z + (resolution - 1 - y) * resolution;
}

function topIndexFromXZ(x: number, z: number, resolution: number): number {
  return x + z * resolution;
}

export function computePieceVoxels(
  frontGrid: Uint8Array,
  sideGrid: Uint8Array,
  topGrid: Uint8Array,
  resolution: number
): Uint8Array {
  const voxels = createEmptyVoxels(resolution);
  for (let i = 0; i < voxels.length; i += 1) {
    const { x, y, z } = voxelIndexToXYZ(i, resolution);
    if (
      frontGrid[frontIndexFromXY(x, y, resolution)] &&
      sideGrid[sideIndexFromZY(z, y, resolution)] &&
      topGrid[topIndexFromXZ(x, z, resolution)]
    ) {
      voxels[i] = 1;
    }
  }
  return voxels;
}

export function reconstructGridsFromPiece(
  pieceVoxels: Uint8Array,
  resolution: number
): {
  frontGrid: Uint8Array;
  sideGrid: Uint8Array;
  topGrid: Uint8Array;
} {
  const frontGrid = createEmptyGrid(resolution);
  const sideGrid = createEmptyGrid(resolution);
  const topGrid = createEmptyGrid(resolution);

  for (let i = 0; i < pieceVoxels.length; i += 1) {
    if (!pieceVoxels[i]) {
      continue;
    }
    const { x, y, z } = voxelIndexToXYZ(i, resolution);
    frontGrid[frontIndexFromXY(x, y, resolution)] = 1;
    sideGrid[sideIndexFromZY(z, y, resolution)] = 1;
    topGrid[topIndexFromXZ(x, z, resolution)] = 1;
  }

  return { frontGrid, sideGrid, topGrid };
}

export function computeModelFromPieces(pieces: Piece[], resolution: number): Uint8Array {
  const modelVoxels = createEmptyVoxels(resolution);
  for (const piece of pieces) {
    for (let i = 0; i < modelVoxels.length; i += 1) {
      if (piece.voxels[i]) {
        modelVoxels[i] = 1;
      }
    }
  }
  return modelVoxels;
}

export function applyPieceToModel(
  modelVoxels: Uint8Array,
  modelColors: Uint8Array,
  pieceVoxels: Uint8Array,
  colorIndex = 0
): { modelVoxels: Uint8Array; modelColors: Uint8Array } {
  const nextModelVoxels = new Uint8Array(modelVoxels);
  const nextModelColors = new Uint8Array(modelColors);

  for (let i = 0; i < pieceVoxels.length; i += 1) {
    if (!pieceVoxels[i] || nextModelVoxels[i]) {
      continue;
    }
    nextModelVoxels[i] = 1;
    nextModelColors[i] = colorIndex;
  }

  return { modelColors: nextModelColors, modelVoxels: nextModelVoxels };
}

export function createPieceId(): string {
  return `piece-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
