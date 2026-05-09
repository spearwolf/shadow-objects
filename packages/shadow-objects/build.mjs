// Build pipeline for @spearwolf/shadow-objects.
//
// One script, two esbuild passes + one tsc pass:
//   1. lib (esbuild, bundle:false)        — preserves src/ layout under dist/src
//   2. types (tsc --emitDeclarationOnly)  — .d.ts + .d.ts.map under dist/src
//   3. single-file bundle (esbuild)       — dist/src/bundle.js + inline worker → dist/bundle.js
// Then writes dist/package.json (publish-ready, with catalog: + workspace:* resolved).
//
// Note: the bundle entry is the TRANSPILED dist/src/bundle.js (not src/bundle.ts) so
// the package.json sideEffects array (which references dist/src/* paths) keeps the
// element-registering imports from being tree-shaken away.

import {execSync} from 'node:child_process';
import {mkdirSync, readFileSync, rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as esbuild from 'esbuild';
import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import {banner} from '../../scripts/makeBanner/banner.mjs';
import {makeVersionWithBuild} from '../../scripts/makeBanner/makeVersionWithBuild.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(projectDir, 'dist');
const distSrcDir = path.join(distDir, 'src');

const pkg = JSON.parse(readFileSync(path.join(projectDir, 'package.json'), 'utf8'));

const log = (emoji, ...args) => console.log(emoji, ...args);

// --- 0. clean -----------------------------------------------------------------------------
rmSync(distDir, {recursive: true, force: true});
mkdirSync(distSrcDir, {recursive: true});

// --- 1. lib transpile ---------------------------------------------------------------------
log('📚', 'Transpile src → dist/src');
const libEntries = (await import('node:fs/promises')).glob('src/**/*.{ts,js}', {cwd: projectDir});
const entryPoints = [];
for await (const f of libEntries) {
  if (/\.(spec|specs|test)\.(ts|js)$/.test(f)) continue;
  entryPoints.push(f);
}
await esbuild.build({
  entryPoints,
  outdir: distSrcDir,
  outbase: 'src',
  format: 'esm',
  target: 'esnext',
  platform: 'browser',
  bundle: false,
  sourcemap: true,
  logLevel: 'warning',
});

// --- 2. types -----------------------------------------------------------------------------
log('🔠', 'Emit .d.ts (tsc)');
execSync('pnpm exec tsc -p tsconfig.lib.json', {cwd: projectDir, stdio: 'inherit'});

// --- 3. single-file bundle ----------------------------------------------------------------
log('📦', 'Bundle dist/src/bundle.js → dist/bundle.js');
const version = makeVersionWithBuild('bundle')(pkg.version);
await esbuild.build({
  entryPoints: [path.join(distSrcDir, 'bundle.js')],
  outfile: path.join(distDir, 'bundle.js'),
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'esnext',
  platform: 'browser',
  banner: {js: banner({...pkg, version})},
  plugins: [
    {
      name: 'swap-create-worker-for-bundle',
      setup(build) {
        // The lib variant of create-worker uses `new Worker(new URL(...))`. The
        // bundle variant (create-worker.bundle.js) inlines the worker source as
        // a Blob — swap them when bundling. The bundle variant imports from
        // `./bundle.worker.js`, a virtual path we redirect to the worker entry
        // so the inline-worker plugin can bundle + inline it.
        build.onResolve({filter: /(^|\/)create-worker\.js$/}, (args) => {
          if (args.kind !== 'import-statement') return undefined;
          return {path: path.resolve(args.resolveDir, args.path.replace(/create-worker\.js$/, 'create-worker.bundle.js'))};
        });
        build.onResolve({filter: /(^|\/)bundle\.worker\.js$/}, (args) => {
          if (args.kind !== 'import-statement') return undefined;
          return {path: path.join(distSrcDir, 'shadow-objects.worker.js')};
        });
      },
    },
    inlineWorkerPlugin(),
  ],
  logLevel: 'warning',
});

// --- 5. dist/package.json (publish-ready) -------------------------------------------------
log('📝', 'Write dist/package.json');
execSync('node ../../scripts/makePackageJson.mjs dist', {cwd: projectDir, stdio: 'inherit'});

log('✅', 'Build complete:', pkg.name, pkg.version);
