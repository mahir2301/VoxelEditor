import assert from 'node:assert/strict';
import test from 'node:test';
import { Mesh, Object3D, Vector3 } from 'three';
import { diagnostics } from '../src/domain/assembly/diagnostics';
import { duplicate, newPart, reparent, setTransform } from '../src/domain/assembly/model';
import { previewTransform } from '../src/domain/assembly/motion';
import { towerTemplate } from '../src/domain/assembly/templates';
import { exportName, worldMatrix } from '../src/domain/assembly/transforms';
import { computePieceVoxels } from '../src/domain/voxel/model';
import { getInitialState, reducer } from '../src/features/editor/state/editorReducer';
import { parseSerializedProjectOrThrow } from '../src/features/editor/state/projectSchema';
import { serializeState } from '../src/features/editor/state/serialization';
import { buildAssemblyScene, disposeAssemblyScene } from '../src/features/export/assemblyScene';
import { presentationMetadata } from '../src/features/export/presentation';
import { buildVoxelGeometry } from '../src/utils/voxelUtils';
function matrixClose(a: number[], b: number[]) {
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-8));
}
function fixture() {
  return { ...getInitialState(), ...towerTemplate('rapid') };
}

void test('projection coordinates preserve +Z front, +X side Z-flip and +Y top', () => {
  const n = 4,
    x = 1,
    y = 2,
    z = 3,
    front = new Uint8Array(n * n),
    side = front.slice(),
    top = front.slice();
  front[x + (n - 1 - y) * n] = 1;
  side[n - 1 - z + (n - 1 - y) * n] = 1;
  top[x + z * n] = 1;
  const voxels = computePieceVoxels(front, side, top, n);
  assert.equal(
    voxels.reduce((a, v) => a + v, 0),
    1
  );
  assert.equal(voxels[x + y * n + z * n * n], 1);
});
void test('legacy migration preserves geometry and shared-coordinate paint, including overlaps', () => {
  const voxels = [1, 0, 0, 0, 0, 0, 0, 0],
    colors = [1, 0, 0, 0, 0, 0, 0, 0];
  const migrated = parseSerializedProjectOrThrow({
    version: 1,
    resolution: 2,
    frontGrid: [0, 0, 0, 0],
    sideGrid: [0, 0, 0, 0],
    topGrid: [0, 0, 0, 0],
    pieces: [
      { id: 'a', name: 'A', voxels },
      { id: 'b', name: 'B', voxels }
    ],
    modelVoxels: voxels,
    modelColors: colors,
    palette: ['#000000', '#ff0000']
  });
  assert.equal(migrated.version, 3);
  assert.deepEqual(
    migrated.pieces.map((candidate) => candidate.colors[0]),
    [1, 1]
  );
  assert.equal(migrated.pieces[0].partId, migrated.pieces[1].partId);
});
void test('legacy model with no pieces becomes editable geometry', () => {
  const n = 2,
    voxels = [1, 0, 0, 0, 0, 0, 0, 0];
  const p = parseSerializedProjectOrThrow({
    version: 1,
    resolution: n,
    frontGrid: [0, 0, 0, 0],
    sideGrid: [0, 0, 0, 0],
    topGrid: [0, 0, 0, 0],
    pieces: [],
    modelVoxels: voxels,
    modelColors: Array(8).fill(0),
    palette: ['#000000']
  });
  assert.deepEqual(p.pieces[0].voxels, voxels);
});
void test('roundtrip retains rest transforms, sockets, local colors and editing draft', () => {
  const state = fixture();
  state.editingPieceId = state.pieces[0].id;
  state.frontGrid[0] = 1;
  const loaded = reducer(getInitialState(), {
    type: 'LOAD_PROJECT',
    state: parseSerializedProjectOrThrow(JSON.parse(JSON.stringify(serializeState(state))))
  });
  assert.deepEqual(serializeState(loaded), serializeState(state));
});
for (const invalid of [
  'cycle',
  'missing parent',
  'socket parent',
  'duplicate ID',
  'invalid color',
  'future version',
  'huge resolution',
  'invalid motion'
] as const)
  void test(`reject ${invalid}`, () => {
    const p = serializeState(fixture());
    if (invalid === 'cycle') p.parts[0].parentId = p.parts[1].id;
    if (invalid === 'missing parent') p.parts[1].parentId = 'missing';
    if (invalid === 'socket parent')
      p.pieces[0].partId = p.parts.find((candidate) => candidate.kind === 'socket')!.id;
    if (invalid === 'duplicate ID') p.parts[1].id = p.parts[0].id;
    if (invalid === 'invalid color') p.pieces[0].colors[0] = 256;
    if (invalid === 'future version') Reflect.set(p, 'version', 99);
    if (invalid === 'huge resolution') p.resolution = 100000;
    if (invalid === 'invalid motion') p.parts[1].motion.duration = -1;
    assert.throws(() => parseSerializedProjectOrThrow(p));
  });
void test('reparent between rotated parents preserves world pose', () => {
  const p = fixture(),
    a = p.parts[1],
    b = newPart('Other');
  b.transform = { position: [5, 9, -3], rotation: [0.2, 0.7, -0.1] };
  p.parts.push(b);
  a.transform.rotation = [0.1, 0.5, 0.3];
  const piece = p.pieces.find((candidate) => candidate.partId === a.id)!;
  const before = worldMatrix(piece.id, p.parts, p.pieces).elements;
  const next = reparent(p, piece.id, b.id);
  matrixClose(before, worldMatrix(piece.id, next.parts, next.pieces).elements);
});
void test('reparent rejects cycles and socket ownership', () => {
  const p = fixture();
  assert.equal(reparent(p, p.parts[0].id, p.parts[1].id), p);
  assert.equal(
    reparent(p, p.pieces[0].id, p.parts.find((candidate) => candidate.kind === 'socket')!.id),
    p
  );
});
void test('pivot relocation preserves descendant mesh and socket world poses', () => {
  const p = fixture(),
    turret = p.parts.find((candidate) => candidate.motion.kind === 'yaw')!;
  turret.transform.rotation = [0.2, 0.4, -0.1];
  const ids = [
    ...p.parts.filter((candidate) => candidate.kind === 'socket').map((candidate) => candidate.id),
    ...p.pieces.map((candidate) => candidate.id)
  ];
  const before = ids.map((id) => worldMatrix(id, p.parts, p.pieces).elements);
  const next = setTransform(
    p,
    turret.id,
    { position: [2, 18, 3], rotation: turret.transform.rotation },
    true
  );
  ids.forEach((id, i) => matrixClose(before[i], worldMatrix(id, next.parts, next.pieces).elements));
});
void test('moving a part moves geometry without changing voxel buffers', () => {
  const p = fixture(),
    part = p.parts[0],
    piece = p.pieces[0],
    before = worldMatrix(piece.id, p.parts, p.pieces).elements;
  const next = setTransform(p, part.id, { position: [2, 0, 0], rotation: [0, 0, 0] });
  assert.equal(next.pieces[0].voxels, piece.voxels);
  assert.equal(worldMatrix(piece.id, next.parts, next.pieces).elements[12], before[12] + 2);
});
void test('duplicate subtree owns IDs and colors, retaining the source', () => {
  const p = fixture(),
    next = duplicate(p, p.parts[1].id);
  assert.ok(next.parts.length > p.parts.length);
  assert.equal(
    new Set([...next.parts, ...next.pieces].map((candidate) => candidate.id)).size,
    next.parts.length + next.pieces.length
  );
  const original = p.pieces.find((x) => x.partId === p.parts[1].id)!,
    copy = next.pieces.find((x) => x.id !== original.id && x.name === original.name)!;
  assert.notEqual(copy.colors, original.colors);
  copy.colors[0] = 4;
  assert.notEqual(copy.colors[0], original.colors[0]);
});
void test('one drag transaction creates one undo step and restores buffers', () => {
  let state = fixture();
  const original = state.parts[0].transform;
  state = reducer(state, { type: 'BEGIN_TRANSACTION' });
  for (let i = 0; i < 15; i++)
    state = reducer(state, {
      type: 'TRANSFORM',
      id: state.parts[0].id,
      transform: { position: [i, 0, 0], rotation: [0, 0, 0] }
    });
  state = reducer(state, { type: 'END_TRANSACTION' });
  assert.equal(state.history.length, 2);
  state = reducer(state, { type: 'UNDO' });
  assert.deepEqual(state.parts[0].transform, original);
  state = reducer(state, { type: 'REDO' });
  assert.equal(state.parts[0].transform.position[0], 14);
});
void test('empty transactions do not enter history; cancellation restores rest pose', () => {
  let state = fixture();
  state = reducer(state, { type: 'BEGIN_TRANSACTION' });
  state = reducer(state, { type: 'END_TRANSACTION' });
  assert.equal(state.history.length, 0);
  state = reducer(state, { type: 'BEGIN_TRANSACTION' });
  state = reducer(state, {
    type: 'TRANSFORM',
    id: state.parts[0].id,
    transform: { position: [10, 0, 0], rotation: [0, 0, 0] }
  });
  state = reducer(state, { type: 'CANCEL_TRANSACTION' });
  assert.equal(state.parts[0].transform.position[0], 0);
  assert.equal(state.history.length, 0);
});
void test('view changes neither alter project serialization nor get restored by model undo', () => {
  let state = fixture(),
    initial = serializeState(state);
  state = reducer(state, { type: 'SET_CAMERA_VIEW', view: 'top' });
  state = reducer(state, { type: 'SET_TOOL', tool: 'erase' });
  assert.deepEqual(serializeState(state), initial);
  assert.equal(state.history.length, 0);
  state = reducer(state, { type: 'SET_PROJECT', name: 'changed' });
  state = reducer(state, { type: 'UNDO' });
  assert.equal(state.cameraView, 'top');
  assert.equal(state.tool, 'erase');
});
void test('painting one piece does not recolor overlapping or sibling geometry', () => {
  let state = fixture();
  const piece = state.pieces[0],
    index = piece.voxels.findIndex(Boolean),
    other = state.pieces[1].colors.slice();
  state = reducer(state, { type: 'PAINT_VOXEL', pieceId: piece.id, index, colorIndex: 3 });
  assert.equal(state.pieces[0].colors[index], 3);
  assert.deepEqual(state.pieces[1].colors, other);
});
void test('geometry has outward normals and O(1) triangle ownership', () => {
  const g = buildVoxelGeometry(new Uint8Array([1]), new Uint8Array([0]), ['#ffffff'], 1),
    positions = g.attributes.position,
    normals = g.attributes.normal;
  for (let i = 0; i < positions.count; i++) {
    const p = new Vector3().fromBufferAttribute(positions, i),
      n = new Vector3().fromBufferAttribute(normals, i);
    assert.ok(p.dot(n) > 0);
  }
  assert.equal(g.userData.triangleVoxels.length, 12);
  assert.ok([...g.userData.triangleVoxels].every((i) => i === 0));
  g.dispose();
});
void test('adjacent independently moving pieces retain their touching faces', () => {
  const document = fixture();
  const first = document.pieces[0];
  first.voxels = new Uint8Array(4096);
  first.colors = new Uint8Array(4096);
  first.voxels[0] = 1;
  const second = document.pieces[1];
  second.voxels = first.voxels.slice();
  second.colors = first.colors.slice();
  second.partId = document.parts[1].id;
  const root = buildAssemblyScene(document);
  let found = 0;
  root.traverse((node) => {
    if (node instanceof Mesh && node.geometry.attributes.position.count === 24) found++;
  });
  assert.ok(found >= 2);
  disposeAssemblyScene(root);
});
for (const kind of ['rapid', 'frost', 'beam'] as const)
  void test(`${kind} starter exports reachable bindings in world units`, () => {
    const document = towerTemplate(kind),
      metadata = presentationMetadata(document),
      root = buildAssemblyScene(document);
    assert.equal(root.name, metadata.root);
    for (const path of [
      ...metadata.bindings.map((b) => b.path),
      ...metadata.sockets.map((s) => s.path),
      ...metadata.energyPaths
    ]) {
      let node: Object3D = root;
      for (const name of path.split('/')) node = node.children.find((n) => n.name === name)!;
      assert.ok(node, path);
    }
    const bound = root.children[0];
    assert.equal(bound.position.y, document.parts[0].transform.position[1] / 16);
    assert.ok(metadata.sockets.length >= 1);
    disposeAssemblyScene(root);
  });
void test('preview motion is temporary, clamped, and local-axis recoil decays to rest', () => {
  const p = fixture(),
    pitch = p.parts.find((candidate) => candidate.motion.kind === 'pitch')!,
    barrel = p.parts.find((candidate) => candidate.motion.kind === 'recoil')!,
    snapshot = serializeState(p);
  const pose = previewTransform(pitch, 0, 90, 0, Infinity, false, true);
  assert.ok(Math.abs(pose.rotation[0] - (55 * Math.PI) / 180) < 1e-8);
  const fire = previewTransform(barrel, 0, 0, 0, 0, false, true);
  assert.equal(fire.position[2], barrel.transform.position[2] + barrel.motion.distance);
  const rest = previewTransform(barrel, 0, 0, 0, 1, false, true);
  matrixClose(rest.position, barrel.transform.position);
  matrixClose(rest.rotation, barrel.transform.rotation);
  assert.deepEqual(serializeState(p), snapshot);
});
void test('export excludes marked subtrees and does not depend on editor visibility', () => {
  const p = fixture();
  p.parts[1].exportEnabled = false;
  const root = buildAssemblyScene(p);
  assert.equal(presentationMetadata(p).sockets.length, 0);
  assert.equal(root.children[0].children.filter((n) => n.type === 'Group').length, 0);
  disposeAssemblyScene(root);
});
void test('diagnostics report open draft and overlapping rigid parts', () => {
  const p = fixture();
  p.frontGrid[0] = 1;
  p.pieces[1] = { ...p.pieces[0], id: 'overlap', partId: p.parts[1].id };
  p.parts[1].transform.position = [0, 0, 0];
  const messages = diagnostics(p);
  assert.ok(messages.some((m) => m.includes('draft')));
  assert.ok(messages.some((m) => m.includes('overlap')));
});

void test('stable export names cannot collide for legal IDs', () => {
  assert.notEqual(exportName('a-b'), exportName('a_hb'));
  assert.notEqual(exportName('a_b'), exportName('a_ub'));
});

void test('undoing a shape stroke restores the open editing draft; cancelling drafts is reversible', () => {
  let state = fixture();
  state = reducer(state, { type: 'LOAD_PIECE_FOR_EDITING', pieceId: state.pieces[0].id });
  const original = state;
  state = reducer(state, { type: 'BEGIN_TRANSACTION' });
  state = reducer(state, { type: 'SET_CELL', grid: 'front', index: 0, value: 1 });
  state = reducer(state, { type: 'END_TRANSACTION' });
  state = reducer(state, { type: 'UNDO' });
  assert.equal(state.editingPieceId, original.editingPieceId);
  assert.deepEqual(state.frontGrid, original.frontGrid);
  state = reducer(state, { type: 'CANCEL_EDITING' });
  assert.equal(state.editingPieceId, null);
  state = reducer(state, { type: 'UNDO' });
  assert.equal(state.editingPieceId, original.editingPieceId);
  assert.deepEqual(state.topGrid, original.topGrid);
});
