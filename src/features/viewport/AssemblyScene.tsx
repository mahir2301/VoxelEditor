import { GizmoHelper, GizmoViewport, OrbitControls, TransformControls } from '@react-three/drei';
import { useRef, useState, useLayoutEffect, useMemo, useEffect } from 'react';
import { MOUSE, Object3D } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { readCanvasTheme } from '../../theme/canvas';
import { buildVoxelGeometry } from '../../utils/voxelUtils';
import { PartGroup } from './PartGroup';
import type { SceneProps } from './types';
import { ViewportCamera } from './ViewportCamera';
const mouseButtons = { LEFT: undefined, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE };
export function AssemblyScene(props: SceneProps) {
  const theme = useMemo(readCanvasTheme, []);
  const controls = useRef<OrbitControlsImpl>(null),
    [object, setObject] = useState<Object3D | null>(null);
  const selectedId = props.selected.length === 1 ? props.selected[0] : null;
  useLayoutEffect(() => {
    setObject(selectedId ? (props.objects.get(selectedId) ?? null) : null);
  }, [
    selectedId,
    props.state.parts,
    props.state.pieces,
    props.hidden,
    props.isolate,
    props.objects
  ]);
  const gizmo =
    object &&
    !props.preview &&
    !props.draft &&
    !props.locked.has(selectedId!) &&
    ['move', 'rotate', 'pivot'].includes(props.tool);
  const draftGeometry = useMemo(
    () =>
      props.draft
        ? buildVoxelGeometry(props.draft, null, props.state.palette, props.state.resolution)
        : null,
    [props.draft, props.state.palette, props.state.resolution]
  );
  useEffect(() => () => draftGeometry?.dispose(), [draftGeometry]);
  return (
    <>
      <color attach="background" args={[theme.background]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[20, 30, 20]} intensity={2} />
      <directionalLight position={[-15, 10, -20]} intensity={0.7} />
      <gridHelper
        args={[
          props.state.resolution * 4,
          (props.state.resolution * 4) / props.state.voxelsPerUnit,
          theme.gridPrimary,
          theme.gridSecondary
        ]}
      />
      <group ref={props.root}>
        {props.draft ? (
          <mesh geometry={draftGeometry!}>
            <meshStandardMaterial color={theme.draft} roughness={0.8} />
          </mesh>
        ) : (
          props.state.parts
            .filter((p) => !p.parentId)
            .map((part) => <PartGroup key={part.id} part={part} props={props} />)
        )}
      </group>
      {props.preview && (
        <mesh
          position={[
            Math.sin((props.preview.yaw * Math.PI) / 180) * -24,
            8,
            Math.cos((props.preview.yaw * Math.PI) / 180) * -24
          ]}
        >
          <sphereGeometry args={[0.6, 12, 8]} />
          <meshBasicMaterial color="#f8c877" wireframe />
        </mesh>
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        mouseButtons={mouseButtons}
        minDistance={2}
        maxDistance={300}
        enableDamping
      />
      <ViewportCamera props={props} controls={controls} />
      {gizmo && (
        <TransformControls
          object={object}
          mode={props.tool === 'rotate' ? 'rotate' : 'translate'}
          space="local"
          translationSnap={props.snap || null}
          rotationSnap={props.snap ? Math.PI / 12 : null}
          onMouseDown={() => props.dispatch({ type: 'BEGIN_TRANSACTION' })}
          onMouseUp={() => props.dispatch({ type: 'END_TRANSACTION' })}
          onObjectChange={() => {
            if (!object || !selectedId) return;
            props.dispatch({
              type: 'TRANSFORM',
              id: selectedId,
              pivot: props.tool === 'pivot',
              transform: {
                position: object.position.toArray(),
                rotation: [object.rotation.x, object.rotation.y, object.rotation.z]
              }
            });
          }}
        />
      )}
      <GizmoHelper alignment="bottom-right" margin={[65, 65]}>
        <GizmoViewport axisColors={['#d97978', '#83d2ad', '#7baaca']} labelColor="white" />
      </GizmoHelper>
    </>
  );
}
