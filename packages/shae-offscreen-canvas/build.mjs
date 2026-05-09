// Copy source-distribution assets into the publish-ready package root.
// shae-offscreen-canvas is shipped as a source distribution (no bundling) — its
// `package.json#exports` point directly at the `.js` files under `src/`.
import {cp} from 'node:fs/promises';
import path from 'node:path';

const targetSubDir = process.argv[2] || '.npm-pkg';
const projectRoot = path.resolve(process.cwd());
const packageRoot = path.resolve(projectRoot, targetSubDir);

await cp(`${projectRoot}/README.md`, `${packageRoot}/README.md`);
await cp(`${projectRoot}/src`, `${packageRoot}/src`, {recursive: true});
