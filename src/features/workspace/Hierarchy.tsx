import { useMemo, useState } from 'react';
import { Tree, TreeItem, TreeItemContent, useDragAndDrop } from 'react-aria-components';
import type { Key } from 'react-aria-components';
import Button from '../../components/ui/Button';
import { TextInput } from '../../components/ui/Fields';
import Icon from '../../components/ui/Icon';
import { descendants } from '../../domain/assembly/transforms';
import type { Part, Piece } from '../editor/state/types';
import type { WorkspaceProps } from './types';
import styles from './Workspace.module.css';
interface Props extends WorkspaceProps {
  selected: string[];
  setSelection: (ids: string[]) => void;
  select: (id: string, extend?: boolean) => void;
  hidden: Set<string>;
  locked: Set<string>;
  toggle: (kind: 'hidden' | 'locked', id: string) => void;
  add: (kind: 'part' | 'socket') => void;
  editPiece: (id: string) => void;
}
const nodeType = 'application/x-voxel-node';
export default function Hierarchy({
  state,
  dispatch,
  selected,
  setSelection,
  select,
  hidden,
  locked,
  toggle,
  add,
  editPiece
}: Props) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<Key>>(
    () => new Set(state.parts.map((part) => part.id))
  );
  const nodes = useMemo(() => [...state.parts, ...state.pieces], [state.parts, state.pieces]);
  const effectiveLocks = useMemo(() => {
    const result = new Set(locked);
    for (const id of locked) {
      const children = descendants(id, state.parts);
      for (const child of children) result.add(child);
      for (const piece of state.pieces) if (children.has(piece.partId)) result.add(piece.id);
    }
    return result;
  }, [locked, state.parts, state.pieces]);
  const matches = useMemo(() => {
    const result = new Set<string>();
    for (const node of nodes) {
      if (!node.name.toLowerCase().includes(search.toLowerCase())) continue;
      result.add(node.id);
      let parent = 'parentId' in node ? node.parentId : node.partId;
      while (parent) {
        result.add(parent);
        parent = state.parts.find((part) => part.id === parent)?.parentId ?? null;
      }
    }
    return result;
  }, [search, nodes, state.parts]);
  function topLevel(ids: string[]) {
    return ids.filter(
      (id) =>
        !ids.some(
          (other) =>
            other !== id &&
            (descendants(other, state.parts).has(id) ||
              state.pieces.some(
                (piece) => piece.id === id && descendants(other, state.parts).has(piece.partId)
              ))
        )
    );
  }
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) =>
      topLevel([...keys].map(String).filter((id) => !effectiveLocks.has(id))).map((id) => ({
        [nodeType]: id,
        'text/plain': nodes.find((node) => node.id === id)?.name ?? id
      })),
    acceptedDragTypes: [nodeType],
    getAllowedDropOperations: () => ['move'],
    shouldAcceptItemDrop: (target) =>
      target.dropPosition === 'on' &&
      !effectiveLocks.has(String(target.key)) &&
      state.parts.some((part) => part.id === target.key && part.kind === 'part'),
    onItemDrop: async (event) => {
      const ids = await Promise.all(
        event.items.flatMap((item) =>
          item.kind === 'text' && item.types.has(nodeType) ? [item.getText(nodeType)] : []
        )
      );
      const parentId = String(event.target.key);
      if (effectiveLocks.has(parentId)) return;
      dispatch({ type: 'BEGIN_TRANSACTION' });
      for (const id of topLevel(ids))
        if (!effectiveLocks.has(id)) dispatch({ type: 'REPARENT', id, parentId });
      dispatch({ type: 'END_TRANSACTION' });
    }
  });
  function renderNode(node: Part | Piece): React.ReactNode {
    if (search && !matches.has(node.id)) return null;
    const part = 'kind' in node ? node : null;
    const isLocked = effectiveLocks.has(node.id);
    return (
      <TreeItem
        key={node.id}
        id={node.id}
        textValue={node.name}
        className={`${styles.treeRow} ${hidden.has(node.id) ? styles.hiddenNode : ''}`}
        onDoubleClick={() => {
          if (!part && !isLocked) {
            select(node.id);
            editPiece(node.id);
          }
        }}
      >
        <TreeItemContent>
          {({ hasChildItems, isExpanded }) => (
            <>
              <Button
                slot="chevron"
                variant="quiet"
                className={`${styles.iconButton} ${styles.chevron}`}
                isDisabled={!hasChildItems}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <Icon name="chevron" size={12} />
              </Button>
              <span className={styles.nodeIcon}>
                <Icon
                  name={part?.kind === 'socket' ? 'socket' : part ? 'part' : 'cube'}
                  size={15}
                />
              </span>
              <span className={styles.treeLabel}>{node.name}</span>
              {isLocked && (
                <span className={styles.nodeState}>
                  <Icon name="lock" size={11} />
                </span>
              )}
              <span className={styles.rowActions}>
                {!part && (
                  <Button
                    variant="quiet"
                    className={styles.iconButton}
                    isDisabled={isLocked}
                    aria-label={`Edit shape ${node.name}`}
                    tooltip="Edit projection shape"
                    onPress={() => {
                      select(node.id);
                      editPiece(node.id);
                    }}
                  >
                    <Icon name="paint" size={13} />
                  </Button>
                )}
                <Button
                  slot="drag"
                  variant="quiet"
                  className={styles.iconButton}
                  isDisabled={isLocked}
                  aria-label={`Move ${node.name}`}
                  tooltip="Drag to a rigid part · Enter for keyboard drag"
                >
                  <Icon name="grip" size={12} />
                </Button>
                <Button
                  variant="quiet"
                  className={styles.iconButton}
                  onPress={() => toggle('hidden', node.id)}
                  aria-label={`${hidden.has(node.id) ? 'Show' : 'Hide'} ${node.name}`}
                  tooltip={hidden.has(node.id) ? 'Show in editor' : 'Hide in editor'}
                >
                  <Icon name={hidden.has(node.id) ? 'eyeOff' : 'eye'} size={13} />
                </Button>
                <Button
                  variant="quiet"
                  className={styles.iconButton}
                  onPress={() => toggle('locked', node.id)}
                  aria-label={`${locked.has(node.id) ? 'Unlock' : 'Lock'} ${node.name}`}
                  tooltip={locked.has(node.id) ? 'Unlock' : isLocked ? 'Locked by parent' : 'Lock'}
                >
                  <Icon name={isLocked ? 'lock' : 'unlock'} size={12} />
                </Button>
              </span>
            </>
          )}
        </TreeItemContent>
        {part &&
          state.pieces
            .filter((piece) => piece.partId === part.id)
            .map((piece) => renderNode(piece))}
        {part &&
          state.parts
            .filter((child) => child.parentId === part.id)
            .map((child) => renderNode(child))}
      </TreeItem>
    );
  }
  return (
    <section className={styles.panel} aria-label="Model hierarchy">
      <div className={styles.panelTitle}>
        <span>MODEL HIERARCHY</span>
        <span>{nodes.length}</span>
      </div>
      <div className={styles.inset}>
        <TextInput label="Find a part or piece" value={search} onChange={setSearch} />
        <div className={styles.actions}>
          <Button onPress={() => add('part')}>
            <Icon name="plus" size={14} />
            Part
          </Button>
          <Button onPress={() => add('socket')}>
            <Icon name="plus" size={14} />
            Socket
          </Button>
        </div>
      </div>
      <Tree
        aria-label="Model hierarchy"
        key={state.parts[0]?.id}
        className={styles.tree}
        selectionMode="multiple"
        selectionBehavior="replace"
        selectedKeys={selected}
        onSelectionChange={(keys) =>
          setSelection(keys === 'all' ? nodes.map((node) => node.id) : [...keys].map(String))
        }
        expandedKeys={search ? new Set(state.parts.map((part) => part.id)) : expanded}
        onExpandedChange={setExpanded}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => <p className={styles.help}>No matching parts or pieces.</p>}
      >
        {state.parts.filter((part) => !part.parentId).map((part) => renderNode(part))}
      </Tree>
      <p className={styles.help}>
        Shift-click to select a range. Drag onto a rigid part to reparent. Double-click a piece to
        edit its shape.
      </p>
    </section>
  );
}
