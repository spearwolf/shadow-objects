import {nodeResolve} from '@rollup/plugin-node-resolve';
import path from 'path';

import {buildDir, distDir, makeBanner, packageJson, projectShortName} from './build.config.mjs';

export default {
  plugins: [nodeResolve()],
  input: {
    [projectShortName]: path.join(buildDir, 'src/index.js'),
  },
  output: [
    {
      banner: makeBanner('esm'),
      dir: distDir,
      entryFileNames: '[name].mjs',
      format: 'es',
    },
    {
      banner: makeBanner('cjs'),
      dir: distDir,
      entryFileNames: '[name].cjs.js',
      format: 'commonjs',
      exports: 'named',
    },
  ],
  external: packageJson.rollup?.external,
};
