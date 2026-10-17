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
    `export { rigFixtures } from ${JSON.stringify(join(cwd, 'src/domain/assembly/rigFixtures.ts'))};\nexport { createGLB } from ${JSON.stringify(join(cwd, 'src/utils/exportGLB.ts'))};\nexport { presentationMetadata } from ${JSON.stringify(join(cwd, 'src/features/export/presentation.ts'))};\nexport { assemblyTemplate } from ${JSON.stringify(join(cwd, 'src/domain/assembly/actorTemplates.ts'))};\nexport { hydrate } from ${JSON.stringify(join(cwd, 'src/features/editor/state/document.ts'))};\nexport { serializeState } from ${JSON.stringify(join(cwd, 'src/features/editor/state/serialization.ts'))};\n`
  );
  const bundle = await rolldown({ input: entry, platform: 'node' });
  const file = join(directory, 'export.mjs');
  await bundle.write({ file, format: 'esm' });
  await bundle.close();
  const {
    rigFixtures,
    createGLB,
    presentationMetadata,
    assemblyTemplate,
    serializeState,
    hydrate
  } = await import(file);
  if (process.argv[2])
    await writeFile(
      resolve(process.argv[2], 'Game.Client/assets/rig-samples.json'),
      JSON.stringify(rigFixtures(), null, 2) + '\n'
    );
  const examples = resolve('examples');
  await mkdir(examples, { recursive: true });

  await Promise.all(
    ['rapid', 'frost', 'beam', 'player', 'weapon-pulse', 'weapon-arc'].map(async (kind) => {
      const folder =
        kind === 'player' ? 'players' : kind.startsWith('weapon-') ? 'weapons' : 'blocks';
      const filename = kind === 'player' ? 'default' : kind.replace('weapon-', '');
      const target = process.argv[2]
        ? resolve(process.argv[2], 'Game.Client/assets/base', folder)
        : examples;
      await mkdir(target, { recursive: true });
      const project = join(examples, kind + '.voxproj');
      let document;
      try {
        document = hydrate(JSON.parse(await readFile(project, 'utf8')));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        document = assemblyTemplate(kind);
        await writeFile(project, JSON.stringify(serializeState(document)));
      }
      await writeFile(
        join(target, (process.argv[2] ? filename : kind) + '.glb'),
        Buffer.from(await createGLB(document))
      );
      await writeFile(
        join(target, (process.argv[2] ? filename : kind) + '.presentation.json'),
        JSON.stringify(presentationMetadata(document), null, 2) + '\n'
      );
      console.log('Exported ' + kind + ' assembly to ' + target);
    })
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
