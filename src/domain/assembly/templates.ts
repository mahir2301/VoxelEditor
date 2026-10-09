import { emptyDocument } from '../../features/editor/state/document';
import type { Part, ProjectDocument, Vector } from '../../features/editor/state/types';
import { newPart } from './model';
export function towerTemplate(kind: 'rapid' | 'frost' | 'beam'): ProjectDocument {
  const document = emptyDocument(16);
  document.name = kind;
  document.parts = [];
  document.pieces = [];
  document.palette = ['#52655d', '#83958a', '#d3d9c2', '#78e8ad', '#7cbdd1', '#c6efff', '#334a50'];
  function part(
    name: string,
    parent: Part | null,
    position: Vector,
    motion: Part['motion']['kind'] = 'none'
  ) {
    const p = newPart(name, parent?.id ?? null);
    p.transform.position = position;
    p.motion.kind = motion;
    p.motion.axis = motion === 'pitch' ? 'x' : motion === 'recoil' ? 'z' : 'y';
    document.parts.push(p);
    return p;
  }
  function box(parent: Part, name: string, size: Vector, center: Vector, color: number) {
    const voxels = new Uint8Array(16 ** 3),
      colors = new Uint8Array(16 ** 3).fill(color);
    for (let z = 0; z < 16; z++)
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++)
          if (
            Math.abs(x + 0.5 - 8) <= size[0] / 2 &&
            Math.abs(y + 0.5 - 8) <= size[1] / 2 &&
            Math.abs(z + 0.5 - 8) <= size[2] / 2
          )
            voxels[x + y * 16 + z * 256] = 1;
    document.pieces.push({
      id: crypto.randomUUID(),
      name,
      partId: parent.id,
      transform: { position: center, rotation: [0, 0, 0] },
      voxels,
      colors,
      exportEnabled: true
    });
  }
  function socket(parent: Part, name: string, position: Vector) {
    const p = newPart(name, parent.id, 'socket');
    p.transform.position = position;
    p.role = 'ProjectileOrigin';
    document.parts.push(p);
  }
  const base = part('Base', null, [0, 0, 0]);
  document.draftPartId = base.id;
  box(base, 'Foundation', [14, 2, 14], [0, 1, 0], 0);
  box(base, 'Power housing', [8, 10, 8], [0, 7, 0], 1);
  box(base, 'Mounting neck', [4, 2, 4], [0, 13, 0], 2);
  const turret = part('Turret', base, [0, 16, 0], 'yaw');
  box(turret, 'Armor', [10, 4, 4], [0, 0, 2], 0);
  if (kind === 'frost') {
    const emitter = part('Crystal emitter', turret, [0, 3, 0]);
    emitter.energy = true;
    box(emitter, 'Crystal', [4, 10, 4], [0, 4, 0], 5);
    const ring = part('Cooling ring', turret, [0, 2, 0], 'spin');
    ring.motion.speed = 45;
    ring.energy = true;
    box(ring, 'Cross X', [14, 2, 2], [0, 0, 0], 4);
    box(ring, 'Cross Z', [2, 2, 14], [0, 0, 0], 4);
    socket(emitter, 'Frost origin', [0, 7, -3]);
  } else {
    const mount = part('Weapon mount', turret, [0, 0, 0], 'pitch');
    mount.motion.min = -35;
    mount.motion.max = 55;
    if (kind === 'rapid')
      for (const x of [-3, 3]) {
        const barrel = part(x < 0 ? 'Left barrel' : 'Right barrel', mount, [x, 0, -3], 'recoil');
        box(barrel, 'Barrel', [2, 2, 8], [0, 0, -2], 6);
        const tip = part('Energy tip', barrel, [0, 0, -7]);
        tip.energy = true;
        box(tip, 'Tip', [2, 2, 2], [0, 0, 0], 3);
        socket(barrel, 'Muzzle', [0, 0, -8]);
      }
    else {
      const emitter = part('Beam emitter', mount, [0, 0, -3]);
      emitter.energy = true;
      box(emitter, 'Emitter', [4, 4, 8], [0, 0, -2], 3);
      socket(emitter, 'Beam origin', [0, 0, -7]);
    }
  }
  return document;
}
