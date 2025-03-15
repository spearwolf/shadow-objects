// @ts-ignore
import Worker from './bundle.worker.js';

// This module is converted to __inline__ worker code using the esbuild-plugin-inline-worker plugin.
// It is done in the `bundle.mjs` build script.
//
// `worker/WorkerRuntime.ts` => `shadow-objects.worker.js` => `bundle.worker.js`

export default () => new Worker();
