import * as esbuild from 'esbuild';
import path from 'path';

import {buildDir, distDir, makeBanner, projectShortName} from './build.config.mjs';

await esbuild.build({
  entryPoints: [path.join(buildDir, 'src/index.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020'],
  banner: {js: makeBanner('standalone')},
  outfile: `${distDir}/${projectShortName}.standalone.js`,
});
