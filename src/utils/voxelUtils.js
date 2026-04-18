import * as THREE from 'three';

export function computePieceVoxels(frontGrid, sideGrid, topGrid, resolution) {
  const size = resolution;
  const voxels = new Uint8Array(size * size * size);
  for (let i = 0; i < voxels.length; i++) {
    const x = i % size;
    const y = Math.floor(i / size) % size;
    const z = Math.floor(i / (size * size));
    if (frontGrid[x + y * size] && sideGrid[z + y * size] && topGrid[x + z * size]) {
      voxels[i] = 1;
    }
  }
  return voxels;
}

export function mergePieceIntoModel(modelVoxels, pieceVoxels) {
  const result = new Uint8Array(modelVoxels.length);
  result.set(modelVoxels);
  for (let i = 0; i < pieceVoxels.length; i++) {
    if (pieceVoxels[i] && !result[i]) result[i] = 1;
  }
  return result;
}

export function computeModelFromPieces(pieces, resolution) {
  const total = resolution * resolution * resolution;
  const modelVoxels = new Uint8Array(total);
  for (const piece of pieces) {
    for (let i = 0; i < total; i++) {
      if (piece.voxels[i] && !modelVoxels[i]) modelVoxels[i] = 1;
    }
  }
  return modelVoxels;
}

/**
 * Build merged voxel geometry with correct face winding.
 * Each face verified via cross product for outward-facing normals.
 *
 * Triangle winding: v0,v1,v2 and v0,v2,v3
 * Normal = cross(v1-v0, v2-v0) should point outward.
 */
export function buildVoxelGeometry(voxels, colors, palette, resolution) {
  const size = resolution;
  const positions = [];
  const colorAttr = [];
  const indices = [];

  /*
   * Unit cube faces at corners (0,0,0) to (1,1,1).
   * Each face: 4 vertices, 2 triangles.
   * Winding verified by cross product producing outward normal.
   *
   * Top    (Y+): v0=(0,1,0) v1=(1,1,0) v2=(1,1,1) v3=(0,1,1)
   *   tri1: cross((1,0,0),(1,0,1)) = (0*1-0*0, 0*1-1*1, 1*0-0*1) = (0,-1,0) ← WRONG!
   *
   * Let me use the correct winding:
   * Top (Y+): v0=(0,1,0) v1=(0,1,1) v2=(1,1,1) v3=(1,1,0)
   *   tri1: cross((0,0,1),(1,0,1)) = (0*1-1*1, 1*1-0*0, 0*0-0*1) = (-1,1,0) ← hmm
   *
   * Actually let me be systematic:
   * cross(a,b) = (ay*bz - az*by, az*bx - ax*bz, ax*by - ay*bx)
   */

  // VERIFIED FACE DATA using explicit cross product calculations

  const faceData = [
    // TOP face (Y+), normal = (0,1,0)
    // v0=(0,1,0) v1=(0,1,1) v2=(1,1,1)
    // edge1=(0,0,1) edge2=(1,0,1)
    // cross: (0*1-1*0, 1*1-0*0, 0*0-0*1) = (0,1,0) ✓
    {
      dir: [0, 1, 0],
      verts: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]]
    },
    // BOTTOM face (Y-), normal = (0,-1,0)
    // v0=(0,0,0) v1=(1,0,0) v2=(1,0,1)
    // edge1=(1,0,0) edge2=(1,0,1)
    // cross: (0*1-0*0, 0*1-1*1, 1*0-0*0) = (0,-1,0) ✓
    {
      dir: [0, -1, 0],
      verts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]
    },
    // RIGHT face (X+), normal = (1,0,0)
    // v0=(1,0,0) v1=(1,1,0) v2=(1,1,1)
    // edge1=(0,1,0) edge2=(0,1,1)
    // cross: (1*1-0*0, 0*0-0*1, 0*0-1*1) = (1,0,-1) ← WRONG!
    // Try: v0=(1,0,0) v1=(1,0,1) v2=(1,1,1)
    // edge1=(0,0,1) edge2=(0,1,1)
    // cross: (0*1-1*0, 1*1-0*1, 0*0-0*1) = (0,1,0) ← WRONG!
    // Try: v0=(1,0,1) v1=(1,0,0) v2=(1,1,0)
    // edge1=(0,0,-1) edge2=(0,1,-1)
    // cross: (0*(-1)-(-1)*1, (-1)*0-0*(-1), 0*1-0*0) = (1,0,0) ✓
    {
      dir: [1, 0, 0],
      verts: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]
    },
    // LEFT face (X-), normal = (-1,0,0)
    // v0=(0,0,0) v1=(0,0,1) v2=(0,1,1)
    // edge1=(0,0,1) edge2=(0,1,1)
    // cross: (0*1-1*0, 1*0-0*1, 0*0-0*1) = (0,0,0) ← WRONG!
    // Try: v0=(0,0,1) v1=(0,0,0) v2=(0,1,0)
    // edge1=(0,0,-1) edge2=(0,1,-1)
    // cross: (0*(-1)-(-1)*1, (-1)*0-0*(-1), 0*1-0*0) = (1,0,0) ← WRONG! Need (-1,0,0)
    // Try: v0=(0,0,0) v1=(0,1,0) v2=(0,1,1)
    // edge1=(0,1,0) edge2=(0,1,1)
    // cross: (1*1-0*0, 0*0-0*1, 0*0-1*1) = (1,0,-1) ← WRONG!
    // Try: v0=(0,0,1) v1=(0,1,1) v2=(0,1,0)
    // edge1=(0,1,0) edge2=(0,1,-1)
    // cross: (1*(-1)-0*0, 0*0-0*(-1), 0*0-1*1) = (-1,0,-1) ← WRONG!
    // Try: v0=(0,1,0) v1=(0,0,0) v2=(0,0,1)
    // edge1=(0,-1,0) edge2=(0,-1,1)
    // cross: ((-1)*1-0*(-1), 0*0-0*1, 0*(-1)-(-1)*0) = (-1,0,0) ✓
    {
      dir: [-1, 0, 0],
      verts: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]]
    },
    // FRONT face (Z+), normal = (0,0,1)
    // v0=(0,0,1) v1=(1,0,1) v2=(1,1,1)
    // edge1=(1,0,0) edge2=(1,1,0)
    // cross: (0*0-0*1, 0*1-1*0, 1*1-0*1) = (0,0,1) ✓
    {
      dir: [0, 0, 1],
      verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]
    },
    // BACK face (Z-), normal = (0,0,-1)
    // v0=(0,0,0) v1=(0,1,0) v2=(1,1,0)
    // edge1=(0,1,0) edge2=(1,1,0)
    // cross: (1*0-0*1, 0*1-0*0, 0*1-1*1) = (0,0,-1) ✓
    {
      dir: [0, 0, -1],
      verts: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]
    }
  ];

  let vertexCount = 0;

  for (let i = 0; i < voxels.length; i++) {
    if (!voxels[i]) continue;

    const x = i % size;
    const y = Math.floor(i / size) % size;
    const z = Math.floor(i / (size * size));

    const colorIdx = colors ? colors[i] : 0;
    const color = new THREE.Color(palette[colorIdx] || palette[0]);

    const ox = x - size / 2;
    const oy = y - size / 2;
    const oz = z - size / 2;

    for (const face of faceData) {
      const nx = x + face.dir[0];
      const ny = y + face.dir[1];
      const nz = z + face.dir[2];

      // Only render face if no adjacent voxel in that direction
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
        if (voxels[nx + ny * size + nz * size * size]) continue;
      }

      for (const v of face.verts) {
        positions.push(ox + v[0], oy + v[1], oz + v[2]);
        colorAttr.push(color.r, color.g, color.b);
      }

      indices.push(
        vertexCount, vertexCount + 1, vertexCount + 2,
        vertexCount, vertexCount + 2, vertexCount + 3
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

export function getVoxelIndexFromHit(faceIndex, voxels, resolution) {
  const size = resolution;
  let triangleCount = 0;

  for (let i = 0; i < voxels.length; i++) {
    if (!voxels[i]) continue;

    const x = i % size;
    const y = Math.floor(i / size) % size;
    const z = Math.floor(i / (size * size));

    let visibleFaces = 0;
    const dirs = [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]];

    for (const [dx, dy, dz] of dirs) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
        if (voxels[nx + ny * size + nz * size * size]) continue;
      }
      visibleFaces++;
    }

    const voxelTriangles = visibleFaces * 2;
    if (faceIndex >= triangleCount && faceIndex < triangleCount + voxelTriangles) return i;
    triangleCount += voxelTriangles;
  }

  return -1;
}

export const DEFAULT_PALETTE = [
  '#808080', '#ff4444', '#44ff44', '#4444ff',
  '#ffff44', '#ff44ff', '#44ffff', '#ff8844',
  '#8844ff', '#44ff88', '#ffffff', '#000000',
  '#ff8888', '#88ff88', '#8888ff', '#884400',
];
