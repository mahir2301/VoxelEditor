import type { ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useEffect } from 'react';
import type { Dispatch } from 'react';
import type { Object3D } from 'three';
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
  powered
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
}) {
  const theme = useMemo(readCanvasTheme, []);
  const geometry = useMemo(
    () => buildVoxelGeometry(piece.voxels, piece.colors, state.palette, state.resolution),
    [piece.voxels, piece.colors, state.palette, state.resolution]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  function hit(event: ThreeEvent<PointerEvent>, begin: boolean) {
    if ((event.button !== 0 && begin) || (!begin && !(event.buttons & 1)) || locked) return;
    event.stopPropagation();
    if (tool === 'paint' || tool === 'paintFill') {
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
      onPointerDown={(e) => hit(e, true)}
      onPointerMove={(e) => hit(e, false)}
    >
      <meshStandardMaterial
        vertexColors
        color={energy && !powered ? '#62736f' : '#ffffff'}
        emissive={selected ? theme.selection : energy && powered ? '#51bb8c' : '#000000'}
        emissiveIntensity={selected ? 0.35 : 0.22}
        roughness={0.8}
      />
    </mesh>
  );
});
