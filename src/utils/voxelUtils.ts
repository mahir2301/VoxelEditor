import { BufferAttribute, BufferGeometry, Color } from 'three';
import { DEFAULT_PALETTE, computeModelFromPieces, computePieceVoxels } from '../domain/voxel/model';
import type { Piece } from '../features/editor/state/types';

type VoxelTuple = readonly [number, number, number];

const FACE_DATA: ReadonlyArray<{
  dir: VoxelTuple;
  verts: readonly [VoxelTuple, VoxelTuple, VoxelTuple, VoxelTuple];
}> = [
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
): BufferGeometry {
  const planeSize = resolution * resolution;

  let visibleFaces = 0;
  for (let i = 0; i < voxels.length; i += 1) {
    if (!voxels[i]) {
      continue;
    }
    const x = i % resolution;
    const y = Math.floor(i / resolution) % resolution;
    const z = Math.floor(i / planeSize);

    for (let faceIndex = 0; faceIndex < FACE_DATA.length; faceIndex += 1) {
      const face = FACE_DATA[faceIndex];
      if (!hasNeighbor(voxels, x + face.dir[0], y + face.dir[1], z + face.dir[2], resolution)) {
        visibleFaces += 1;
      }
    }
  }

  const vertexCount = visibleFaces * 4;
  const positions = new Float32Array(vertexCount * 3);
  const colorAttr = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(visibleFaces * 6);

  let positionCursor = 0;
  let colorCursor = 0;
  let indexCursor = 0;
  let baseVertex = 0;

  const paletteRgb = palette.map((entry) => {
    const color = new Color(entry);
    return [color.r, color.g, color.b] as const;
  });
  const fallbackRgb = paletteRgb[0] || ([1, 1, 1] as const);

  for (let i = 0; i < voxels.length; i += 1) {
    if (!voxels[i]) {
      continue;
    }

    const x = i % resolution;
    const y = Math.floor(i / resolution) % resolution;
    const z = Math.floor(i / planeSize);
    const ox = x - resolution / 2;
    const oy = y - resolution / 2;
    const oz = z - resolution / 2;
    const colorIndex = colors ? colors[i] : 0;
    const [r, g, b] = paletteRgb[colorIndex] || fallbackRgb;

    for (let faceIndex = 0; faceIndex < FACE_DATA.length; faceIndex += 1) {
      const face = FACE_DATA[faceIndex];
      const nx = x + face.dir[0];
      const ny = y + face.dir[1];
      const nz = z + face.dir[2];
      if (hasNeighbor(voxels, nx, ny, nz, resolution)) {
        continue;
      }

      for (let vertexIndex = 0; vertexIndex < face.verts.length; vertexIndex += 1) {
        const [vx, vy, vz] = face.verts[vertexIndex];
        positions[positionCursor] = ox + vx;
        positions[positionCursor + 1] = oy + vy;
        positions[positionCursor + 2] = oz + vz;
        positionCursor += 3;

        colorAttr[colorCursor] = r;
        colorAttr[colorCursor + 1] = g;
        colorAttr[colorCursor + 2] = b;
        colorCursor += 3;
      }

      indices[indexCursor] = baseVertex;
      indices[indexCursor + 1] = baseVertex + 1;
      indices[indexCursor + 2] = baseVertex + 2;
      indices[indexCursor + 3] = baseVertex;
      indices[indexCursor + 4] = baseVertex + 2;
      indices[indexCursor + 5] = baseVertex + 3;
      indexCursor += 6;
      baseVertex += 4;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colorAttr, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

export function getVoxelIndexFromHit(
  faceIndex: number,
  voxels: Uint8Array,
  resolution: number
): number {
  const planeSize = resolution * resolution;
  let triangleCursor = 0;
  for (let i = 0; i < voxels.length; i += 1) {
    if (!voxels[i]) {
      continue;
    }

    const x = i % resolution;
    const y = Math.floor(i / resolution) % resolution;
    const z = Math.floor(i / planeSize);
    let visibleFaces = 0;
    for (let visibleFaceIndex = 0; visibleFaceIndex < FACE_DATA.length; visibleFaceIndex += 1) {
      const dir = FACE_DATA[visibleFaceIndex].dir;
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
