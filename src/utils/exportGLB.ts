import { BufferAttribute, BufferGeometry, Color, Mesh, MeshStandardMaterial, Scene } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { parseSerializedProjectOrThrow } from '../features/editor/state/projectSchema';
import type { SerializedProject } from '../features/editor/state/types';

type VoxelTuple = readonly [number, number, number];

const EXPORT_FACE_DATA: ReadonlyArray<{
  dir: VoxelTuple;
  verts: readonly [VoxelTuple, VoxelTuple, VoxelTuple, VoxelTuple];
}> = [
  {
    dir: [0, 1, 0],
    verts: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 1, 1],
      [0, 1, 1]
    ]
  },
  {
    dir: [0, -1, 0],
    verts: [
      [0, 0, 0],
      [0, 0, 1],
      [1, 0, 1],
      [1, 0, 0]
    ]
  },
  {
    dir: [1, 0, 0],
    verts: [
      [1, 0, 1],
      [1, 1, 1],
      [1, 1, 0],
      [1, 0, 0]
    ]
  },
  {
    dir: [-1, 0, 0],
    verts: [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
      [0, 0, 0]
    ]
  },
  {
    dir: [0, 0, 1],
    verts: [
      [0, 0, 1],
      [0, 1, 1],
      [1, 1, 1],
      [1, 0, 1]
    ]
  },
  {
    dir: [0, 0, -1],
    verts: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0]
    ]
  }
] as const;

/**
 * Build voxel geometry with flipped winding for Unity (left-handed coords).
 */
function buildVoxelGeometryForExport(
  voxels: Uint8Array,
  colors: Uint8Array,
  palette: string[],
  resolution: number
): BufferGeometry {
  const size = resolution;
  const planeSize = size * size;

  let visibleFaces = 0;
  for (let i = 0; i < voxels.length; i += 1) {
    if (!voxels[i]) {
      continue;
    }
    const x = i % size;
    const y = Math.floor(i / size) % size;
    const z = Math.floor(i / planeSize);

    for (let faceIndex = 0; faceIndex < EXPORT_FACE_DATA.length; faceIndex += 1) {
      const face = EXPORT_FACE_DATA[faceIndex];
      const nx = x + face.dir[0];
      const ny = y + face.dir[1];
      const nz = z + face.dir[2];
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
        if (voxels[nx + ny * size + nz * planeSize]) {
          continue;
        }
      }
      visibleFaces += 1;
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

    const x = i % size;
    const y = Math.floor(i / size) % size;
    const z = Math.floor(i / planeSize);

    const colorIdx = colors ? colors[i] : 0;
    const [r, g, b] = paletteRgb[colorIdx] || fallbackRgb;

    const ox = x - size / 2;
    const oy = y - size / 2;
    const oz = z - size / 2;

    for (let faceIndex = 0; faceIndex < EXPORT_FACE_DATA.length; faceIndex += 1) {
      const face = EXPORT_FACE_DATA[faceIndex];
      const nx = x + face.dir[0];
      const ny = y + face.dir[1];
      const nz = z + face.dir[2];

      if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
        if (voxels[nx + ny * size + nz * planeSize]) {
          continue;
        }
      }

      for (let vertexIndex = 0; vertexIndex < face.verts.length; vertexIndex += 1) {
        const v = face.verts[vertexIndex];
        positions[positionCursor] = ox + v[0];
        positions[positionCursor + 1] = oy + v[1];
        positions[positionCursor + 2] = oz + v[2];
        positionCursor += 3;

        colorAttr[colorCursor] = r;
        colorAttr[colorCursor + 1] = g;
        colorAttr[colorCursor + 2] = b;
        colorCursor += 3;
      }

      indices[indexCursor] = baseVertex;
      indices[indexCursor + 1] = baseVertex + 2;
      indices[indexCursor + 2] = baseVertex + 1;
      indices[indexCursor + 3] = baseVertex;
      indices[indexCursor + 4] = baseVertex + 3;
      indices[indexCursor + 5] = baseVertex + 2;
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

/**
 * Export the assembled model as a GLB file (Unity-compatible).
 */
export async function exportModelAsGLB(
  modelVoxels: Uint8Array,
  modelColors: Uint8Array,
  palette: string[],
  resolution: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const geometry = buildVoxelGeometryForExport(modelVoxels, modelColors, palette, resolution);

    if (geometry.attributes.position.count === 0) {
      reject(new Error('No voxels to export'));
      return;
    }

    const material = new MeshStandardMaterial({
      metalness: 0.1,
      roughness: 0.7,
      vertexColors: true
    });

    const mesh = new Mesh(geometry, material);
    mesh.name = 'VoxelModel';

    const scene = new Scene();
    scene.add(mesh);

    const cleanup = () => {
      geometry.dispose();
      material.dispose();
    };

    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (result) => {
        if (!(result instanceof ArrayBuffer)) {
          reject(new Error('Unexpected GLB export result'));
          return;
        }
        const blob = new Blob([result], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'voxel_model.glb';
        link.click();
        URL.revokeObjectURL(url);
        cleanup();
        resolve();
      },
      (error) => {
        cleanup();
        reject(error);
      },
      { binary: true }
    );
  });
}

/**
 * Export project as .voxproj JSON file.
 */
export function exportProject(projectData: SerializedProject): void {
  const json = JSON.stringify(projectData);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'voxel_project.voxproj';
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Import project from .voxproj JSON file.
 */
export async function importProject(file: File): Promise<SerializedProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = typeof e.target?.result === 'string' ? e.target.result : '';
      try {
        const raw = JSON.parse(text);
        resolve(parseSerializedProjectOrThrow(raw));
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error(`Invalid JSON: ${error.message}`));
          return;
        }
        const message = error instanceof Error ? error.message : 'Unknown import error';
        reject(new Error(message));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
