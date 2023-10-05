import {nodeResolve} from '@rollup/plugin-node-resolve';
import path from 'path';

import {buildDir, distDir, makeBanner, packageJson} from './build.config.mjs';

export default {
  plugins: [nodeResolve()],
  input: {
    index: path.join(buildDir, 'src/index.js'),
    'simple-greeting': path.join(buildDir, 'src/simple-greeting.js'),
  },
  output: [
    {
      banner: makeBanner('esm'),
      dir: distDir,
      entryFileNames: '[name].js',
      format: 'es',
    },
    {
      banner: makeBanner('cjs'),
      dir: distDir,
      entryFileNames: '[name].cjs',
      format: 'commonjs',
      exports: 'named',
    },
  ],
  external: packageJson.rollup?.external,
};
