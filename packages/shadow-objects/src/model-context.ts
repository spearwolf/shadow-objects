/**
 * The model-context layer of the inspection API: one function that registers five read-only
 * tools on `document.modelContext` (WebMCP), the structural contract it talks to the platform
 * through, and the types of both. A subpath rather than an `index.ts` export: this module
 * touches `document` when called, and stays out of the worker bundle and out of every consumer
 * that does not want it. Importing it throws nowhere -- the platform is read only inside a call.
 */
export {
  DefaultToolPrefix,
  type ExposeHandle,
  type ExposeOptions,
  exposeShadowEnvsToModelContext,
} from './model-context/exposeShadowEnvsToModelContext.js';
export {
  findModelContext,
  isModelContextLike,
  type ModelContextLike,
  type ModelContextRegisterOptions,
  type ModelContextToolAnnotations,
  type ModelContextToolLike,
  type ModelContextToolResult,
} from './model-context/ModelContextLike.js';
export type {RedactRule} from './model-context/redactProps.js';
export type {NamespaceRule} from './model-context/toolSupport.js';
export type {EntityMatchEntry, EnvSummary, FindEntitiesEntry, RegistryEntry} from './model-context/tools/index.js';
