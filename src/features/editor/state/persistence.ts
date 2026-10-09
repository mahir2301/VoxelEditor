import { parseSerializedProject } from './projectSchema';
import { serializeState } from './serialization';
import type { ProjectDocument, SerializedProject } from './types';
const STORAGE_KEY = 'voxel-editor-autosave';
export function saveStateToStorage(state: ProjectDocument): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, project: serializeState(state) }));
}
export function loadStateFromStorage(): SerializedProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parseSerializedProject(
      parsed && typeof parsed === 'object' && Reflect.has(parsed, 'project')
        ? Reflect.get(parsed, 'project')
        : parsed
    );
  } catch {
    return null;
  }
}
