import { Euler, Quaternion } from 'three';
import type { Part, Transform, Vector, PoseOffsets } from '../../features/editor/state/types';
export interface RigSample {
  seconds: number;
  stride: number;
  speed: number;
  pitch: number;
  fire: number;
  knockedOut: boolean;
  handPose?: PoseOffsets;
}
export function rigTransform(part: Part, s: RigSample): Transform {
  const rotation = new Quaternion().setFromEuler(new Euler(...part.transform.rotation));
  const offset: Vector = [...part.poses.hold];
  const weight = Math.max(0, Math.min(1, s.speed / 4));
  const cadence = Math.sin(s.stride),
    role = part.rigRole;
  if (role === 'LeftLeg') offset[0] += (cadence * 0.55 * weight * 180) / Math.PI;
  if (role === 'RightLeg') offset[0] -= (cadence * 0.55 * weight * 180) / Math.PI;
  if (role === 'LeftArm') offset[0] -= (cadence * 0.28 * weight * 180) / Math.PI;
  if (role === 'RightArm') {
    offset[0] += s.pitch;
    if (s.handPose)
      for (let a = 0; a < 3; a++) offset[a] += s.handPose.hold[a] + s.handPose.fire[a] * s.fire;
  }
  if (role === 'Head') offset[0] += s.pitch * 0.35;
  for (let a = 0; a < 3; a++) offset[a] += part.poses.fire[a] * s.fire;
  if (s.knockedOut) for (let a = 0; a < 3; a++) offset[a] = part.poses.knockout[a];
  rotation.multiply(
    new Quaternion().setFromEuler(
      new Euler(
        (offset[0] * Math.PI) / 180,
        (offset[1] * Math.PI) / 180,
        (offset[2] * Math.PI) / 180
      )
    )
  );
  const e = new Euler().setFromQuaternion(rotation);
  const position: Vector = [...part.transform.position];
  if (role === 'Torso' && !s.knockedOut)
    position[1] +=
      (1 - weight) * 0.192 * Math.sin(s.seconds * 3) + weight * 0.56 * Math.abs(cadence);
  return { position, rotation: [e.x, e.y, e.z] };
}
