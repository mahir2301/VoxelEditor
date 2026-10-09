import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rolldown } from 'rolldown';
const directory = await mkdtemp(join(tmpdir(), 'voxel-editor-tests-'));
try {
  const bundle = await rolldown({
    input: 'tests/editor.test.ts',
    platform: 'node',
    external: [/^node:/]
  });
  const file = join(directory, 'tests.mjs');
  await bundle.write({ file, format: 'esm' });
  await bundle.close();
  const result = spawnSync(process.execPath, ['--test', file], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
