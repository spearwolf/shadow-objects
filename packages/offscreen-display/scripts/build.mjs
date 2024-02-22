import * as esbuild from 'esbuild';
import {dirname} from 'node:path';
import {chdir} from 'node:process';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

chdir(__dirname);

const sharedBuildOptions = {
  bundle: true,
  minify: false,
  sourcemap: false,
  format: 'esm',
  target: ['chrome121', 'edge120', 'safari17', 'firefox122'],
  external: ['@spearwolf/eventize', '@spearwolf/signalize'],
};

await Promise.all([
  esbuild.build({
    ...sharedBuildOptions,
    entryPoints: ['src/index.js'],
    outfile: 'dist/offscreen-display.js',
  }),
  esbuild.build({
    ...sharedBuildOptions,
    entryPoints: ['src/worker.js'],
    outfile: 'dist/offscreen-display-worker.js',
  }),
]);
