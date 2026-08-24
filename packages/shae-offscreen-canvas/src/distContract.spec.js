// @vitest-environment node

// The npm audience never sees `src/` in its uncopied form — they resolve against
// `.npm-pkg`. This spec holds two things a build could silently break: the set of
// files that land under `.npm-pkg`, and the shape of the `package.json` that ships
// alongside them (entry points, `exports`, `sideEffects`, dependency names). Either
// drifting on its own, without a matching change to the recorded expectation, breaks
// resolution for a consumer without failing the build itself.
//
// `.npm-pkg` is produced by a recursive copy of `src/` (see `build.mjs`), not by a
// compiler, so drift here comes from a file being added, renamed or removed under
// `src/` rather than from a type-checker decision.
//
// `turbo` runs `build` before `test` for this package (`turbo.json#tasks.test.dependsOn`),
// so `.npm-pkg` already exists whenever this spec runs inside the pipeline. Only a
// vitest watch started directly, bypassing turbo, needs a manual
// `pnpm -F @spearwolf/shae-offscreen-canvas build` first — the `beforeAll` below says so
// if `.npm-pkg` is missing.

import {existsSync, readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {beforeAll, describe, expect, it} from 'vitest';
import expectedPackageJsonShape from './distContract.package.json';

const distDir = fileURLToPath(new URL('../.npm-pkg', import.meta.url));
const distPackageJsonPath = path.join(distDir, 'package.json');

const collectFilesUnderDist = () => {
  const entries = readdirSync(distDir, {recursive: true, withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const relativePath = path.relative(distDir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/');
    files.push(relativePath);
  }
  return files.sort();
};

const collectEntryPointStrings = (pkg) => {
  const values = [];
  const visit = (node) => {
    if (typeof node === 'string') {
      values.push(node);
    } else if (node && typeof node === 'object') {
      for (const value of Object.values(node)) visit(value);
    }
  };
  visit(pkg.main);
  visit(pkg.module);
  visit(pkg.types);
  visit(pkg.exports);
  return values;
};

describe('the .npm-pkg layout of @spearwolf/shae-offscreen-canvas', () => {
  beforeAll(() => {
    if (!existsSync(distDir) || !existsSync(distPackageJsonPath)) {
      throw new Error(
        `.npm-pkg is missing or incomplete at ${distDir} — run "pnpm -F @spearwolf/shae-offscreen-canvas build" first.`,
      );
    }
  });

  it('the file list under .npm-pkg matches the recorded expectation', () => {
    const expectedFilesText = readFileSync(fileURLToPath(new URL('./distContract.files.txt', import.meta.url)), 'utf8');
    const expectedFiles = expectedFilesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .sort();

    expect(collectFilesUnderDist()).toEqual(expectedFiles);
  });

  it('the shape of .npm-pkg/package.json matches the recorded expectation', () => {
    const pkg = JSON.parse(readFileSync(distPackageJsonPath, 'utf8'));

    expect(Object.keys(pkg).sort()).toEqual(expectedPackageJsonShape.topLevelKeys);
    expect({main: pkg.main, module: pkg.module, types: pkg.types}).toEqual(expectedPackageJsonShape.entryPoints);
    expect(pkg.exports).toEqual(expectedPackageJsonShape.exports);
    expect(pkg.sideEffects).toEqual(expectedPackageJsonShape.sideEffects);
    // Only dependency *names* are checked, not their version ranges, and `pkg.version` isn't
    // checked at all: both move on every release, so an expectation that has to be edited on
    // every release is an expectation nobody reads before editing it.
    expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual(expectedPackageJsonShape.dependencyNames);
    expect(Object.keys(pkg.peerDependencies ?? {}).sort()).toEqual(expectedPackageJsonShape.peerDependencyNames);
    // Unlike the dependency-name check above, this one does hold a shape (not just a name):
    // a peer names a floor a consumer is held to, not a version this package installs, so a
    // `^` or `~` range here would be the exact regression this contract exists to catch.
    expect(pkg.peerDependencies?.three).toMatch(/^>=/);
  });

  it('every entry point in .npm-pkg/package.json resolves to an existing file', () => {
    const pkg = JSON.parse(readFileSync(distPackageJsonPath, 'utf8'));

    for (const entryPoint of collectEntryPointStrings(pkg)) {
      expect(existsSync(path.join(distDir, entryPoint)), `${entryPoint} does not exist under .npm-pkg`).toBe(true);
    }
  });
});