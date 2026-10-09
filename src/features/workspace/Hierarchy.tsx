import { useMemo, useState } from 'react';
import Button from '../../components/ui/Button';
import { TextInput } from '../../components/ui/Fields';
import { descendants } from '../../domain/assembly/transforms';
import type { Part } from '../editor/state/types';
import type { WorkspaceProps } from './types';
import styles from './Workspace.module.css';
interface Props extends WorkspaceProps {
  selected: string[];
  select: (id: string, extend?: boolean) => void;
  hidden: Set<string>;
  locked: Set<string>;
  toggle: (kind: 'hidden' | 'locked', id: string) => void;
  add: (kind: 'part' | 'socket') => void;
  editPiece: (id: string) => void;
}
export default function Hierarchy({
  state,
  dispatch,
  selected,
  select,
  hidden,
  locked,
  toggle,
  add,
  editPiece
}: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(new Set<string>());
  function collapse(id: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const matches = useMemo(
    () =>
      new Set(
        [...state.parts, ...state.pieces]
          .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
          .map((p) => p.id)
      ),
    [state.parts, state.pieces, search]
  );
  function row(id: string, name: string, depth: number, kind: string, parentLocked: boolean) {
    return (
      <div
        key={id}
        className={`${styles.treeRow} ${selected.includes(id) ? styles.selected : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable={!parentLocked && !locked.has(id)}
        onDragStart={(event) => {
          event.dataTransfer.setData('application/x-voxel-node', id);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (parentLocked || locked.has(id)) return;
          const source = event.dataTransfer.getData('application/x-voxel-node');
          if (source && !locked.has(source))
            dispatch({
              type: 'REPARENT',
              id: source,
              parentId:
                state.parts.find((p) => p.id === id)?.kind === 'part'
                  ? id
                  : (state.pieces.find((p) => p.id === id)?.partId ?? null)
            });
        }}
      >
        {kind === 'Part' && (
          <Button
            className={styles.iconButton}
            aria-label={`${collapsed.has(id) ? 'Expand' : 'Collapse'} ${name}`}
            onPress={() => collapse(id)}
          >
            {collapsed.has(id) ? '▸' : '▾'}
          </Button>
        )}
        <Button
          className={styles.treeName}
          onPress={(event) => select(id, event.shiftKey)}
          onDoubleClick={() => {
            if (kind === 'Piece' && !parentLocked && !locked.has(id)) editPiece(id);
          }}
          aria-label={`Select ${name}`}
        >
          <span className={styles.nodeIcon}>
            {kind === 'Socket' ? '◇' : kind === 'Piece' ? '▪' : '▣'}
          </span>
          <span>{name}</span>
        </Button>
        <Button
          className={styles.iconButton}
          onPress={() => toggle('hidden', id)}
          aria-label={`${hidden.has(id) ? 'Show' : 'Hide'} ${name}`}
        >
          {hidden.has(id) ? '○' : '◉'}
        </Button>
        <Button
          className={styles.iconButton}
          onPress={() => toggle('locked', id)}
          aria-label={`${locked.has(id) ? 'Unlock' : 'Lock'} ${name}`}
        >
          {locked.has(id) ? '●' : '·'}
        </Button>
      </div>
    );
  }
  function branch(part: Part, depth: number, parentLocked = false): React.ReactNode {
    const children = state.parts.filter((p) => p.parentId === part.id),
      pieces = state.pieces.filter((p) => p.partId === part.id);
    if (
      search &&
      ![
        ...descendants(part.id, state.parts),
        ...state.pieces
          .filter((p) => descendants(part.id, state.parts).has(p.partId))
          .map((p) => p.id)
      ].some((id) => matches.has(id))
    )
      return null;
    const isLocked = parentLocked || locked.has(part.id);
    return (
      <div key={part.id}>
        {row(part.id, part.name, depth, part.kind === 'socket' ? 'Socket' : 'Part', parentLocked)}
        {(!collapsed.has(part.id) || Boolean(search)) &&
          pieces
            .filter((p) => !search || matches.has(p.id))
            .map((p) => row(p.id, p.name, depth + 1, 'Piece', isLocked))}
        {(!collapsed.has(part.id) || Boolean(search)) &&
          children.map((p) => branch(p, depth + 1, isLocked))}
      </div>
    );
  }
  return (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>
        <span>MODEL HIERARCHY</span>
        <span>{state.parts.length + state.pieces.length}</span>
      </div>
      <div className={styles.inset}>
        <TextInput label="Find a part or piece" value={search} onChange={setSearch} />
        <div className={styles.actions}>
          <Button onPress={() => add('part')}>+ Part</Button>
          <Button onPress={() => add('socket')}>+ Socket</Button>
        </div>
      </div>
      <div className={styles.tree}>
        {state.parts.filter((p) => !p.parentId).map((p) => branch(p, 0))}
      </div>
      <p className={styles.help}>
        Shift-click to select several. Drag onto a part to reparent. Double-click a piece to edit
        its shape.
      </p>
    </section>
  );
}
