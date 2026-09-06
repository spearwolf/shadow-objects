# Shadow Object Testing Utility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@spearwolf/shadow-objects/testing.js` -- `createTestKernel()`, `TestEntity` and `mountShadowObject()` -- so that a consumer can unit-test a Shadow Object against the real Kernel instead of a hand-written mock.

**Architecture:** Seven small modules under `src/testing/`, each with one responsibility, behind one barrel. Nothing new is invented: the utility wraps `Kernel`, `Registry` and `Entity`, which are already headless, and adds the eight pieces of ceremony a test would otherwise write itself -- Registry isolation, uuid bookkeeping, object-shaped properties, typed instance access, signal reading, microtask draining, View message recording and Kernel error recording.

**Tech Stack:** TypeScript 7 (emit-only declarations), esbuild transpile, vitest 4 with the `happy-dom` environment and the `forks` pool, `@spearwolf/eventize` and `@spearwolf/signalize` as the existing runtime dependencies. No new dependency, and no test runner is imported by anything under `src/testing/` that is not itself a spec.

**Spec:** `docs/proposals/shadow-object-testing-utility.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Package:** all source and spec paths are relative to `packages/shadow-objects/`.
- **Run one spec:** `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/<name>.spec.ts --run`
- **Run the package suite:** `pnpm -F @spearwolf/shadow-objects build && pnpm -F @spearwolf/shadow-objects test`. The build comes first because `src/distContract.spec.ts` reads a real `dist/`; without it that one spec fails and says nothing about this work.
- **Lint and format:** `pnpm lint:fix` from the repository root; `pnpm lint:ci` must exit 0 (it fails on warnings, unlike `pnpm lint`).
- **Typecheck:** `pnpm -F @spearwolf/shadow-objects typecheck` (`tsc --noEmit` over the whole tree, specs included).
- **TypeScript settings that bite:** `strict`, `exactOptionalPropertyTypes: true` (never assign an explicit `undefined` to an optional property -- use a conditional spread), `noUncheckedIndexedAccess: true` (every index access is `T | undefined`), `noUnusedLocals` and `noUnusedParameters` are on, `verbatimModuleSyntax: true` (a type-only import **must** be written `import type`), target `ES2022`, and every relative import ends in `.js`.
- **Biome formatting:** 2 spaces, line width 130, single quotes, semicolons always, trailing commas everywhere, **no** bracket spacing (`{settle}`, not `{ settle }`), arrow parentheses always.
- **Specs live next to their source** as `src/testing/<name>.spec.ts`. They use vitest globals via explicit imports (`import {describe, expect, it} from 'vitest'`), matching the rest of `src/`.
- **Dist contract:** every new file under `src/testing/` emits four artifacts -- `.d.ts`, `.d.ts.map`, `.js`, `.js.map`. Add all four to `src/distContract.files.txt` in the same commit. The file is a plain sorted list; the whole `src/testing…` block sits between `src/shae-worker.js.map` and `src/types.d.ts`, and within `src/testing/` the sort is `TestEntity`, `createTestKernel`, `mountShadowObject`, `recordKernelErrors`, `settle`, `types` (uppercase sorts before lowercase). Task 10 verifies the list against a real build.
- **No banned analogies** (`AGENTS.md` §4): never write "shadow theater", "puppet", "puppeteer", "light world", or "screen" as an analogy. Use Entity, Kernel, Shadow Object, Token, Registry, View.
- **Every commit message ends with these two trailers**, separated from the body by a blank line:

  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01E9v9mERJ1ZK22HHWwnWhNe
  ```

  The commit steps below show the subject and body only; append the trailers to each.

---

### Task 1: `settle()`

Drains the microtask queue, including everything the queue grows while it is being drained.

**Files:**
- Create: `packages/shadow-objects/src/testing/settle.ts`
- Test: `packages/shadow-objects/src/testing/settle.spec.ts`
- Modify: `packages/shadow-objects/src/distContract.files.txt`

**Interfaces:**
- Consumes: nothing.
- Produces: `settle(): Promise<void>` from `./settle.js`. Tasks 3 and 9 call it.

- [ ] **Step 1: Write the failing test**

Create `packages/shadow-objects/src/testing/settle.spec.ts`:

```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {settle} from './settle.js';

describe('settle', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('drains a cascade of microtasks, not just the first generation', async () => {
    const order: string[] = [];

    queueMicrotask(() => {
      order.push('first');
      queueMicrotask(() => {
        order.push('second');
        queueMicrotask(() => {
          order.push('third');
        });
      });
    });

    expect(order).toEqual([]);

    await settle();

    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('resolves while fake timers are installed', async () => {
    vi.useFakeTimers();

    let reached = false;
    queueMicrotask(() => {
      reached = true;
    });

    await settle();

    expect(reached).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/settle.spec.ts --run`
Expected: FAIL -- `Failed to resolve import "./settle.js"`.

- [ ] **Step 3: Write the implementation**

Create `packages/shadow-objects/src/testing/settle.ts`:

```ts
/**
 * Waits until the microtask queue is empty, including everything it grows while it is drained.
 *
 * A single `await Promise.resolve()` clears one generation of microtasks and lies about the rest,
 * and the Kernel produces more than one: `dispatchMessageToView()` queues a microtask of its own,
 * and the `MicrotaskCollector` behind the Entity Contexts is documented to accept writes from
 * inside its own delivery, which schedules the next round. A macrotask hop waits for all of them.
 *
 * `MessageChannel` rather than `setTimeout`, because a test that installs fake timers is a test
 * that has frozen `setTimeout`, and a `settle()` that never resolves under fake timers is an
 * afternoon of debugging per consumer. A message port is not a timer. The `setTimeout` fallback
 * covers a realm that has no `MessageChannel`.
 */
export function settle(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof MessageChannel === 'function') {
      const channel = new MessageChannel();
      // Assigning `onmessage` starts the port; no explicit `start()` is needed.
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(undefined);
    } else {
      setTimeout(resolve, 0);
    }
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/settle.spec.ts --run`
Expected: PASS, 2 tests.

If the fake-timer test hangs until vitest's 5 s timeout, `MessageChannel` was not found and the `setTimeout` fallback ran. Check with `pnpm -F @spearwolf/shadow-objects exec vitest --run --reporter=verbose` and, if the global really is missing in this environment, report it rather than working around it -- the whole point of the branch is that the fallback is the rare path.

- [ ] **Step 5: Add the emitted files to the dist contract**

In `packages/shadow-objects/src/distContract.files.txt`, insert between the line `src/shae-worker.js.map` and the line `src/types.d.ts`:

```
src/testing/settle.d.ts
src/testing/settle.d.ts.map
src/testing/settle.js
src/testing/settle.js.map
```

- [ ] **Step 6: Lint, format and typecheck**

Run: `pnpm lint:fix && pnpm lint:ci && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: all three exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/shadow-objects/src/testing/settle.ts \
        packages/shadow-objects/src/testing/settle.spec.ts \
        packages/shadow-objects/src/distContract.files.txt
git commit -m "feat: settle() drains the whole microtask cascade, and survives fake timers

The Kernel defers on two paths -- a microtask per message to the View, and
the collector behind the Entity Contexts, which accepts writes from inside
its own delivery. One await clears one generation; a message-port hop clears
all of them, and unlike a timer it is not frozen by vi.useFakeTimers()."
```

---

### Task 2: The type surface and the Kernel error recorder

`types.ts` declares everything the later tasks implement against, so no task has to guess a neighbour's names. `recordKernelErrors.ts` is the first behaviour built on it.

**Files:**
- Create: `packages/shadow-objects/src/testing/types.ts`
- Create: `packages/shadow-objects/src/testing/recordKernelErrors.ts`
- Test: `packages/shadow-objects/src/testing/recordKernelErrors.spec.ts`
- Modify: `packages/shadow-objects/src/distContract.files.txt`

**Interfaces:**
- Consumes: `settle()` is referenced by the `TestKernel` type only.
- Produces: from `./types.js` the types `AnyShadowObjectConstructor`, `ShadowObjectInstance<C>`, `KernelErrorRecord`, `ViewMessageRecord`, `CreateEntityOptions`, `TestEntity`, `TestKernelOptions`, `TestKernel`, `MountOptions`, `MountedShadowObject<C>`. From `./recordKernelErrors.js` the function `recordKernelErrors(logger: ConsoleLogger, echo?: boolean): KernelErrorRecorder` and the interface `KernelErrorRecorder` with `records: readonly KernelErrorRecord[]`, `clear(): void`, `unhook(): void`.

- [ ] **Step 1: Write the type surface**

Create `packages/shadow-objects/src/testing/types.ts`:

```ts
import type {Entity} from '../in-the-dark/Entity.js';
import type {Kernel} from '../in-the-dark/Kernel.js';
import type {Registry} from '../in-the-dark/Registry.js';
import type {
  ShadowObjectConstructor,
  ShadowObjectConstructorFunc,
  ShadowObjectDescription,
  ShadowObjectsModule,
  ShadowObjectType,
} from '../types.js';

/** Either shape a Shadow Object can be defined in. */
export type AnyShadowObjectConstructor = ShadowObjectConstructor | ShadowObjectConstructorFunc;

/**
 * The instance a constructor produces. A function constructor that returns nothing yields
 * `object`, which is honest: there is an eventized instance, and it carries nothing a test can name.
 */
export type ShadowObjectInstance<C> = C extends new (...args: any[]) => infer R
  ? R
  : C extends (...args: any[]) => infer R
    ? R extends object
      ? R
      : object
    : object;

/** One report the Kernel made through its logger while a test kernel was recording. */
export interface KernelErrorRecord {
  level: 'error' | 'warn';
  /** The arguments as they were logged. `runGuarded()` puts its message first and the error last. */
  args: readonly unknown[];
  /** The last argument, where that argument is an `Error`. */
  error?: Error;
}

/** One message an Entity sent towards the View. */
export interface ViewMessageRecord {
  type: string;
  data: unknown;
  traverseChildren?: boolean;
}

export interface CreateEntityOptions {
  uuid?: string;
  order?: number;
  parent?: TestEntity;
  autoDestructionOnParentRemoval?: boolean;
}

/** One handle per Entity. The same uuid always answers with the same handle. */
export interface TestEntity {
  readonly uuid: string;
  /** The token the Kernel currently holds for this Entity. */
  readonly token: string;
  /** The Entity itself -- the way out for everything this handle does not cover. */
  readonly entity: Entity;
  /** What this Entity sent towards the View since the last `clearViewMessages()`. */
  readonly viewMessages: readonly ViewMessageRecord[];

  createChild(token: string, props?: Record<string, unknown>, options?: Omit<CreateEntityOptions, 'parent'>): TestEntity;

  setProps(props: Record<string, unknown>): void;
  removeProps(...names: string[]): void;
  readProp<T = unknown>(name: string): T | undefined;
  readContext<T = unknown>(name: string | symbol): T | undefined;

  setToken(token: string): void;
  setParent(parent: TestEntity | undefined, order?: number): void;

  /** Deliver a View event. Synchronous, as the Kernel's own delivery is. */
  sendViewEvent(type: string, data?: unknown): void;
  /** Emit on the Entity's event bus -- the channel Shadow Objects on one Entity talk to each other on. */
  emit(eventName: string | symbol, ...args: unknown[]): void;

  shadowObjects(): ShadowObjectType[];
  /** The one Shadow Object on this Entity built from `constructa`. Throws for none and for more than one. */
  instanceOf<C extends AnyShadowObjectConstructor>(constructa: C): ShadowObjectInstance<C>;
  describe(): ShadowObjectDescription[];

  clearViewMessages(): void;
  destroy(): void;
}

export interface TestKernelOptions {
  /**
   * The Registry to build on. Default: a fresh `new Registry()`, isolated from the default Registry
   * and from every other test kernel. Pass `Registry.get()` for Shadow Objects that registered
   * themselves through `@ShadowObject` without a registry of their own.
   */
  registry?: Registry;
  /** Fail `dispose()` when unacknowledged reports of level `error` were recorded. Default: `true`. */
  failOnKernelErrors?: boolean;
  /** Keep the Kernel's logger output on the console as well as recording it. Default: `false`. */
  echoKernelErrors?: boolean;
}

export interface TestKernel {
  /** The Kernel itself -- the way out for everything this facade does not cover. */
  readonly kernel: Kernel;
  readonly registry: Registry;
  /** What the Kernel reported through its logger since the last `clearErrors()`. */
  readonly errors: readonly KernelErrorRecord[];

  define(token: string, constructa: AnyShadowObjectConstructor): void;
  route(token: string, targets: string[]): void;
  importModule(module: ShadowObjectsModule): Promise<void>;

  createEntity(token: string, props?: Record<string, unknown>, options?: CreateEntityOptions): TestEntity;
  /**
   * The handle for a uuid, or `undefined` when the Kernel holds no such Entity. A uuid a Shadow
   * Object created through `testKernel.kernel.createEntity()` gets a handle here on first ask.
   */
  entity(uuid: string): TestEntity | undefined;

  settle(): Promise<void>;
  clearErrors(): void;
  dispose(): void;
}

export interface MountOptions {
  props?: Record<string, unknown>;
  /** Entity Contexts a synthetic parent Entity provides to the object under test. */
  contexts?: Record<string | symbol, unknown>;
  /** The token to register the constructor under. Default: a generated one. */
  token?: string;
  registry?: Registry;
  failOnKernelErrors?: boolean;
  echoKernelErrors?: boolean;
}

export interface MountedShadowObject<C> extends Omit<TestEntity, 'createChild' | 'destroy'> {
  readonly instance: ShadowObjectInstance<C>;
  readonly testKernel: TestKernel;
  settle(): Promise<void>;
  dispose(): void;
}
```

- [ ] **Step 2: Write the failing test for the recorder**

Create `packages/shadow-objects/src/testing/recordKernelErrors.spec.ts`:

```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {recordKernelErrors} from './recordKernelErrors.js';

describe('recordKernelErrors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records an error report with its arguments and the trailing Error', () => {
    const logger = new ConsoleLogger('TestRecorder');
    const recorder = recordKernelErrors(logger);
    const cause = new RangeError('out of range');

    logger.error('shadow-object onDestroy hook failed:', 'PlayerLogic', cause);

    expect(recorder.records).toHaveLength(1);
    expect(recorder.records[0]!.level).toBe('error');
    expect(recorder.records[0]!.args).toEqual(['shadow-object onDestroy hook failed:', 'PlayerLogic', cause]);
    expect(recorder.records[0]!.error).toBe(cause);

    recorder.unhook();
  });

  it('records a warning and leaves its error field unset when nothing trailing is an Error', () => {
    const logger = new ConsoleLogger('TestRecorder');
    const recorder = recordKernelErrors(logger);

    logger.warn('importModule: skipping already imported module', {define: {}});

    expect(recorder.records).toHaveLength(1);
    expect(recorder.records[0]!.level).toBe('warn');
    expect(recorder.records[0]!.error).toBeUndefined();

    recorder.unhook();
  });

  it('keeps the console quiet by default and speaks with echo on', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const quiet = new ConsoleLogger('TestRecorderQuiet');
    const quietRecorder = recordKernelErrors(quiet);
    quiet.error('kept to itself');
    expect(consoleError).not.toHaveBeenCalled();
    quietRecorder.unhook();

    const loud = new ConsoleLogger('TestRecorderLoud');
    const loudRecorder = recordKernelErrors(loud, true);
    loud.error('said out loud');
    expect(consoleError).toHaveBeenCalledTimes(1);
    loudRecorder.unhook();
  });

  it('clear() empties the records and unhook() gives the logger its own methods back', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new ConsoleLogger('TestRecorderRestore');
    const recorder = recordKernelErrors(logger);

    logger.error('one');
    expect(recorder.records).toHaveLength(1);

    recorder.clear();
    expect(recorder.records).toHaveLength(0);

    recorder.unhook();
    expect(Object.hasOwn(logger, 'error')).toBe(false);

    logger.error('two');
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(recorder.records).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/recordKernelErrors.spec.ts --run`
Expected: FAIL -- `Failed to resolve import "./recordKernelErrors.js"`.

- [ ] **Step 4: Write the implementation**

Create `packages/shadow-objects/src/testing/recordKernelErrors.ts`:

```ts
import type {ConsoleLogger} from '../utils/ConsoleLogger.js';
import type {KernelErrorRecord} from './types.js';

export interface KernelErrorRecorder {
  readonly records: readonly KernelErrorRecord[];
  clear(): void;
  unhook(): void;
}

/**
 * Records what a Kernel reports through its logger, and keeps it off the console.
 *
 * The Kernel answers a failing teardown by reporting it and carrying on -- `runGuarded()` hands
 * nothing back to a caller, because on that path there is no caller left to decide anything. A test
 * therefore has no way to see a Shadow Object whose `onDestroy` threw, unless it watches the logger.
 *
 * `error` and `warn` live on `ConsoleLogger.prototype`, so writing them here shadows them with own
 * properties and `unhook()` deletes those again. `warn` is recorded even though the real method is
 * gated behind `ConsoleLogger.isWarn`, which is off outside a loopback host: a test wants the report
 * whatever the host it runs on happens to be.
 */
export function recordKernelErrors(logger: ConsoleLogger, echo = false): KernelErrorRecorder {
  const records: KernelErrorRecord[] = [];

  const originals: Record<'error' | 'warn', (...args: any[]) => void> = {
    error: logger.error,
    warn: logger.warn,
  };
  const wasOwn: Record<'error' | 'warn', boolean> = {
    error: Object.hasOwn(logger, 'error'),
    warn: Object.hasOwn(logger, 'warn'),
  };

  const record =
    (level: 'error' | 'warn') =>
    (...args: any[]) => {
      const last = args.length > 0 ? args[args.length - 1] : undefined;
      records.push({level, args, ...(last instanceof Error ? {error: last} : {})});
      if (echo) {
        originals[level].apply(logger, args);
      }
    };

  logger.error = record('error');
  logger.warn = record('warn');

  return {
    records,
    clear() {
      records.length = 0;
    },
    unhook() {
      for (const level of ['error', 'warn'] as const) {
        if (wasOwn[level]) {
          logger[level] = originals[level];
        } else {
          delete (logger as Partial<ConsoleLogger>)[level];
        }
      }
    },
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/recordKernelErrors.spec.ts --run`
Expected: PASS, 4 tests.

- [ ] **Step 6: Add the emitted files to the dist contract**

In `packages/shadow-objects/src/distContract.files.txt`, add in sorted position inside the `src/testing/` block:

```
src/testing/recordKernelErrors.d.ts
src/testing/recordKernelErrors.d.ts.map
src/testing/recordKernelErrors.js
src/testing/recordKernelErrors.js.map
src/testing/types.d.ts
src/testing/types.d.ts.map
src/testing/types.js
src/testing/types.js.map
```

- [ ] **Step 7: Lint, format and typecheck**

Run: `pnpm lint:fix && pnpm lint:ci && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: all three exit 0. `types.ts` is declarations only, so `noUnusedLocals` will complain about any import it does not actually use -- every one of the eight imports is used by an interface above.

- [ ] **Step 8: Commit**

```bash
git add packages/shadow-objects/src/testing/types.ts \
        packages/shadow-objects/src/testing/recordKernelErrors.ts \
        packages/shadow-objects/src/testing/recordKernelErrors.spec.ts \
        packages/shadow-objects/src/distContract.files.txt
git commit -m "feat: the testing types are declared up front, and the logger is recorded

runGuarded() reports a failing teardown and carries on, so a broken
onDestroy is invisible to every assertion a test could write. The recorder
shadows error and warn on the ConsoleLogger instance, keeps them off the
console, and hands them back on unhook."
```

---

### Task 3: `createTestKernel()` and the `TestEntity` skeleton

Registry isolation, the definition members, entity creation with object-shaped properties, handle bookkeeping, and a `dispose()` that lets go of everything. The error throw of §8 of the spec comes in Task 8.

**Files:**
- Create: `packages/shadow-objects/src/testing/createTestKernel.ts`
- Create: `packages/shadow-objects/src/testing/TestEntity.ts`
- Test: `packages/shadow-objects/src/testing/createTestKernel.spec.ts`
- Modify: `packages/shadow-objects/src/distContract.files.txt`

**Interfaces:**
- Consumes: `settle()` from `./settle.js`; `recordKernelErrors()` and `KernelErrorRecorder` from `./recordKernelErrors.js`; every type from `./types.js`.
- Produces: `createTestKernel(options?: TestKernelOptions): TestKernel` from `./createTestKernel.js`. `TestEntityImpl` and `toPropertyEntries(props: Record<string, unknown>): ComponentPropertiesType` from `./TestEntity.js`, plus the internal interface `TestKernelInternals` that `TestEntityImpl` is constructed with. Tasks 4 to 9 extend `TestEntityImpl` and use `createTestKernel()`.

- [ ] **Step 1: Write the failing test**

Create `packages/shadow-objects/src/testing/createTestKernel.spec.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {Registry} from '../in-the-dark/Registry.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

describe('createTestKernel', () => {
  it('builds on a Registry of its own, leaving the default Registry untouched', () => {
    const t = createTestKernel();

    t.define('isolated-token', class Isolated {});

    expect(t.registry).not.toBe(Registry.get());
    expect(t.registry.hasToken('isolated-token')).toBe(true);
    expect(Registry.get().hasToken('isolated-token')).toBe(false);

    t.dispose();
  });

  it('two test kernels do not see each other definitions', () => {
    const a = createTestKernel();
    const b = createTestKernel();

    a.define('only-in-a', class OnlyInA {});

    expect(b.registry.hasToken('only-in-a')).toBe(false);

    a.dispose();
    b.dispose();
  });

  it('creates an entity with object-shaped properties and hands back a stable handle', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const ent = t.createEntity('probe', {score: 7, name: 'Ragnar'});

    expect(ent.uuid).toMatch(/^[0-9a-f]{8}-/);
    expect(ent.token).toBe('probe');
    expect(t.kernel.hasEntity(ent.uuid)).toBe(true);
    expect(ent.entity.getProperty('score')).toBe(7);
    expect(ent.entity.getProperty('name')).toBe('Ragnar');
    expect(t.entity(ent.uuid)).toBe(ent);

    t.dispose();
  });

  it('honours an explicit uuid, an order and a parent', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const parent = t.createEntity('probe', undefined, {uuid: 'parent-uuid'});
    const child = t.createEntity('probe', undefined, {uuid: 'child-uuid', order: 5, parent});

    expect(child.entity.parentUuid).toBe('parent-uuid');
    expect(child.entity.order).toBe(5);

    t.dispose();
  });

  it('hands out a handle for an Entity a Shadow Object created on its own', () => {
    const t = createTestKernel();

    t.define('probe', class Probe {});
    t.define('spawner', function Spawner({entity}: ShadowObjectCreationAPI) {
      entity.kernel.createEntity('spawned-uuid', 'probe', entity.uuid);
    });

    t.createEntity('spawner');

    const spawned = t.entity('spawned-uuid');
    expect(spawned).toBeDefined();
    expect(spawned!.uuid).toBe('spawned-uuid');
    expect(spawned!.token).toBe('probe');
    expect(t.entity('spawned-uuid')).toBe(spawned);
    expect(t.entity('never-existed')).toBeUndefined();

    t.dispose();
  });

  it('resolves a composite token through a route', () => {
    const t = createTestKernel();
    const built: string[] = [];

    t.define('physics', class Physics { constructor() { built.push('physics'); } });
    t.define('health', class Health { constructor() { built.push('health'); } });
    t.route('player', ['physics', 'health']);

    t.createEntity('player');

    // Set-wise: the Registry promises which constructors a route resolves to, not the order it
    // hands them over in. Asserting the order here would test an implementation detail.
    expect(built).toHaveLength(2);
    expect(built).toContain('physics');
    expect(built).toContain('health');

    t.dispose();
  });

  it('imports a shadow objects module into its own Registry', async () => {
    const t = createTestKernel();
    const built: string[] = [];

    await t.importModule({
      define: {
        'from-module': class FromModule { constructor() { built.push('from-module'); } },
      },
    });

    t.createEntity('from-module');

    expect(built).toEqual(['from-module']);
    expect(Registry.get().hasToken('from-module')).toBe(false);

    t.dispose();
  });

  it('dispose() destroys the Kernel and empties the Registry it created', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});
    const ent = t.createEntity('probe');

    t.dispose();

    expect(t.kernel.hasEntity(ent.uuid)).toBe(false);
    expect(t.kernel.debugEntityCounts.entities).toBe(0);
    expect(t.registry.hasToken('probe')).toBe(false);
  });

  it('leaves a Registry it was handed alone', () => {
    const registry = new Registry();
    registry.define('borrowed', class Borrowed {});

    const t = createTestKernel({registry});
    t.dispose();

    expect(registry.hasToken('borrowed')).toBe(true);
  });

  it('dispose() is idempotent', () => {
    const t = createTestKernel();
    t.dispose();
    expect(() => t.dispose()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/createTestKernel.spec.ts --run`
Expected: FAIL -- `Failed to resolve import "./createTestKernel.js"`.

- [ ] **Step 3: Write the `TestEntity` skeleton**

Create `packages/shadow-objects/src/testing/TestEntity.ts`:

```ts
import type {Entity} from '../in-the-dark/Entity.js';
import type {Kernel} from '../in-the-dark/Kernel.js';
import type {ComponentPropertiesType, ShadowObjectDescription, ShadowObjectType} from '../types.js';
import type {
  AnyShadowObjectConstructor,
  CreateEntityOptions,
  ShadowObjectInstance,
  TestEntity,
  ViewMessageRecord,
} from './types.js';

/** What a `TestEntityImpl` needs from the test kernel that owns it. */
export interface TestKernelInternals {
  readonly kernel: Kernel;
  createEntity(token: string, props?: Record<string, unknown>, options?: CreateEntityOptions): TestEntity;
}

/**
 * Properties as a Kernel call wants them. `Object.entries()` drops symbol keys, which is right:
 * an Entity property is string-keyed. A value of `undefined` is a removal, which is what
 * `types.ts` says about a `ComponentPropertiesType` entry and what `removeProps()` relies on.
 */
export const toPropertyEntries = (props: Record<string, unknown>): ComponentPropertiesType =>
  Object.entries(props).map(([key, val]) => [key, val] as [string, unknown]);

export class TestEntityImpl implements TestEntity {
  readonly uuid: string;

  readonly #testKernel: TestKernelInternals;
  readonly #viewMessages: ViewMessageRecord[] = [];

  // The token the Kernel no longer answers for, once this Entity is destroyed. A handle stays
  // readable after its Entity is gone -- a test asserts on what it held, and a getter that threw
  // would turn that assertion into a crash.
  #lastKnownToken: string;

  constructor(testKernel: TestKernelInternals, uuid: string, token: string) {
    this.#testKernel = testKernel;
    this.uuid = uuid;
    this.#lastKnownToken = token;
  }

  get #kernel(): Kernel {
    return this.#testKernel.kernel;
  }

  get entity(): Entity {
    return this.#kernel.getEntity(this.uuid);
  }

  get token(): string {
    const current = this.#kernel.tokenOf(this.uuid);
    if (current !== undefined) {
      this.#lastKnownToken = current;
    }
    return this.#lastKnownToken;
  }

  get viewMessages(): readonly ViewMessageRecord[] {
    return this.#viewMessages;
  }

  createChild(token: string, props?: Record<string, unknown>, options?: Omit<CreateEntityOptions, 'parent'>): TestEntity {
    return this.#testKernel.createEntity(token, props, {...options, parent: this});
  }

  setProps(_props: Record<string, unknown>): void {
    throw new Error('not implemented yet');
  }

  removeProps(..._names: string[]): void {
    throw new Error('not implemented yet');
  }

  readProp<T = unknown>(_name: string): T | undefined {
    throw new Error('not implemented yet');
  }

  readContext<T = unknown>(_name: string | symbol): T | undefined {
    throw new Error('not implemented yet');
  }

  setToken(_token: string): void {
    throw new Error('not implemented yet');
  }

  setParent(_parent: TestEntity | undefined, _order?: number): void {
    throw new Error('not implemented yet');
  }

  sendViewEvent(_type: string, _data?: unknown): void {
    throw new Error('not implemented yet');
  }

  emit(_eventName: string | symbol, ..._args: unknown[]): void {
    throw new Error('not implemented yet');
  }

  shadowObjects(): ShadowObjectType[] {
    throw new Error('not implemented yet');
  }

  instanceOf<C extends AnyShadowObjectConstructor>(_constructa: C): ShadowObjectInstance<C> {
    throw new Error('not implemented yet');
  }

  describe(): ShadowObjectDescription[] {
    throw new Error('not implemented yet');
  }

  clearViewMessages(): void {
    this.#viewMessages.length = 0;
  }

  destroy(): void {
    this.#kernel.destroyEntity(this.uuid);
  }
}
```

The `not implemented yet` bodies are filled in by Tasks 4 to 7, each with its own tests. They are written out rather than left off so the class satisfies `TestEntity` from this task on and `tsc` stays green.

- [ ] **Step 4: Write `createTestKernel()`**

Create `packages/shadow-objects/src/testing/createTestKernel.ts`:

```ts
import {importModule as importShadowObjectsModule} from '../in-the-dark/importModule.js';
import {Kernel} from '../in-the-dark/Kernel.js';
import {Registry} from '../in-the-dark/Registry.js';
import type {ShadowObjectConstructor, ShadowObjectsModule} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {recordKernelErrors, type KernelErrorRecorder} from './recordKernelErrors.js';
import {settle} from './settle.js';
import {TestEntityImpl, toPropertyEntries, type TestKernelInternals} from './TestEntity.js';
import type {
  AnyShadowObjectConstructor,
  CreateEntityOptions,
  KernelErrorRecord,
  TestEntity,
  TestKernel,
  TestKernelOptions,
} from './types.js';

class TestKernelImpl implements TestKernel, TestKernelInternals {
  readonly kernel: Kernel;
  readonly registry: Registry;

  readonly #handles = new Map<string, TestEntityImpl>();
  readonly #importedModules = new Set<ShadowObjectsModule>();
  readonly #recorder: KernelErrorRecorder;
  // Only a Registry this test kernel made is a Registry it may empty. One the caller handed in is
  // the caller's, default or not, and clearing it would take the rest of the suite's definitions.
  readonly #ownsRegistry: boolean;

  #disposed = false;

  constructor(options: TestKernelOptions) {
    this.#ownsRegistry = options.registry === undefined;
    this.registry = options.registry ?? new Registry();
    this.kernel = new Kernel(this.registry);
    this.#recorder = recordKernelErrors(this.kernel.logger, options.echoKernelErrors ?? false);
  }

  get errors(): readonly KernelErrorRecord[] {
    return this.#recorder.records;
  }

  define(token: string, constructa: AnyShadowObjectConstructor): void {
    this.registry.define(token, constructa as ShadowObjectConstructor);
  }

  route(token: string, targets: string[]): void {
    this.registry.appendRoute(token, targets);
  }

  async importModule(module: ShadowObjectsModule): Promise<void> {
    await importShadowObjectsModule(this.kernel, module, this.#importedModules);
  }

  createEntity(token: string, props?: Record<string, unknown>, options?: CreateEntityOptions): TestEntity {
    const uuid = options?.uuid ?? generateUUID();

    // The handle goes in before the Kernel call, because a Shadow Object constructor may already
    // dispatch a message towards the View, and the recorder has to find a handle to put it on.
    const handle = new TestEntityImpl(this, uuid, token);
    this.#handles.set(uuid, handle);

    try {
      this.kernel.createEntity(
        uuid,
        token,
        options?.parent?.uuid,
        options?.order ?? 0,
        props ? toPropertyEntries(props) : undefined,
        options?.autoDestructionOnParentRemoval ?? false,
      );
    } catch (error) {
      this.#handles.delete(uuid);
      throw error;
    }

    return handle;
  }

  entity(uuid: string): TestEntity | undefined {
    const known = this.#handles.get(uuid);
    if (known !== undefined) return known;

    const token = this.kernel.tokenOf(uuid);
    if (token === undefined) return undefined;

    const handle = new TestEntityImpl(this, uuid, token);
    this.#handles.set(uuid, handle);
    return handle;
  }

  settle(): Promise<void> {
    return settle();
  }

  clearErrors(): void {
    this.#recorder.clear();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    this.kernel.destroy();

    if (this.#ownsRegistry) {
      this.registry.clear();
    }

    this.#recorder.unhook();
    this.#handles.clear();
    this.#importedModules.clear();
  }
}

/**
 * A Kernel for a unit test: its own Registry, object-shaped properties, recorded View messages,
 * recorded Kernel errors, and a `settle()` that drains the microtask cascade.
 *
 * Everything runs on the real Kernel. There is no DOM, no ShadowEnv and no worker in it, and no
 * `structuredClone` between the test and the Shadow Object -- a value handed in as a property or a
 * context arrives by identity, a DOM node and a WebGL handle included.
 */
export function createTestKernel(options: TestKernelOptions = {}): TestKernel {
  return new TestKernelImpl(options);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/createTestKernel.spec.ts --run`
Expected: PASS, 10 tests.

- [ ] **Step 6: Add the emitted files to the dist contract**

In `packages/shadow-objects/src/distContract.files.txt`, add in sorted position inside the `src/testing/` block. `TestEntity` sorts before `createTestKernel`, because uppercase sorts before lowercase:

```
src/testing/TestEntity.d.ts
src/testing/TestEntity.d.ts.map
src/testing/TestEntity.js
src/testing/TestEntity.js.map
src/testing/createTestKernel.d.ts
src/testing/createTestKernel.d.ts.map
src/testing/createTestKernel.js
src/testing/createTestKernel.js.map
```

- [ ] **Step 7: Lint, format and typecheck**

Run: `pnpm lint:fix && pnpm lint:ci && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: all three exit 0.

- [ ] **Step 8: Commit**

```bash
git add packages/shadow-objects/src/testing/createTestKernel.ts \
        packages/shadow-objects/src/testing/TestEntity.ts \
        packages/shadow-objects/src/testing/createTestKernel.spec.ts \
        packages/shadow-objects/src/distContract.files.txt
git commit -m "feat: createTestKernel() runs a real Kernel on a Registry of its own

The default Registry is process-wide, so a test that defines a token there
leaks into every other test in the worker. A test kernel makes its own, and
empties it on dispose -- but only when it made it: a Registry the caller
handed in is the caller's."
```

---

### Task 4: Properties and contexts on `TestEntity`

**Files:**
- Modify: `packages/shadow-objects/src/testing/TestEntity.ts` (the `setProps`, `removeProps`, `readProp` and `readContext` bodies)
- Test: `packages/shadow-objects/src/testing/TestEntity.props.spec.ts`

**Interfaces:**
- Consumes: `createTestKernel()` from `./createTestKernel.js`, `TestEntityImpl` and `toPropertyEntries()` from `./TestEntity.js`.
- Produces: working `setProps`, `removeProps`, `readProp` and `readContext` on every `TestEntity`.

- [ ] **Step 1: Write the failing test**

Create `packages/shadow-objects/src/testing/TestEntity.props.spec.ts`:

```ts
import {describe, expect, it} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

describe('TestEntity properties and contexts', () => {
  it('setProps writes through the Kernel, so property routing is re-resolved', () => {
    const t = createTestKernel();
    const built: string[] = [];

    t.define('base', class Base {});
    t.define('boosted', class Boosted { constructor() { built.push('boosted'); } });
    t.route('base@turbo', ['boosted']);

    const ent = t.createEntity('base');
    expect(built).toEqual([]);

    ent.setProps({turbo: true});
    expect(built).toEqual(['boosted']);

    t.dispose();
  });

  it('readProp answers the current value without a signalize import', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const ent = t.createEntity('probe', {speed: 3});
    expect(ent.readProp<number>('speed')).toBe(3);

    ent.setProps({speed: 9});
    expect(ent.readProp<number>('speed')).toBe(9);

    expect(ent.readProp('never-set')).toBeUndefined();

    t.dispose();
  });

  it('removeProps sets the named properties back to undefined', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const ent = t.createEntity('probe', {a: 1, b: 2});
    ent.removeProps('a', 'b');

    expect(ent.readProp('a')).toBeUndefined();
    expect(ent.readProp('b')).toBeUndefined();

    t.dispose();
  });

  it('a property value arrives by identity -- nothing clones it', () => {
    const t = createTestKernel();
    const handle = {notCloneable: () => 42};
    let seen: unknown;

    t.define('probe', function Probe({useProperty, createEffect}: ShadowObjectCreationAPI) {
      const getHandle = useProperty('handle');
      createEffect(() => {
        seen = getHandle();
      });
    });

    t.createEntity('probe', {handle});

    expect(seen).toBe(handle);

    t.dispose();
  });

  it('readContext answers what a provider on the same Entity provided, one settle later', async () => {
    const t = createTestKernel();
    const scene = {name: 'the scene'};

    t.define('provider', function Provider({provideContext}: ShadowObjectCreationAPI) {
      provideContext('three-scene', scene);
    });

    const ent = t.createEntity('provider');

    expect(ent.readContext('three-scene')).toBeUndefined();

    await t.settle();

    expect(ent.readContext('three-scene')).toBe(scene);

    t.dispose();
  });

  it('a child reads a context its parent provides, one settle after the first read', async () => {
    const t = createTestKernel();
    const world = {gravity: -9.81};

    t.define('root', function Root({provideContext}: ShadowObjectCreationAPI) {
      provideContext('physicsWorld', world);
    });
    t.define('body', class Body {});

    const root = t.createEntity('root');
    const body = root.createChild('body');

    await t.settle();

    // Nothing on this Entity has touched the context yet, so this read is what creates the entry
    // and links it to the parent. The link feeds the inherited signal straight away, but the
    // effective value every reader sees runs through the Entity's microtask collector -- so a read
    // that creates the entry is always one settle too early, however long the parent has stood.
    expect(body.readContext('physicsWorld')).toBeUndefined();

    await t.settle();

    expect(body.readContext<typeof world>('physicsWorld')).toBe(world);

    t.dispose();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/TestEntity.props.spec.ts --run`
Expected: FAIL -- six failures, each `not implemented yet`.

- [ ] **Step 3: Implement the four members**

In `packages/shadow-objects/src/testing/TestEntity.ts`, add to the import block at the top:

```ts
import {value} from '@spearwolf/signalize';
```

and replace the four stub bodies with:

```ts
  /**
   * Writes through the Kernel rather than through `Entity.setProperties()`: `changeProperties()`
   * re-resolves the constructor set afterwards, which is how a property route -- `token@prop` in a
   * module's `routes` -- puts a Shadow Object on an Entity or takes it off again.
   */
  setProps(props: Record<string, unknown>): void {
    this.#kernel.changeProperties(this.uuid, toPropertyEntries(props));
  }

  /** A property set to `undefined` is a removal; see `ComponentPropertiesType` in `src/types.ts`. */
  removeProps(...names: string[]): void {
    this.#kernel.changeProperties(
      this.uuid,
      names.map((name) => [name, undefined] as [string, unknown]),
    );
  }

  readProp<T = unknown>(name: string): T | undefined {
    return this.entity.getProperty<T | undefined>(name);
  }

  /**
   * The effective value of an Entity Context, the one `useContext()` reads. It arrives a microtask
   * after a provider wrote it -- `Entity` runs every context value through a `MicrotaskCollector` --
   * so a test reads it after `settle()`.
   */
  readContext<T = unknown>(name: string | symbol): T | undefined {
    return value(this.entity.useContext<T | undefined>(name));
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/TestEntity.props.spec.ts --run`
Expected: PASS, 6 tests.

- [ ] **Step 5: Lint, format and typecheck**

Run: `pnpm lint:fix && pnpm lint:ci && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: all three exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/shadow-objects/src/testing/TestEntity.ts \
        packages/shadow-objects/src/testing/TestEntity.props.spec.ts
git commit -m "feat: properties are an object and a context reads without a signalize import

setProps() goes through Kernel.changeProperties() rather than the Entity, so
a property route resolves the way it does in a running application. readProp
and readContext call the signal readers, which is the one import a test would
otherwise need from signalize."
```

---

### Task 5: Tree, token and the two event directions

**Files:**
- Modify: `packages/shadow-objects/src/testing/TestEntity.ts` (the `setToken`, `setParent`, `sendViewEvent` and `emit` bodies)
- Test: `packages/shadow-objects/src/testing/TestEntity.events.spec.ts`

**Interfaces:**
- Consumes: `createTestKernel()` from `./createTestKernel.js`.
- Produces: working `setToken`, `setParent`, `sendViewEvent` and `emit` on every `TestEntity`.

- [ ] **Step 1: Write the failing test**

Create `packages/shadow-objects/src/testing/TestEntity.events.spec.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {onViewEvent} from '../in-the-dark/events.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

describe('TestEntity tree, token and events', () => {
  it('sendViewEvent reaches onViewEvent synchronously', () => {
    const t = createTestKernel();
    const seen: Array<[string, unknown]> = [];

    t.define('probe', function Probe({onViewEvent: onEvent}: ShadowObjectCreationAPI) {
      onEvent((type, data) => {
        seen.push([type, data]);
      });
    });

    const ent = t.createEntity('probe');
    ent.sendViewEvent('damage', {amount: 5});

    expect(seen).toEqual([['damage', {amount: 5}]]);

    t.dispose();
  });

  it('the [onViewEvent] hook of a class receives the same event', () => {
    const t = createTestKernel();
    const seen: Array<[string, unknown]> = [];

    t.define(
      'probe',
      class Probe {
        [onViewEvent](type: string, data: unknown) {
          seen.push([type, data]);
        }
      },
    );

    t.createEntity('probe').sendViewEvent('ping', 1);

    expect(seen).toEqual([['ping', 1]]);

    t.dispose();
  });

  it('emit carries an event from one Shadow Object to another on the same Entity', () => {
    const t = createTestKernel();
    const heard: number[] = [];

    t.define('sender', class Sender {});
    t.define(
      'receiver',
      class Receiver {
        playerDied(score: number) {
          heard.push(score);
        }
      },
    );
    t.route('player', ['sender', 'receiver']);

    const ent = t.createEntity('player');
    ent.emit('playerDied', 42);

    expect(heard).toEqual([42]);

    t.dispose();
  });

  it('setToken rebuilds the Shadow Objects of the Entity', () => {
    const t = createTestKernel();
    const log: string[] = [];

    t.define('before', class Before { constructor() { log.push('before'); } });
    t.define('after', class After { constructor() { log.push('after'); } });

    const ent = t.createEntity('before');
    expect(log).toEqual(['before']);

    ent.setToken('after');

    expect(log).toEqual(['before', 'after']);
    expect(ent.token).toBe('after');

    t.dispose();
  });

  it('setParent moves an Entity and setParent(undefined) makes it a root again', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const a = t.createEntity('probe');
    const b = t.createEntity('probe');
    const child = t.createEntity('probe');

    child.setParent(a);
    expect(child.entity.parentUuid).toBe(a.uuid);

    child.setParent(b, 2);
    expect(child.entity.parentUuid).toBe(b.uuid);
    expect(child.entity.order).toBe(2);

    child.setParent(undefined);
    expect(child.entity.hasParent).toBe(false);

    t.dispose();
  });

  it('a destroyed handle still answers with the token it held', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const ent = t.createEntity('probe');
    ent.destroy();

    expect(t.kernel.hasEntity(ent.uuid)).toBe(false);
    expect(ent.token).toBe('probe');

    t.dispose();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/TestEntity.events.spec.ts --run`
Expected: FAIL -- `not implemented yet` from the four stubs.

- [ ] **Step 3: Implement the four members**

In `packages/shadow-objects/src/testing/TestEntity.ts`, add to the import block:

```ts
import {emit} from '@spearwolf/eventize';
```

and replace the four stub bodies with:

```ts
  setToken(token: string): void {
    this.#kernel.changeToken(this.uuid, token);
  }

  setParent(parent: TestEntity | undefined, order?: number): void {
    this.#kernel.setParent(this.uuid, parent?.uuid, order);
  }

  /**
   * Delivery is synchronous, the way `Kernel.dispatchEventsToEntity()` is: a View event carries no
   * structure, so nothing has to settle before a Shadow Object hears it.
   */
  sendViewEvent(type: string, data?: unknown): void {
    this.#kernel.dispatchEventsToEntity(this.uuid, [{type, data}]);
  }

  /**
   * Emits on the Entity's own event bus. Every Shadow Object of this Entity is attached there as an
   * eventize listener object, so a method named like the event is what receives it.
   */
  emit(eventName: string | symbol, ...args: unknown[]): void {
    emit(this.entity, eventName, ...args);
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/TestEntity.events.spec.ts --run`
Expected: PASS, 6 tests.

- [ ] **Step 5: Lint, format and typecheck**

Run: `pnpm lint:fix && pnpm lint:ci && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: all three exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/shadow-objects/src/testing/TestEntity.ts \
        packages/shadow-objects/src/testing/TestEntity.events.spec.ts
git commit -m "feat: the handle drives the tree, the token and both event directions

sendViewEvent is the inbound channel and emit is the bus Shadow Objects on
one Entity talk over; setToken and setParent are the two structural moves a
test needs to reach a rebuild and a context rebinding."
```

---

### Task 6: Reaching the Shadow Object instances

**Files:**
- Modify: `packages/shadow-objects/src/testing/TestEntity.ts` (the `shadowObjects`, `instanceOf` and `describe` bodies)
- Test: `packages/shadow-objects/src/testing/TestEntity.instances.spec.ts`

**Interfaces:**
- Consumes: `getDisplayName()` from `../in-the-dark/displayName.js`.
- Produces: working `shadowObjects()`, `instanceOf()` and `describe()` on every `TestEntity`.

- [ ] **Step 1: Write the failing test**

Create `packages/shadow-objects/src/testing/TestEntity.instances.spec.ts`:

```ts
import {describe, expect, it} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

describe('TestEntity shadow object access', () => {
  it('instanceOf finds a class instance and types it', () => {
    const t = createTestKernel();

    class PlayerLogic {
      score = 7;
    }
    t.define('player', PlayerLogic);

    const ent = t.createEntity('player');
    const instance = ent.instanceOf(PlayerLogic);

    expect(instance.score).toBe(7);
    expect(ent.shadowObjects()).toHaveLength(1);

    t.dispose();
  });

  it('instanceOf finds an object a function constructor returned', () => {
    const t = createTestKernel();

    function HealthLogic(_api: ShadowObjectCreationAPI) {
      return {health: 100};
    }
    t.define('health', HealthLogic);

    const ent = t.createEntity('health');

    expect(ent.instanceOf(HealthLogic).health).toBe(100);

    t.dispose();
  });

  it('instanceOf picks the right one out of three on a composite token', () => {
    const t = createTestKernel();

    class Physics {}
    class Health {
      hp = 50;
    }
    class Render {}

    t.define('physics', Physics);
    t.define('health', Health);
    t.define('render', Render);
    t.route('player', ['physics', 'health', 'render']);

    const ent = t.createEntity('player');

    expect(ent.shadowObjects()).toHaveLength(3);
    expect(ent.instanceOf(Health).hp).toBe(50);

    t.dispose();
  });

  it('instanceOf throws with the display name when nothing matches', () => {
    const t = createTestKernel();

    class Present {}
    class Absent {}
    t.define('probe', Present);

    const ent = t.createEntity('probe');

    expect(() => ent.instanceOf(Absent)).toThrow(/Absent/);

    t.dispose();
  });

  it('describe names the properties, contexts and hooks a Shadow Object uses', () => {
    const t = createTestKernel();

    t.define('player', function PlayerLogic({useProperty, useContext, onDestroy}: ShadowObjectCreationAPI) {
      useProperty('score');
      useContext('three-scene');
      onDestroy(() => {});
    });

    const ent = t.createEntity('player');
    const [description] = ent.describe();

    expect(description!.displayName).toBe('PlayerLogic');
    expect(description!.usesProperties).toEqual(['score']);
    expect(description!.usesContexts).toEqual(['three-scene']);
    expect(description!.definedUnder).toEqual(['player']);

    t.dispose();
  });

  it('answers empty for an Entity that is gone', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const ent = t.createEntity('probe');
    ent.destroy();

    expect(ent.shadowObjects()).toEqual([]);
    expect(ent.describe()).toEqual([]);

    t.dispose();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/TestEntity.instances.spec.ts --run`
Expected: FAIL -- `not implemented yet`.

- [ ] **Step 3: Implement the three members**

In `packages/shadow-objects/src/testing/TestEntity.ts`, add to the import block:

```ts
import {getDisplayName} from '../in-the-dark/displayName.js';
```

and replace the three stub bodies with:

```ts
  shadowObjects(): ShadowObjectType[] {
    return this.#kernel.findShadowObjects(this.uuid);
  }

  /**
   * The one Shadow Object on this Entity that came out of `constructa`.
   *
   * Two rules, because one does not cover both constructor shapes. A class instance answers
   * `instanceof` -- the `@ShadowObject` decorator wraps the class in a subclass, which still does.
   * A function constructor that returns an object does not: `new fn()` hands back that object, and
   * it carries none of `fn`'s prototype. The display name covers that case, and it is what the
   * Kernel reports the Shadow Object under anyway. `findShadowObjects()` and
   * `describeShadowObjects()` walk the same bookkeeping in the same order, so the two lists line up
   * index by index.
   */
  instanceOf<C extends AnyShadowObjectConstructor>(constructa: C): ShadowObjectInstance<C> {
    const displayName = getDisplayName(constructa as ShadowObjectConstructor);
    const instances = this.shadowObjects();
    const descriptions = this.describe();

    const matches = instances.filter(
      (instance, index) =>
        instance instanceof (constructa as unknown as new (...args: any[]) => object) ||
        descriptions[index]?.displayName === displayName,
    );

    if (matches.length === 0) {
      throw new Error(`no shadow object built from "${displayName}" on entity ${this.uuid}`);
    }
    if (matches.length > 1) {
      throw new Error(
        `${matches.length} shadow objects built from "${displayName}" on entity ${this.uuid}; use shadowObjects() and pick one`,
      );
    }

    return matches[0] as ShadowObjectInstance<C>;
  }

  describe(): ShadowObjectDescription[] {
    return this.#kernel.describeShadowObjects(this.uuid);
  }
```

Add `ShadowObjectConstructor` to the type import from `../types.js` at the top of the file.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/TestEntity.instances.spec.ts --run`
Expected: PASS, 6 tests.

- [ ] **Step 5: Lint, format and typecheck**

Run: `pnpm lint:fix && pnpm lint:ci && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: all three exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/shadow-objects/src/testing/TestEntity.ts \
        packages/shadow-objects/src/testing/TestEntity.instances.spec.ts
git commit -m "feat: instanceOf reaches one Shadow Object, whichever shape it was defined in

A class instance answers instanceof and a decorated subclass still does. An
object a function constructor returned carries none of that function's
prototype, so the display name the Kernel reports it under is the second
rule -- the instance list and the description list line up index by index."
```

---

### Task 7: Recording View messages

**Files:**
- Modify: `packages/shadow-objects/src/testing/TestEntity.ts` (an internal `recordViewMessage()`)
- Modify: `packages/shadow-objects/src/testing/createTestKernel.ts` (subscribe to `MessageToView`)
- Test: `packages/shadow-objects/src/testing/TestEntity.viewMessages.spec.ts`

**Interfaces:**
- Consumes: `MessageToView` from `../constants.js`, `MessageToViewEvent` from `../in-the-dark/Kernel.js`, `on` from `@spearwolf/eventize`.
- Produces: `TestEntityImpl.recordViewMessage(message: MessageToViewEvent): void` (internal, called only by the test kernel), and a populated `TestEntity.viewMessages`.

- [ ] **Step 1: Write the failing test**

Create `packages/shadow-objects/src/testing/TestEntity.viewMessages.spec.ts`:

```ts
import {describe, expect, it} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

describe('TestEntity view messages', () => {
  it('records what a Shadow Object dispatched, after one settle', async () => {
    const t = createTestKernel();

    t.define('player', function PlayerLogic({useProperty, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
      const getScore = useProperty<number>('score');
      createEffect(() => {
        dispatchMessageToView('score-updated', {value: getScore()});
      });
    });

    const ent = t.createEntity('player', {score: 0});

    expect(ent.viewMessages).toEqual([]);

    await t.settle();

    expect(ent.viewMessages).toEqual([{type: 'score-updated', data: {value: 0}}]);

    ent.setProps({score: 10});
    await t.settle();

    expect(ent.viewMessages).toEqual([
      {type: 'score-updated', data: {value: 0}},
      {type: 'score-updated', data: {value: 10}},
    ]);

    t.dispose();
  });

  it('carries traverseChildren and hands the payload over by identity', async () => {
    const t = createTestKernel();
    const payload = {node: {tag: 'not cloneable in a worker'}};

    t.define('probe', function Probe({dispatchMessageToView}: ShadowObjectCreationAPI) {
      dispatchMessageToView('hello', payload, undefined, true);
    });

    const ent = t.createEntity('probe');
    await t.settle();

    expect(ent.viewMessages).toHaveLength(1);
    expect(ent.viewMessages[0]!.traverseChildren).toBe(true);
    expect(ent.viewMessages[0]!.data).toBe(payload);

    t.dispose();
  });

  // The registration order in `createTestKernel.createEntity()` is what this test pins: the handle
  // goes into the map before the Kernel call, so a Shadow Object that dispatches from its own
  // constructor has somewhere for its message to land. Without the early insert the message is
  // dropped in silence, and nothing else in the suite would notice.
  it('records a message a Shadow Object dispatched from its own constructor', async () => {
    const t = createTestKernel();

    t.define('eager', function Eager({dispatchMessageToView}: ShadowObjectCreationAPI) {
      dispatchMessageToView('constructed');
    });

    const ent = t.createEntity('eager');
    await t.settle();

    expect(ent.viewMessages).toEqual([{type: 'constructed', data: undefined}]);

    t.dispose();
  });

  // The other half of that order: a constructor that throws must leave no handle behind.
  it('leaves no handle behind when a constructor throws', () => {
    const t = createTestKernel();

    t.define('doomed', function Doomed() {
      throw new RangeError('constructor gave up');
    });

    expect(() => t.createEntity('doomed', undefined, {uuid: 'doomed-uuid'})).toThrow(/constructor gave up/);
    expect(t.entity('doomed-uuid')).toBeUndefined();

    t.clearErrors();
    t.dispose();
  });

  it('records on the Entity that sent it, and clearViewMessages empties one list', async () => {
    const t = createTestKernel();

    t.define('probe', function Probe({entity, dispatchMessageToView}: ShadowObjectCreationAPI) {
      dispatchMessageToView('from', entity.uuid);
    });

    const a = t.createEntity('probe');
    const b = t.createEntity('probe');
    await t.settle();

    expect(a.viewMessages).toEqual([{type: 'from', data: a.uuid}]);
    expect(b.viewMessages).toEqual([{type: 'from', data: b.uuid}]);

    a.clearViewMessages();

    expect(a.viewMessages).toEqual([]);
    expect(b.viewMessages).toHaveLength(1);

    t.dispose();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/TestEntity.viewMessages.spec.ts --run`
Expected: FAIL -- the recorded lists stay empty.

- [ ] **Step 3: Add the recorder to `TestEntityImpl`**

In `packages/shadow-objects/src/testing/TestEntity.ts`, add to the import block:

```ts
import type {MessageToViewEvent} from '../in-the-dark/Kernel.js';
```

and add this method to `TestEntityImpl`, directly above `clearViewMessages()`:

```ts
  /**
   * Called by the test kernel for every message the Kernel emitted for this uuid. `traverseChildren`
   * is recorded rather than acted on: the flag is an instruction to the View layer, and there is no
   * View layer here.
   *
   * @internal
   */
  recordViewMessage(message: MessageToViewEvent): void {
    this.#viewMessages.push({
      type: message.type,
      data: message.data,
      ...(message.traverseChildren !== undefined ? {traverseChildren: message.traverseChildren} : {}),
    });
  }
```

- [ ] **Step 4: Subscribe in the test kernel**

In `packages/shadow-objects/src/testing/createTestKernel.ts`, add to the import block:

```ts
import {on} from '@spearwolf/eventize';
import {MessageToView} from '../constants.js';
import type {MessageToViewEvent} from '../in-the-dark/Kernel.js';
```

add the field next to `#recorder`:

```ts
  readonly #unsubscribeMessageToView: () => void;
```

append to the constructor, after the `#recorder` assignment:

```ts
    // Nothing clones the payload on the way here, unlike `LocalShadowObjectEnv`, which runs it
    // through `structuredClone`. A test asserts on the object the Shadow Object sent.
    this.#unsubscribeMessageToView = on(this.kernel, MessageToView, (message: MessageToViewEvent) => {
      this.#handles.get(message.uuid)?.recordViewMessage(message);
    });
```

and add to `dispose()`, directly after `this.kernel.destroy()`:

```ts
    this.#unsubscribeMessageToView();
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/TestEntity.viewMessages.spec.ts --run`
Expected: PASS, 5 tests.

- [ ] **Step 6: Lint, format and typecheck**

Run: `pnpm lint:fix && pnpm lint:ci && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: all three exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/shadow-objects/src/testing/TestEntity.ts \
        packages/shadow-objects/src/testing/createTestKernel.ts \
        packages/shadow-objects/src/testing/TestEntity.viewMessages.spec.ts
git commit -m "feat: what an Entity sent towards the View is recorded on its handle

Kernel.dispatchMessageToView() hands every message to a microtask, so the
list fills after a settle and not on the line that caused it. Nothing clones
the payload on the way -- a test asserts on the object that was sent."
```

---

### Task 8: The failing default for swallowed Kernel errors

**Files:**
- Modify: `packages/shadow-objects/src/testing/createTestKernel.ts` (`dispose()` throws)
- Test: `packages/shadow-objects/src/testing/createTestKernel.errors.spec.ts`

**Interfaces:**
- Consumes: `KernelErrorRecord` from `./types.js`.
- Produces: `dispose()` that throws on unacknowledged reports of level `error`, gated by `failOnKernelErrors`.

- [ ] **Step 1: Write the failing test**

Create `packages/shadow-objects/src/testing/createTestKernel.errors.spec.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {onDestroy} from '../in-the-dark/events.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

const withBrokenTeardown = () => {
  const t = createTestKernel();
  t.define(
    'broken',
    class BrokenTeardown {
      [onDestroy]() {
        throw new RangeError('teardown went wrong');
      }
    },
  );
  t.createEntity('broken');
  return t;
};

describe('createTestKernel error recording', () => {
  it('records the error the Kernel swallowed during a teardown', () => {
    const t = withBrokenTeardown();

    expect(t.errors).toHaveLength(0);

    t.kernel.destroy();

    const errors = t.errors.filter((record) => record.level === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.error).toBeInstanceOf(RangeError);

    t.clearErrors();
    t.dispose();
  });

  it('dispose() throws when such an error was not acknowledged', () => {
    const t = withBrokenTeardown();

    expect(() => t.dispose()).toThrow(/teardown went wrong/);
  });

  it('clearErrors() satisfies dispose()', () => {
    const t = withBrokenTeardown();

    t.kernel.destroy();
    expect(t.errors.filter((record) => record.level === 'error')).toHaveLength(1);

    t.clearErrors();

    expect(() => t.dispose()).not.toThrow();
  });

  it('failOnKernelErrors: false switches the throw off', () => {
    const t = createTestKernel({failOnKernelErrors: false});
    t.define(
      'broken',
      class BrokenTeardown {
        [onDestroy]() {
          throw new RangeError('teardown went wrong');
        }
      },
    );
    t.createEntity('broken');

    expect(() => t.dispose()).not.toThrow();
  });

  it('a warning is recorded but never fails a run', async () => {
    const t = createTestKernel();
    const module = {define: {probe: class Probe {}}};

    await t.importModule(module);
    await t.importModule(module);

    expect(t.errors.filter((record) => record.level === 'warn')).toHaveLength(1);
    expect(() => t.dispose()).not.toThrow();
  });

  it('the Kernel keeps working after a Shadow Object teardown threw', () => {
    const t = createTestKernel();
    const built: string[] = [];

    t.define(
      'broken',
      class BrokenTeardown {
        [onDestroy]() {
          throw new RangeError('teardown went wrong');
        }
      },
    );
    t.define('fine', function Fine(_api: ShadowObjectCreationAPI) {
      built.push('fine');
    });

    const broken = t.createEntity('broken');
    broken.destroy();
    t.createEntity('fine');

    expect(built).toEqual(['fine']);

    t.clearErrors();
    t.dispose();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/createTestKernel.errors.spec.ts --run`
Expected: FAIL -- the two tests that expect `dispose()` to throw fail, because it does not throw yet.

- [ ] **Step 3: Implement the throw**

In `packages/shadow-objects/src/testing/createTestKernel.ts`, add the field next to `#ownsRegistry`:

```ts
  readonly #failOnKernelErrors: boolean;
```

set it in the constructor, before the `#recorder` assignment:

```ts
    this.#failOnKernelErrors = options.failOnKernelErrors ?? true;
```

and replace the body of `dispose()` with:

```ts
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    this.kernel.destroy();
    this.#unsubscribeMessageToView();

    if (this.#ownsRegistry) {
      this.registry.clear();
    }

    // Read before the unhook, because unhooking does not clear the records but a later read has no
    // reason to reach the recorder again.
    const errors = this.#recorder.records.filter((record) => record.level === 'error');

    this.#recorder.unhook();
    this.#handles.clear();
    this.#importedModules.clear();

    // Only `error`. A warning is recorded and readable, and never fails a run: `importModule()`
    // warns about a module two `extends` chains have in common, which is a shape of the module
    // graph and not a mistake.
    if (this.#failOnKernelErrors && errors.length > 0) {
      const first = errors[0]!;
      throw new Error(
        `the kernel reported ${errors.length} error(s) that this test did not acknowledge. ` +
          `The first one was: ${first.args.map((arg) => String(arg)).join(' ')}. ` +
          'Assert on testKernel.errors and call clearErrors(), or pass {failOnKernelErrors: false}.',
        ...(first.error !== undefined ? [{cause: first.error}] : []),
      );
    }
  }
```

Note the shape of the last argument: `exactOptionalPropertyTypes` forbids handing `{cause: undefined}` to the `Error` constructor, so the options object is spread in only when there is a cause.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/createTestKernel.errors.spec.ts --run`
Expected: PASS, 6 tests.

- [ ] **Step 5: Run every testing spec written so far**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing --run`
Expected: PASS, 45 tests across 8 files.

- [ ] **Step 6: Lint, format and typecheck**

Run: `pnpm lint:fix && pnpm lint:ci && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: all three exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/shadow-objects/src/testing/createTestKernel.ts \
        packages/shadow-objects/src/testing/createTestKernel.errors.spec.ts
git commit -m "feat: a swallowed kernel error fails the test kernel teardown

runGuarded() reports and carries on, which is the right thing for a running
application and the wrong thing for a test: a Shadow Object whose onDestroy
throws passes every assertion and still leaks. dispose() now throws unless
the test acknowledged the reports. Warnings never fail a run."
```

---

### Task 9: `mountShadowObject()`

**Files:**
- Create: `packages/shadow-objects/src/testing/mountShadowObject.ts`
- Test: `packages/shadow-objects/src/testing/mountShadowObject.spec.ts`
- Modify: `packages/shadow-objects/src/distContract.files.txt`

**Interfaces:**
- Consumes: `createTestKernel()` from `./createTestKernel.js`, `generateUUID()` from `../utils/generateUUID.js`, the types from `./types.js`.
- Produces: `mountShadowObject<C>(constructa: C, options?: MountOptions): Promise<MountedShadowObject<C>>` from `./mountShadowObject.js`.

- [ ] **Step 1: Write the failing test**

Create `packages/shadow-objects/src/testing/mountShadowObject.spec.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {onDestroy} from '../in-the-dark/events.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {mountShadowObject} from './mountShadowObject.js';

describe('mountShadowObject', () => {
  it('mounts one object with properties and records what it sent to the View', async () => {
    class PlayerLogic {
      constructor({useProperty, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
        const getScore = useProperty<number>('score');
        createEffect(() => {
          dispatchMessageToView('score-updated', {value: getScore()});
        });
      }
    }

    const so = await mountShadowObject(PlayerLogic, {props: {score: 0}});

    expect(so.instance).toBeInstanceOf(PlayerLogic);
    expect(so.viewMessages).toEqual([{type: 'score-updated', data: {value: 0}}]);

    so.setProps({score: 10});
    await so.settle();

    expect(so.viewMessages).toEqual([
      {type: 'score-updated', data: {value: 0}},
      {type: 'score-updated', data: {value: 10}},
    ]);

    so.dispose();
  });

  it('every context has reached every reader by the time the mount resolves', async () => {
    const scene = {name: 'the scene'};
    const seen: unknown[] = [];

    function SceneConsumer({useContext, createEffect}: ShadowObjectCreationAPI) {
      const getScene = useContext('three-scene');
      createEffect(() => {
        seen.push(getScene());
      });
      return {read: () => getScene()};
    }

    const so = await mountShadowObject(SceneConsumer, {contexts: {'three-scene': scene}});

    expect(so.readContext('three-scene')).toBe(scene);
    expect(seen.at(-1)).toBe(scene);
    expect(so.instance.read()).toBe(scene);

    so.dispose();
  });

  it('takes a symbol-keyed context', async () => {
    const key = Symbol('physics-world');
    const world = {gravity: -9.81};

    function Body({useContext}: ShadowObjectCreationAPI) {
      return {read: () => useContext(key)()};
    }

    const so = await mountShadowObject(Body, {contexts: {[key]: world}});

    expect(so.readContext(key)).toBe(world);

    so.dispose();
  });

  it('delivers a View event and exposes the test kernel underneath', async () => {
    const seen: Array<[string, unknown]> = [];

    function Damageable({onViewEvent}: ShadowObjectCreationAPI) {
      onViewEvent((type, data) => {
        seen.push([type, data]);
      });
    }

    const so = await mountShadowObject(Damageable);

    so.sendViewEvent('damage', {amount: 5});

    expect(seen).toEqual([['damage', {amount: 5}]]);
    expect(so.testKernel.kernel.hasEntity(so.uuid)).toBe(true);

    so.dispose();
  });

  it('registers under the token it was given, and under a generated one otherwise', async () => {
    class Named {}

    const explicit = await mountShadowObject(Named, {token: 'my-token'});
    expect(explicit.token).toBe('my-token');
    explicit.dispose();

    const generated = await mountShadowObject(Named);
    expect(generated.token).not.toBe('my-token');
    expect(generated.describe()[0]!.definedUnder).toEqual([generated.token]);
    generated.dispose();
  });

  it('dispose() carries the failing-error default of the test kernel', async () => {
    class BrokenTeardown {
      [onDestroy]() {
        throw new RangeError('teardown went wrong');
      }
    }

    const so = await mountShadowObject(BrokenTeardown);

    expect(() => so.dispose()).toThrow(/teardown went wrong/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/mountShadowObject.spec.ts --run`
Expected: FAIL -- `Failed to resolve import "./mountShadowObject.js"`.

- [ ] **Step 3: Write the implementation**

Create `packages/shadow-objects/src/testing/mountShadowObject.ts`:

```ts
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {createTestKernel} from './createTestKernel.js';
import type {
  AnyShadowObjectConstructor,
  MountedShadowObject,
  MountOptions,
  ShadowObjectInstance,
  TestEntity,
} from './types.js';

/**
 * Mounts one Shadow Object on one Entity and hands back everything a test asserts on.
 *
 * Asynchronous because the framework is. `contexts` are provided by a synthetic parent Entity, and a
 * context value reaches a reader a microtask after it was written -- twice over, because the child's
 * own context signal runs through the same collector. The mount settles after the parent and again
 * after the object under test, so when it resolves every context has reached every reader and every
 * effect that depends on one has re-run.
 *
 * What it cannot do is hand a context value to a constructor body: `useContext()` gives out a signal
 * reader, and the value behind it lands after the constructor has returned. That is the framework's
 * tempo, not this function's -- a context is read inside an effect or a memo. `useParentContext()`
 * is the exception and reads synchronously.
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

  const instance = ent.instanceOf(constructa);

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
    readProp: <T,>(name: string) => ent.readProp<T>(name),
    readContext: <T,>(name: string | symbol) => ent.readContext<T>(name),
    setToken: (nextToken) => ent.setToken(nextToken),
    setParent: (nextParent, order) => ent.setParent(nextParent, order),
    sendViewEvent: (type, data) => ent.sendViewEvent(type, data),
    emit: (eventName, ...args) => ent.emit(eventName, ...args),
    shadowObjects: () => ent.shadowObjects(),
    instanceOf: <C2 extends AnyShadowObjectConstructor>(other: C2) => ent.instanceOf(other),
    describe: () => ent.describe(),
    clearViewMessages: () => ent.clearViewMessages(),
    settle: () => testKernel.settle(),
    dispose: () => testKernel.dispose(),
  };
}
```

The trailing comma in `<T,>` is what keeps a generic arrow function from being read as JSX; the file is `.ts` and does not need it for parsing, but Biome's formatter keeps it and it is harmless.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/testing/mountShadowObject.spec.ts --run`
Expected: PASS, 6 tests.

If the context test fails with `undefined`, the second `settle()` is missing or is placed before `createEntity()` rather than after it. Both hops are needed and both come after the Entity they wait for.

- [ ] **Step 5: Add the emitted files to the dist contract**

In `packages/shadow-objects/src/distContract.files.txt`, add in sorted position inside the `src/testing/` block, between the `createTestKernel` entries and the `recordKernelErrors` entries:

```
src/testing/mountShadowObject.d.ts
src/testing/mountShadowObject.d.ts.map
src/testing/mountShadowObject.js
src/testing/mountShadowObject.js.map
```

- [ ] **Step 6: Lint, format and typecheck**

Run: `pnpm lint:fix && pnpm lint:ci && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: all three exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/shadow-objects/src/testing/mountShadowObject.ts \
        packages/shadow-objects/src/testing/mountShadowObject.spec.ts \
        packages/shadow-objects/src/distContract.files.txt
git commit -m "feat: mountShadowObject() is the one-object case, and it is asynchronous

Contexts come from a synthetic parent Entity, and a context value needs two
microtask hops to reach a reader: one for the parent, one for the child's own
context signal. The mount settles after each, so when it resolves every
effect that depends on a context has re-run."
```

---

### Task 10: The barrel, the subpath export and the dist contract

**Files:**
- Create: `packages/shadow-objects/src/testing.ts`
- Modify: `packages/shadow-objects/package.json` (`exports`)
- Modify: `packages/shadow-objects/src/distContract.files.txt`
- Modify: `packages/shadow-objects/src/distContract.package.json`
- Modify: `packages/shadow-objects/CHANGELOG.md`

**Interfaces:**
- Consumes: every module under `./testing/`.
- Produces: the public surface of `@spearwolf/shadow-objects/testing.js`.

- [ ] **Step 1: Write the barrel**

Create `packages/shadow-objects/src/testing.ts`:

```ts
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
export {recordKernelErrors, type KernelErrorRecorder} from './testing/recordKernelErrors.js';
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
```

- [ ] **Step 2: Add the export to `package.json`**

In `packages/shadow-objects/package.json`, add to `exports`, after the `"./model-context.js"` entry:

```json
    "./testing.js": {
      "import": "./dist/src/testing.js",
      "types": "./dist/src/testing.d.ts"
    }
```

Do **not** add anything to `sideEffects`: nothing under `src/testing/` runs at import time.

- [ ] **Step 3: Record the barrel in the dist contract**

In `packages/shadow-objects/src/distContract.files.txt`, add directly above the `src/testing/…` block:

```
src/testing.d.ts
src/testing.d.ts.map
src/testing.js
src/testing.js.map
```

In `packages/shadow-objects/src/distContract.package.json`, add to `exports`, after `"./model-context.js"`:

```json
    "./testing.js": {
      "import": "./src/testing.js",
      "types": "./src/testing.d.ts"
    }
```

Note the shape difference: `package.json` paths carry the `dist/` prefix and the recorded contract does not, because `scripts/makePackageJson.mjs` strips it.

- [ ] **Step 4: Build and run the dist contract spec**

Run: `pnpm -F @spearwolf/shadow-objects build && pnpm -F @spearwolf/shadow-objects exec vitest src/distContract.spec.ts --run`
Expected: PASS.

If it fails on the file list, diff what was actually emitted against what is recorded:

```bash
cd packages/shadow-objects && find dist -type f | sed 's|^dist/||' | sort > /tmp/actual.txt && diff /tmp/actual.txt src/distContract.files.txt
```

Fix the recorded list to match the build. Do not fix the build to match the list.

- [ ] **Step 5: Write the changelog entry**

In `packages/shadow-objects/CHANGELOG.md`, add as the last bullet of the `### New` list under `## [Unreleased]`:

```markdown
- **New (public API, subpath):** `@spearwolf/shadow-objects/testing.js` — a testing utility that runs Shadow Objects on the real Kernel instead of a mocked creation API. `createTestKernel(options?)` builds a Kernel on a `Registry` of its own (`registry`, `failOnKernelErrors`, `echoKernelErrors`) and offers `define()`, `route()`, `importModule()`, `createEntity(token, props, options?)`, `entity(uuid)`, `settle()`, `errors`, `clearErrors()`, `dispose()`, plus `kernel` and `registry` for everything the facade does not cover. Each `createEntity()` hands out a `TestEntity`: object-shaped `setProps()`/`removeProps()`, `readProp()` and `readContext()` without a signalize import, `createChild()`, `setToken()`, `setParent()`, `sendViewEvent()`, `emit()`, `shadowObjects()`, `instanceOf(constructor)`, `describe()`, and a recorded `viewMessages` list. `mountShadowObject(constructor, options?)` is the one-object case on top of both — asynchronous, because a context value needs two microtask hops to reach its reader. `settle()` drains the whole microtask cascade through a `MessageChannel`, so it also resolves under fake timers, and `recordKernelErrors(logger, echo?)` is exported beside it for a Kernel held directly. Reports the Kernel swallows through `runGuarded()` are recorded and, by default, fail `dispose()`. Nothing imports a test runner, nothing runs at import time, and nothing is cloned on the way in — a DOM node or a WebGL handle reaches a Shadow Object by identity. Adds `dist/src/testing.js`, `dist/src/testing/*` and their declarations to the published file list. Documented in `docs/api-reference.md`, `docs/best-practices.md` §9, `docs/cheat-sheet.md` and the README.
```

- [ ] **Step 6: Run the whole package suite**

Run: `pnpm -F @spearwolf/shadow-objects build && pnpm -F @spearwolf/shadow-objects test`
Expected: PASS, every spec including `distContract.spec.ts`.

- [ ] **Step 7: Lint, format and typecheck**

Run: `pnpm lint:fix && pnpm lint:ci && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: all three exit 0.

- [ ] **Step 8: Commit**

```bash
git add packages/shadow-objects/src/testing.ts \
        packages/shadow-objects/package.json \
        packages/shadow-objects/src/distContract.files.txt \
        packages/shadow-objects/src/distContract.package.json \
        packages/shadow-objects/CHANGELOG.md
git commit -m "feat: @spearwolf/shadow-objects/testing.js is a subpath of its own

Alongside model-context.js and for the same reason: it has no place in an
application bundle and none at all in the worker bundle. The dist contract
records the eight new modules and the new export."
```

---

### Task 11: Documentation

The mock example goes. Nothing about it is worth keeping.

**Files:**
- Modify: `packages/shadow-objects/docs/best-practices.md` (§9, lines 323-425)
- Modify: `packages/shadow-objects/docs/api-reference.md` (a new section)
- Modify: `packages/shadow-objects/docs/cheat-sheet.md`
- Modify: `packages/shadow-objects/README.md`

**Interfaces:**
- Consumes: the whole public surface of Task 10.
- Produces: `docs/api-reference.md` as the reference of record for the testing API.

- [ ] **Step 1: Rewrite §9 of `best-practices.md`**

Replace everything from the line `## 9. Testing Shadow Objects` up to and including the line before `## 10. Exposing Environments to an Agent`. The *Integration Testing* subsection stays, with a sentence added that says where the line runs. The new section covers, in this order:

1. One paragraph: Shadow Objects run on a Kernel that needs no DOM and no worker, so a unit test runs the real thing. Point at `@spearwolf/shadow-objects/testing.js`.
2. The ten-line `mountShadowObject()` example, copied verbatim from Task 9's first test.
3. *Properties, contexts and the sync tempo*: `await settle()` before asserting on a View message or a context; a View event is synchronous; a context is read inside an effect, never as a bare value in a constructor body; `useParentContext()` is the exception. Link back to §6.
4. *Composition* with `createTestKernel()`: `route()`, `createChild()`, `readContext()`, `instanceOf()`.
5. *Errors the Kernel swallows*: what `runGuarded()` does, why `dispose()` throws by default, and the three-line acknowledgement pattern.
6. *What the utility does not do*: no View layer, no worker, no clone — and therefore no proof that the same code survives a remote environment. Point at the *Integration Testing* subsection below it.
7. Under *What to Test*, keep the list and add: that a Shadow Object uses the properties and contexts it should, asserted through `describe()`.

Two constraints on the prose: no banned analogy from `AGENTS.md` §4, and the word "mock" appears only where the section says what it replaces.

- [ ] **Step 2: Add the reference section to `api-reference.md`**

Insert a new `## Testing` section directly after the `## Model Context` section (which ends where `## Web Components` begins, currently line 2037). It documents, each with its full signature and its defaults:

- `createTestKernel(options?)` and `TestKernelOptions`
- the `TestKernel` members, one line each
- `TestEntity`, one line per member, with the throw conditions of `instanceOf()` and this timing rule on `readContext()`: a context is read one settle after a provider wrote it, and a context no Shadow Object on that Entity has used yet needs one settle more, because the read is what creates the entry and links it to the parent
- `mountShadowObject(constructa, options?)`, `MountOptions`, `MountedShadowObject`, and the two microtask hops
- `settle()` and why it uses a `MessageChannel`
- `KernelErrorRecord`, `ViewMessageRecord`, and the rule that only level `error` fails a `dispose()`
- the Registry isolation rule, including the `createTestKernel({registry: Registry.get()})` bridge for `@ShadowObject`-registered classes and the warning that a Registry handed in is never cleared
- that a function handed in as a context value is read by `provideContext()` as a signal reader

- [ ] **Step 3: Add a block to `cheat-sheet.md`**

Add a `## Testing a Shadow Object` section between `## Inspecting an Environment` and `## Exposing Environments to an Agent`. One code block with the `mountShadowObject()` case, one with the `createTestKernel()` composition case, and three lines of prose naming the `settle()` rule and the error default.

- [ ] **Step 4: Add a line to the README**

In `packages/shadow-objects/README.md`, next to the existing mention of `@spearwolf/shadow-objects/model-context.js`, add one paragraph: the testing subpath, what it is for, and a link to the best-practices section.

- [ ] **Step 5: Run the terminology check and the full CI sequence**

Run: `pnpm lint:terms`
Expected: exit 0, `N documentation files, no banned terms`.

Run: `pnpm run ci`
Expected: exit 0. The `run` is not optional — `pnpm ci` is pnpm's own clean install.

- [ ] **Step 6: Commit**

```bash
git add packages/shadow-objects/docs/best-practices.md \
        packages/shadow-objects/docs/api-reference.md \
        packages/shadow-objects/docs/cheat-sheet.md \
        packages/shadow-objects/README.md
git commit -m "docs: section 9 tests against the Kernel, and the mock example is gone

The mock reimplemented signal tracking by hand and said so in its own
comment. What replaces it is ten lines of mountShadowObject(), the sync
tempo spelled out, and the reason a swallowed kernel error has to fail a
test rather than pass one."
```

---

## Self-Review

**Spec coverage.** §3 the file layout — Tasks 1, 2, 3, 9, 10. §4 `createTestKernel()` — Task 3, with §8's throw split into Task 8. §5 `TestEntity` — Tasks 3 to 7. §6 `mountShadowObject()` and both context hops — Task 9. §6.2 values are not cloned — asserted in Tasks 4 and 7. §7 `settle()` — Task 1. §8 error recording — Tasks 2 and 8. §9 isolation and teardown — Task 3. §10 files, exports, dist contract — every task carries its own contract lines, Task 10 verifies them against a build. §11 documentation — Task 11. §12 the utility's own tests — one spec per task. §13's open question about `instanceOf()` versus `shadowObjectOf()` is decided in Task 11 Step 1, where the name is read most; renaming afterwards means one edit in `types.ts`, one in `TestEntity.ts`, one in `mountShadowObject.ts` and one in `testing.ts`.

**Type consistency.** `TestKernel`, `TestEntity`, `MountedShadowObject`, `KernelErrorRecord`, `ViewMessageRecord`, `CreateEntityOptions`, `MountOptions`, `TestKernelOptions`, `AnyShadowObjectConstructor` and `ShadowObjectInstance` are declared once, in Task 2, and every later task implements against those declarations rather than restating them. `toPropertyEntries()` and `TestKernelInternals` are introduced in Task 3 and used in Tasks 3, 4 and 7. `recordKernelErrors()` returns `KernelErrorRecorder` in Task 2 and is consumed under that name in Tasks 3 and 8. `settle()` is one function, used by `TestKernel.settle()`, `MountedShadowObject.settle()` and directly.

**Known risk, and where it shows.** `settle()` rests on `MessageChannel` being a global under the `happy-dom` environment and the `forks` pool. Task 1 Step 4 checks exactly that and says to report rather than route around it, because the `setTimeout` fallback is the branch that breaks under fake timers.
