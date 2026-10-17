import { identityTransform } from '../../../domain/assembly/transforms';
import {
  computePieceVoxels,
  createEmptyGrid,
  reconstructGridsFromPiece
} from '../../../domain/voxel/model';
import { fill2DGrid } from '../../../domain/voxel/painting';
import type { EditorAction, ProjectDocument } from './types';
export function clearDraft(state: ProjectDocument): ProjectDocument {
  return {
    ...state,
    editingPieceId: null,
    frontGrid: createEmptyGrid(state.resolution),
    sideGrid: createEmptyGrid(state.resolution),
    topGrid: createEmptyGrid(state.resolution)
  };
}
export function draftReducer(state: ProjectDocument, action: EditorAction): ProjectDocument {
  switch (action.type) {
    case 'SET_DRAFT_PART':
      return state.editingPieceId ? state : { ...state, draftPartId: action.partId };
    case 'SET_CELL':
    case 'FILL_CELL': {
      const key =
        action.grid === 'front' ? 'frontGrid' : action.grid === 'side' ? 'sideGrid' : 'topGrid';
      if (
        action.index < 0 ||
        action.index >= state[key].length ||
        state[key][action.index] === action.value
      )
        return state;
      const grid =
        action.type === 'FILL_CELL'
          ? fill2DGrid(state[key], state.resolution, action.index, action.value)
          : state[key].slice();
      if (!grid) return state;
      grid[action.index] = action.value;
      return { ...state, [key]: grid };
    }
    case 'COPY_FRONT_TO_SIDE':
      return { ...state, sideGrid: state.frontGrid.slice() };
    case 'LOAD_PIECE_FOR_EDITING': {
      const piece = state.pieces.find((p) => p.id === action.pieceId);
      if (!piece) return state;
      return {
        ...state,
        ...reconstructGridsFromPiece(piece.voxels, state.resolution),
        editingPieceId: piece.id,
        draftPartId: piece.partId
      };
    }
    case 'CANCEL_EDITING':
      return clearDraft(state);
    case 'PUSH_PIECE':
    case 'FINISH_EDITING': {
      let voxels = computePieceVoxels(
        state.frontGrid,
        state.sideGrid,
        state.topGrid,
        state.resolution
      );
      if (!voxels.some(Boolean)) return state;
      const existing = state.pieces.find((p) => p.id === state.editingPieceId);
      if (existing) {
        const original = reconstructGridsFromPiece(existing.voxels, state.resolution);
        if (
          (['frontGrid', 'sideGrid', 'topGrid'] as const).every((key) =>
            original[key].every((v, i) => v === state[key][i])
          )
        )
          voxels = existing.voxels;
      }
      const colors = existing ? existing.colors.slice() : new Uint8Array(voxels.length);
      const piece = existing
        ? { ...existing, voxels, colors }
        : {
            id: crypto.randomUUID(),
            name: `Piece ${state.pieces.length + 1}`,
            partId: state.draftPartId,
            transform: identityTransform(),
            voxels,
            colors,
            exportEnabled: true
          };
      return {
        ...clearDraft(state),
        pieces: existing
          ? state.pieces.map((p) => (p.id === existing.id ? piece : p))
          : [...state.pieces, piece]
      };
    }
    default:
      return state;
  }
}
