import { useReducer, useEffect, useCallback, useRef } from 'react';
import { computePieceVoxels, computeModelFromPieces, DEFAULT_PALETTE } from '../utils/voxelUtils';
import { serializeState } from '../utils/exportGLB';

const STORAGE_KEY = 'voxel-editor-autosave';

function createEmptyGrid(size) {
  return new Uint8Array(size * size);
}

function createEmptyVoxels(size) {
  return new Uint8Array(size * size * size);
}

function getInitialState(resolution = 16) {
  const size = resolution;
  return {
    version: 1,
    resolution,
    frontGrid: createEmptyGrid(size),
    sideGrid: createEmptyGrid(size),
    topGrid: createEmptyGrid(size),
    pieceVoxels: createEmptyVoxels(size),
    pieces: [],
    editingPieceId: null,
    modelVoxels: createEmptyVoxels(size),
    modelColors: createEmptyVoxels(size),
    history: [],
    historyIndex: -1,
    palette: [...DEFAULT_PALETTE],
    selectedColor: 1,
    tool: 'draw',
    cameraMode: 'perspective',
    cameraView: 'perspective', // 'front', 'side', 'top', 'perspective', 'isometric'
    pieceCount: 0,
  };
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved);
    if (!data.version || !data.resolution) return null;

    return {
      ...data,
      resolution: data.resolution,
      frontGrid: new Uint8Array(data.frontGrid),
      sideGrid: new Uint8Array(data.sideGrid),
      topGrid: new Uint8Array(data.topGrid),
      pieceVoxels: createEmptyVoxels(data.resolution),
      pieces: data.pieces.map((p) => ({
        ...p,
        voxels: new Uint8Array(p.voxels),
      })),
      modelVoxels: new Uint8Array(data.modelVoxels),
      modelColors: new Uint8Array(data.modelColors),
      history: (data.history || []).map((h) => ({
        modelVoxels: new Uint8Array(h.modelVoxels),
        modelColors: new Uint8Array(h.modelColors),
        pieces: h.pieces.map((p) => ({
          ...p,
          voxels: new Uint8Array(p.voxels),
        })),
      })),
      palette: data.palette || [...DEFAULT_PALETTE],
      selectedColor: data.selectedColor || 1,
      tool: data.tool || 'draw',
      cameraMode: data.cameraMode || 'perspective',
      cameraView: data.cameraView || 'perspective',
      editingPieceId: null,
      pieceCount: data.pieces?.length || 0,
    };
  } catch {
    return null;
  }
}

function reducer(state, action) {
  const size = state.resolution;

  switch (action.type) {
    case 'SET_RESOLUTION': {
      const newRes = action.resolution;
      return {
        ...getInitialState(newRes),
        resolution: newRes,
      };
    }

    case 'TOGGLE_CELL': {
      const { grid, index } = action;
      const gridKey = `${grid}Grid`;
      const currentGrid = state[gridKey];
      const newGrid = new Uint8Array(currentGrid);
      newGrid[index] = newGrid[index] ? 0 : 1;

      const pieceVoxels = computePieceVoxels(
        grid === 'front' ? newGrid : state.frontGrid,
        grid === 'side' ? newGrid : state.sideGrid,
        grid === 'top' ? newGrid : state.topGrid,
        size
      );

      return { ...state, [gridKey]: newGrid, pieceVoxels };
    }

    case 'SET_CELL': {
      const { grid, index, value } = action;
      const gridKey = `${grid}Grid`;
      const currentGrid = state[gridKey];
      const newGrid = new Uint8Array(currentGrid);
      newGrid[index] = value;

      const pieceVoxels = computePieceVoxels(
        grid === 'front' ? newGrid : state.frontGrid,
        grid === 'side' ? newGrid : state.sideGrid,
        grid === 'top' ? newGrid : state.topGrid,
        size
      );

      return { ...state, [gridKey]: newGrid, pieceVoxels };
    }

    case 'PUSH_PIECE': {
      const { pieceCount } = state;
      const name = `Piece_${pieceCount + 1}`;

      // Additive merge: only fill empty cells
      const newModelVoxels = new Uint8Array(state.modelVoxels);
      const newModelColors = new Uint8Array(state.modelColors);

      for (let i = 0; i < state.pieceVoxels.length; i++) {
        if (state.pieceVoxels[i] && !newModelVoxels[i]) {
          newModelVoxels[i] = 1;
          newModelColors[i] = 1; // default color (red)
        }
      }

      const newPiece = {
        id: `piece-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        voxels: new Uint8Array(state.pieceVoxels),
      };

      const newPieces = [...state.pieces, newPiece];

      // Save to history
      const snapshot = {
        modelVoxels: new Uint8Array(newModelVoxels),
        modelColors: new Uint8Array(newModelColors),
        pieces: newPieces.map((p) => ({ ...p, voxels: new Uint8Array(p.voxels) })),
      };
      const newHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        snapshot,
      ];

      return {
        ...state,
        frontGrid: createEmptyGrid(size),
        sideGrid: createEmptyGrid(size),
        topGrid: createEmptyGrid(size),
        pieceVoxels: createEmptyVoxels(size),
        pieces: newPieces,
        editingPieceId: null,
        modelVoxels: newModelVoxels,
        modelColors: newModelColors,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        pieceCount: pieceCount + 1,
      };
    }

    case 'LOAD_PIECE_FOR_EDITING': {
      const piece = state.pieces.find((p) => p.id === action.pieceId);
      if (!piece) return state;

      // Compute grids from piece voxels (approximate reconstruction)
      const frontGrid = createEmptyGrid(size);
      const sideGrid = createEmptyGrid(size);
      const topGrid = createEmptyGrid(size);

      for (let i = 0; i < piece.voxels.length; i++) {
        if (!piece.voxels[i]) continue;
        const x = i % size;
        const y = Math.floor(i / size) % size;
        const z = Math.floor(i / (size * size));
        frontGrid[x + (size - 1 - y) * size] = 1;
        sideGrid[z + (size - 1 - y) * size] = 1;
        topGrid[x + z * size] = 1;
      }

      return {
        ...state,
        editingPieceId: action.pieceId,
        frontGrid,
        sideGrid,
        topGrid,
        pieceVoxels: new Uint8Array(piece.voxels),
      };
    }

    case 'FINISH_EDITING': {
      if (!state.editingPieceId) return state;

      // Update the piece's voxels
      const newPieces = state.pieces.map((p) =>
        p.id === state.editingPieceId
          ? { ...p, voxels: new Uint8Array(state.pieceVoxels) }
          : p
      );

      // Recompute model from all pieces
      const newModelVoxels = computeModelFromPieces(newPieces, size);
      const newModelColors = new Uint8Array(state.modelColors);

      // Save snapshot
      const snapshot = {
        modelVoxels: new Uint8Array(newModelVoxels),
        modelColors: new Uint8Array(newModelColors),
        pieces: newPieces.map((p) => ({ ...p, voxels: new Uint8Array(p.voxels) })),
      };
      const newHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        snapshot,
      ];

      return {
        ...state,
        frontGrid: createEmptyGrid(size),
        sideGrid: createEmptyGrid(size),
        topGrid: createEmptyGrid(size),
        pieceVoxels: createEmptyVoxels(size),
        pieces: newPieces,
        editingPieceId: null,
        modelVoxels: newModelVoxels,
        modelColors: newModelColors,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'CANCEL_EDITING': {
      return {
        ...state,
        frontGrid: createEmptyGrid(size),
        sideGrid: createEmptyGrid(size),
        topGrid: createEmptyGrid(size),
        pieceVoxels: createEmptyVoxels(size),
        editingPieceId: null,
      };
    }

    case 'RENAME_PIECE': {
      const newPieces = state.pieces.map((p) =>
        p.id === action.pieceId ? { ...p, name: action.name } : p
      );
      return { ...state, pieces: newPieces };
    }

    case 'DELETE_PIECE': {
      const newPieces = state.pieces.filter((p) => p.id !== action.pieceId);
      const newModelVoxels = computeModelFromPieces(newPieces, size);
      const newModelColors = new Uint8Array(state.modelColors);

      const snapshot = {
        modelVoxels: new Uint8Array(newModelVoxels),
        modelColors: new Uint8Array(newModelColors),
        pieces: newPieces.map((p) => ({ ...p, voxels: new Uint8Array(p.voxels) })),
      };
      const newHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        snapshot,
      ];

      return {
        ...state,
        pieces: newPieces,
        modelVoxels: newModelVoxels,
        modelColors: newModelColors,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        editingPieceId: state.editingPieceId === action.pieceId ? null : state.editingPieceId,
      };
    }

    case 'PAINT_VOXEL': {
      if (!state.modelVoxels[action.index]) return state;
      const newColors = new Uint8Array(state.modelColors);
      newColors[action.index] = action.colorIndex;

      const snapshot = {
        modelVoxels: new Uint8Array(state.modelVoxels),
        modelColors: new Uint8Array(newColors),
        pieces: state.pieces.map((p) => ({ ...p, voxels: new Uint8Array(p.voxels) })),
      };
      const newHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        snapshot,
      ];

      return {
        ...state,
        modelColors: newColors,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
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
      if (state.historyIndex < 0) return state;
      const prev = state.history[state.historyIndex];
      return {
        ...state,
        modelVoxels: new Uint8Array(prev.modelVoxels),
        modelColors: new Uint8Array(prev.modelColors),
        pieces: prev.pieces.map((p) => ({ ...p, voxels: new Uint8Array(p.voxels) })),
        historyIndex: state.historyIndex - 1,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const next = state.history[state.historyIndex + 1];
      return {
        ...state,
        modelVoxels: new Uint8Array(next.modelVoxels),
        modelColors: new Uint8Array(next.modelColors),
        pieces: next.pieces.map((p) => ({ ...p, voxels: new Uint8Array(p.voxels) })),
        historyIndex: state.historyIndex + 1,
      };
    }

    case 'LOAD_PROJECT': {
      return {
        ...action.state,
        pieceVoxels: createEmptyVoxels(action.state.resolution),
        editingPieceId: null,
        tool: 'draw',
        selectedColor: 1,
        cameraMode: action.state.cameraMode || 'perspective',
      };
    }

    case 'NEW_PROJECT': {
      return getInitialState(state.resolution);
    }

    default:
      return state;
  }
}

export function useVoxelState() {
  const saved = loadFromStorage();
  const [state, dispatch] = useReducer(reducer, saved || getInitialState(16));
  const saveTimeout = useRef(null);

  // Auto-save to localStorage
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const data = serializeState(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [state]);

  // Get the effective model voxels (includes editing piece overlay)
  const getEffectiveModelVoxels = useCallback(() => {
    if (!state.editingPieceId) return state.modelVoxels;
    // Add editing piece as overlay (additive)
    const overlay = new Uint8Array(state.modelVoxels);
    for (let i = 0; i < state.pieceVoxels.length; i++) {
      if (state.pieceVoxels[i]) overlay[i] = 1;
    }
    return overlay;
  }, [state.modelVoxels, state.pieceVoxels, state.editingPieceId]);

  // Get the editing piece voxels (for semi-transparent overlay)
  const getEditingPieceVoxels = useCallback(() => {
    if (!state.editingPieceId) return null;
    return state.pieceVoxels;
  }, [state.pieceVoxels, state.editingPieceId]);

  return {
    state,
    dispatch,
    getEffectiveModelVoxels,
    getEditingPieceVoxels,
  };
}
