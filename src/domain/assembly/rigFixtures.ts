import type { RigRole } from '../../features/editor/state/types';
import { newPart } from './model';
import type { RigSample } from './rig';
import { rigTransform } from './rig';
export function rigFixtures() {
  return (
    ['Torso', 'Head', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg', 'None'] satisfies RigRole[]
  ).map((role, index) => {
    const part = newPart('Sample');
    part.rigRole = role;
    part.transform = { position: [2, 3, -4], rotation: [0.2, -0.3, 0.4] };
    part.poses = { hold: [12, -21, 8], fire: [-15, 7, 18], knockout: [0, 0, 90] };
    const sample: RigSample = {
      seconds: 0.7,
      stride: 1.2,
      speed: 2.5,
      pitch: 25,
      fire: 0.6,
      knockedOut: index === 6,
      handPose: {
        hold: [2, 3, 4],
        fire: [5, 6, 7],
        knockout: [0, 0, 0]
      }
    };
    return {
      role,
      rest: part.transform,
      poses: part.poses,
      sample,
      expected: rigTransform(part, sample)
    };
  });
}
