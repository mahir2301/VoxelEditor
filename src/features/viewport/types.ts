import type { Dispatch, RefObject } from 'react';
import type { Group, Object3D } from 'three';
import type { EditorAction, EditorState } from '../editor/state/types';
import type { AssemblyTool, PreviewState } from '../workspace/types';
export interface ViewportProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  selected: string[];
  clearSelection?: () => void;
  select: (id: string, extend?: boolean) => void;
  hidden: Set<string>;
  locked: Set<string>;
  isolate?: Set<string> | null;
  tool: AssemblyTool;
  snap: number;
  focusToken: number;
  preview?: PreviewState;
  draft?: Uint8Array;
}
export interface SceneProps extends ViewportProps {
  objects: Map<string, Object3D>;
  root: RefObject<Group | null>;
}
