import { parseSerializedProject } from './projectSchema';
import { serializeState } from './serialization';
import type { EditorState, SerializedProject } from './types';

const STORAGE_KEY = 'voxel-editor-autosave';
const STORAGE_VERSION = 1;

interface AutosaveEnvelope {
  version: number;
  project: SerializedProject;
}

function isAutosaveEnvelope(value: unknown): value is AutosaveEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const version = Reflect.get(value, 'version');
  const project = Reflect.get(value, 'project');
  return typeof version === 'number' && project != null;
}

export function saveStateToStorage(state: EditorState): void {
  const payload: AutosaveEnvelope = {
    version: STORAGE_VERSION,
    project: serializeState(state)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadStateFromStorage(): SerializedProject | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (isAutosaveEnvelope(parsed)) {
      return parseSerializedProject(parsed.project);
    }
    return parseSerializedProject(parsed);
  } catch {
    return null;
  }
}
