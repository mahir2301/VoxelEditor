import * as THREE from 'three';
import { DEFAULT_PALETTE, computeModelFromPieces, computePieceVoxels } from '../domain/voxel/model';
import type { Piece } from '../features/editor/state/types';

type VoxelTuple = [number, number, number];

const FACE_DATA: {
  dir: VoxelTuple;
  verts: [VoxelTuple, VoxelTuple, VoxelTuple, VoxelTuple];
}[] = [
  {
    dir: [0, 1, 0],
    verts: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0]
    ]
  },
  {
    dir: [0, -1, 0],
    verts: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1]
    ]
  },
  {
    dir: [1, 0, 0],
    verts: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1]
    ]
  },
  {
    dir: [-1, 0, 0],
    verts: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1]
    ]
  },
  {
    dir: [0, 0, 1],
    verts: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1]
    ]
  },
  {
    dir: [0, 0, -1],
    verts: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0]
    ]
  }
];

function getVoxelCoord(index: number, resolution: number): VoxelTuple {
  const x = index % resolution;
  const y = Math.floor(index / resolution) % resolution;
  const z = Math.floor(index / (resolution * resolution));
  return [x, y, z];
}

function getVoxelOffset(x: number, y: number, z: number, resolution: number): VoxelTuple {
  return [x - resolution / 2, y - resolution / 2, z - resolution / 2];
}

function hasNeighbor(
  voxels: Uint8Array,
  x: number,
  y: number,
  z: number,
  resolution: number
): boolean {
  if (x < 0 || x >= resolution || y < 0 || y >= resolution || z < 0 || z >= resolution) {
    return false;
  }
  return Boolean(voxels[x + y * resolution + z * resolution * resolution]);
}

export function buildVoxelGeometry(
  voxels: Uint8Array,
  colors: Uint8Array | null | undefined,
  palette: string[],
  resolution: number
): THREE.BufferGeometry {
  const positions = [];
  const colorAttr = [];
  const indices = [];
  let vertexCount = 0;
  const paletteRgb = palette.map((entry) => {
    const color = new THREE.Color(entry);
    return [color.r, color.g, color.b] as const;
  });
  const fallbackRgb = paletteRgb[0] || ([1, 1, 1] as const);

  for (let i = 0; i < voxels.length; i += 1) {
    if (!voxels[i]) {
      continue;
    }

    const [x, y, z] = getVoxelCoord(i, resolution);
    const [ox, oy, oz] = getVoxelOffset(x, y, z, resolution);
    const colorIndex = colors ? colors[i] : 0;
    const [r, g, b] = paletteRgb[colorIndex] || fallbackRgb;

    for (const face of FACE_DATA) {
      const nx = x + face.dir[0];
      const ny = y + face.dir[1];
      const nz = z + face.dir[2];
      if (hasNeighbor(voxels, nx, ny, nz, resolution)) {
        continue;
      }

      for (const [vx, vy, vz] of face.verts) {
        positions.push(ox + vx, oy + vy, oz + vz);
        colorAttr.push(r, g, b);
      }

      indices.push(
        vertexCount,
        vertexCount + 1,
        vertexCount + 2,
        vertexCount,
        vertexCount + 2,
        vertexCount + 3
      );
      vertexCount += 4;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorAttr, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function getVoxelIndexFromHit(
  faceIndex: number,
  voxels: Uint8Array,
  resolution: number
): number {
  let triangleCursor = 0;
  for (let i = 0; i < voxels.length; i += 1) {
    if (!voxels[i]) {
      continue;
    }

    const [x, y, z] = getVoxelCoord(i, resolution);
    let visibleFaces = 0;
    for (const { dir } of FACE_DATA) {
      if (!hasNeighbor(voxels, x + dir[0], y + dir[1], z + dir[2], resolution)) {
        visibleFaces += 1;
      }
    }
    const voxelTriangles = visibleFaces * 2;
    if (faceIndex >= triangleCursor && faceIndex < triangleCursor + voxelTriangles) {
      return i;
    }
    triangleCursor += voxelTriangles;
  }
  return -1;
}

export { computePieceVoxels, computeModelFromPieces, DEFAULT_PALETTE };
export type { Piece };
