import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { ProjectDocument } from '../features/editor/state/types';
import { buildAssemblyScene, disposeAssemblyScene } from '../features/export/assemblyScene';
import { download, safeFilename } from '../features/export/download';
export async function createGLB(document: ProjectDocument): Promise<ArrayBuffer> {
  const scene = buildAssemblyScene(document);
  try {
    const result = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false });
    if (!(result instanceof ArrayBuffer)) throw new Error('Unexpected GLB export result');
    return result;
  } finally {
    disposeAssemblyScene(scene);
  }
}
export async function exportModelAsGLB(document: ProjectDocument): Promise<void> {
  download(await createGLB(document), safeFilename(document.name) + '.glb');
}
