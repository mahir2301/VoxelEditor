import { Vector3 } from 'three';
import type { ProjectDocument } from '../../features/editor/state/types';
import { exportIncluded } from './model';
import { worldMatrix } from './transforms';
export function diagnostics(
  document: Pick<
    ProjectDocument,
    'parts' | 'pieces' | 'frontGrid' | 'sideGrid' | 'topGrid' | 'resolution'
  > & { profile?: ProjectDocument['profile'] }
): string[] {
  const messages: string[] = [];
  const occupied = new Map<string, string>();
  const v = new Vector3();
  let overlap = 0;
  for (const piece of document.pieces) {
    const part = document.parts.find((p) => p.id === piece.partId)!;
    if (!piece.exportEnabled || !exportIncluded(part, document.parts)) continue;
    const matrix = worldMatrix(piece.id, document.parts, document.pieces),
      n = document.resolution;
    for (let i = 0; i < piece.voxels.length; i++)
      if (piece.voxels[i]) {
        v.set(
          (i % n) + 0.5 - n / 2,
          (Math.floor(i / n) % n) + 0.5 - n / 2,
          Math.floor(i / (n * n)) + 0.5 - n / 2
        ).applyMatrix4(matrix);
        const key = `${Math.round(v.x * 1000)},${Math.round(v.y * 1000)},${Math.round(v.z * 1000)}`;
        const owner = occupied.get(key);
        if (owner && owner !== piece.partId) overlap++;
        occupied.set(key, piece.partId);
      }
  }
  if (!occupied.size) messages.push('No exportable geometry. Add and apply a piece.');
  if (overlap)
    messages.push(
      `${overlap} voxel centers overlap between moving parts. Inspect their clearance in Preview.`
    );
  if (
    document.profile !== 'player' &&
    !document.parts.some(
      (p) =>
        p.kind === 'socket' && p.role === 'ProjectileOrigin' && exportIncluded(p, document.parts)
    )
  )
    messages.push('No ProjectileOrigin socket. Add one for firing effects.');
  if (
    document.frontGrid.some(Boolean) ||
    document.sideGrid.some(Boolean) ||
    document.topGrid.some(Boolean)
  )
    messages.push('A shape draft is open. Apply or cancel it before exporting.');
  return messages;
}
