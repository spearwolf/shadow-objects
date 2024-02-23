import {build} from 'esbuild';
import {dirname} from 'node:path';
import {chdir} from 'node:process';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

chdir(__dirname);

const sharedBuildOptions = {
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['chrome121', 'edge120', 'safari17', 'firefox122'],
};

await Promise.all([
  build({
    ...sharedBuildOptions,
    entryPoints: ['src/rainbow-line.js'],
    outfile: 'rainbow-line.js',
  }),
  build({
    ...sharedBuildOptions,
    entryPoints: ['src/rainbow-line-worker.js'],
    outfile: 'rainbow-line-worker.js',
  }),
]);
