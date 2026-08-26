#!/usr/bin/env node
/**
 * Playwright ships one Linux WebKit build, and it is linked against Ubuntu 24.04 sonames.
 * On a distribution that carries different ones — Arch, Fedora, openSUSE — the download
 * succeeds and the browser then refuses to start, with a host-dependency banner naming apt
 * packages that do not exist there.
 *
 * The browser bundle already carries a directory for exactly this kind of library:
 * `sys/lib` inside each flavour directory, which its launcher puts on LD_LIBRARY_PATH. Dropping the missing
 * libraries in there makes WebKit run, and makes Playwright's own host validation pass, without
 * touching anything outside the browser cache and without root.
 *
 * Two modes:
 *   (no flag)   report whether anything is missing; exit 1 with the command to fix it.
 *   --install   take the missing libraries out of the matching Playwright container image.
 *
 * Both are a no-op wherever WebKit already resolves — Ubuntu, macOS, Windows, CI.
 *
 * The libraries come from `mcr.microsoft.com/playwright:v<version>-noble`, which is the same
 * image CI's Ubuntu runner effectively is. Tying them to the installed @playwright/test version
 * keeps the ICU major in step with the WebKit build that asks for it.
 */

import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

const require = createRequire(import.meta.url);

const INSTALL = process.argv.includes('--install');
const SETUP_COMMAND = 'pnpm -F shadow-objects-e2e setup:webkit';

// The launcher exports LD_LIBRARY_PATH="<flavour>/lib:<flavour>/sys/lib" and nothing else, so a
// library is only found if it sits in one of those two directories.
const FLAVOURS = ['minibrowser-gtk', 'minibrowser-wpe'];

const ok = (message) => {
  console.log(message);
  process.exit(0);
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (process.platform !== 'linux') {
  ok(`webkit-host-libs: nothing to do on ${process.platform}.`);
}

if (spawnSync('ldd', ['--version']).error) {
  ok('webkit-host-libs: no `ldd` on this system, skipping the check.');
}

let bundleDir;
try {
  const {webkit} = require('@playwright/test');
  // executablePath() points at the bundle's pw_run.sh; the flavours sit next to it.
  bundleDir = dirname(webkit.executablePath());
} catch (error) {
  ok(`webkit-host-libs: cannot locate the WebKit bundle (${error.message}), skipping the check.`);
}

const flavourDirs = FLAVOURS.map((flavour) => join(bundleDir, flavour)).filter((dir) =>
  existsSync(join(dir, 'bin', 'MiniBrowser')),
);

if (flavourDirs.length === 0) {
  ok('webkit-host-libs: WebKit is not installed, leaving that to `playwright install`.');
}

/** Every soname `ldd` cannot resolve, looking exactly where the launcher will look. */
const missingSonames = () => {
  const missing = new Set();
  for (const dir of flavourDirs) {
    const result = spawnSync('ldd', [join(dir, 'bin', 'MiniBrowser')], {
      encoding: 'utf8',
      env: {...process.env, LD_LIBRARY_PATH: `${join(dir, 'lib')}:${join(dir, 'sys', 'lib')}`},
    });
    for (const line of (result.stdout ?? '').split('\n')) {
      const match = /^\s*(\S+)\s+=>\s+not found/.exec(line);
      if (match) missing.add(match[1]);
    }
  }
  return [...missing].sort();
};

const initiallyMissing = missingSonames();

if (initiallyMissing.length === 0) {
  ok('webkit-host-libs: WebKit resolves every library it needs.');
}

if (!INSTALL) {
  fail(
    `webkit-host-libs: WebKit cannot start — ${initiallyMissing.length} librar${initiallyMissing.length === 1 ? 'y is' : 'ies are'} missing:\n` +
      `  ${initiallyMissing.join('\n  ')}\n\n` +
      `Playwright's Linux WebKit build expects Ubuntu 24.04 sonames. Run \`${SETUP_COMMAND}\` to take them\n` +
      'out of the matching Playwright container image and put them into the browser bundle.',
  );
}

const containerRuntime = ['docker', 'podman'].find((runtime) => !spawnSync(runtime, ['--version']).error);

if (!containerRuntime) {
  fail(
    'webkit-host-libs: neither `docker` nor `podman` is available, and they are where the libraries come from.\n' +
      "Install one of them, or provide these sonames yourself in the WebKit bundle's sys/lib directory:\n" +
      `  ${initiallyMissing.join('\n  ')}`,
  );
}

const playwrightVersion = require('@playwright/test/package.json').version;
const image = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;

console.log(
  `webkit-host-libs: sourcing ${initiallyMissing.length} librar${initiallyMissing.length === 1 ? 'y' : 'ies'} from ${image} via ${containerRuntime}.`,
);

/**
 * Copy the named sonames out of the image into every flavour's sys/lib.
 *
 * `tar -h` dereferences, so a soname that is a symlink in the image arrives as a real file under
 * the name the loader asks for — which is all the loader cares about, and it saves resolving the
 * symlink chain here.
 */
const copyFromImage = (sonames) => {
  const archive = execFileSync(
    containerRuntime,
    ['run', '--rm', image, 'tar', '-ch', '-C', '/usr/lib/x86_64-linux-gnu', '-f', '-', ...sonames],
    {maxBuffer: 512 * 1024 * 1024, encoding: 'buffer'},
  );
  for (const dir of flavourDirs) {
    const target = join(dir, 'sys', 'lib');
    mkdirSync(target, {recursive: true});
    execFileSync('tar', ['-x', '-C', target, '-f', '-'], {input: archive});
  }
};

// A copied library can drag in one of its own, so re-check and fetch again until nothing moves.
// Five rounds is far more than the one this has ever needed and still terminates on a soname the
// image does not carry.
let pending = initiallyMissing;
for (let round = 0; round < 5 && pending.length > 0; round += 1) {
  try {
    copyFromImage(pending);
  } catch (error) {
    fail(
      `webkit-host-libs: ${image} does not carry ${pending.join(', ')}.\n` +
        `Extraction failed with: ${(error.stderr?.toString() ?? error.message).trim().split('\n').slice(-3).join(' ')}`,
    );
  }
  const stillMissing = missingSonames();
  if (stillMissing.length === 0) {
    ok(`webkit-host-libs: WebKit resolves every library it needs. Installed ${initiallyMissing.join(', ')}.`);
  }
  if (stillMissing.join() === pending.join()) {
    fail(`webkit-host-libs: still missing after copying — ${stillMissing.join(', ')}.`);
  }
  pending = stillMissing;
}

fail(`webkit-host-libs: gave up with these still missing — ${missingSonames().join(', ')}.`);