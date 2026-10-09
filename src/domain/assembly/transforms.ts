import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { Part, Piece, Transform } from '../../features/editor/state/types';
export const identityTransform = (): Transform => ({ position: [0, 0, 0], rotation: [0, 0, 0] });
export function matrixOf(transform: Transform): Matrix4 {
  return new Matrix4().compose(
    new Vector3(...transform.position),
    new Quaternion().setFromEuler(new Euler(...transform.rotation)),
    new Vector3(1, 1, 1)
  );
}
export function transformOf(matrix: Matrix4): Transform {
  const position = new Vector3(),
    rotation = new Quaternion(),
    scale = new Vector3();
  matrix.decompose(position, rotation, scale);
  const euler = new Euler().setFromQuaternion(rotation);
  return {
    position: position.toArray() as Transform['position'],
    rotation: [euler.x, euler.y, euler.z]
  };
}
export function worldMatrix(id: string | null, parts: Part[], pieces: Piece[] = []): Matrix4 {
  if (!id) return new Matrix4();
  const piece = pieces.find((p) => p.id === id);
  if (piece) return worldMatrix(piece.partId, parts).multiply(matrixOf(piece.transform));
  const part = parts.find((p) => p.id === id);
  if (!part) throw new Error(`Missing parent ${id}`);
  return worldMatrix(part.parentId, parts).multiply(matrixOf(part.transform));
}
export function descendants(id: string, parts: Part[]): Set<string> {
  const ids = new Set([id]);
  for (let changed = true; changed;) {
    changed = false;
    for (const part of parts)
      if (part.parentId && ids.has(part.parentId) && !ids.has(part.id)) {
        ids.add(part.id);
        changed = true;
      }
  }
  return ids;
}
export function exportName(id: string): string {
  return `node_${id.replace(/[_-]/g, (character) => (character === '-' ? '_h' : '_u'))}`;
}
export function nodePath(id: string, parts: Part[]): string {
  const part = parts.find((p) => p.id === id)!;
  return (part.parentId ? nodePath(part.parentId, parts) + '/' : '') + exportName(id);
}
