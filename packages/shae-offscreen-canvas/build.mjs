import {cp} from 'fs/promises';
import path from 'path';
//import {fileURLToPath} from 'url';

const targetSubDir = process.argv[2] || '.npm-pkg';

// const workspaceRoot = path.resolve(fileURLToPath(import.meta.url), '../../');
const projectRoot = path.resolve(process.cwd());
const packageRoot = path.resolve(process.cwd(), targetSubDir);

// console.log('workspaceRoot:', workspaceRoot);
// console.log('projectRoot:', projectRoot);
// console.log('packageRoot:', packageRoot);
// console.log('- - -');

try {
  await cp(`${projectRoot}/README.md`, `${packageRoot}/README.md`);
  await cp(`${projectRoot}/src`, `${packageRoot}/src`, {recursive: true});
} catch (err) {
  console.error('Error:', err.message);
}
