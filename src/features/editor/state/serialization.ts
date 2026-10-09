import { createSnapshot } from './history';
import type { ProjectDocument, SerializedProject } from './types';
export function serializeState(state: ProjectDocument): SerializedProject {
  return {
    ...createSnapshot(state),
    frontGrid: [...state.frontGrid],
    sideGrid: [...state.sideGrid],
    topGrid: [...state.topGrid],
    pieces: state.pieces.map((p) => ({ ...p, voxels: [...p.voxels], colors: [...p.colors] }))
  };
}
