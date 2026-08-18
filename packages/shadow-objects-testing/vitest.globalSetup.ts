import {join} from 'node:path';
import {rimraf} from 'rimraf';

// Resolved against this file's own location, not `process.cwd()` — vitest can be
// invoked from any directory (e.g. a targeted single-file run from the package root).
const screenshotsDir = join(import.meta.dirname, 'test', '__screenshots__');

// Screenshots are captured for failing cases only. Clearing the directory before
// every run — including a targeted single-file run — keeps every image tied to
// the most recent run, so a green run never leaves behind a picture for a case
// that no longer failed.
export default async function setup() {
  await rimraf(screenshotsDir);
}