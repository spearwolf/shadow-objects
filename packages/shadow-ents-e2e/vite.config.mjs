import {readdirSync} from 'fs';
import {basename, dirname, resolve} from 'path';
import {fileURLToPath} from 'url';
import {defineConfig} from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));

const resolvePage = (path) => resolve(projectRoot, 'pages', path);

const pages = Object.fromEntries(
  readdirSync(resolve(projectRoot, 'pages'))
    .filter((file) => file.endsWith('.html'))
    .map((file) => [basename(file, '.html'), resolvePage(file)]),
);

export default defineConfig({
  preview: {
    port: 4174,
  },
  server: {
    port: 5174,
  },
  build: {
    rollupOptions: {
      input: {
        ...pages,
        main: resolve(projectRoot, 'index.html'),
      },
    },
  },
});
