import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import {banner} from '../../scripts/makeBanner/banner.mjs';
import {makeVersionWithBuild} from '../../scripts/makeBanner/makeVersionWithBuild.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json')));

const buildDir = path.join(projectDir, 'build');
const distDir = path.join(projectDir, 'dist');

const makeBanner = (build) => {
  const version = makeVersionWithBuild(build)(packageJson.version);
  return {js: banner({...packageJson, version})};
};

const build = async (emoji, entry, outfile, moreBuildOptions = {}) => {
  console.log(emoji, 'Building', outfile);

  return esbuild.build({
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'esnext',
    ...moreBuildOptions,
    entryPoints: [entry],
    outfile,
  });
};

const copyFiles = (files) => {
  for (const [from, to] of files) {
    fs.copyFileSync(from, to);
  }
};

// --- worker ---------------------------------------------------------------------------

await build('🛠️', `${buildDir}/src/shadow-objects.worker.js`, `${buildDir}/src/bundle.worker.js`);

copyFiles([
  [`${buildDir}/src/create-worker.bundle.js`, `${buildDir}/src/create-worker.js`],
  [`${buildDir}/src/create-worker.bundle.js.map`, `${buildDir}/src/create-worker.js.map`],
  [`${buildDir}/src/create-worker.bundle.d.ts`, `${buildDir}/src/create-worker.d.ts`],
  [`${buildDir}/src/create-worker.bundle.d.ts.map`, `${buildDir}/src/create-worker.d.ts.map`],
]);

// --- bundles --------------------------------------------------------------------------

const plugins = [inlineWorkerPlugin()];

await build('📦', `${buildDir}/src/bundle.js`, `${distDir}/bundle.js`, {plugins, banner: makeBanner('bundle')});

console.log('✅ Bundle', packageJson.name, 'is ready!\n');
