import { Euler, Quaternion, Vector3 } from 'three';
import type { Part, Transform } from '../../features/editor/state/types';
export function previewTransform(
  part: Part,
  yaw: number,
  pitch: number,
  seconds: number,
  fireAge: number,
  playing: boolean,
  powered: boolean
): Transform {
  const { motion, transform } = part,
    axis = new Vector3(
      motion.axis === 'x' ? 1 : 0,
      motion.axis === 'y' ? 1 : 0,
      motion.axis === 'z' ? 1 : 0
    );
  const rotation = new Quaternion().setFromEuler(new Euler(...transform.rotation)),
    position = new Vector3(...transform.position);
  if (motion.kind === 'recoil' && fireAge >= 0 && fireAge < motion.duration && powered)
    position.add(
      axis
        .clone()
        .applyQuaternion(rotation)
        .multiplyScalar(motion.distance * (1 - fireAge / motion.duration))
    );
  let angle =
    motion.kind === 'yaw'
      ? yaw
      : motion.kind === 'pitch'
        ? pitch
        : motion.kind === 'spin' && (playing || seconds > 0)
          ? seconds * motion.speed
          : 0;
  if (motion.kind === 'yaw' || motion.kind === 'pitch')
    angle = Math.max(motion.min, Math.min(motion.max, angle));
  rotation.multiply(new Quaternion().setFromAxisAngle(axis, (angle * Math.PI) / 180));
  const euler = new Euler().setFromQuaternion(rotation);
  return {
    position: position.toArray() as Transform['position'],
    rotation: [euler.x, euler.y, euler.z]
  };
}
