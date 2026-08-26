// Merges the v8 coverage of the three vitest suites into one report for the whole
// workspace. The suites run in different environments over overlapping files: the
// unit specs of packages/shadow-objects exercise the library under happy-dom,
// packages/shadow-objects-testing exercises the same files through the built
// package in real Chromium, and packages/shae-offscreen-canvas covers its own
// source. On its own none of the three says how much of the library any test
// touches.
//
// Each suite writes a raw `coverage-final.json` next to its HTML report. Those are
// declared turbo outputs, so they are on disk after a cache hit as well. The root
// `test`, `test:ci`, `cbt` and `ci` scripts run this afterwards.
//
// A merged file can score a fraction below the better of its two inputs. The two
// runs transform the same source through different pipelines, so their statement
// maps differ slightly and the merge takes the union: a location only one side
// knows enters the denominator with only that side's hits. Measured across the
// library it costs 42 statements on 3182, and it is the price of one number
// instead of two.

import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
// These three are CommonJS; a named import does not resolve against them.
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const projectRoot = path.resolve(process.cwd());

const SUITES = [
  {dir: 'packages/shadow-objects', command: 'pnpm -F @spearwolf/shadow-objects test'},
  {dir: 'packages/shadow-objects-testing', command: 'pnpm -F shadow-objects-testing test'},
  {dir: 'packages/shae-offscreen-canvas', command: 'pnpm -F @spearwolf/shae-offscreen-canvas test'},
];

const coverageMap = libCoverage.createCoverageMap({});

for (const {dir, command} of SUITES) {
  const file = path.resolve(projectRoot, dir, 'coverage', 'coverage-final.json');
  if (!existsSync(file)) {
    console.error(`no coverage report at ${path.relative(projectRoot, file)} -- run \`${command}\` first`);
    process.exit(1);
  }
  const suite = libCoverage.createCoverageMap(JSON.parse(readFileSync(file, 'utf8')));
  console.log(`${dir}: ${suite.files().length} files`);
  coverageMap.merge(suite);
}

const context = libReport.createContext({
  dir: path.resolve(projectRoot, 'coverage'),
  coverageMap,
  defaultSummarizer: 'nested',
});

reports.create('text-summary').execute(context);
reports.create('html').execute(context);
