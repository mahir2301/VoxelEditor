import { exportIncluded } from '../../domain/assembly/model';
import { assertProfile } from '../../domain/assembly/profiles';
import { nodePath } from '../../domain/assembly/transforms';
import type { ProjectDocument } from '../editor/state/types';
export function presentationMetadata(document: ProjectDocument) {
  assertProfile(document);
  const parts = document.parts.filter((p) => exportIncluded(p, document.parts));
  return {
    version: document.profile === 'player' || document.profile === 'weapon' ? 2 : 1,
    ...(document.profile === 'player' || document.profile === 'weapon'
      ? {
          assetType: document.profile,
          handPose: document.parts.find((p) => p.role === 'PrimaryGrip')?.poses ?? {
            hold: [0, 0, 0],
            fire: [0, 0, 0],
            knockout: [0, 0, 0]
          },
          rig: parts
            .filter((p) => p.kind === 'part')
            .map((p) => ({
              path: nodePath(p.id, document.parts),
              role: p.rigRole,
              poses: p.poses
            })),
          teamPaths: parts.filter((p) => p.teamColor).map((p) => nodePath(p.id, document.parts))
        }
      : {}),
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
