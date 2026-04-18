import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { EditorState, SerializedProject } from '../features/editor/state/types';

/**
 * Build voxel geometry with flipped winding for Unity (left-handed coords).
 */
function buildVoxelGeometryForExport(
  voxels: Uint8Array,
  colors: Uint8Array,
  palette: string[],
  resolution: number,
): THREE.BufferGeometry {
  const size = resolution;
  const positions = [];
  const colorAttr = [];
  const indices = [];

  // Same face definitions as scene but with FLIPPED winding (reversed vertex order)
  const faceData = [
    // Top (Y+): flipped from (0,1,0),(0,1,1),(1,1,1),(1,1,0)
    {
      dir: [0, 1, 0],
      verts: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]]
    },
    // Bottom (Y-): flipped from (0,0,0),(1,0,0),(1,0,1),(0,0,1)
    {
      dir: [0, -1, 0],
      verts: [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]]
    },
    // Right (X+): flipped from (1,0,1),(1,0,0),(1,1,0),(1,1,1)
    {
      dir: [1, 0, 0],
      verts: [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]]
    },
    // Left (X-): flipped from (0,1,0),(0,0,0),(0,0,1),(0,1,1)
    {
      dir: [-1, 0, 0],
      verts: [[0, 1, 0], [0, 1, 1], [0, 0, 1], [0, 0, 0]]
    },
    // Front (Z+): flipped from (0,0,1),(1,0,1),(1,1,1),(0,1,1)
    {
      dir: [0, 0, 1],
      verts: [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]]
    },
    // Back (Z-): flipped from (0,0,0),(0,1,0),(1,1,0),(1,0,0)
    {
      dir: [0, 0, -1],
      verts: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]
    }
  ];

  let vertexCount = 0;

  for (let i = 0; i < voxels.length; i += 1) {
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

      if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
        if (voxels[nx + ny * size + nz * size * size]) continue;
      }

      for (const v of face.verts) {
        positions.push(ox + v[0], oy + v[1], oz + v[2]);
        colorAttr.push(color.r, color.g, color.b);
      }

      indices.push(
        vertexCount, vertexCount + 2, vertexCount + 1,
        vertexCount, vertexCount + 3, vertexCount + 2
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

/**
 * Export the assembled model as a GLB file (Unity-compatible).
 */
export function exportModelAsGLB(
  modelVoxels: Uint8Array,
  modelColors: Uint8Array,
  palette: string[],
  resolution: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const geometry = buildVoxelGeometryForExport(modelVoxels, modelColors, palette, resolution);

    if (geometry.attributes.position.count === 0) {
      reject(new Error('No voxels to export'));
      return;
    }

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'VoxelModel';

    const scene = new THREE.Scene();
    scene.add(mesh);

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
        resolve();
      },
      (error) => {
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
export function importProject(file: File): Promise<SerializedProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = typeof e.target?.result === 'string' ? e.target.result : '';
        const data = JSON.parse(text) as Partial<SerializedProject>;
        const parsed: SerializedProject = {
          version: data.version || 1,
          resolution: data.resolution || 16,
          pieces: (data.pieces || []).map((p) => ({
            ...p,
            voxels: Array.from(new Uint8Array(Object.values(p.voxels || []))),
          })),
          frontGrid: Array.from(new Uint8Array(Object.values(data.frontGrid || []))),
          sideGrid: Array.from(new Uint8Array(Object.values(data.sideGrid || []))),
          topGrid: Array.from(new Uint8Array(Object.values(data.topGrid || []))),
          modelVoxels: Array.from(new Uint8Array(Object.values(data.modelVoxels || []))),
          modelColors: Array.from(new Uint8Array(Object.values(data.modelColors || []))),
          palette: data.palette || [],
          cameraMode: data.cameraMode,
          cameraView: data.cameraView,
        };
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Serialize state for save.
 */
export function serializeState(state: EditorState): SerializedProject {
  return {
    version: 1,
    resolution: state.resolution,
    frontGrid: Array.from(state.frontGrid),
    sideGrid: Array.from(state.sideGrid),
    topGrid: Array.from(state.topGrid),
    pieces: state.pieces.map((p) => ({
      id: p.id,
      name: p.name,
      voxels: Array.from(p.voxels),
    })),
    modelVoxels: Array.from(state.modelVoxels),
    modelColors: Array.from(state.modelColors),
    palette: [...state.palette],
    cameraMode: state.cameraMode,
    cameraView: state.cameraView,
  };
}
