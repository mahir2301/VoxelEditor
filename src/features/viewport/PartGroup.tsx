import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Group, Vector3 } from 'three';
import { previewTransform } from '../../domain/assembly/motion';
import { rigTransform } from '../../domain/assembly/rig';
import { useCanvasTheme } from '../../theme/useCanvasTheme';
import type { Part } from '../editor/state/types';
import { PieceMesh } from './PieceMesh';
import type { SceneProps } from './types';
const socketDirection = new Vector3(0, 0, -1);
export function PartGroup({
  part,
  props,
  inheritedLock = false,
  inheritedEnergy = false
}: {
  part: Part;
  props: SceneProps;
  inheritedLock?: boolean;
  inheritedEnergy?: boolean;
}) {
  const theme = useCanvasTheme();
  const ref = useRef<Group>(null),
    fire = useRef(-Infinity),
    elapsed = useRef(0),
    motionTime = useRef(0),
    shot = useRef(0),
    speed = useRef(0),
    stride = useRef(0);
  const { state, hidden, locked, isolate, objects, preview } = props;
  const energy = inheritedEnergy || part.energy,
    isLocked = inheritedLock || locked.has(part.id);
  useFrame((_, delta) => {
    if (!preview || !ref.current) return;
    if (shot.current !== preview.shot) {
      fire.current = elapsed.current;
      shot.current = preview.shot;
    }
    elapsed.current += delta;
    if (preview.playing && preview.powered) motionTime.current += delta;
    const age = preview.shot ? elapsed.current - fire.current : Infinity;
    if (preview.playing) {
      speed.current +=
        ((preview.knockedOut ? 0 : preview.speed) - speed.current) * (1 - Math.exp(-20 * delta));
      stride.current += delta * speed.current * 5;
    }
    const transform =
      state.profile === 'player'
        ? rigTransform(part, {
            seconds: motionTime.current,
            stride: stride.current,
            speed: speed.current,
            pitch: preview.pitch,
            fire: age < 0.16 ? 1 - age / 0.16 : 0,
            knockedOut: preview.knockedOut,
            handPose: props.companion?.parts.find((p) => p.role === 'PrimaryGrip')?.poses
          })
        : previewTransform(
            part,
            preview.yaw + Math.sin(motionTime.current) * 100,
            preview.pitch,
            motionTime.current,
            age,
            preview.playing,
            preview.powered
          );
    ref.current.position.fromArray(transform.position);
    ref.current.rotation.set(...transform.rotation);
  });
  const previewActive = Boolean(preview),
    previewReset = preview?.reset;
  useEffect(() => {
    speed.current = 0;
    stride.current = 0;
    elapsed.current = 0;
    motionTime.current = 0;
    fire.current = -Infinity;
    shot.current = 0;
    if (!previewActive && ref.current) {
      ref.current.position.fromArray(part.transform.position);
      ref.current.rotation.set(...part.transform.rotation);
    }
  }, [previewActive, previewReset, part.transform]);
  if (hidden.has(part.id)) return null;
  const visible = !isolate || isolate.has(part.id);
  return (
    <group
      ref={(node) => {
        ref.current = node;
        if (node) objects.set(part.id, node);
        else objects.delete(part.id);
      }}
      position={part.transform.position}
      rotation={part.transform.rotation}
    >
      {part.kind === 'socket' && visible && (
        <group
          onPointerDown={(event) => {
            if (event.button === 0 && !isLocked && !preview && props.tool === 'select') {
              event.stopPropagation();
              props.select(part.id, event.shiftKey);
            }
          }}
        >
          <axesHelper args={[2]} />
          <arrowHelper args={[socketDirection, new Vector3(), 3, theme.socket, 0.8, 0.5]} />
          <mesh>
            <octahedronGeometry args={[0.5]} />
            <meshBasicMaterial
              color={props.selected.includes(part.id) ? theme.gridHover : theme.socket}
              wireframe
            />
          </mesh>
        </group>
      )}
      {state.pieces
        .filter(
          (p) =>
            p.partId === part.id && !hidden.has(p.id) && (!isolate || isolate.has(p.id)) && visible
        )
        .map((piece) => (
          <PieceMesh
            key={piece.id}
            piece={piece}
            state={state}
            selected={props.selected.includes(piece.id) || props.selected.includes(part.id)}
            locked={isLocked || locked.has(piece.id) || Boolean(preview)}
            dispatch={props.dispatch}
            select={props.select}
            tool={props.tool}
            objects={objects}
            energy={energy}
            powered={preview?.powered ?? true}
            teamColor={Boolean(preview) && part.teamColor}
            hit={preview?.hit ?? false}
          />
        ))}
      {state.parts
        .filter((p) => p.parentId === part.id)
        .map((child) => (
          <PartGroup
            key={child.id}
            part={child}
            props={props}
            inheritedLock={isLocked}
            inheritedEnergy={energy}
          />
        ))}
    </group>
  );
}
