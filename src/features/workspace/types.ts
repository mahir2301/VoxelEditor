import type { Dispatch } from 'react';
import type { EditorAction, EditorState } from '../editor/state/types';
export type WorkspaceMode = 'shape' | 'assemble' | 'preview';
export type AssemblyTool = 'select' | 'move' | 'rotate' | 'pivot' | 'paint' | 'paintFill';
export interface PreviewState {
  yaw: number;
  pitch: number;
  playing: boolean;
  powered: boolean;
  shot: number;
  quarter: number;
  reset: number;
}
export interface WorkspaceProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}
