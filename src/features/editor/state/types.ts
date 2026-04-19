export type EditorTool = 'draw' | 'erase' | 'paint';
export type CameraMode = 'perspective' | 'isometric';
export type CameraView =
  | 'front'
  | 'back'
  | 'right'
  | 'left'
  | 'top'
  | 'bottom'
  | 'isometric'
  | 'perspective';
export type GridName = 'front' | 'side' | 'top';

export interface Piece {
  id: string;
  name: string;
  voxels: Uint8Array;
}

export interface EditorSnapshot {
  resolution: number;
  frontGrid: Uint8Array;
  sideGrid: Uint8Array;
  topGrid: Uint8Array;
  pieceVoxels: Uint8Array;
  pieces: Piece[];
  editingPieceId: string | null;
  modelVoxels: Uint8Array;
  modelColors: Uint8Array;
  palette: string[];
  selectedColor: number;
  tool: EditorTool;
  cameraMode: CameraMode;
  cameraView: CameraView;
  pieceCount: number;
}

export interface EditorState {
  version: number;
  resolution: number;
  frontGrid: Uint8Array;
  sideGrid: Uint8Array;
  topGrid: Uint8Array;
  pieceVoxels: Uint8Array;
  pieces: Piece[];
  editingPieceId: string | null;
  modelVoxels: Uint8Array;
  modelColors: Uint8Array;
  history: EditorSnapshot[];
  historyIndex: number;
  palette: string[];
  selectedColor: number;
  tool: EditorTool;
  cameraMode: CameraMode;
  cameraView: CameraView;
  pieceCount: number;
}

export type EditorAction =
  | { type: 'SET_RESOLUTION'; resolution: number }
  | { type: 'SET_CELL'; grid: GridName; index: number; value: number }
  | { type: 'LOAD_PIECE_FOR_EDITING'; pieceId: string }
  | { type: 'PUSH_PIECE' }
  | { type: 'FINISH_EDITING' }
  | { type: 'CANCEL_EDITING' }
  | { type: 'RENAME_PIECE'; pieceId: string; name: string }
  | { type: 'DELETE_PIECE'; pieceId: string }
  | { type: 'PAINT_VOXEL'; index: number; colorIndex: number }
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'SET_COLOR'; colorIndex: number }
  | { type: 'SET_PALETTE_COLOR'; colorIndex: number; color: string }
  | { type: 'SET_CAMERA_MODE'; mode: CameraMode }
  | { type: 'SET_CAMERA_VIEW'; view: CameraView }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD_PROJECT'; state: SerializedProject }
  | { type: 'NEW_PROJECT' };

export interface SerializedPiece {
  id: string;
  name: string;
  voxels: number[];
}

export interface SerializedProject {
  version: number;
  resolution: number;
  frontGrid: number[];
  sideGrid: number[];
  topGrid: number[];
  pieces: SerializedPiece[];
  modelVoxels: number[];
  modelColors: number[];
  palette: string[];
  cameraMode?: CameraMode;
  cameraView?: CameraView;
}
