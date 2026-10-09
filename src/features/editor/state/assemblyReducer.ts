import { duplicate, reparent, setTransform } from '../../../domain/assembly/model';
import { descendants } from '../../../domain/assembly/transforms';
import { fillModelColor } from '../../../domain/voxel/painting';
import type { EditorAction, ProjectDocument } from './types';
export function assemblyReducer(state: ProjectDocument, action: EditorAction): ProjectDocument {
  switch (action.type) {
    case 'SET_EXPORT':
      return {
        ...state,
        parts: state.parts.map((part) =>
          part.id === action.id ? { ...part, exportEnabled: action.enabled } : part
        ),
        pieces: state.pieces.map((piece) =>
          piece.id === action.id ? { ...piece, exportEnabled: action.enabled } : piece
        )
      };

    case 'ADD_PART':
      return { ...state, parts: [...state.parts, action.part] };
    case 'UPDATE_PART':
      return {
        ...state,
        parts: state.parts.map((p) => (p.id === action.partId ? { ...p, ...action.changes } : p))
      };
    case 'TRANSFORM':
      return setTransform(state, action.id, action.transform, action.pivot);
    case 'REPARENT':
      return reparent(state, action.id, action.parentId);
    case 'DUPLICATE_NODE':
      return duplicate(state, action.id);
    case 'DELETE_NODE': {
      if (!state.parts.some((p) => p.id === action.id))
        return {
          ...state,
          pieces: state.pieces.filter((p) => p.id !== action.id),
          editingPieceId: state.editingPieceId === action.id ? null : state.editingPieceId
        };
      const ids = descendants(action.id, state.parts),
        parts = state.parts.filter((p) => !ids.has(p.id));
      if (!parts.some((p) => p.kind === 'part')) return state;
      const pieces = state.pieces.filter((p) => !ids.has(p.partId));
      return {
        ...state,
        parts,
        pieces,
        editingPieceId: pieces.some((p) => p.id === state.editingPieceId)
          ? state.editingPieceId
          : null,
        draftPartId: parts.some((p) => p.id === state.draftPartId)
          ? state.draftPartId
          : parts.find((p) => p.kind === 'part')!.id
      };
    }
    case 'RENAME_PIECE':
      return {
        ...state,
        pieces: state.pieces.map((p) =>
          p.id === action.pieceId ? { ...p, name: action.name.trim() || p.name } : p
        )
      };
    case 'DELETE_PIECE':
      return assemblyReducer(state, { type: 'DELETE_NODE', id: action.pieceId });
    case 'PAINT_VOXEL':
    case 'FILL_PAINT_VOXEL': {
      const piece = state.pieces.find((p) => p.id === action.pieceId);
      if (
        !piece ||
        !piece.voxels[action.index] ||
        action.colorIndex < 0 ||
        action.colorIndex >= state.palette.length ||
        piece.colors[action.index] === action.colorIndex
      )
        return state;
      const colors =
        action.type === 'FILL_PAINT_VOXEL'
          ? fillModelColor(
              piece.voxels,
              piece.colors,
              state.resolution,
              action.index,
              action.colorIndex
            )
          : piece.colors.slice();
      if (!colors) return state;
      colors[action.index] = action.colorIndex;
      return {
        ...state,
        pieces: state.pieces.map((p) => (p.id === piece.id ? { ...p, colors } : p))
      };
    }
    case 'SET_PALETTE_COLOR':
      return {
        ...state,
        palette: state.palette.map((p, i) => (i === action.colorIndex ? action.color : p))
      };
    case 'SET_PROJECT':
      return {
        ...state,
        name: action.name ?? state.name,
        voxelsPerUnit: action.voxelsPerUnit ?? state.voxelsPerUnit
      };
    default:
      return state;
  }
}
