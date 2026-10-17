import { useMemo, useState } from 'react';
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components';
import ColorPalette from '../../components/ColorPalette';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Disclosure from '../../components/ui/Disclosure';
import { Choice } from '../../components/ui/Fields';
import Icon from '../../components/ui/Icon';
import { diagnostics } from '../../domain/assembly/diagnostics';
import { newPart } from '../../domain/assembly/model';
import { descendants } from '../../domain/assembly/transforms';
import AssemblyViewport from '../viewport/AssemblyViewport';
import Hierarchy from './Hierarchy';
import Inspector from './Inspector';
import PreviewControls, { restPreview } from './PreviewControls';
import ShapeWorkspace from './ShapeWorkspace';
import type { AssemblyTool, WorkspaceMode, WorkspaceProps } from './types';
import { useWorkspaceShortcuts } from './useWorkspaceShortcuts';
import styles from './Workspace.module.css';
interface Props extends WorkspaceProps {
  template: (kind: 'rapid' | 'frost' | 'beam') => void;
}
export default function Workspace({ state, dispatch, template }: Props) {
  const [mode, setMode] = useState<WorkspaceMode>('assemble'),
    [tool, setTool] = useState<AssemblyTool>('select'),
    [selected, setSelected] = useState<string[]>([]),
    [hidden, setHidden] = useState(new Set<string>()),
    [locks, setLocks] = useState(new Set<string>()),
    [isolated, setIsolated] = useState(false),
    [snap, setSnap] = useState(1),
    [focus, setFocus] = useState(0),
    [preview, setPreview] = useState(restPreview),
    [pendingPiece, setPendingPiece] = useState<string | null>(null),
    [pendingTemplate, setPendingTemplate] = useState<'rapid' | 'frost' | 'beam' | null>(null);
  const { parts, pieces, frontGrid, sideGrid, topGrid, resolution } = state;
  const selection = useMemo(() => {
    const ids = new Set([...parts, ...pieces].map((p) => p.id));
    return selected.filter((id) => ids.has(id));
  }, [selected, parts, pieces]);
  const topSelection = selection.filter((id) => {
    let parent =
      parts.find((part) => part.id === id)?.parentId ??
      pieces.find((piece) => piece.id === id)?.partId;
    while (parent) {
      if (selection.includes(parent)) return false;
      parent = parts.find((part) => part.id === parent)?.parentId ?? undefined;
    }
    return true;
  });
  const locked = useMemo(() => {
    const set = new Set(locks);
    for (const id of locks) {
      const children = descendants(id, state.parts);
      for (const child of children) set.add(child);
      for (const piece of state.pieces) if (children.has(piece.partId)) set.add(piece.id);
    }
    return set;
  }, [locks, state.parts, state.pieces]);
  const isolate = useMemo(() => {
    if (!isolated) return null;
    const set = new Set<string>();
    for (const id of selection) {
      const children = descendants(id, state.parts);
      for (const child of children) set.add(child);
      for (const piece of state.pieces) if (children.has(piece.partId)) set.add(piece.id);
      let parent =
        state.parts.find((p) => p.id === id)?.parentId ??
        state.pieces.find((p) => p.id === id)?.partId;
      while (parent) {
        set.add(parent);
        parent = state.parts.find((p) => p.id === parent)?.parentId ?? undefined;
      }
    }
    return set;
  }, [isolated, selection, state.parts, state.pieces]);
  const messages = useMemo(
    () => diagnostics({ parts, pieces, frontGrid, sideGrid, topGrid, resolution }),
    [parts, pieces, frontGrid, sideGrid, topGrid, resolution]
  );
  function select(id: string, extend = false) {
    setSelected((prev) =>
      extend ? (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]) : [id]
    );
  }
  function toggle(kind: 'hidden' | 'locked', id: string) {
    const setter = kind === 'hidden' ? setHidden : setLocks;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function add(kind: 'part' | 'socket') {
    const selectedPart = state.parts.find((p) => p.id === selection[0]);
    const parent =
      selectedPart?.kind === 'part'
        ? selectedPart.id
        : (state.pieces.find((p) => p.id === selection[0])?.partId ?? null);
    if (parent && locked.has(parent)) return;
    const part = newPart(kind === 'socket' ? 'Socket' : 'Part', parent, kind);
    dispatch({ type: 'ADD_PART', part });
    select(part.id);
  }
  function editPiece(id: string) {
    if (locked.has(id)) return;
    if (
      state.frontGrid.some(Boolean) ||
      state.sideGrid.some(Boolean) ||
      state.topGrid.some(Boolean)
    ) {
      setPendingPiece(id);
      return;
    }
    dispatch({ type: 'LOAD_PIECE_FOR_EDITING', pieceId: id });
    setMode('shape');
  }
  function group() {
    const part = newPart('Group');
    dispatch({ type: 'BEGIN_TRANSACTION' });
    dispatch({ type: 'ADD_PART', part });
    for (const id of topSelection)
      if (!locked.has(id)) dispatch({ type: 'REPARENT', id, parentId: part.id });
    dispatch({ type: 'END_TRANSACTION' });
    select(part.id);
  }
  function nodesAction(type: 'DELETE_NODE' | 'DUPLICATE_NODE') {
    dispatch({ type: 'BEGIN_TRANSACTION' });
    for (const id of topSelection) if (!locked.has(id)) dispatch({ type, id });
    dispatch({ type: 'END_TRANSACTION' });
  }
  useWorkspaceShortcuts({
    v: () => setTool('select'),
    g: () => setTool('move'),
    r: () => setTool('rotate'),
    b: () => setTool('pivot'),
    p: () => setTool('paint'),
    'shift+p': () => setTool('paintFill'),
    f: () => setFocus((v) => v + 1),
    d: () => dispatch({ type: 'SET_TOOL', tool: 'draw' }),
    e: () => dispatch({ type: 'SET_TOOL', tool: 'erase' }),
    'shift+d': () => dispatch({ type: 'SET_TOOL', tool: 'fill' }),
    'shift+e': () => dispatch({ type: 'SET_TOOL', tool: 'fillErase' }),
    'mod+enter': () => dispatch({ type: state.editingPieceId ? 'FINISH_EDITING' : 'PUSH_PIECE' }),
    escape: () => {
      dispatch({ type: 'CANCEL_TRANSACTION' });
      setTool('select');
      setPreview(restPreview());
    },
    'mod+d': () => nodesAction('DUPLICATE_NODE'),
    delete: () => nodesAction('DELETE_NODE')
  });
  return (
    <div className={styles.workspace}>
      <Tabs
        className={styles.workspace}
        selectedKey={mode}
        onSelectionChange={(key) => {
          if (key === 'shape' || key === 'assemble' || key === 'preview') {
            setMode(key);
            setPreview(restPreview());
          }
        }}
      >
        <div className={styles.modebar}>
          <TabList aria-label="Workspace mode" className={styles.tabs}>
            {(['shape', 'assemble', 'preview'] as const).map((value) => (
              <Tab key={value} id={value} className={styles.tab}>
                <Icon name={value === 'shape' ? 'shape' : value === 'assemble' ? 'cube' : 'play'} />
                {value[0].toUpperCase() + value.slice(1)}
              </Tab>
            ))}
          </TabList>
          <div className={styles.actions}>
            {(['rapid', 'frost', 'beam'] as const).map((kind) => (
              <Button key={kind} onPress={() => setPendingTemplate(kind)}>
                {kind[0].toUpperCase() + kind.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <TabPanel key={mode} id={mode} className={styles.layout}>
          <aside className={styles.sidebar}>
            <Hierarchy
              key={state.parts[0]?.id}
              state={state}
              dispatch={dispatch}
              selected={selection}
              setSelection={setSelected}
              select={select}
              hidden={hidden}
              locked={locks}
              toggle={toggle}
              add={add}
              editPiece={editPiece}
            />
            <div className={styles.actions}>
              <Button
                isDisabled={!selection.length || selection.some((id) => locked.has(id))}
                onPress={group}
              >
                Group
              </Button>
              <Button
                isActive={isolated}
                isDisabled={!selection.length && !isolated}
                onPress={() => setIsolated((v) => !v)}
              >
                Isolate
              </Button>
              <Button
                onPress={() => {
                  setHidden(new Set());
                  setIsolated(false);
                }}
              >
                Show all
              </Button>
            </div>
            <Disclosure title="Palette">
              <ColorPalette
                palette={state.palette}
                selectedColor={state.selectedColor}
                onColorSelect={(colorIndex) => dispatch({ type: 'SET_COLOR', colorIndex })}
                onColorChange={(colorIndex, color) =>
                  dispatch({ type: 'SET_PALETTE_COLOR', colorIndex, color })
                }
              />
            </Disclosure>
          </aside>
          <main className={styles.main}>
            {mode === 'shape' ? (
              <>
                <div className={styles.tools}>
                  {(['draw', 'erase', 'fill', 'fillErase'] as const).map((value) => (
                    <Button
                      key={value}
                      isActive={state.tool === value}
                      onPress={() => dispatch({ type: 'SET_TOOL', tool: value })}
                    >
                      <Icon
                        name={value === 'draw' ? 'paint' : value === 'erase' ? 'erase' : 'fill'}
                      />
                      {value === 'fillErase'
                        ? 'Fill erase'
                        : value[0].toUpperCase() + value.slice(1)}
                    </Button>
                  ))}
                  <Button onPress={() => dispatch({ type: 'COPY_FRONT_TO_SIDE' })}>
                    Front → Side
                  </Button>
                </div>
                <ShapeWorkspace state={state} dispatch={dispatch} />
              </>
            ) : (
              <>
                <div className={styles.tools}>
                  {mode === 'assemble' &&
                    (['select', 'move', 'rotate', 'pivot', 'paint', 'paintFill'] as const).map(
                      (value) => (
                        <Button
                          key={value}
                          isActive={tool === value}
                          onPress={() => setTool(value)}
                        >
                          <Icon name={value === 'paintFill' ? 'fill' : value} />
                          {value === 'paintFill'
                            ? 'Paint fill'
                            : value[0].toUpperCase() + value.slice(1)}
                        </Button>
                      )
                    )}
                  <Button onPress={() => setFocus((v) => v + 1)}>
                    <Icon name="focus" />
                    Focus
                  </Button>
                  <Choice
                    label="Snap"
                    value={String(snap)}
                    options={[
                      { id: '1', label: '1 voxel' },
                      { id: '0.5', label: '½ voxel' },
                      { id: '0', label: 'Free' }
                    ]}
                    onChange={(value) => setSnap(Number(value))}
                  />
                  <Button
                    isActive={state.cameraMode === 'isometric'}
                    onPress={() =>
                      dispatch({
                        type: 'SET_CAMERA_MODE',
                        mode: state.cameraMode === 'isometric' ? 'perspective' : 'isometric'
                      })
                    }
                  >
                    Isometric
                  </Button>
                </div>
                <AssemblyViewport
                  state={state}
                  dispatch={dispatch}
                  selected={selection}
                  select={select}
                  clearSelection={() => setSelected([])}
                  hidden={hidden}
                  locked={locked}
                  isolate={isolate}
                  tool={tool}
                  snap={snap}
                  focusToken={focus}
                  preview={mode === 'preview' ? preview : undefined}
                />
              </>
            )}
          </main>
          <aside className={styles.sidebar}>
            {mode === 'preview' ? (
              <PreviewControls
                preview={preview}
                change={(changes) => setPreview((prev) => ({ ...prev, ...changes }))}
              />
            ) : (
              <Inspector
                state={state}
                dispatch={dispatch}
                id={selection.length === 1 ? selection[0] : null}
                disabled={mode === 'shape' || selection.some((id) => locked.has(id))}
                pivot={tool === 'pivot'}
                editPiece={editPiece}
              />
            )}
            {messages.length > 0 && (
              <Disclosure title={`Model checks · ${messages.length}`}>
                <div className={styles.diagnostics}>
                  {messages.map((message) => (
                    <p key={message}>
                      <Icon name="warning" size={14} />
                      {message}
                    </p>
                  ))}
                </div>
              </Disclosure>
            )}
          </aside>
        </TabPanel>
      </Tabs>
      <ConfirmDialog
        isOpen={Boolean(pendingPiece)}
        title="Replace current draft?"
        description="The current projection draft will be replaced."
        cancelLabel="Keep draft"
        confirmLabel="Replace draft"
        onCancel={() => setPendingPiece(null)}
        onConfirm={() => {
          dispatch({ type: 'LOAD_PIECE_FOR_EDITING', pieceId: pendingPiece! });
          setPendingPiece(null);
          setMode('shape');
        }}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingTemplate)}
        title="Open tower starter?"
        description="This replaces the current project."
        cancelLabel="Cancel"
        confirmLabel="Open starter"
        onCancel={() => setPendingTemplate(null)}
        onConfirm={() => {
          template(pendingTemplate!);
          setPendingTemplate(null);
          setSelected([]);
          setHidden(new Set());
          setLocks(new Set());
          setIsolated(false);
          setPreview(restPreview());
          setMode('assemble');
        }}
      />
    </div>
  );
}
