import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { rolldown } from 'rolldown';
// GLTFExporter uses the browser FileReader API for its binary buffer.
class BufferReader {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
}
globalThis.FileReader = BufferReader;
const directory = await mkdtemp(join(tmpdir(), 'voxel-editor-export-'));
try {
  const entry = join(directory, 'entry.ts');
  const cwd = process.cwd();
  await writeFile(
    entry,
    `export { createGLB } from ${JSON.stringify(join(cwd, 'src/utils/exportGLB.ts'))};\nexport { presentationMetadata } from ${JSON.stringify(join(cwd, 'src/features/export/presentation.ts'))};\nexport { towerTemplate } from ${JSON.stringify(join(cwd, 'src/domain/assembly/templates.ts'))};\nexport { hydrate } from ${JSON.stringify(join(cwd, 'src/features/editor/state/document.ts'))};\nexport { serializeState } from ${JSON.stringify(join(cwd, 'src/features/editor/state/serialization.ts'))};\n`
  );
  const bundle = await rolldown({ input: entry, platform: 'node' });
  const file = join(directory, 'export.mjs');
  await bundle.write({ file, format: 'esm' });
  await bundle.close();
  const { createGLB, presentationMetadata, towerTemplate, serializeState, hydrate } = await import(
    file
  );
  const examples = resolve('examples');
  await mkdir(examples, { recursive: true });
  const target = process.argv[2]
    ? resolve(process.argv[2], 'Game.Client/assets/base/blocks')
    : examples;
  await mkdir(target, { recursive: true });
  await Promise.all(
    ['rapid', 'frost', 'beam'].map(async (kind) => {
      const project = join(examples, kind + '.voxproj');
      let document;
      try {
        document = hydrate(JSON.parse(await readFile(project, 'utf8')));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        document = towerTemplate(kind);
        await writeFile(project, JSON.stringify(serializeState(document)));
      }
      await writeFile(join(target, kind + '.glb'), Buffer.from(await createGLB(document)));
      await writeFile(
        join(target, kind + '.presentation.json'),
        JSON.stringify(presentationMetadata(document), null, 2) + '\n'
      );
      console.log('Exported ' + kind + ' assembly to ' + target);
    })
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
