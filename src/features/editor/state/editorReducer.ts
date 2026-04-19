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

function fill2DGrid(
  grid: Uint8Array,
  size: number,
  startIndex: number,
  value: number
): Uint8Array | null {
  const target = grid[startIndex];
  if (target === value) {
    return null;
  }

  const result = new Uint8Array(grid);
  const queue = [startIndex];
  result[startIndex] = value;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % size;
    const y = Math.floor(index / size);

    if (x > 0) {
      const left = index - 1;
      if (result[left] === target) {
        result[left] = value;
        queue.push(left);
      }
    }
    if (x < size - 1) {
      const right = index + 1;
      if (result[right] === target) {
        result[right] = value;
        queue.push(right);
      }
    }
    if (y > 0) {
      const up = index - size;
      if (result[up] === target) {
        result[up] = value;
        queue.push(up);
      }
    }
    if (y < size - 1) {
      const down = index + size;
      if (result[down] === target) {
        result[down] = value;
        queue.push(down);
      }
    }
  }

  return result;
}

function fillModelColor(
  modelVoxels: Uint8Array,
  modelColors: Uint8Array,
  size: number,
  startIndex: number,
  colorIndex: number
): Uint8Array | null {
  if (!modelVoxels[startIndex]) {
    return null;
  }

  const planeSize = size * size;
  const surfaceVoxels = new Uint8Array(modelVoxels.length);

  for (let index = 0; index < modelVoxels.length; index += 1) {
    if (!modelVoxels[index]) {
      continue;
    }

    const x = index % size;
    const y = Math.floor(index / size) % size;
    const z = Math.floor(index / planeSize);

    const left = x === 0 || !modelVoxels[index - 1];
    const right = x === size - 1 || !modelVoxels[index + 1];
    const up = y === 0 || !modelVoxels[index - size];
    const down = y === size - 1 || !modelVoxels[index + size];
    const back = z === 0 || !modelVoxels[index - planeSize];
    const front = z === size - 1 || !modelVoxels[index + planeSize];

    if (left || right || up || down || back || front) {
      surfaceVoxels[index] = 1;
    }
  }

  if (!surfaceVoxels[startIndex]) {
    return null;
  }

  const targetColor = modelColors[startIndex];
  if (targetColor === colorIndex) {
    return null;
  }

  const result = new Uint8Array(modelColors);
  const queue = [startIndex];
  result[startIndex] = colorIndex;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % size;
    const y = Math.floor(index / size) % size;
    const z = Math.floor(index / planeSize);

    const visit = (nextIndex: number) => {
      if (
        !surfaceVoxels[nextIndex] ||
        !modelVoxels[nextIndex] ||
        result[nextIndex] !== targetColor
      ) {
        return;
      }
      result[nextIndex] = colorIndex;
      queue.push(nextIndex);
    };

    if (x > 0) {
      visit(index - 1);
    }
    if (x < size - 1) {
      visit(index + 1);
    }
    if (y > 0) {
      visit(index - size);
    }
    if (y < size - 1) {
      visit(index + size);
    }
    if (z > 0) {
      visit(index - planeSize);
    }
    if (z < size - 1) {
      visit(index + planeSize);
    }
  }

  return result;
}

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
    selectedColor: 0,
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
      const gridKey =
        action.grid === 'front' ? 'frontGrid' : action.grid === 'side' ? 'sideGrid' : 'topGrid';
      const current = state[gridKey];
      if (!current || current[action.index] === action.value) {
        return state;
      }
      const nextGrid = new Uint8Array(current);
      nextGrid[action.index] = action.value;
      return updateState(state, withRecomputedPiece(state, gridKey, nextGrid), true);
    }

    case 'FILL_CELL': {
      const gridKey =
        action.grid === 'front' ? 'frontGrid' : action.grid === 'side' ? 'sideGrid' : 'topGrid';
      const current = state[gridKey];
      if (!current || action.index < 0 || action.index >= current.length) {
        return state;
      }
      const nextGrid = fill2DGrid(current, state.resolution, action.index, action.value);
      if (!nextGrid) {
        return state;
      }
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

    case 'FILL_PAINT_VOXEL': {
      if (action.index < 0 || action.index >= state.modelVoxels.length) {
        return state;
      }
      const modelColors = fillModelColor(
        state.modelVoxels,
        state.modelColors,
        state.resolution,
        action.index,
        action.colorIndex
      );
      if (!modelColors) {
        return state;
      }
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

    case 'COPY_FRONT_TO_SIDE': {
      const nextGrid = new Uint8Array(state.frontGrid);
      return updateState(state, withRecomputedPiece(state, 'sideGrid', nextGrid), true);
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
        id: piece.id,
        name: piece.name,
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
          selectedColor: 0,
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
