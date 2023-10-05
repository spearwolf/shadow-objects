import {nodeResolve} from '@rollup/plugin-node-resolve';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

import {createBanner} from '../../scripts/rollup/createBanner.mjs';
import {makeVersionWithBuild} from '../../scripts/rollup/makeVersionWithBuild.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json')));

const projectShortName = path.basename(projectDir);

const buildDir = path.join(projectDir, 'build');
const distDir = path.join(projectDir, 'dist');

const makeBanner = (build) => {
  const version = makeVersionWithBuild(build)(packageJson.version);
  return createBanner({...packageJson, version});
};

export default {
  plugins: [nodeResolve()],
  input: {
    [projectShortName]: path.join(buildDir, 'src/index.js'),
  },
  output: [
    {
      banner: makeBanner('esm'),
      dir: distDir,
      entryFileNames: '[name].standalone.mjs',
      format: 'es',
    },
  ],
  external: () => false,
};
