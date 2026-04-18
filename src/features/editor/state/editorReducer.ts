import {
  applyPieceToModel,
  computeModelFromPieces,
  computePieceVoxels,
  createEmptyGrid,
  createEmptyVoxels,
  createPieceId,
  DEFAULT_PALETTE,
  reconstructGridsFromPiece,
} from '../../../domain/voxel/model';
import { applySnapshot, recordHistory } from './history';
import type { EditorAction, EditorState, SerializedProject } from './types';

export const DEFAULT_RESOLUTION = 16;

export function getInitialState(resolution = DEFAULT_RESOLUTION): EditorState {
  return {
    version: 2,
    resolution,
    frontGrid: createEmptyGrid(resolution),
    sideGrid: createEmptyGrid(resolution),
    topGrid: createEmptyGrid(resolution),
    pieceVoxels: createEmptyVoxels(resolution),
    pieces: [],
    editingPieceId: null,
    modelVoxels: createEmptyVoxels(resolution),
    modelColors: createEmptyVoxels(resolution),
    history: [],
    historyIndex: -1,
    palette: [...DEFAULT_PALETTE],
    selectedColor: 1,
    tool: 'draw',
    cameraMode: 'perspective',
    cameraView: 'perspective',
    pieceCount: 0,
  };
}

function withRecomputedPiece(
  state: EditorState,
  gridKey: 'frontGrid' | 'sideGrid' | 'topGrid',
  gridValue: Uint8Array,
): EditorState {
  const frontGrid = gridKey === 'frontGrid' ? gridValue : state.frontGrid;
  const sideGrid = gridKey === 'sideGrid' ? gridValue : state.sideGrid;
  const topGrid = gridKey === 'topGrid' ? gridValue : state.topGrid;
  return {
    ...state,
    [gridKey]: gridValue,
    pieceVoxels: computePieceVoxels(frontGrid, sideGrid, topGrid, state.resolution),
  };
}

function clearDraft(state: EditorState): EditorState {
  return {
    ...state,
    frontGrid: createEmptyGrid(state.resolution),
    sideGrid: createEmptyGrid(state.resolution),
    topGrid: createEmptyGrid(state.resolution),
    pieceVoxels: createEmptyVoxels(state.resolution),
    editingPieceId: null,
  };
}

function updateState(state: EditorState, nextState: EditorState, trackHistory = false): EditorState {
  if (!trackHistory) return nextState;
  return recordHistory(state, nextState);
}

export function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_RESOLUTION': {
      if (action.resolution === state.resolution) return state;
      return getInitialState(action.resolution);
    }

    case 'SET_CELL': {
      const gridKey = `${action.grid}Grid` as 'frontGrid' | 'sideGrid' | 'topGrid';
      const current = state[gridKey];
      if (!current || current[action.index] === action.value) return state;
      const nextGrid = new Uint8Array(current);
      nextGrid[action.index] = action.value;
      return updateState(state, withRecomputedPiece(state, gridKey, nextGrid), true);
    }

    case 'LOAD_PIECE_FOR_EDITING': {
      const piece = state.pieces.find((entry) => entry.id === action.pieceId);
      if (!piece) return state;
      const grids = reconstructGridsFromPiece(piece.voxels, state.resolution);
      return {
        ...state,
        ...grids,
        pieceVoxels: new Uint8Array(piece.voxels),
        editingPieceId: piece.id,
      };
    }

    case 'PUSH_PIECE': {
      if (!state.pieceVoxels.some(Boolean)) return state;
      const piece = {
        id: createPieceId(),
        name: `Piece_${state.pieceCount + 1}`,
        voxels: new Uint8Array(state.pieceVoxels),
      };
      const pieces = [...state.pieces, piece];
      const merged = applyPieceToModel(state.modelVoxels, state.modelColors, state.pieceVoxels);
      return updateState(state, {
        ...clearDraft(state),
        pieces,
        modelVoxels: merged.modelVoxels,
        modelColors: merged.modelColors,
        pieceCount: state.pieceCount + 1,
      }, true);
    }

    case 'FINISH_EDITING': {
      if (!state.editingPieceId) return state;
      const pieces = state.pieces.map((piece) => (
        piece.id === state.editingPieceId
          ? { ...piece, voxels: new Uint8Array(state.pieceVoxels) }
          : piece
      ));
      return updateState(state, {
        ...clearDraft(state),
        pieces,
        modelVoxels: computeModelFromPieces(pieces, state.resolution),
      }, true);
    }

    case 'CANCEL_EDITING':
      return clearDraft(state);

    case 'RENAME_PIECE': {
      const name = action.name.trim();
      if (!name) return state;
      const pieces = state.pieces.map((piece) => (
        piece.id === action.pieceId ? { ...piece, name } : piece
      ));
      return { ...state, pieces };
    }

    case 'DELETE_PIECE': {
      const pieces = state.pieces.filter((piece) => piece.id !== action.pieceId);
      return updateState(state, {
        ...state,
        pieces,
        editingPieceId: state.editingPieceId === action.pieceId ? null : state.editingPieceId,
        modelVoxels: computeModelFromPieces(pieces, state.resolution),
      }, true);
    }

    case 'PAINT_VOXEL': {
      if (!state.modelVoxels[action.index] || state.modelColors[action.index] === action.colorIndex) return state;
      const modelColors = new Uint8Array(state.modelColors);
      modelColors[action.index] = action.colorIndex;
      return updateState(state, { ...state, modelColors }, true);
    }

    case 'SET_TOOL':
      return { ...state, tool: action.tool };

    case 'SET_COLOR':
      return { ...state, selectedColor: action.colorIndex };

    case 'SET_CAMERA_MODE':
      return { ...state, cameraMode: action.mode };

    case 'SET_CAMERA_VIEW':
      return { ...state, cameraView: action.view };

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const snapshot = state.history[state.historyIndex - 1];
      return {
        ...applySnapshot(state, snapshot),
        historyIndex: state.historyIndex - 1,
      };
    }

    case 'REDO': {
      if (state.historyIndex < 0) return state;
      const nextIndex = state.historyIndex + 1;
      if (nextIndex >= state.history.length) return state;
      const snapshot = state.history[nextIndex];
      return {
        ...applySnapshot(state, snapshot),
        historyIndex: nextIndex,
      };
    }

    case 'LOAD_PROJECT': {
      const loaded: SerializedProject = action.state;
      const pieces = (loaded.pieces || []).map((piece) => ({
        ...piece,
        voxels: new Uint8Array(piece.voxels),
      }));
      const resolution = loaded.resolution || DEFAULT_RESOLUTION;
      return {
        ...getInitialState(resolution),
        ...loaded,
        frontGrid: new Uint8Array(loaded.frontGrid || createEmptyGrid(resolution)),
        sideGrid: new Uint8Array(loaded.sideGrid || createEmptyGrid(resolution)),
        topGrid: new Uint8Array(loaded.topGrid || createEmptyGrid(resolution)),
        pieceVoxels: createEmptyVoxels(resolution),
        pieces,
        modelVoxels: new Uint8Array(loaded.modelVoxels || createEmptyVoxels(resolution)),
        modelColors: new Uint8Array(loaded.modelColors || createEmptyVoxels(resolution)),
        history: [],
        historyIndex: -1,
        editingPieceId: null,
        palette: loaded.palette || [...DEFAULT_PALETTE],
        cameraMode: loaded.cameraMode || 'perspective',
        cameraView: loaded.cameraView || 'perspective',
        pieceCount: pieces.length,
      };
    }

    case 'NEW_PROJECT':
      return getInitialState(state.resolution);

    default:
      return state;
  }
}
