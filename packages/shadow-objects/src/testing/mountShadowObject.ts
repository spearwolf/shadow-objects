import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {createTestKernel} from './createTestKernel.js';
import type {
  AnyShadowObjectConstructor,
  MountedShadowObject,
  MountOptions,
  ShadowObjectInstance,
  TestEntity,
  TestKernel,
} from './types.js';

/**
 * Mounts one Shadow Object on one Entity and hands back everything a test asserts on.
 *
 * Asynchronous because the framework is. `contexts` are provided by a synthetic parent Entity, and a
 * context value reaches a reader a microtask after it was written.
 *
 * Two settles, and they buy different things. `settle()` drains the whole microtask cascade, so the
 * second one alone already carries every context value down to every effect. The first is what a
 * constructor gets: it lets the parent's own context signal settle before the object under test is
 * built, so a `useParentContext()` read inside the constructor body answers with the value instead
 * of `undefined` -- that reader is a direct link to the parent and does not pass the Entity's
 * collector.
 *
 * What neither settle can do is hand a context value to a constructor through `useContext()`. That
 * reader does pass the collector, and the value behind it lands after the constructor has returned,
 * in a mounted test as much as in a running application. A context is read inside an effect or a
 * memo.
 */
export async function mountShadowObject<C extends AnyShadowObjectConstructor>(
  constructa: C,
  options: MountOptions = {},
): Promise<MountedShadowObject<C>> {
  const testKernel = createTestKernel({
    ...(options.registry !== undefined ? {registry: options.registry} : {}),
    ...(options.failOnKernelErrors !== undefined ? {failOnKernelErrors: options.failOnKernelErrors} : {}),
    ...(options.echoKernelErrors !== undefined ? {echoKernelErrors: options.echoKernelErrors} : {}),
  });

  // Everything from here on can throw -- a Shadow Object constructor propagates through
  // `createEntity()`, and `shadowObjectOf()` throws when nothing matched. The test kernel is
  // unreachable on that path, because the caller is handed an error rather than a mount, so it is
  // torn down here or never. With `{registry: Registry.get()}` "never" would leave the generated
  // token and the synthetic provider's token in the process-wide Registry for the rest of the run.
  try {
    return await mount(testKernel, constructa, options);
  } catch (error) {
    try {
      testKernel.dispose();
    } catch {
      // `dispose()` throws over an unacknowledged Kernel error -- and a failed mount is exactly the
      // situation that records one. That error must not take the place of the one the caller is
      // waiting for: the original says why the mount failed, and it is the one that gets through.
    }
    throw error;
  }
}

/** The body of the mount, split out so the caller above has one place to put the teardown guard. */
async function mount<C extends AnyShadowObjectConstructor>(
  testKernel: TestKernel,
  constructa: C,
  options: MountOptions,
): Promise<MountedShadowObject<C>> {
  const token = options.token ?? `mounted-shadow-object-${generateUUID()}`;
  testKernel.define(token, constructa);

  let parent: TestEntity | undefined;

  // Hoisted rather than read off `options` inside the closure: a narrowing done out here does not
  // survive into a function body, and the alternative is a non-null assertion per read.
  const providedContexts: Record<string | symbol, unknown> = options.contexts ?? {};
  const contextNames = Reflect.ownKeys(providedContexts);

  if (contextNames.length > 0) {
    const providerToken = `mounted-context-provider-${generateUUID()}`;
    // A function as a context value is read by `provideContext()` as a signal reader rather than as
    // the value. That is `provideContext()`'s contract; the documentation names it next to this.
    testKernel.define(providerToken, function MountedContextProvider({provideContext}: ShadowObjectCreationAPI) {
      for (const name of contextNames) {
        provideContext(name, providedContexts[name]);
      }
    });
    parent = testKernel.createEntity(providerToken);
    await testKernel.settle();
  }

  const ent = testKernel.createEntity(token, options.props, parent !== undefined ? {parent} : {});

  await testKernel.settle();

  const instance = ent.shadowObjectOf(constructa);

  // Written out rather than delegated through a prototype: `TestEntityImpl` keeps its state in
  // private fields, which are branded per instance, so a method reached through `Object.create()`
  // would throw on the first field access.
  return {
    get uuid() {
      return ent.uuid;
    },
    get token() {
      return ent.token;
    },
    get entity() {
      return ent.entity;
    },
    get viewMessages() {
      return ent.viewMessages;
    },
    instance: instance as ShadowObjectInstance<C>,
    testKernel,
    setProps: (props) => ent.setProps(props),
    removeProps: (...names) => ent.removeProps(...names),
    readProp: <T>(name: string) => ent.readProp<T>(name),
    readContext: <T>(name: string | symbol) => ent.readContext<T>(name),
    setToken: (nextToken) => ent.setToken(nextToken),
    setParent: (nextParent, order) => ent.setParent(nextParent, order),
    sendViewEvent: (type, data) => ent.sendViewEvent(type, data),
    emit: (eventName, ...args) => ent.emit(eventName, ...args),
    shadowObjects: () => ent.shadowObjects(),
    shadowObjectOf: <C2 extends AnyShadowObjectConstructor>(other: C2) => ent.shadowObjectOf(other),
    describe: () => ent.describe(),
    clearViewMessages: () => ent.clearViewMessages(),
    settle: () => testKernel.settle(),
    dispose: () => testKernel.dispose(),
  };
}
