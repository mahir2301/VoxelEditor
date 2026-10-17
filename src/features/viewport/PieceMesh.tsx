import type { ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useEffect } from 'react';
import type { Dispatch } from 'react';
import { Vector3, type Object3D } from 'three';
import { readCanvasTheme } from '../../theme/canvas';
import { buildVoxelGeometry } from '../../utils/voxelUtils';
import type { Piece, EditorState, EditorAction } from '../editor/state/types';
import type { AssemblyTool } from '../workspace/types';
import type { ViewportProps } from './types';
export const PieceMesh = memo(function PieceMesh({
  piece,
  state,
  selected,
  locked,
  dispatch,
  select,
  tool,
  objects,
  energy,
  powered,
  teamColor,
  hit
}: {
  piece: Piece;
  state: EditorState;
  selected: boolean;
  locked: boolean;
  dispatch: Dispatch<EditorAction>;
  select: ViewportProps['select'];
  tool: AssemblyTool;
  objects: Map<string, Object3D>;
  energy: boolean;
  powered: boolean;
  teamColor: boolean;
  hit: boolean;
}) {
  const theme = useMemo(readCanvasTheme, []);
  const geometry = useMemo(
    () => buildVoxelGeometry(piece.voxels, piece.colors, state.palette, state.resolution),
    [piece.voxels, piece.colors, state.palette, state.resolution]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  function editHit(event: ThreeEvent<PointerEvent>, begin: boolean) {
    if ((event.button !== 0 && begin) || (!begin && !(event.buttons & 1)) || locked) return;
    event.stopPropagation();
    if (tool === 'voxelAdd' || tool === 'voxelErase') {
      if (begin) dispatch({ type: 'BEGIN_TRANSACTION' });
      const index = geometry.userData.triangleVoxels[event.faceIndex ?? -1];
      if (index === undefined) return;
      const n = state.resolution,
        xyz = [index % n, Math.floor(index / n) % n, Math.floor(index / (n * n))];
      if (tool === 'voxelAdd') {
        const normal = event.face?.normal ?? new Vector3();
        xyz[0] += Math.round(normal.x);
        xyz[1] += Math.round(normal.y);
        xyz[2] += Math.round(normal.z);
      }
      if (xyz.every((v) => v >= 0 && v < n))
        dispatch({
          type: 'EDIT_VOXEL',
          pieceId: piece.id,
          index: xyz[0] + xyz[1] * n + xyz[2] * n * n,
          occupied: tool === 'voxelAdd',
          colorIndex: state.selectedColor
        });
    } else if (tool === 'paint' || tool === 'paintFill') {
      if (begin) dispatch({ type: 'BEGIN_TRANSACTION' });
      const index = geometry.userData.triangleVoxels[event.faceIndex ?? -1];
      if (index !== undefined)
        dispatch({
          type: tool === 'paint' ? 'PAINT_VOXEL' : 'FILL_PAINT_VOXEL',
          pieceId: piece.id,
          index,
          colorIndex: state.selectedColor
        });
    } else if (begin && tool === 'select') select(piece.id, event.shiftKey);
  }
  return (
    <mesh
      ref={(node) => {
        if (node) objects.set(piece.id, node);
        else objects.delete(piece.id);
      }}
      geometry={geometry}
      position={piece.transform.position}
      rotation={piece.transform.rotation}
      onPointerDown={(e) => editHit(e, true)}
      onPointerMove={(e) => editHit(e, false)}
    >
      <meshStandardMaterial
        vertexColors={!teamColor}
        color={hit ? '#fff6d7' : teamColor ? '#e5a846' : energy && !powered ? '#62736f' : '#ffffff'}
        emissive={selected ? theme.selection : energy && powered ? '#51bb8c' : '#000000'}
        emissiveIntensity={selected ? 0.35 : 0.22}
        roughness={0.8}
      />
    </mesh>
  );
});
