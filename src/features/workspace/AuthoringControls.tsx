import { useState } from 'react';
import { Box3, Vector3 } from 'three';
import Button from '../../components/ui/Button';
import { NumberInput } from '../../components/ui/Fields';
import { matrixOf, transformOf, worldMatrix } from '../../domain/assembly/transforms';
import { descendants } from '../../domain/assembly/transforms';
import type { Part, Piece, Vector } from '../editor/state/types';
import type { WorkspaceProps } from './types';
import styles from './Workspace.module.css';
export default function AuthoringControls({
  state,
  dispatch,
  node
}: WorkspaceProps & { node: Part | Piece }) {
  const [size, setSize] = useState<Vector>([2, 4, 2]),
    [cell, setCell] = useState<Vector>([0, 0, 0]);
  const n = state.resolution,
    piece = 'voxels' in node ? node : null;
  function pivot(where: 'center' | 'top' | 'bottom') {
    if (!('kind' in node) || node.kind !== 'part') return;
    const ids = descendants(node.id, state.parts),
      bounds = new Box3();
    const parentInverse = worldMatrix(node.parentId, state.parts).invert();
    for (const p of state.pieces.filter((candidate) => ids.has(candidate.partId))) {
      const matrix = parentInverse.clone().multiply(worldMatrix(p.id, state.parts, state.pieces));
      for (let i = 0; i < p.voxels.length; i++)
        if (p.voxels[i]) {
          const center = new Vector3(
            (i % n) + 0.5 - n / 2,
            (Math.floor(i / n) % n) + 0.5 - n / 2,
            Math.floor(i / (n * n)) + 0.5 - n / 2
          );
          for (const x of [-0.5, 0.5])
            for (const y of [-0.5, 0.5])
              for (const z of [-0.5, 0.5])
                bounds.expandByPoint(
                  center
                    .clone()
                    .add(new Vector3(x, y, z))
                    .applyMatrix4(matrix)
                );
        }
    }
    if (bounds.isEmpty()) return;
    const position = bounds.getCenter(new Vector3());
    if (where !== 'center') position.y = where === 'top' ? bounds.max.y : bounds.min.y;
    const t = transformOf(matrixOf(node.transform));
    t.position = position.toArray();
    dispatch({ type: 'TRANSFORM', id: node.id, transform: t, pivot: true });
  }
  return (
    <>
      <div className={styles.actions}>
        {(['x', 'y', 'z'] as const).map((axis) => (
          <Button key={axis} onPress={() => dispatch({ type: 'MIRROR_NODE', id: node.id, axis })}>
            Mirror {axis.toUpperCase()}
          </Button>
        ))}
      </div>
      {'kind' in node && node.kind === 'part' && (
        <>
          <div className={styles.actions}>
            {(['bottom', 'center', 'top'] as const).map((where) => (
              <Button key={where} onPress={() => pivot(where)}>
                Pivot {where}
              </Button>
            ))}
          </div>
          <div className={styles.vector}>
            {size.map((v, a) => (
              <NumberInput
                key={'XYZ'[a]}
                label={`Size ${'XYZ'[a]}`}
                value={v}
                min={1}
                max={n}
                step={1}
                onChange={(value) =>
                  setSize((prev) => {
                    const next: Vector = [...prev];
                    next[a] = Math.round(value);
                    return next;
                  })
                }
              />
            ))}
          </div>
          <Button onPress={() => dispatch({ type: 'ADD_BOX', partId: node.id, size })}>
            Add box
          </Button>
        </>
      )}
      {piece && (
        <>
          <div className={styles.vector}>
            {cell.map((v, a) => (
              <NumberInput
                key={'XYZ'[a]}
                label={`Voxel ${'XYZ'[a]}`}
                value={v}
                min={0}
                max={n - 1}
                step={1}
                onChange={(value) =>
                  setCell((prev) => {
                    const next: Vector = [...prev];
                    next[a] = Math.round(value);
                    return next;
                  })
                }
              />
            ))}
          </div>
          <div className={styles.actions}>
            {[true, false].map((occupied) => (
              <Button
                key={String(occupied)}
                onPress={() =>
                  dispatch({
                    type: 'EDIT_VOXEL',
                    pieceId: piece.id,
                    index: cell[0] + cell[1] * n + cell[2] * n * n,
                    occupied,
                    colorIndex: state.selectedColor
                  })
                }
              >
                {occupied ? 'Set voxel' : 'Clear voxel'}
              </Button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
