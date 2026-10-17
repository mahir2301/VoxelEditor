import { emptyDocument } from '../../features/editor/state/document';
import type { Part, Vector } from '../../features/editor/state/types';
import { boxPiece } from './authoring';
import { newPart } from './model';
import { towerTemplate } from './templates';
export type TemplateKind = 'rapid' | 'frost' | 'beam' | 'player' | 'weapon-pulse' | 'weapon-arc';
export function actorTemplate(kind: 'player' | 'weapon-pulse' | 'weapon-arc') {
  const d = emptyDocument(16);
  d.parts = [];
  d.pieces = [];
  d.profile = kind === 'player' ? 'player' : 'weapon';
  d.name = kind === 'player' ? 'default' : kind.slice(7);
  d.palette = ['#304654', '#e5a846', '#dce9f4', '#6fe3ff', '#68efb1'];
  function part(name: string, parent: Part | null, position: Vector) {
    const p = newPart(name, parent?.id ?? null);
    p.transform.position = position;
    d.parts.push(p);
    return p;
  }
  function box(p: Part, size: Vector, position: Vector, color = 0) {
    const piece = boxPiece(d, p.id, size);
    piece.transform.position = [
      position[0] + piece.transform.position[0],
      position[1] + piece.transform.position[1],
      position[2] + piece.transform.position[2]
    ];
    piece.colors.fill(color);
    d.pieces.push(piece);
  }
  function socket(name: string, parent: Part, position: Vector, role: Part['role']) {
    const p = newPart(name, parent.id, 'socket');
    p.transform.position = position;
    p.role = role;
    d.parts.push(p);
    return p;
  }
  const root = part('Root', null, [0, 0, 0]);
  d.draftPartId = root.id;
  if (kind === 'player') {
    root.poses.knockout = [0, 0, 90];
    const torso = part('Torso', root, [0, 7.5, 0]);
    torso.rigRole = 'Torso';
    torso.teamColor = true;
    box(torso, [6, 6, 4], [0, 0, 0], 1);
    const head = part('Head', torso, [0, 5, 0]);
    head.rigRole = 'Head';
    box(head, [4, 4, 4], [0, 0, 0], 2);
    box(head, [4, 2, 1], [0, 0, -2.5], 0);
    for (const side of [-1, 1]) {
      const arm = part(side < 0 ? 'Left arm' : 'Right arm', torso, [side * 4.5, 2, 0]);
      arm.rigRole = side < 0 ? 'LeftArm' : 'RightArm';
      arm.teamColor = true;
      if (side > 0) arm.poses.fire = [-8, 0, 0];
      box(arm, [2, 5, 2], [0, -2.5, 0], 1);
      const leg = part(side < 0 ? 'Left leg' : 'Right leg', root, [side * 2, 5, 0]);
      leg.rigRole = side < 0 ? 'LeftLeg' : 'RightLeg';
      box(leg, [2, 5, 3], [0, -2.5, 0]);
      if (side > 0) socket('Hand grip', arm, [0, -5, -1], 'HandGrip');
    }
    socket('Healthbar', root, [0, 16, 0], 'HealthbarAnchor');
  } else {
    socket('Primary grip', root, [0, 0, 0], 'PrimaryGrip');
    box(root, [2, 3, 2], [0, 1, 0]);
    box(root, [3, 2, 5], [0, 3, -1], 2);
    const barrel = part('Barrel', root, [0, 3, -4]);
    barrel.motion = { ...barrel.motion, kind: 'recoil', axis: 'z', distance: 1, duration: 0.14 };
    if (kind === 'weapon-pulse') {
      box(barrel, [2, 2, 6], [0, 0, -2]);
      socket('Muzzle', barrel, [0, 0, -5], 'ProjectileOrigin');
    } else {
      barrel.energy = true;
      box(barrel, [4, 4, 4], [0, 0, -2], 3);
      socket('Muzzle', barrel, [0, 0, -4], 'ProjectileOrigin');
      const ring = part('Cooling ring', barrel, [0, 0, -2]);
      ring.motion = { ...ring.motion, kind: 'spin', axis: 'z', speed: 90 };
      box(ring, [6, 1, 1], [0, 0, 0], 2);
      box(ring, [1, 6, 1], [0, 0, 0], 2);
    }
    socket('Support grip', root, [0, 1, -3], 'SupportGrip');
  }
  return d;
}
export function assemblyTemplate(kind: TemplateKind) {
  return kind === 'rapid' || kind === 'frost' || kind === 'beam'
    ? towerTemplate(kind)
    : actorTemplate(kind);
}
