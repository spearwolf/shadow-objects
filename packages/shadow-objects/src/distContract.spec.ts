// @vitest-environment node

/// <reference types="node" />
// This spec is the one file in the package that needs Node's ambient types
// (`node:fs`, `node:path`, `node:url`). The reference states that need at the point
// of use instead of a package-wide `compilerOptions.types` entry in `tsconfig.json`.
// TypeScript still merges the referenced globals (`process`, `Buffer`, `require`, …)
// into the single global scope of the whole `pnpm typecheck` run — a directive here
// does not sandbox them to this file — but no other file in the package currently
// relies on them, so nothing changes as a result beyond making this file typecheck.

// The npm audience never sees `src/` — they resolve against `dist/`. This spec
// holds two things a build could silently break: the set of files that land under
// `dist`, and the shape of the `package.json` that ships alongside them (entry
// points, `exports`, `sideEffects`, dependency names). Either drifting on its own,
// without a matching change to the recorded expectation, breaks resolution for a
// consumer without failing the build itself.
//
// `turbo` runs `build` before `test` for this package (`turbo.json#tasks.test.dependsOn`),
// so `dist` already exists whenever this spec runs inside the pipeline. Only a
// vitest watch started directly, bypassing turbo, needs a manual
// `pnpm -F @spearwolf/shadow-objects build` first — the `beforeAll` below says so
// if `dist` is missing.

import {existsSync, readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {beforeAll, describe, expect, it} from 'vitest';
import expectedPackageJsonShape from './distContract.package.json';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const distPackageJsonPath = path.join(distDir, 'package.json');

const collectFilesUnderDist = (): string[] => {
  const entries = readdirSync(distDir, {recursive: true, withFileTypes: true});
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const relativePath = path.relative(distDir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/');
    files.push(relativePath);
  }
  return files.sort();
};

interface DistPackageJsonEntryPoints {
  main?: unknown;
  module?: unknown;
  types?: unknown;
  exports?: unknown;
}

const collectEntryPointStrings = (pkg: DistPackageJsonEntryPoints): string[] => {
  const values: string[] = [];
  const visit = (node: unknown) => {
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

describe('the dist layout of @spearwolf/shadow-objects', () => {
  beforeAll(() => {
    if (!existsSync(distDir) || !existsSync(distPackageJsonPath)) {
      throw new Error(`dist is missing or incomplete at ${distDir} — run "pnpm -F @spearwolf/shadow-objects build" first.`);
    }
  });

  it('the file list under dist matches the recorded expectation', () => {
    const expectedFilesText = readFileSync(fileURLToPath(new URL('./distContract.files.txt', import.meta.url)), 'utf8');
    const expectedFiles = expectedFilesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .sort();

    expect(collectFilesUnderDist()).toEqual(expectedFiles);
  });

  it('the shape of dist/package.json matches the recorded expectation', () => {
    const pkg = JSON.parse(readFileSync(distPackageJsonPath, 'utf8'));

    expect(Object.keys(pkg).sort()).toEqual(expectedPackageJsonShape.topLevelKeys);
    expect({main: pkg.main, module: pkg.module, types: pkg.types}).toEqual(expectedPackageJsonShape.entryPoints);
    expect(pkg.exports).toEqual(expectedPackageJsonShape.exports);
    expect(pkg.sideEffects).toEqual(expectedPackageJsonShape.sideEffects);
    // Only dependency *names* are checked, not their version ranges, and `pkg.version` isn't
    // checked at all: both move on every release, so an expectation that has to be edited on
    // every release is an expectation nobody reads before editing it.
    expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual(expectedPackageJsonShape.dependencyNames);
  });

  it('every entry point in dist/package.json resolves to an existing file', () => {
    const pkg = JSON.parse(readFileSync(distPackageJsonPath, 'utf8'));

    for (const entryPoint of collectEntryPointStrings(pkg)) {
      expect(existsSync(path.join(distDir, entryPoint)), `${entryPoint} does not exist under dist`).toBe(true);
    }
  });

  it('no emitted declaration imports through a source extension', () => {
    // The declarations are what a consumer resolves against, and a `.ts` specifier in them
    // does not resolve under `moduleResolution: NodeNext` or `Node16`. The source extension
    // survives declaration emit verbatim, so the only place it can be caught is here.
    const offenders = collectFilesUnderDist()
      .filter((file) => file.endsWith('.d.ts'))
      .flatMap((file) => {
        const text = readFileSync(path.join(distDir, file), 'utf8');
        return [...text.matchAll(/from '([^']*\.ts)'/g)].map((match) => `${file}: ${match[1]!}`);
      });

    expect(offenders).toEqual([]);
  });
});
