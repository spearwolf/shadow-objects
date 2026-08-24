// Copy source-distribution assets into the publish-ready package root.
// shae-offscreen-canvas is shipped as a source distribution (no bundling) — its
// `package.json#exports` point directly at the `.js` files under `src/`.
import {cp} from 'node:fs/promises';
import path from 'node:path';

const targetSubDir = process.argv[2] || '.npm-pkg';
const projectRoot = path.resolve(process.cwd());
const packageRoot = path.resolve(projectRoot, targetSubDir);

// Fixtures that record the expected shape of this very output. They live next to
// `distContract.spec.js` under `src/` for the same reason `.spec.js` files do — close
// to the test that reads them — but must never end up inside the published package,
// or the spec would compare `.npm-pkg` against a copy of itself instead of a fixed
// expectation.
const distContractFixtureNames = new Set(['distContract.files.txt', 'distContract.package.json']);

await cp(`${projectRoot}/README.md`, `${packageRoot}/README.md`);
await cp(`${projectRoot}/src`, `${packageRoot}/src`, {
  recursive: true,
  // the published package is a source distribution, and a spec is not part of it. `cp`'s
  // `filter` receives source and destination paths and must answer `true` for a directory,
  // or the whole subtree under it is skipped rather than just the files this excludes
  filter: (source) => !/\.(spec|specs|test)\.(js|ts)$/.test(source) && !distContractFixtureNames.has(path.basename(source)),
});