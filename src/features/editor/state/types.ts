export type EditorTool = 'draw' | 'erase' | 'fill' | 'fillErase' | 'paint' | 'paintFill';
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
export type Vector = [number, number, number];
export interface Transform {
  position: Vector;
  rotation: Vector;
}
export type MotionKind = 'none' | 'yaw' | 'pitch' | 'recoil' | 'spin';
export type AssetProfile = 'generic' | 'tower' | 'player' | 'weapon';
export type RigRole = 'None' | 'Torso' | 'Head' | 'LeftArm' | 'RightArm' | 'LeftLeg' | 'RightLeg';
export type PoseName = 'hold' | 'fire' | 'knockout';
export type PoseOffsets = Record<PoseName, Vector>;
export type SocketRole =
  | 'None'
  | 'ProjectileOrigin'
  | 'EnergyConnector'
  | 'HealthbarAnchor'
  | 'HandGrip'
  | 'PrimaryGrip'
  | 'SupportGrip';
export interface Motion {
  kind: MotionKind;
  axis: 'x' | 'y' | 'z';
  min: number;
  max: number;
  distance: number;
  duration: number;
  speed: number;
}
export interface Part {
  id: string;
  name: string;
  parentId: string | null;
  kind: 'part' | 'socket';
  transform: Transform;
  motion: Motion;
  role: SocketRole;
  energy: boolean;
  rigRole: RigRole;
  teamColor: boolean;
  poses: PoseOffsets;
  exportEnabled: boolean;
}
export interface Piece {
  id: string;
  name: string;
  partId: string;
  transform: Transform;
  voxels: Uint8Array;
  colors: Uint8Array;
  exportEnabled: boolean;
}
export interface ProjectDocument {
  version: 4;
  profile: AssetProfile;
  name: string;
  resolution: number;
  voxelsPerUnit: number;
  parts: Part[];
  pieces: Piece[];
  palette: string[];
  frontGrid: Uint8Array;
  sideGrid: Uint8Array;
  topGrid: Uint8Array;
  editingPieceId: string | null;
  draftPartId: string;
}
export interface EditorSnapshot extends ProjectDocument {}
export interface EditorState extends ProjectDocument {
  history: EditorSnapshot[];
  historyIndex: number;
  transaction: EditorSnapshot | null;
  tool: EditorTool;
  selectedColor: number;
  cameraMode: CameraMode;
  cameraView: CameraView;
}
export interface SerializedPiece extends Omit<Piece, 'voxels' | 'colors'> {
  voxels: number[];
  colors: number[];
}
export interface SerializedProject extends Omit<
  ProjectDocument,
  'pieces' | 'frontGrid' | 'sideGrid' | 'topGrid'
> {
  pieces: SerializedPiece[];
  frontGrid: number[];
  sideGrid: number[];
  topGrid: number[];
}
export type EditorAction =
  | { type: 'SET_CELL' | 'FILL_CELL'; grid: GridName; index: number; value: number }
  | { type: 'LOAD_PIECE_FOR_EDITING' | 'DELETE_PIECE'; pieceId: string }
  | { type: 'RENAME_PIECE'; pieceId: string; name: string }
  | {
      type:
        | 'PUSH_PIECE'
        | 'FINISH_EDITING'
        | 'CANCEL_EDITING'
        | 'COPY_FRONT_TO_SIDE'
        | 'UNDO'
        | 'REDO'
        | 'BEGIN_TRANSACTION'
        | 'END_TRANSACTION'
        | 'CANCEL_TRANSACTION';
    }
  | { type: 'PAINT_VOXEL' | 'FILL_PAINT_VOXEL'; pieceId: string; index: number; colorIndex: number }
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'SET_COLOR'; colorIndex: number }
  | { type: 'SET_PALETTE_COLOR'; colorIndex: number; color: string }
  | { type: 'SET_CAMERA_MODE'; mode: CameraMode }
  | { type: 'SET_CAMERA_VIEW'; view: CameraView }
  | { type: 'LOAD_PROJECT'; state: SerializedProject }
  | { type: 'NEW_PROJECT'; resolution: number }
  | { type: 'SET_PROJECT'; name?: string; voxelsPerUnit?: number; profile?: AssetProfile }
  | { type: 'ADD_BOX'; partId: string; size: Vector }
  | { type: 'MIRROR_NODE'; id: string; axis: 'x' | 'y' | 'z' }
  | { type: 'EDIT_VOXEL'; pieceId: string; index: number; occupied: boolean; colorIndex: number }
  | { type: 'SET_DRAFT_PART'; partId: string }
  | { type: 'ADD_PART'; part: Part }
  | {
      type: 'UPDATE_PART';
      partId: string;
      changes: Partial<
        Pick<
          Part,
          | 'name'
          | 'motion'
          | 'role'
          | 'energy'
          | 'exportEnabled'
          | 'rigRole'
          | 'teamColor'
          | 'poses'
        >
      >;
    }
  | { type: 'TRANSFORM'; id: string; transform: Transform; pivot?: boolean }
  | { type: 'SET_EXPORT'; id: string; enabled: boolean }
  | { type: 'REPARENT'; id: string; parentId: string | null }
  | { type: 'DELETE_NODE' | 'DUPLICATE_NODE'; id: string };
