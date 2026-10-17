import type { ProjectDocument, Part, RigRole, SocketRole } from '../../features/editor/state/types';
import { exportIncluded } from './model';
export const rigRoles: RigRole[] = [
  'None',
  'Torso',
  'Head',
  'LeftArm',
  'RightArm',
  'LeftLeg',
  'RightLeg'
];
export const socketRoles: SocketRole[] = [
  'None',
  'ProjectileOrigin',
  'EnergyConnector',
  'HealthbarAnchor',
  'HandGrip',
  'PrimaryGrip',
  'SupportGrip'
];
export function profileChecks(document: ProjectDocument): string[] {
  const parts = document.parts.filter((p) => exportIncluded(p, document.parts));
  const messages: string[] = [];
  if (
    (document.profile === 'player' || document.profile === 'weapon') &&
    document.voxelsPerUnit !== 16
  )
    messages.push('Player/Weapon game profiles require 16 voxels per world unit.');
  const requireOne = (label: string, matches: Part[]) => {
    if (matches.length !== 1)
      messages.push(`${label}: expected exactly one exported binding, found ${matches.length}.`);
  };
  if (document.profile === 'player' && parts.some((p) => p.motion.kind !== 'none'))
    messages.push(
      'Player motion uses rig roles and pose offsets; keep mechanical motion on the weapon.'
    );
  for (const role of rigRoles.filter((r) => r !== 'None')) {
    const matches = parts.filter((p) => p.rigRole === role);
    if (document.profile === 'player') requireOne(role, matches);
    else if (matches.length > 1) messages.push(`Duplicate rig role: ${role}.`);
  }
  if (document.profile === 'player')
    requireOne(
      'HandGrip',
      parts.filter((p) => p.kind === 'socket' && p.role === 'HandGrip')
    );
  if (document.profile === 'weapon') {
    requireOne(
      'PrimaryGrip',
      parts.filter((p) => p.kind === 'socket' && p.role === 'PrimaryGrip')
    );
    if (!parts.some((p) => p.role === 'ProjectileOrigin'))
      messages.push('Weapon requires an exported ProjectileOrigin socket.');
    const grip = parts.find((p) => p.role === 'PrimaryGrip');
    let parent = grip?.parentId;
    while (parent) {
      const part = parts.find((p) => p.id === parent);
      if (part?.motion.kind !== 'none') {
        messages.push('PrimaryGrip must not move with weapon mechanisms.');
        break;
      }
      parent = part?.parentId;
    }
  }
  for (const p of parts)
    if (p.kind === 'part' && p.rigRole !== 'None' && p.motion.kind !== 'none')
      messages.push(`${p.name}: rig motion and mechanical motion cannot share a part.`);
  return messages;
}
export function assertProfile(document: ProjectDocument) {
  const messages = profileChecks(document);
  if (messages.length) throw new Error(messages.join('\n'));
}
