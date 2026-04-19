import type { EditorState, SerializedProject } from './types';

export function serializeState(state: EditorState): SerializedProject {
  return {
    cameraMode: state.cameraMode,
    cameraView: state.cameraView,
    frontGrid: [...state.frontGrid],
    modelColors: [...state.modelColors],
    modelVoxels: [...state.modelVoxels],
    palette: [...state.palette],
    pieces: state.pieces.map((p) => ({
      id: p.id,
      name: p.name,
      voxels: [...p.voxels]
    })),
    resolution: state.resolution,
    sideGrid: [...state.sideGrid],
    topGrid: [...state.topGrid],
    version: 1
  };
}
