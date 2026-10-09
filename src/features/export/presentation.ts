import { exportIncluded } from '../../domain/assembly/model';
import { nodePath } from '../../domain/assembly/transforms';
import type { ProjectDocument } from '../editor/state/types';
export function presentationMetadata(document: ProjectDocument) {
  const parts = document.parts.filter((p) => exportIncluded(p, document.parts));
  return {
    version: 1,
    root: 'VoxelAssembly',
    forward: '-Z',
    bindings: parts
      .filter((p) => p.motion.kind !== 'none')
      .map((p) => ({
        path: nodePath(p.id, document.parts),
        motion: p.motion.kind,
        axis: p.motion.axis,
        minDegrees: p.motion.min,
        maxDegrees: p.motion.max,
        distance: p.motion.distance / document.voxelsPerUnit,
        duration: p.motion.duration,
        speedDegrees: p.motion.speed
      })),
    sockets: parts
      .filter((p) => p.kind === 'socket' && p.role !== 'None')
      .map((p) => ({ path: nodePath(p.id, document.parts), role: p.role })),
    energyPaths: parts.filter((p) => p.energy).map((p) => nodePath(p.id, document.parts))
  };
}
