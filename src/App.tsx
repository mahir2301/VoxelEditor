import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import LandingScreen from './components/LandingScreen';
import ConfirmDialog from './components/ui/ConfirmDialog';
import Icon from './components/ui/Icon';
import { towerTemplate } from './domain/assembly/templates';
import { getInitialState } from './features/editor/state/document';
import { loadStateFromStorage } from './features/editor/state/persistence';
import { parseSerializedProjectOrThrow } from './features/editor/state/projectSchema';
import { serializeState } from './features/editor/state/serialization';
import type { EditorSnapshot, SerializedProject } from './features/editor/state/types';
import ProjectToolbar from './features/workspace/ProjectToolbar';
import { useWorkspaceShortcuts } from './features/workspace/useWorkspaceShortcuts';
const Workspace = lazy(() => import('./features/workspace/Workspace'));
const loadingWorkspace = (
  <div className={styles.loading} role="status">
    <Icon name="cube" size={28} />
    Loading workspace…
  </div>
);
import { exportPresentation, exportProject } from './features/export/projectFiles';
import { useVoxelState } from './hooks/useVoxelState';
import styles from './App.module.css';
export default function App() {
  const [active, setActive] = useState(false),
    [resolution, setResolution] = useState(16),
    [hasAutosave, setHasAutosave] = useState(() => Boolean(loadStateFromStorage())),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [leaving, setLeaving] = useState(false),
    [saved, setSaved] = useState<EditorSnapshot | null>(null);
  const cleanAfterLoad = useRef(false);
  const { state, dispatch, document, autosaveError, canUndo, canRedo } = useVoxelState(active);
  useEffect(() => {
    if (cleanAfterLoad.current) {
      setSaved(document);
      cleanAfterLoad.current = false;
    }
  }, [document]);
  const dirty =
    !saved ||
    Object.keys(document).some((key) => Reflect.get(saved, key) !== Reflect.get(document, key));
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (active && dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active, dirty]);
  function open(project: SerializedProject) {
    cleanAfterLoad.current = true;
    dispatch({ type: 'LOAD_PROJECT', state: project });
    setActive(true);
  }
  function save() {
    try {
      exportProject(serializeState(state));
      setSaved(document);
    } catch (e) {
      setError(String(e));
    }
  }
  function assertExport() {
    parseSerializedProjectOrThrow(serializeState(state));
    if (
      state.frontGrid.some(Boolean) ||
      state.sideGrid.some(Boolean) ||
      state.topGrid.some(Boolean)
    )
      throw new Error('Apply or cancel the shape draft before exporting.');
    if (!state.pieces.some((p) => p.voxels.some(Boolean)))
      throw new Error('Add geometry before exporting.');
  }
  async function exportGlb() {
    if (busy) return;
    setBusy(true);
    try {
      assertExport();
      const { exportModelAsGLB } = await import('./utils/exportGLB');
      await exportModelAsGLB(document);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function exportBindings() {
    try {
      assertExport();
      exportPresentation(document);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  function back() {
    if (dirty) {
      setLeaving(true);
      return;
    }
    setActive(false);
    setHasAutosave(Boolean(loadStateFromStorage()));
  }
  useWorkspaceShortcuts(
    active
      ? {
          'mod+s': save,
          'mod+e': () => {
            void exportGlb();
          },
          'mod+z': () => dispatch({ type: 'UNDO' }),
          'mod+shift+z': () => dispatch({ type: 'REDO' }),
          'shift+escape': back
        }
      : {}
  );
  if (!active)
    return (
      <LandingScreen
        resolution={resolution}
        hasAutosave={hasAutosave}
        onResolutionChange={setResolution}
        onCreateProject={() => {
          cleanAfterLoad.current = true;
          dispatch({ type: 'NEW_PROJECT', resolution });
          setActive(true);
        }}
        onLoadProject={open}
        onLoadAutosave={() => {
          const project = loadStateFromStorage();
          if (project) open(project);
          else setHasAutosave(false);
        }}
      />
    );
  return (
    <div className={styles.app}>
      <ProjectToolbar
        name={state.name}
        dirty={dirty}
        canUndo={canUndo}
        canRedo={canRedo}
        busy={busy}
        undo={() => dispatch({ type: 'UNDO' })}
        redo={() => dispatch({ type: 'REDO' })}
        save={save}
        exportGlb={() => {
          void exportGlb();
        }}
        exportMetadata={exportBindings}
        back={back}
      />
      <Suspense fallback={loadingWorkspace}>
        <Workspace
          state={state}
          dispatch={dispatch}
          template={(kind) =>
            dispatch({
              type: 'LOAD_PROJECT',
              state: serializeState({ ...getInitialState(), ...towerTemplate(kind) })
            })
          }
        />
      </Suspense>
      {autosaveError && (
        <div className={styles.notice} role="status">
          {autosaveError}
        </div>
      )}
      <ConfirmDialog
        isOpen={Boolean(error)}
        title="Operation failed"
        description={error ?? ''}
        cancelLabel="Close"
        onCancel={() => setError(null)}
      />
      <ConfirmDialog
        isOpen={leaving}
        title="Leave project?"
        description="This project has unsaved changes."
        cancelLabel="Stay"
        confirmLabel="Leave"
        onCancel={() => setLeaving(false)}
        onConfirm={() => {
          setLeaving(false);
          setActive(false);
          setHasAutosave(Boolean(loadStateFromStorage()));
        }}
      />
    </div>
  );
}
