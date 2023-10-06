import * as esbuild from 'esbuild';
import path from 'path';

import {buildDir, distDir, makeBanner} from './build.config.mjs';

await esbuild.build({
  entryPoints: [path.join(buildDir, 'src/bundle.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2017'],
  banner: {js: makeBanner('bundle')},
  outfile: `${distDir}/bundle.js`,
});
