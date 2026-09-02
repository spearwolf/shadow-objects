import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const targetSubDir = process.argv[2] || '.npm-pkg';

const workspaceRoot = path.resolve(fileURLToPath(import.meta.url), '../../');

// --- pnpm catalog (single source of truth for dependency versions) ---
const CATALOG = loadPnpmCatalog();
const projectRoot = path.resolve(process.cwd());
const packageRoot = path.resolve(process.cwd(), targetSubDir);

console.log('workspaceRoot:', workspaceRoot);
console.log('projectRoot:', projectRoot);
console.log('packageRoot:', packageRoot);
console.log('- - -');

const packageJsonPath = path.resolve(projectRoot, 'package.json');
const inPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const packageJsonOverridePath = path.resolve(projectRoot, 'package.override.json');
const packageJsonOverride = fs.existsSync(packageJsonOverridePath)
  ? JSON.parse(fs.readFileSync(packageJsonOverridePath, 'utf8'))
  : {};

const outPackageJson = {
  ...inPackageJson,
};

[[outPackageJson, ['main', 'module', 'types']], [outPackageJson.exports]].forEach(removeDistPathPrefix);

resolveDependencies(outPackageJson.dependencies);
resolveDependencies(outPackageJson.peerDependencies);

for (const [key, value] of Object.entries(packageJsonOverride)) {
  if (value == null) {
    delete outPackageJson[key];
  } else {
    outPackageJson[key] = value;
  }
}

assertEveryVersionResolved(outPackageJson);

const releasePackageJsonPath = path.resolve(packageRoot, 'package.json');
console.log('Write to', releasePackageJsonPath);
fs.writeFileSync(releasePackageJsonPath, JSON.stringify(outPackageJson, null, 2));

// --------------------------------------------------------------------------------------------

function resolveDependencies(dependenciesSection) {
  if (!dependenciesSection) return;
  for (const [depName, version] of Object.entries(dependenciesSection)) {
    if (version.startsWith('workspace:') || version === '*') {
      const pkgVersion = resolvePackageVersion(depName);
      if (pkgVersion) dependenciesSection[depName] = pkgVersion;
    } else if (version.startsWith('catalog:')) {
      const catalogName = version.slice('catalog:'.length);
      // The main catalog is the pin this workspace installs. A named catalog
      // (`catalog:<name>`) carries ranges that mean something else — a peer
      // range is not an install wish, it's a compatibility promise.
      const catalogVersion = catalogName ? CATALOG.named[catalogName]?.[depName] : CATALOG.default[depName];
      if (catalogVersion) {
        dependenciesSection[depName] = catalogVersion;
      } else if (catalogName) {
        console.warn('Catalog entry not found for', depName, 'in catalog', catalogName, '- leaving as-is');
      } else {
        console.warn('Catalog entry not found for', depName, '- leaving as-is');
      }
    }
  }
}

// Every `catalog:` and `workspace:` specifier is a pnpm-internal reference that resolves
// inside this workspace and nowhere else. One that reaches a published manifest makes the
// package uninstallable for everyone, and nothing downstream catches it: the publish step
// reads an exit code, not a warning. So the write is the last gate, and it refuses.
function assertEveryVersionResolved(pkgJson) {
  const unresolved = [];
  for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, version] of Object.entries(pkgJson[section] ?? {})) {
      if (typeof version === 'string' && /^(catalog|workspace):/.test(version)) {
        unresolved.push(`  ${section}.${name}: ${version}`);
      }
    }
  }
  if (unresolved.length === 0) return;
  console.error('Unresolved version references in the generated package.json:');
  console.error(unresolved.join('\n'));
  console.error('A consumer cannot install these. Check the catalog blocks in pnpm-workspace.yaml.');
  process.exit(1);
}

function loadPnpmCatalog() {
  const ymlPath = path.resolve(workspaceRoot, 'pnpm-workspace.yaml');
  if (!fs.existsSync(ymlPath)) return {default: {}, named: {}};
  const text = fs.readFileSync(ymlPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const entryPattern = /^\s+['"]?([^'":]+?)['"]?\s*:\s*(.+?)\s*(?:#.*)?$/;
  const unquote = (value) => value.replace(/^['"]|['"]$/g, '');

  const catalog = {};
  const named = {};
  let inCatalog = false;
  let inNamedCatalogs = false;
  let currentNamedCatalog = null;

  for (const raw of lines) {
    if (/^catalog:\s*$/.test(raw)) {
      inCatalog = true;
      inNamedCatalogs = false;
      currentNamedCatalog = null;
      continue;
    }
    if (/^catalogs:\s*$/.test(raw)) {
      inCatalog = false;
      inNamedCatalogs = true;
      currentNamedCatalog = null;
      continue;
    }
    if (inCatalog) {
      if (/^\S/.test(raw)) {
        // top-level key encountered (other than comments) → end of catalog
        if (raw.trim() && !raw.trim().startsWith('#')) {
          inCatalog = false;
        } else {
          continue;
        }
      } else {
        const m = raw.match(entryPattern);
        if (m) catalog[m[1]] = unquote(m[2]);
        continue;
      }
    }
    if (inNamedCatalogs) {
      if (/^\S/.test(raw)) {
        // top-level key encountered (other than comments) → end of catalogs
        if (raw.trim() && !raw.trim().startsWith('#')) {
          inNamedCatalogs = false;
          currentNamedCatalog = null;
        }
        continue;
      }
      // one nesting level deeper than `catalog:`: a catalog name, then its pairs
      const nameMatch = raw.match(/^\s{2}['"]?([^'":]+?)['"]?\s*:\s*$/);
      if (nameMatch) {
        currentNamedCatalog = nameMatch[1];
        named[currentNamedCatalog] ??= {};
        continue;
      }
      if (currentNamedCatalog) {
        const m = raw.match(entryPattern);
        if (m) named[currentNamedCatalog][m[1]] = unquote(m[2]);
      }
    }
  }
  return {default: catalog, named};
}

function resolvePackageVersion(pkgName) {
  const pkgNameWithoutScope = pkgName.replace(/^@[^/]+\//, '');
  const pkgJsonPath = path.resolve(workspaceRoot, `packages/${pkgNameWithoutScope}/package.json`);
  console.log('Check workspace package', pkgName, '->', pkgJsonPath);
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const pkgVersion = `^${pkgJson.version.replace(/-dev$/, '')}`;
    console.log('Resolve package version', pkgName, '->', pkgVersion);
    return pkgVersion;
  } else {
    console.warn(
      'Oops.. workspace package not found:',
      pkgName,
      '->',
      pkgNameWithoutScope,
      'referenced from:',
      inPackageJson.name,
    );
  }
  return undefined;
}

// --------------------------------------------------------------------------------------------

function removeDistPathPrefix([section, keys]) {
  if (keys) {
    keys.forEach((key) => {
      removePathPrefixAt(section, key);
    });
  } else {
    const replaceAllPropValues = (obj) => {
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === 'string') {
          removePathPrefixAt(obj, key);
        } else if (typeof obj[key] === 'object') {
          replaceAllPropValues(obj[key]);
        }
      });
    };
    replaceAllPropValues(section);
  }
}

function removePathPrefixAt(section, key, prefix = `${targetSubDir}/`) {
  if (section[key]) {
    section[key] = section[key].replace(prefix, '');
  }
}
