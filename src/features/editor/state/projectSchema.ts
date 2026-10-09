import { type } from 'arktype';
import { newPart } from '../../../domain/assembly/model';
import { identityTransform } from '../../../domain/assembly/transforms';
import { parseLegacyProjectOrThrow } from './legacySchema';
import type { SerializedProject } from './types';
const vector = type(['number', 'number', 'number']);
const transform = type({ position: vector, rotation: vector });
const motion = type({
  kind: "'none' | 'yaw' | 'pitch' | 'recoil' | 'spin'",
  axis: "'x' | 'y' | 'z'",
  min: 'number',
  max: 'number',
  distance: 'number',
  duration: 'number',
  speed: 'number'
});
const part = type({
  id: 'string',
  name: 'string',
  parentId: 'string | null',
  kind: "'part' | 'socket'",
  transform,
  motion,
  role: "'None' | 'ProjectileOrigin' | 'EnergyConnector' | 'HealthbarAnchor'",
  energy: 'boolean',
  exportEnabled: 'boolean'
});
const piece = type({
  id: 'string',
  name: 'string',
  partId: 'string',
  transform,
  voxels: 'number[]',
  colors: 'number[]',
  exportEnabled: 'boolean'
});
const schema = type({
  version: '3',
  name: 'string',
  resolution: 'number',
  voxelsPerUnit: 'number',
  parts: part.array(),
  pieces: piece.array(),
  palette: 'string[]',
  frontGrid: 'number[]',
  sideGrid: 'number[]',
  topGrid: 'number[]',
  editingPieceId: 'string | null',
  draftPartId: 'string'
});
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Project consistency validation failed: ${message}`);
}
export function validateProject(project: SerializedProject): SerializedProject {
  const n = project.resolution,
    count = n ** 3;
  ensure(Number.isInteger(n) && n >= 1 && n <= 64, 'resolution must be an integer from 1 to 64');
  ensure(
    Number.isFinite(project.voxelsPerUnit) &&
      project.voxelsPerUnit > 0 &&
      project.voxelsPerUnit <= 1024,
    'voxelsPerUnit must be positive and at most 1024'
  );
  ensure(
    project.palette.length > 0 &&
      project.palette.length <= 256 &&
      project.palette.every((c) => /^#[0-9a-f]{6}$/i.test(c)),
    'palette must contain 1–256 six-digit hex colors'
  );
  ensure(
    project.parts.length > 0 && project.parts.length <= 256 && project.pieces.length <= 512,
    'too many parts/pieces or no parts'
  );
  const ids = new Set<string>();
  for (const node of [...project.parts, ...project.pieces]) {
    ensure(
      /^[a-zA-Z0-9_-]+$/.test(node.id) && !ids.has(node.id),
      'node IDs must be unique and contain letters, numbers, underscores or hyphens'
    );
    ids.add(node.id);
    ensure(
      node.name.trim().length > 0 && node.name.length <= 128,
      'names must contain 1–128 characters'
    );
    ensure(
      [...node.transform.position, ...node.transform.rotation].every(
        (v) => Number.isFinite(v) && Math.abs(v) <= 100000
      ),
      'invalid transform'
    );
  }
  const parts = new Map(project.parts.map((p) => [p.id, p]));
  for (const node of project.parts) {
    const seen = new Set([node.id]);
    let parentId = node.parentId;
    while (parentId) {
      const parent = parts.get(parentId);
      ensure(
        parent && parent.kind === 'part' && !seen.has(parentId),
        'missing parent, socket parent or cyclic hierarchy'
      );
      seen.add(parentId);
      parentId = parent.parentId;
    }
    ensure(
      [
        node.motion.min,
        node.motion.max,
        node.motion.distance,
        node.motion.duration,
        node.motion.speed
      ].every(Number.isFinite),
      'invalid motion values'
    );
    ensure(
      node.motion.min <= node.motion.max &&
        node.motion.duration >= 0.01 &&
        node.motion.duration <= 10 &&
        node.motion.distance >= 0 &&
        Math.abs(node.motion.speed) <= 3600,
      'invalid motion limits'
    );
    ensure(
      node.kind !== 'socket' || (node.motion.kind === 'none' && !node.energy),
      'sockets cannot own motion or energy geometry'
    );
  }
  for (const node of project.pieces) {
    ensure(parts.get(node.partId)?.kind === 'part', 'piece must belong to a part');
    ensure(
      node.voxels.length === count && node.colors.length === count,
      'piece buffer size does not match resolution'
    );
    ensure(
      node.voxels.every((v) => v === 0 || v === 1),
      'voxel occupancy must be binary'
    );
    ensure(
      node.colors.every((v) => Number.isInteger(v) && v >= 0 && v < project.palette.length),
      'piece has invalid palette indices'
    );
  }
  for (const grid of [project.frontGrid, project.sideGrid, project.topGrid])
    ensure(
      grid.length === n * n && grid.every((v) => v === 0 || v === 1),
      'invalid projection grid'
    );
  ensure(parts.get(project.draftPartId)?.kind === 'part', 'invalid draft part');
  ensure(
    project.editingPieceId === null || project.pieces.some((p) => p.id === project.editingPieceId),
    'invalid edited piece'
  );
  return project;
}
export function parseSerializedProjectOrThrow(raw: unknown): SerializedProject {
  ensure(raw && typeof raw === 'object', 'project must be an object');
  const version = Reflect.get(raw, 'version') ?? 1;
  if (version === 3) return validateProject(schema.assert(raw));
  ensure(version === 1 || version === 2, `unsupported project version ${String(version)}`);
  const resolution = Reflect.get(raw, 'resolution') ?? 16;
  ensure(
    Number.isInteger(resolution) && resolution > 0 && resolution <= 64,
    'invalid legacy resolution'
  );
  const old = parseLegacyProjectOrThrow(raw),
    base = newPart('Base');
  // Union-era projects paint shared coordinates. Copy those colors into every owning piece.
  const pieces = old.pieces.length
    ? old.pieces
    : old.modelVoxels.some(Boolean)
      ? [{ id: crypto.randomUUID(), name: 'Imported Model', voxels: old.modelVoxels }]
      : [];
  return validateProject({
    version: 3,
    name: 'tower',
    resolution: old.resolution,
    voxelsPerUnit: 16,
    parts: [base],
    pieces: pieces.map((p) =>
      Object.assign({}, p, {
        partId: base.id,
        transform: identityTransform(),
        colors: [...old.modelColors],
        exportEnabled: true
      })
    ),
    palette: old.palette,
    frontGrid: old.frontGrid,
    sideGrid: old.sideGrid,
    topGrid: old.topGrid,
    editingPieceId: null,
    draftPartId: base.id
  });
}
export function parseSerializedProject(raw: unknown): SerializedProject | null {
  try {
    return parseSerializedProjectOrThrow(raw);
  } catch {
    return null;
  }
}
