import { parseSerializedProjectOrThrow } from '../editor/state/projectSchema';
import type { ProjectDocument, SerializedProject } from '../editor/state/types';
import { download, safeFilename } from './download';
import { presentationMetadata } from './presentation';
export function exportPresentation(document: ProjectDocument): void {
  download(
    JSON.stringify(presentationMetadata(document), null, 2),
    safeFilename(document.name) + '.presentation.json',
    'application/json'
  );
}
export function exportProject(project: SerializedProject): void {
  parseSerializedProjectOrThrow(project);
  download(JSON.stringify(project), safeFilename(project.name) + '.voxproj', 'application/json');
}
export async function importProject(file: File): Promise<SerializedProject> {
  if (file.size > 64 * 1024 * 1024) throw new Error('Project files must be smaller than 64 MB.');
  return parseSerializedProjectOrThrow(JSON.parse(await file.text()));
}
