import type {ShadowObjectConstructor, ShadowObjectsModule} from '../types.js';
import type {Kernel} from './Kernel.js';

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
    for (const [token, constructor] of Object.entries(module.define)) {
      registry.define(token, constructor as ShadowObjectConstructor);
    }
  }

  if (module.routes) {
    for (const [token, routes] of Object.entries(module.routes)) {
      registry.appendRoute(token, routes);
    }
  }

  await (module.initialize?.({
    define: (token, constructor) => registry.define(token, constructor as ShadowObjectConstructor),
    kernel,
    registry,
  }) ?? Promise.resolve());

  if (upgradeEntities) {
    kernel.upgradeEntities();
  }
}
