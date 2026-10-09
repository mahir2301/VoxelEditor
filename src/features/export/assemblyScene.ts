import { Group, Mesh, MeshStandardMaterial } from 'three';
import { exportIncluded } from '../../domain/assembly/model';
import { exportName } from '../../domain/assembly/transforms';
import { buildVoxelGeometry } from '../../utils/voxelUtils';
import type { ProjectDocument } from '../editor/state/types';
export function buildAssemblyScene(document: ProjectDocument): Group {
  const root = new Group();
  root.name = 'VoxelAssembly';
  const nodes = new Map<string, Group>();
  for (const part of document.parts) {
    if (!exportIncluded(part, document.parts)) continue;
    const node = new Group();
    node.name = exportName(part.id);
    node.userData = { displayName: part.name, nodeId: part.id, kind: part.kind, role: part.role };
    node.position.fromArray(part.transform.position).divideScalar(document.voxelsPerUnit);
    node.rotation.fromArray([...part.transform.rotation, 'XYZ']);
    nodes.set(part.id, node);
  }
  for (const part of document.parts) {
    const node = nodes.get(part.id);
    if (node) (part.parentId ? nodes.get(part.parentId)! : root).add(node);
  }
  const material = new MeshStandardMaterial({ vertexColors: true, metalness: 0.1, roughness: 0.8 });
  // Piece faces remain intact across transforms. No face culling across independently moving nodes.
  for (const piece of document.pieces) {
    const parent = nodes.get(piece.partId);
    if (!parent || !piece.exportEnabled) continue;
    const geometry = buildVoxelGeometry(
      piece.voxels,
      piece.colors,
      document.palette,
      document.resolution
    );
    geometry.scale(
      1 / document.voxelsPerUnit,
      1 / document.voxelsPerUnit,
      1 / document.voxelsPerUnit
    );
    if (!geometry.attributes.position.count) {
      geometry.dispose();
      continue;
    }
    const mesh = new Mesh(geometry, material);
    mesh.name = exportName(piece.id);
    mesh.position.fromArray(piece.transform.position).divideScalar(document.voxelsPerUnit);
    mesh.rotation.fromArray([...piece.transform.rotation, 'XYZ']);
    parent.add(mesh);
  }
  root.updateMatrixWorld(true);
  return root;
}
export function disposeAssemblyScene(root: Group): void {
  const materials = new Set<MeshStandardMaterial>();
  root.traverse((node) => {
    if (node instanceof Mesh) {
      node.geometry.dispose();
      if (node.material instanceof MeshStandardMaterial) materials.add(node.material);
    }
  });
  for (const material of materials) material.dispose();
}
