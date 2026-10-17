import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Matrix4, Mesh, MeshStandardMaterial } from 'three';
import { previewTransform } from '../../domain/assembly/motion';
import { rigTransform } from '../../domain/assembly/rig';
import { exportName, worldMatrix } from '../../domain/assembly/transforms';
import type { ProjectDocument } from '../editor/state/types';
import { buildAssemblyScene, disposeAssemblyScene } from '../export/assemblyScene';
import type { SceneProps } from './types';
export function CompanionPreview({
  props,
  document
}: {
  props: SceneProps;
  document: ProjectDocument;
}) {
  const model = useMemo(() => buildAssemblyScene(document), [document]);
  const clock = useRef({
    time: 0,
    motion: 0,
    speed: 0,
    stride: 0,
    shot: 0,
    fire: -Infinity,
    reset: 0
  });
  useEffect(
    () => () => {
      disposeAssemblyScene(model);
      if (props.root.current) {
        props.root.current.matrixAutoUpdate = true;
        props.root.current.position.set(0, 0, 0);
        props.root.current.rotation.set(0, 0, 0);
        props.root.current.updateMatrix();
      }
    },
    [model, props.root]
  );
  useFrame((_, delta) => {
    const preview = props.preview,
      root = props.root.current;
    if (!preview || !root) return;
    let c = clock.current;
    if (c.reset !== preview.reset)
      c = clock.current = {
        time: 0,
        motion: 0,
        speed: 0,
        stride: 0,
        shot: 0,
        fire: -Infinity,
        reset: preview.reset
      };
    if (c.shot !== preview.shot) {
      c.shot = preview.shot;
      c.fire = c.time;
    }
    c.time += delta;
    if (preview.playing) {
      c.motion += delta;
      c.speed += ((preview.knockedOut ? 0 : preview.speed) - c.speed) * (1 - Math.exp(-20 * delta));
      c.stride += delta * c.speed * 5;
    }
    const age = c.time - c.fire;
    for (const part of document.parts) {
      const node = model.getObjectByName(exportName(part.id));
      if (!node) continue;
      const t =
        document.profile === 'player'
          ? rigTransform(part, {
              seconds: c.motion,
              stride: c.stride,
              speed: c.speed,
              pitch: preview.pitch,
              fire: age < 0.16 ? 1 - age / 0.16 : 0,
              knockedOut: preview.knockedOut,
              handPose: props.state.parts.find((p) => p.role === 'PrimaryGrip')?.poses
            })
          : previewTransform(
              part,
              preview.yaw,
              preview.pitch,
              c.motion,
              age,
              preview.playing,
              preview.powered
            );
      node.position.fromArray(t.position).divideScalar(document.voxelsPerUnit);
      node.rotation.set(...t.rotation);
      if (part.teamColor || part.energy)
        node.traverse((child) => {
          if (part.teamColor && !part.energy && child.parent !== node) return;
          if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
            // This preview instance owns its materials. Clone once before per-part tinting.
            if (!child.userData.ownedTint) {
              child.material = child.material.clone();
              child.userData.ownedTint = true;
            }
            child.material.vertexColors = !part.teamColor;
            child.material.color.set(
              preview.hit
                ? '#fff6d7'
                : part.teamColor
                  ? '#e5a846'
                  : preview.powered
                    ? '#ffffff'
                    : '#62736f'
            );
          }
        });
    }
    const player = props.state.profile === 'player' ? props.state : document;
    const weapon = props.state.profile === 'weapon' ? props.state : document;
    const hand = player.parts.find((p) => p.role === 'HandGrip'),
      grip = weapon.parts.find((p) => p.role === 'PrimaryGrip');
    if (!hand || !grip) return;
    if (props.state.profile === 'player') {
      const anchor = props.objects.get(hand.id);
      if (!anchor) return;
      root.updateMatrixWorld(true);
      const gripRest = worldMatrix(grip.id, weapon.parts);
      gripRest.elements[12] /= weapon.voxelsPerUnit;
      gripRest.elements[13] /= weapon.voxelsPerUnit;
      gripRest.elements[14] /= weapon.voxelsPerUnit;
      model.matrixAutoUpdate = false;
      model.matrix
        .copy(anchor.matrixWorld)
        .multiply(
          new Matrix4().makeScale(
            props.state.voxelsPerUnit,
            props.state.voxelsPerUnit,
            props.state.voxelsPerUnit
          )
        )
        .multiply(gripRest.invert());
      model.updateMatrixWorld(true);
    } else {
      model.matrixAutoUpdate = true;
      model.rotation.y = (preview.yaw * Math.PI) / 180;
      model.scale.setScalar(props.state.voxelsPerUnit);
      model.updateMatrixWorld(true);
      const anchor = model.getObjectByName(exportName(hand.id));
      if (!anchor) return;
      root.matrixAutoUpdate = false;
      root.matrix.copy(anchor.matrixWorld).multiply(worldMatrix(grip.id, weapon.parts).invert());
      root.updateMatrixWorld(true);
    }
  });
  return <primitive object={model} />;
}
