import type { Part, ProjectDocument, Transform } from '../../features/editor/state/types';
import { descendants, identityTransform, matrixOf, transformOf, worldMatrix } from './transforms';
export function newPart(
  name = 'Part',
  parentId: string | null = null,
  kind: Part['kind'] = 'part'
): Part {
  return {
    id: crypto.randomUUID(),
    name,
    parentId,
    kind,
    transform: identityTransform(),
    motion: {
      kind: 'none',
      axis: 'y',
      min: -180,
      max: 180,
      distance: 2,
      duration: 0.14,
      speed: 90
    },
    role: 'None',
    energy: false,
    rigRole: 'None',
    teamColor: false,
    poses: { hold: [0, 0, 0], fire: [0, 0, 0], knockout: [0, 0, 0] },
    exportEnabled: true
  };
}
export function reparent(
  document: ProjectDocument,
  id: string,
  parentId: string | null
): ProjectDocument {
  const piece = document.pieces.find((p) => p.id === id),
    part = document.parts.find((p) => p.id === id);
  if (!piece && !part) return document;
  const parent = document.parts.find((p) => p.id === parentId);
  if (parentId && (!parent || parent.kind !== 'part')) return document;
  if (piece && !parentId) return document;
  if (part && parentId && descendants(id, document.parts).has(parentId)) return document;
  if ((piece?.partId ?? part?.parentId) === parentId) return document;
  const transform = transformOf(
    worldMatrix(parentId, document.parts)
      .invert()
      .multiply(worldMatrix(id, document.parts, document.pieces))
  );
  return piece
    ? {
        ...document,
        pieces: document.pieces.map((p) =>
          p.id === id ? { ...p, partId: parentId!, transform } : p
        )
      }
    : {
        ...document,
        parts: document.parts.map((p) => (p.id === id ? { ...p, parentId, transform } : p))
      };
}
export function setTransform(
  document: ProjectDocument,
  id: string,
  transform: Transform,
  pivot = false
): ProjectDocument {
  const part = document.parts.find((p) => p.id === id);
  if (!part)
    return {
      ...document,
      pieces: document.pieces.map((p) => (p.id === id ? { ...p, transform } : p))
    };
  const correction = matrixOf(transform).invert().multiply(matrixOf(part.transform));
  return {
    ...document,
    parts: document.parts.map((p) =>
      p.id === id
        ? { ...p, transform }
        : pivot && p.parentId === id
          ? { ...p, transform: transformOf(correction.clone().multiply(matrixOf(p.transform))) }
          : p
    ),
    pieces: pivot
      ? document.pieces.map((p) =>
          p.partId === id
            ? { ...p, transform: transformOf(correction.clone().multiply(matrixOf(p.transform))) }
            : p
        )
      : document.pieces
  };
}
export function duplicate(document: ProjectDocument, id: string): ProjectDocument {
  const piece = document.pieces.find((p) => p.id === id);
  if (piece)
    return {
      ...document,
      pieces: [
        ...document.pieces,
        {
          ...piece,
          id: crypto.randomUUID(),
          name: piece.name + ' copy',
          transform: structuredClone(piece.transform),
          voxels: piece.voxels.slice(),
          colors: piece.colors.slice()
        }
      ]
    };
  const ids = descendants(id, document.parts),
    mapping = new Map([...ids].map((old) => [old, crypto.randomUUID()]));
  return {
    ...document,
    parts: [
      ...document.parts,
      ...document.parts
        .filter((p) => ids.has(p.id))
        .map((p) =>
          Object.assign(structuredClone(p), {
            id: mapping.get(p.id)!,
            rigRole: 'None',
            role: 'None',
            name: p.id === id ? p.name + ' copy' : p.name,
            parentId: p.parentId && mapping.has(p.parentId) ? mapping.get(p.parentId)! : p.parentId
          })
        )
    ],
    pieces: [
      ...document.pieces,
      ...document.pieces
        .filter((p) => ids.has(p.partId))
        .map((p) =>
          Object.assign({}, p, {
            id: crypto.randomUUID(),
            partId: mapping.get(p.partId)!,
            transform: structuredClone(p.transform),
            voxels: p.voxels.slice(),
            colors: p.colors.slice()
          })
        )
    ]
  };
}
export function exportIncluded(part: Part, parts: Part[]): boolean {
  return (
    part.exportEnabled &&
    (!part.parentId ||
      exportIncluded(
        parts.find((p) => p.id === part.parentId)!,
        parts
      ))
  );
}
