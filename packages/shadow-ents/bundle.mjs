import * as esbuild from 'esbuild';
import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {banner} from '../../scripts/makeBanner/banner.mjs';
import {makeVersionWithBuild} from '../../scripts/makeBanner/makeVersionWithBuild.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json')));

const buildDir = path.join(projectDir, 'build');
const distDir = path.join(projectDir, 'dist');

const makeBanner = (build) => {
  const version = makeVersionWithBuild(build)(packageJson.version);
  return banner({...packageJson, version});
};

await esbuild.build({
  entryPoints: [path.join(buildDir, 'src/shadow-ents.worker.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2017'],
  banner: {js: makeBanner('bundle')},
  outfile: `${buildDir}/src/bundle.worker.js`,
});

await esbuild.build({
  entryPoints: [path.join(buildDir, 'src/bundle.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2017'],
  plugins: [inlineWorkerPlugin()],
  banner: {js: makeBanner('bundle')},
  outfile: `${distDir}/bundle.js`,
});
