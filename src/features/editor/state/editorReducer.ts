import { assemblyReducer } from './assemblyReducer';
import { getInitialState, hydrate } from './document';
import { draftReducer } from './draftReducer';
import { applySnapshot, createSnapshot, recordHistory } from './history';
import type { EditorAction, EditorState } from './types';
export { getInitialState } from './document';
export const DEFAULT_RESOLUTION = 16;
export function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'NEW_PROJECT':
      return getInitialState(action.resolution);
    case 'LOAD_PROJECT':
      return { ...getInitialState(action.state.resolution), ...hydrate(action.state) };
    case 'SET_TOOL':
      return { ...state, tool: action.tool };
    case 'SET_COLOR':
      return { ...state, selectedColor: action.colorIndex };
    case 'SET_CAMERA_MODE':
      return { ...state, cameraMode: action.mode };
    case 'SET_CAMERA_VIEW':
      return { ...state, cameraView: action.view };
    case 'BEGIN_TRANSACTION':
      return state.transaction ? state : { ...state, transaction: createSnapshot(state) };
    case 'END_TRANSACTION': {
      if (!state.transaction) return state;
      const previous = { ...state, ...state.transaction, transaction: null },
        next = { ...state, transaction: null };
      return Object.keys(state.transaction).every(
        (key) => Reflect.get(state.transaction!, key) === Reflect.get(state, key)
      )
        ? next
        : recordHistory(previous, next);
    }
    case 'CANCEL_TRANSACTION':
      return state.transaction
        ? { ...applySnapshot(state, state.transaction), transaction: null }
        : state;
    case 'UNDO':
    case 'REDO': {
      if (state.transaction) return reducer(reducer(state, { type: 'END_TRANSACTION' }), action);
      const index = state.historyIndex + (action.type === 'UNDO' ? -1 : 1);
      return index < 0 || index >= state.history.length
        ? state
        : { ...applySnapshot(state, state.history[index]), historyIndex: index };
    }
    default: {
      const document = assemblyReducer(draftReducer(state, action), action);
      if (document === state) return state;
      const next = { ...state, ...document };
      return state.transaction ? next : recordHistory(state, next);
    }
  }
}
