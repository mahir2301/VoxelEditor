import {
  DEFAULT_PALETTE,
  applyPieceToModel,
  computeModelFromPieces,
  computePieceVoxels,
  createEmptyGrid,
  createEmptyVoxels,
  createPieceId,
  reconstructGridsFromPiece
} from '../../../domain/voxel/model';
import { applySnapshot, recordHistory } from './history';
import type { EditorAction, EditorState, SerializedProject } from './types';

export const DEFAULT_RESOLUTION = 16;

export function getInitialState(resolution = DEFAULT_RESOLUTION): EditorState {
  return {
    cameraMode: 'perspective',
    cameraView: 'perspective',
    editingPieceId: null,
    frontGrid: createEmptyGrid(resolution),
    history: [],
    historyIndex: -1,
    modelColors: createEmptyVoxels(resolution),
    modelVoxels: createEmptyVoxels(resolution),
    palette: [...DEFAULT_PALETTE],
    pieceCount: 0,
    pieceVoxels: createEmptyVoxels(resolution),
    pieces: [],
    resolution,
    selectedColor: 1,
    sideGrid: createEmptyGrid(resolution),
    tool: 'draw',
    topGrid: createEmptyGrid(resolution),
    version: 2
  };
}

function withRecomputedPiece(
  state: EditorState,
  gridKey: 'frontGrid' | 'sideGrid' | 'topGrid',
  gridValue: Uint8Array
): EditorState {
  const frontGrid = gridKey === 'frontGrid' ? gridValue : state.frontGrid;
  const sideGrid = gridKey === 'sideGrid' ? gridValue : state.sideGrid;
  const topGrid = gridKey === 'topGrid' ? gridValue : state.topGrid;
  return {
    ...state,
    [gridKey]: gridValue,
    pieceVoxels: computePieceVoxels(frontGrid, sideGrid, topGrid, state.resolution)
  };
}

function clearDraft(state: EditorState): EditorState {
  return {
    ...state,
    editingPieceId: null,
    frontGrid: createEmptyGrid(state.resolution),
    pieceVoxels: createEmptyVoxels(state.resolution),
    sideGrid: createEmptyGrid(state.resolution),
    topGrid: createEmptyGrid(state.resolution)
  };
}

function updateState(
  state: EditorState,
  nextState: EditorState,
  trackHistory = false
): EditorState {
  if (!trackHistory) {
    return nextState;
  }
  return recordHistory(state, nextState);
}

export function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_RESOLUTION': {
      if (action.resolution === state.resolution) {
        return state;
      }
      return updateState(state, getInitialState(action.resolution), true);
    }

    case 'SET_CELL': {
      const gridKey = `${action.grid}Grid`;
      const current = state[gridKey];
      if (!current || current[action.index] === action.value) {
        return state;
      }
      const nextGrid = new Uint8Array(current);
      nextGrid[action.index] = action.value;
      return updateState(state, withRecomputedPiece(state, gridKey, nextGrid), true);
    }

    case 'LOAD_PIECE_FOR_EDITING': {
      const piece = state.pieces.find((entry) => entry.id === action.pieceId);
      if (!piece) {
        return state;
      }
      const grids = reconstructGridsFromPiece(piece.voxels, state.resolution);
      return {
        ...state,
        ...grids,
        editingPieceId: piece.id,
        pieceVoxels: new Uint8Array(piece.voxels)
      };
    }

    case 'PUSH_PIECE': {
      if (!state.pieceVoxels.some(Boolean)) {
        return state;
      }
      const piece = {
        id: createPieceId(),
        name: `Piece_${state.pieceCount + 1}`,
        voxels: new Uint8Array(state.pieceVoxels)
      };
      const pieces = [...state.pieces, piece];
      const merged = applyPieceToModel(state.modelVoxels, state.modelColors, state.pieceVoxels);
      return updateState(
        state,
        {
          ...clearDraft(state),
          modelColors: merged.modelColors,
          modelVoxels: merged.modelVoxels,
          pieceCount: state.pieceCount + 1,
          pieces
        },
        true
      );
    }

    case 'FINISH_EDITING': {
      if (!state.editingPieceId) {
        return state;
      }
      const pieces = state.pieces.map((piece) =>
        piece.id === state.editingPieceId
          ? { ...piece, voxels: new Uint8Array(state.pieceVoxels) }
          : piece
      );
      return updateState(
        state,
        {
          ...clearDraft(state),
          modelVoxels: computeModelFromPieces(pieces, state.resolution),
          pieces
        },
        true
      );
    }

    case 'CANCEL_EDITING': {
      return clearDraft(state);
    }

    case 'RENAME_PIECE': {
      const name = action.name.trim();
      if (!name) {
        return state;
      }
      const pieces = state.pieces.map((piece) =>
        piece.id === action.pieceId ? { ...piece, name } : piece
      );
      const unchanged = state.pieces.every((piece, index) => piece.name === pieces[index]?.name);
      if (unchanged) {
        return state;
      }
      return updateState(state, { ...state, pieces }, true);
    }

    case 'DELETE_PIECE': {
      const pieces = state.pieces.filter((piece) => piece.id !== action.pieceId);
      return updateState(
        state,
        {
          ...state,
          editingPieceId: state.editingPieceId === action.pieceId ? null : state.editingPieceId,
          modelVoxels: computeModelFromPieces(pieces, state.resolution),
          pieces
        },
        true
      );
    }

    case 'PAINT_VOXEL': {
      if (
        !state.modelVoxels[action.index] ||
        state.modelColors[action.index] === action.colorIndex
      ) {
        return state;
      }
      const modelColors = new Uint8Array(state.modelColors);
      modelColors[action.index] = action.colorIndex;
      return updateState(state, { ...state, modelColors }, true);
    }

    case 'SET_TOOL': {
      return { ...state, tool: action.tool };
    }

    case 'SET_COLOR': {
      return { ...state, selectedColor: action.colorIndex };
    }

    case 'SET_PALETTE_COLOR': {
      const current = state.palette[action.colorIndex];
      if (current === action.color) {
        return state;
      }
      const palette = [...state.palette];
      palette[action.colorIndex] = action.color;
      return updateState(state, { ...state, palette }, true);
    }

    case 'SET_CAMERA_MODE': {
      return { ...state, cameraMode: action.mode };
    }

    case 'SET_CAMERA_VIEW': {
      return { ...state, cameraView: action.view };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) {
        return state;
      }
      const snapshot = state.history[state.historyIndex - 1];
      return {
        ...applySnapshot(state, snapshot),
        historyIndex: state.historyIndex - 1
      };
    }

    case 'REDO': {
      if (state.historyIndex < 0) {
        return state;
      }
      const nextIndex = state.historyIndex + 1;
      if (nextIndex >= state.history.length) {
        return state;
      }
      const snapshot = state.history[nextIndex];
      return {
        ...applySnapshot(state, snapshot),
        historyIndex: nextIndex
      };
    }

    case 'LOAD_PROJECT': {
      const loaded: SerializedProject = action.state;
      const pieces = (loaded.pieces || []).map((piece) => ({
        ...piece,
        voxels: new Uint8Array(piece.voxels)
      }));
      const resolution = loaded.resolution || DEFAULT_RESOLUTION;
      return updateState(
        state,
        {
          ...getInitialState(resolution),
          ...loaded,
          cameraMode: loaded.cameraMode || 'perspective',
          cameraView: loaded.cameraView || 'perspective',
          editingPieceId: null,
          frontGrid: new Uint8Array(loaded.frontGrid || createEmptyGrid(resolution)),
          history: [],
          historyIndex: -1,
          modelColors: new Uint8Array(loaded.modelColors || createEmptyVoxels(resolution)),
          modelVoxels: new Uint8Array(loaded.modelVoxels || createEmptyVoxels(resolution)),
          palette: loaded.palette || [...DEFAULT_PALETTE],
          pieceCount: pieces.length,
          pieceVoxels: createEmptyVoxels(resolution),
          pieces,
          sideGrid: new Uint8Array(loaded.sideGrid || createEmptyGrid(resolution)),
          topGrid: new Uint8Array(loaded.topGrid || createEmptyGrid(resolution))
        },
        true
      );
    }

    case 'NEW_PROJECT': {
      return updateState(state, getInitialState(state.resolution), true);
    }

    default: {
      return state;
    }
  }
}
