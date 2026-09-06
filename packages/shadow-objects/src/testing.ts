/**
 * The testing utility: a real Kernel for a unit test, with the ceremony taken off.
 *
 * A subpath rather than an `index.ts` export, for the same reason `model-context.js` is one -- it
 * has no place in an application bundle, and none at all in the worker bundle. Nothing here imports
 * a test runner: what a test asserts on are plain arrays, so vitest, jest, `node:test` and the
 * browser mode are served alike. Importing this module registers nothing and touches no global.
 */
export {createTestKernel} from './testing/createTestKernel.js';
export {mountShadowObject} from './testing/mountShadowObject.js';
export {type KernelErrorRecorder, recordKernelErrors} from './testing/recordKernelErrors.js';
export {settle} from './testing/settle.js';
export type {
  AnyShadowObjectConstructor,
  CreateEntityOptions,
  KernelErrorRecord,
  MountedShadowObject,
  MountOptions,
  ShadowObjectInstance,
  TestEntity,
  TestKernel,
  TestKernelOptions,
  ViewMessageRecord,
} from './testing/types.js';
