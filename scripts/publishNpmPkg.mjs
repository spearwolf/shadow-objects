import {execFile, execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DRY_RUN = false || process.argv.includes('--dry-run');

const workspaceRoot = path.resolve(fileURLToPath(import.meta.url), '../../');
const projectRoot = path.resolve(process.cwd());
const packageRoot = path.resolve(projectRoot, process.argv[2]);
const pkgJson = JSON.parse(fs.readFileSync(path.resolve(packageRoot, 'package.json'), 'utf8'));

// npm reaches the registry either through OIDC trusted publishing (CI) or a token (local).
// Both arrive as environment variables, and turbo runs its tasks in strict env mode — every
// name read here has to be listed in the `publishNpmPkg` task's `passThroughEnv` in turbo.json,
// or it is stripped before this script ever starts.
const hasOidc = Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN);
const authToken = process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN;

console.log('workspaceRoot:', workspaceRoot);
console.log('projectRoot:', projectRoot);
console.log('packageRoot:', packageRoot);
console.log('dryRun:', DRY_RUN ? 'yes' : 'no');
console.log('auth: ---');
console.log(' - OIDC trusted publishing:', hasOidc ? 'available' : 'unavailable');
console.log(' - NPM_TOKEN:', process.env.NPM_TOKEN ? 'set' : 'unset');
console.log(' - NODE_AUTH_TOKEN:', process.env.NODE_AUTH_TOKEN ? 'set' : 'unset');
console.log('packageJson: ---');
console.dir(pkgJson);

if (pkgJson.version.endsWith('-dev')) {
  console.warn('skip publishing, version', pkgJson.version, 'is marked as a *development* version');
  process.exit(0);
}

// npm receives its arguments as an array. No shell parses this call, so no character in the
// package name can be read as syntax.
execFile('npm', ['show', pkgJson.name, 'versions', '--json'], (error, stdout, stderr) => {
  if (!error) {
    const versions = JSON.parse(stdout);
    console.log('already published versions: ---');
    console.dir(versions);

    if (versions.includes(pkgJson.version)) {
      console.warn('skip publishing, version', pkgJson.version, 'is already released');
      process.exit(0);
    } else {
      publishPackage();
    }
  } else if (stderr?.toString().toLowerCase().includes('e404')) {
    console.log('oh it looks like this is the first time to publish the package :)');
    publishPackage();
  } else {
    console.error(`npm show panic: ${stderr || error.message}`);
    process.exit(1);
  }
});

function publishPackage(dryRun = DRY_RUN) {
  if (!dryRun && !hasOidc && !authToken) {
    console.error(
      'no way to authenticate against the registry: neither an OIDC id-token request (ACTIONS_ID_TOKEN_REQUEST_URL /',
      '_TOKEN) nor NODE_AUTH_TOKEN / NPM_TOKEN reached this process.',
    );
    console.error('in CI this usually means the job lacks `permissions: id-token: write`,');
    console.error('or turbo stripped the variable because it is missing from `passThroughEnv` in turbo.json.');
    process.exit(1);
  }

  if (packageRoot !== projectRoot) {
    preparePackageRoot();
  }

  // Provenance attestations come for free with trusted publishing; npm generates them
  // without --provenance as long as the package.json carries a `repository` field.
  execFileSync('npm', ['publish', '--access', 'public', ...(dryRun ? ['--dry-run'] : [])], {cwd: packageRoot, stdio: 'inherit'});

  process.exit(0);
}

function preparePackageRoot() {
  copyFile(path.resolve(workspaceRoot, 'LICENSE'), path.resolve(packageRoot, 'LICENSE'));
  copyFile(path.resolve(projectRoot, 'CHANGELOG.md'), path.resolve(packageRoot, 'CHANGELOG.md'));

  const readmePkgPath = path.resolve(projectRoot, 'README-pkg.md');
  const readmeDstPath = path.resolve(packageRoot, 'README.md');
  if (fs.existsSync(readmePkgPath)) {
    copyFile(readmePkgPath, readmeDstPath);
  } else {
    copyFile(path.resolve(projectRoot, 'README.md'), readmeDstPath);
  }
}

function copyFile(src, dst) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
  }
}
