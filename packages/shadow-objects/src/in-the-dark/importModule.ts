import {ShadowObjectsExport} from '../constants.js';
import type {ShadowObjectConstructor, ShadowObjectsModule} from '../types.js';
import type {Kernel} from './Kernel.js';

/**
 * The wording both environments use when a module they import carries no `shadowObjects` export.
 * `worker/MessageRouter.ts` puts it in the `error` field of the `ImportedModule` message it posts
 * to the view, where `view/RemoteWorkerEnv.ts` builds an `Error` from it;
 * `view/LocalShadowObjectEnv.ts` rejects `importScript()` with such an `Error` directly.
 */
export const missingShadowObjectsExportMessage = `module has no "${ShadowObjectsExport}" export`;

export async function importModule(
  kernel: Kernel,
  module: ShadowObjectsModule,
  importedModules: Set<ShadowObjectsModule>,
  upgradeEntities = true,
): Promise<void> {
  if (importedModules.has(module)) {
    console.warn('importModule: skipping already imported module', module);
    return;
  } else {
    importedModules.add(module);
  }

  if (module.extends) {
    await Promise.all(module.extends.map((subModule) => importModule(kernel, subModule, importedModules, false)));
  }

  const {registry} = kernel;

  if (module.define) {
    for (const [token, constructa] of Object.entries(module.define)) {
      registry.define(token, constructa as ShadowObjectConstructor);
    }
  }

  if (module.routes) {
    for (const [token, routes] of Object.entries(module.routes)) {
      registry.appendRoute(token, routes);
    }
  }

  await (module.initialize?.({
    define: (token, constructa) => registry.define(token, constructa as ShadowObjectConstructor),
    kernel,
    registry,
  }) ?? Promise.resolve());

  if (upgradeEntities) {
    kernel.upgradeEntities();
  }
}