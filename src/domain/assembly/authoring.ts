import { Matrix4 } from 'three';
import type { ProjectDocument, Piece, Vector } from '../../features/editor/state/types';
import { duplicate } from './model';
import { matrixOf, transformOf } from './transforms';
export function boxPiece(document: ProjectDocument, partId: string, size: Vector): Piece {
  const n = document.resolution;
  const voxels = new Uint8Array(n ** 3);
  for (let z = 0; z < n; z++)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (
          [x, y, z].every(
            (v, a) =>
              v >= Math.floor((n - size[a]) / 2) && v < Math.floor((n - size[a]) / 2) + size[a]
          )
        )
          voxels[x + y * n + z * n * n] = 1;
  return {
    id: crypto.randomUUID(),
    name: 'Box',
    partId,
    transform: {
      position: [(size[0] % 2) / 2, (size[1] % 2) / 2, (size[2] % 2) / 2],
      rotation: [0, 0, 0]
    },
    voxels,
    colors: new Uint8Array(n ** 3),
    exportEnabled: true
  };
}
// Reflect transforms by S*M*S (a proper rotation), and voxel coordinates by S.
// The selected node's parent-local origin is the reflection plane.
export function mirrorNode(
  document: ProjectDocument,
  id: string,
  axis: 'x' | 'y' | 'z'
): ProjectDocument {
  const next = duplicate(document, id),
    a = ['x', 'y', 'z'].indexOf(axis),
    n = document.resolution;
  const scales: Vector = [1, 1, 1];
  scales[a] = -1;
  const s = new Matrix4().makeScale(...scales);
  const reflect = (t: Piece['transform']) =>
    transformOf(s.clone().multiply(matrixOf(t)).multiply(s));
  const reflectBuffer = (buffer: Uint8Array) => {
    const result = new Uint8Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const xyz = [i % n, Math.floor(i / n) % n, Math.floor(i / (n * n))];
      xyz[a] = n - 1 - xyz[a];
      result[xyz[0] + xyz[1] * n + xyz[2] * n * n] = buffer[i];
    }
    return result;
  };
  const reflectAngles = (angles: Vector): Vector => [
    angles[0] * (a === 0 ? 1 : -1),
    angles[1] * (a === 1 ? 1 : -1),
    angles[2] * (a === 2 ? 1 : -1)
  ];
  return {
    ...next,
    parts: next.parts.map((p, i) =>
      i < document.parts.length
        ? p
        : {
            ...p,
            transform: reflect(p.transform),
            // Reflection changes the handedness of local rotation offsets.
            poses: {
              hold: reflectAngles(p.poses.hold),
              fire: reflectAngles(p.poses.fire),
              knockout: reflectAngles(p.poses.knockout)
            }
          }
    ),
    pieces: next.pieces.map((p, i) =>
      i < document.pieces.length
        ? p
        : Object.assign({}, p, {
            transform: reflect(p.transform),
            voxels: reflectBuffer(p.voxels),
            colors: reflectBuffer(p.colors)
          })
    )
  };
}
