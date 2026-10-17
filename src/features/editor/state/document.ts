import { newPart } from '../../../domain/assembly/model';
import { DEFAULT_PALETTE, createEmptyGrid } from '../../../domain/voxel/model';
import { parseSerializedProjectOrThrow } from './projectSchema';
import type { EditorState, ProjectDocument, SerializedProject } from './types';
export function emptyDocument(resolution = 16): ProjectDocument {
  const base = newPart('Base');
  base.transform.position[1] = resolution / 2;
  return {
    version: 4,
    profile: 'generic',
    name: 'tower',
    resolution,
    voxelsPerUnit: 16,
    parts: [base],
    pieces: [],
    palette: [...DEFAULT_PALETTE],
    frontGrid: createEmptyGrid(resolution),
    sideGrid: createEmptyGrid(resolution),
    topGrid: createEmptyGrid(resolution),
    editingPieceId: null,
    draftPartId: base.id
  };
}
export function hydrate(raw: SerializedProject): ProjectDocument {
  const project = parseSerializedProjectOrThrow(raw);
  return {
    ...structuredClone(project),
    pieces: project.pieces.map((p) => ({
      ...p,
      voxels: new Uint8Array(p.voxels),
      colors: new Uint8Array(p.colors)
    })),
    frontGrid: new Uint8Array(project.frontGrid),
    sideGrid: new Uint8Array(project.sideGrid),
    topGrid: new Uint8Array(project.topGrid)
  };
}
export function getInitialState(resolution = 16): EditorState {
  return {
    ...emptyDocument(resolution),
    history: [],
    historyIndex: -1,
    transaction: null,
    tool: 'draw',
    selectedColor: 0,
    cameraMode: 'perspective',
    cameraView: 'perspective'
  };
}
