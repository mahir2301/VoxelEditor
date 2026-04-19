import { serializeState } from '../../../utils/exportGLB';
import { parseSerializedProject } from './projectSchema';
import type { EditorState, SerializedProject } from './types';

const STORAGE_KEY = 'voxel-editor-autosave';

export function saveStateToStorage(state: EditorState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState(state)));
}

export function loadStateFromStorage(): SerializedProject | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return parseSerializedProject(JSON.parse(raw));
  } catch {
    return null;
  }
}
