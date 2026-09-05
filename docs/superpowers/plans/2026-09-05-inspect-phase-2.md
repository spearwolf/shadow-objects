# Inspection Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ShadowEnv.get('ns').inspect()` answers for a worker environment exactly as it does for a local one: the request crosses into the worker, the Kernel snapshot is built there and comes back as plain data.

**Architecture:** One new request/reply pair on the worker protocol, `Inspect` / `Inspected`, carried by a serial of its own. `RemoteWorkerEnv.inspect()` posts the request and waits for the matching reply the way `applyChangeTrail(trail, true)` waits for its confirmation; `MessageRouter` answers it behind its teardown barrier by calling the `createKernelSnapshot()` of phase 1. A fifth worker timeout, `inspectTimeout`, follows the four existing ones through the constants, the constructor options and the `<shae-worker>` attributes. `ShadowEnv` needs no change: it already hands the request to whatever proxy implements `inspect`.

**Tech Stack:** TypeScript, `AbortSignal.any()` (Node ≥ 24.13 per `engines`, every evergreen browser since 2024), vitest 4 with happy-dom for the unit specs, vitest browser mode (Chromium) in `shadow-objects-testing`, Playwright in `shadow-objects-e2e`, Biome, pnpm 11 + turbo.

**Spec:** `docs/proposals/web-mcp-shadow-envs.md`, §8.4 (worker environment), §8.5 (what `ShadowEnv.inspect()` guarantees over a worker), §11.4 (`<shae-worker>`), §13 (no caching, the ordering rule), §14 (tests), §15 (docs), §16 (Phase 2), §18.6 (the builder in the worker bundle). Phase 1 is done: `docs/superpowers/plans/2026-09-05-inspect-phase-1.md`.

## Global Constraints

- Every source file and doc is English. Docs use the terminology of `AGENTS.md` §4: Entity, Entity Tree, Token, Shadow Object, `ComponentContext`, "Entity Context"; `pnpm lint:terms` checks the docs and READMEs.
- `view/` and `worker/` are mirror images: a message type added on one side gets its reader on the other side in the same change. `IShadowObjectEnvProxy.ts` is the contract and is not touched here -- `inspect?` is already on it.
- `WorkerReplyType` grows to five members. Its doc comment promises an exhaustive `switch`; every prose and code comment that counts "four replies", "four timeouts" or "four timeout attributes" is updated to five in the same task that adds the fifth (Tasks 1, 3, 4, 7).
- `MessageRouter.route()` keeps its order: the readability check, then the `isDestroyed` barrier, then the `switch`. The new case sits behind the barrier, so an inspection that arrives after the teardown is discarded like everything else.
- `createKernelSnapshot()` joins the inline worker bundle through `MessageRouter`. `src/inspect/createKernelSnapshot.ts` and `serializeValue.ts` must stay free of DOM globals (they are, since phase 1).
- `tsconfig.json` has `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`: an optional field is written only when it has a value; indexed reads are guarded or `!`-asserted with a reason.
- `inspectTimeout` obeys the same rule as the four others: a number of milliseconds from 1 to `MaxWorkerTimeout` (2147483647), everything else reported and the constant kept. Default `WorkerInspectTimeout = 5000`.
- The published `dist/` file list does not change in this phase; `src/distContract.files.txt` and `src/distContract.package.json` stay as they are. `dist/bundle.js` grows by the snapshot builder; the size delta is measured (Task 1, Task 7) and recorded in the changelog.
- `pnpm lint:ci` exits 1 on any Biome warning.
- Every commit message ends with the two trailers below, verbatim:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA
```

- Commit subjects follow the repo's style: `<type>: <lowercase sentence describing what now holds>`, e.g. `feat: the worker answers an inspection with a snapshot of its kernel`.
- Running numbers of an audit or review report never appear in code, tests, docs or commits.

## Deviations from the proposal, decided here

Task 7 writes these into the proposal so spec and code agree.

1. The wire types are named `InspectEvent` and `InspectedEvent` (the proposal says `InspectMessage` / `InspectedMessage`) and live in `src/types.ts` next to `AppliedChangeTrailEvent` and `ImportedModuleEvent`, whose naming they follow. Both are exported through `export type * from './types.js'` in `index.ts`.
2. The browser test for the worker route lives in `packages/shadow-objects-e2e` as a page (`pages/inspect-worker-env.html`), not in `packages/shadow-objects-testing` as §14 says. That package's harness runs local environments only -- `src/mount.js` documents it, and nothing there has ever resolved the worker URL under the vitest browser runner. The e2e package already drives `RemoteWorkerEnv` through Playwright in three engines. The local-environment browser test of §14 (`test/inspect-local-env.test.js`) lands in `shadow-objects-testing`, where it belongs.
3. An `Inspected` reply that carries neither `snapshot` nor `error` rejects with a `WorkerReportedError` naming the missing snapshot; the proposal does not say what such a reply means, and reading through `undefined` at the caller is the wrong answer.
4. `inspectTimeout` takes its place between `changeTrailTimeout` and `destroyTimeout` in every ordered list -- the `WorkerTimeouts` interface, the defaults, the attribute table, the docs tables -- so that the teardown stays last everywhere.
5. The router answers an inspection whether or not it carries a serial. A change trail without a serial gets no confirmation because nobody waits; an inspection has no effect besides its answer, so an answer is the only thing worth sending. `RemoteWorkerEnv` always sends one.

## File structure

| File | Responsibility |
| :--- | :--- |
| `packages/shadow-objects/src/constants.ts` | `Inspect`, `Inspected`, `WorkerInspectTimeout`, the fifth member of `WorkerReplyType` |
| `packages/shadow-objects/src/types.ts` | `InspectEvent`, `InspectedEvent` (wire shapes) |
| `packages/shadow-objects/src/WorkerTimeoutError.ts` | doc comment: five replies |
| `packages/shadow-objects/src/worker/MessageRouter.ts` | the `Inspect` case and `#onInspect()` |
| `packages/shadow-objects/src/view/RemoteWorkerEnv.ts` | `inspect()`, `#inspectSerial`, `WorkerTimeouts.inspectTimeout`, the default |
| `packages/shadow-objects/src/elements/constants.ts` | `ATTR_INSPECT_TIMEOUT` |
| `packages/shadow-objects/src/elements/ShaeWorkerElement.ts` | the fifth row of `WorkerTimeoutAttributes` |
| `packages/shadow-objects/src/worker/MessageRouter.spec.ts`, `src/view/RemoteWorkerEnv.spec.ts` | unit specs |
| `packages/shadow-objects-testing/test/worker-element-attributes.test.js` | the local element ignores five attributes |
| `packages/shadow-objects-testing/test/inspect-local-env.test.js` (new) | `inspect()` on a markup-built local environment in Chromium |
| `packages/shadow-objects-e2e/pages/inspect-worker-env.html`, `src/inspect-worker-env.js`, `tests/inspect-worker-env.spec.ts` (new) | `inspect()` over a real worker in three engines |
| `packages/shadow-objects-e2e/pages/shae-worker.html`, `src/shae-worker.js` | the fifth timeout attribute on `worker0` |
| `packages/shadow-objects-e2e/README.md`, `TEST-PLAN.md` | the new page in the tables |
| `packages/shadow-objects/docs/*.md`, `CHANGELOG.md`, `AGENTS.md`, `docs/proposals/web-mcp-shadow-envs.md` | documentation and spec amendments |

Commands run from the repository root unless a task says otherwise. A single vitest file needs the package directory: `cd packages/shadow-objects && pnpm exec vitest src/... --run`.

---

### Task 1: Protocol constants and wire shapes

**Files:**
- Modify: `packages/shadow-objects/src/constants.ts` (after `Destroyed`; after `WorkerChangeTrailTimeout`; the `WorkerReplyType` block)
- Modify: `packages/shadow-objects/src/types.ts` (imports; after `AppliedChangeTrailEvent`)
- Modify: `packages/shadow-objects/src/WorkerTimeoutError.ts` (doc comment only)

**Interfaces:**
- Produces: `Inspect = 'inspect'`, `Inspected = 'inspected'`, `WorkerInspectTimeout = 5000`, `WorkerReplyType` with `typeof Inspected` as fifth member, `InspectEvent {type, serial, request}`, `InspectedEvent {type, serial, snapshot?, error?, errorName?}`. Tasks 2 and 3 import all of them.

- [ ] **Step 1: Measure the bundle before anything changes**

Run:

```bash
pnpm -F @spearwolf/shadow-objects build
stat -c %s packages/shadow-objects/dist/bundle.js
gzip -c packages/shadow-objects/dist/bundle.js | wc -c
```

Write the two numbers down; Task 7 compares against them for the changelog.

- [ ] **Step 2: Add the constants**

In `src/constants.ts`, after `export const Destroyed = 'destroyed';`:

```typescript
export const Inspect = 'inspect';
export const Inspected = 'inspected';
```

Replace the `WorkerReplyType` block with:

```typescript
/**
 * The five replies a `RemoteWorkerEnv` waits for, each behind a deadline of its own: the `Loaded`
 * greeting of the load handshake, the `ImportedModule` answer to an `importScript()`, the
 * `AppliedChangeTrail` confirmation of a change trail sent with `waitForConfirmation`, the
 * `Inspected` answer to an `inspect()`, and the `Destroyed` receipt of a teardown. A `switch` over
 * the five is exhaustive.
 */
export type WorkerReplyType =
  | typeof Loaded
  | typeof AppliedChangeTrail
  | typeof ImportedModule
  | typeof Inspected
  | typeof Destroyed;
```

After `export const WorkerChangeTrailTimeout = 5000;`:

```typescript
export const WorkerInspectTimeout = 5000;
```

- [ ] **Step 3: Add the wire shapes to `src/types.ts`**

Extend the constants import to `import type {AppliedChangeTrail, ComponentChangeType, ImportedModule, Inspect, Inspected} from './constants.js';` and add, next to the other imports:

```typescript
import type {InspectRequest, KernelSnapshot} from './inspect/types.js';
```

(`inspect/types.ts` imports `RegistryDescription` from `./types.js`; the cycle is type-only on both ends and is erased.)

After the `AppliedChangeTrailEvent` interface:

```typescript
/**
 * What goes on the wire for an `inspect()` over a worker: the request as the caller gave it, and
 * the serial the answer is matched by. The request is plain data and survives structured cloning.
 */
export interface InspectEvent {
  type: typeof Inspect;
  serial: number;
  request: InspectRequest;
}

/**
 * The worker's answer to an {@link InspectEvent}: the snapshot, or the two fields of a throw that
 * survive structured cloning -- see {@link ImportedModuleEvent.errorName}. Exactly one of
 * `snapshot` and `error` is set by the router; a reply carrying neither is rejected by the view
 * side rather than read through.
 */
export interface InspectedEvent {
  type: typeof Inspected;
  serial: number;
  snapshot?: KernelSnapshot;
  error?: string;
  errorName?: string;
}
```

- [ ] **Step 4: Count five in `WorkerTimeoutError.ts`**

Replace the two paragraphs of the class doc comment that count four:

```typescript
/**
 * The reason a reply from the worker did not arrive in time.
 *
 * Five replies of a `RemoteWorkerEnv` have a deadline, and `messageType` names the one that stayed
 * out: the `Loaded` greeting of the load handshake, the `ImportedModule` answer to an
 * `importScript()`, the `AppliedChangeTrail` confirmation of a change trail sent with
 * `waitForConfirmation`, the `Inspected` answer to an `inspect()`, and the `Destroyed` receipt of
 * a teardown.
 *
 * `timeout` carries the number of milliseconds that were waited, so a diagnosis knows which of the
 * five values was in force without reaching for the `timeouts` of the `RemoteWorkerEnv`.
 *
 * The error says nothing about what the worker did with the request. A confirmation window that
 * ran out leaves a Shadow Environment that may well have applied the whole change trail, which is
 * why `ShadowEnv` books it as applied; `ChangeTrailRefusedError` is the only refusal that names a
 * number.
 */
```

- [ ] **Step 5: Confirm no `switch` over `WorkerReplyType` exists that would need a fifth case**

Run: `grep -rn "WorkerReplyType" packages/shadow-objects/src --include='*.ts' | grep -v spec`
Expected: three hits -- the definition in `constants.ts`, the parameter type in `utils/waitForMessageOfType.ts`, the field in `WorkerTimeoutError.ts`. None of them is a `switch`; nothing else to extend.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm -F @spearwolf/shadow-objects typecheck && pnpm exec biome check packages/shadow-objects/src/constants.ts packages/shadow-objects/src/types.ts packages/shadow-objects/src/WorkerTimeoutError.ts`
Expected: exit 0, no diagnostics.

- [ ] **Step 7: Commit**

```bash
git add packages/shadow-objects/src/constants.ts packages/shadow-objects/src/types.ts packages/shadow-objects/src/WorkerTimeoutError.ts
git commit -m "feat: the worker protocol names an inspection request and its answer, and the reply type counts five" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 2: `MessageRouter` answers an inspection

**Files:**
- Modify: `packages/shadow-objects/src/worker/MessageRouter.ts` (imports; the `switch` in `route()`; a method after `#onChangeTrail()`)
- Test: `packages/shadow-objects/src/worker/MessageRouter.spec.ts` (imports; a `describe` block appended inside `describe('MessageRouter', …)`, before the `describe('teardown', …)` block)

**Interfaces:**
- Consumes: `Inspect`, `Inspected` (Task 1), `InspectEvent`, `InspectedEvent` (Task 1), `createKernelSnapshot(kernel, request)` (phase 1), the module-local `describeError()`.
- Produces: for every `{type: 'inspect', serial, request}` that reaches `route()` before the teardown, exactly one posted `{type: 'inspected', serial, snapshot}` or `{type: 'inspected', serial, error, errorName?}`.

- [ ] **Step 1: Write the failing spec**

Extend the constants import at the top of `MessageRouter.spec.ts` with `Inspect` and `Inspected`, and add `import type {InspectedEvent} from '../types.js';`. Then insert, before `describe('teardown', …)`:

```typescript
  describe('inspection', () => {
    const inspectMessage = (serial: number, request: Record<string, unknown> = {}) =>
      message({type: Inspect, serial, request});

    it('answers an inspection with a snapshot of the kernel, under the serial it came in on', () => {
      const {posted, router} = setup();

      router.route(changeTrailMessage(1, createEntity('a', 'root'), createEntity('b', 'leaf'), setParent('b', 'a')));
      router.route(inspectMessage(7, {include: ['props']}));

      expect(posted).toHaveLength(2);
      const reply = posted[1]!.message as InspectedEvent;
      expect(reply.type).toBe(Inspected);
      expect(reply.serial).toBe(7);
      expect(reply.error).toBeUndefined();
      expect(reply.snapshot?.thread, 'happy-dom has no WorkerGlobalScope').toBe('main');
      expect(reply.snapshot?.counts).toEqual({entities: 2, roots: 1, shadowObjects: 0});
      expect(reply.snapshot?.roots.map((node) => [node.uuid, node.token])).toEqual([['a', 'root']]);
      expect(reply.snapshot?.roots[0]?.children?.map((node) => node.uuid)).toEqual(['b']);
      expect(reply.snapshot?.roots[0]?.shadowObjects, 'the request asked for props only').toBeUndefined();
      expect(reply.snapshot?.registry, 'and for no registry').toBeUndefined();
      expect(JSON.parse(JSON.stringify(reply)), 'the answer is plain data').toEqual(reply);
    });

    // The same queue as the change trails, so the picture is of the kernel between two of them.
    it('reflects every change trail routed before the request and none routed after it', () => {
      const {posted, router} = setup();

      router.route(changeTrailMessage(1, createEntity('before')));
      router.route(inspectMessage(1));
      router.route(changeTrailMessage(2, createEntity('after')));

      const reply = posted[1]!.message as InspectedEvent;
      expect(reply.type).toBe(Inspected);
      expect(reply.snapshot?.roots.map((node) => node.uuid)).toEqual(['before']);
    });

    // Without an answer the caller sits out its inspectTimeout and learns nothing about why.
    it('answers a builder that throws with the error, under the same serial', () => {
      const {kernel, posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(kernel, 'traverseLevelOrderBFS').mockImplementation(() => {
        throw new RangeError('the kernel is in no state to be walked');
      });

      router.route(inspectMessage(3));

      expect(posted.map((entry) => entry.message)).toEqual([
        {type: Inspected, serial: 3, error: 'the kernel is in no state to be walked', errorName: 'RangeError'},
      ]);
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0]![2]).toBe('failed to inspect the kernel');
    });

    it('discards an inspection that arrives after the destroy', () => {
      const {posted, router} = setup();
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
      ConsoleLogger.sharedConfig.enable = true;
      ConsoleLogger.sharedConfig.debug = true;

      router.route(message({type: Destroy}));
      router.route(inspectMessage(4));

      expect(posted.map((entry) => entry.message)).toEqual([{type: Destroyed}]);
      expect(debug.mock.calls.filter((call) => call[2] === 'discarding a message that arrived after the teardown')).toHaveLength(1);
    });
  });
```

The file's `beforeEach` restores every mock and snapshots `ConsoleLogger.sharedConfig`; its `afterEach` writes the snapshot back. `traverseLevelOrderBFS` is a prototype method of `Kernel`, so the spy replaces it on the instance.

- [ ] **Step 2: Run the spec to see it fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/worker/MessageRouter.spec.ts --run -t inspection`
Expected: FAIL -- three cases post nothing but a `warn('unknown message', 'inspect')`; the teardown case passes already (the barrier is in place) and stays green.

- [ ] **Step 3: Add the case and the handler to `MessageRouter.ts`**

Extend the constants import with `Inspect` and `Inspected`; add `import {createKernelSnapshot} from '../inspect/createKernelSnapshot.js';`; extend the types import with `InspectEvent` and `InspectedEvent`.

In `route()`, between the `ChangeTrail` and the `Destroy` cases:

```typescript
      case Inspect:
        this.#onInspect(data);
        break;
```

After `#onChangeTrail()`:

```typescript
  /**
   * An inspection runs through the same queue as the change trails, so the snapshot reflects every
   * trail routed before the request and none routed after it -- the one ordering guarantee
   * `ShadowEnv.inspect()` documents. It changes nothing and exists only for its answer, so unlike a
   * change trail it is answered whether or not the serial names a waiter; and a builder that throws
   * is answered too, with the two fields of the throw that survive the wire -- without a reply the
   * caller would sit out its `inspectTimeout` and learn nothing about why.
   */
  #onInspect(data: InspectEvent) {
    try {
      const snapshot = createKernelSnapshot(this.kernel, data.request);
      this.postMessage({type: Inspected, serial: data.serial, snapshot} as InspectedEvent);
    } catch (error) {
      this.logger.error('failed to inspect the kernel', error);
      this.postMessage({type: Inspected, serial: data.serial, ...describeError(error)} as InspectedEvent);
    }
  }
```

The `postMessage` sits inside the `try` on purpose: a snapshot the structured clone algorithm refuses -- which the builder promises never to emit -- would then be reported as an error reply rather than a silent timeout on the other side.

- [ ] **Step 4: Run the spec, the router suite and the runtime suite**

Run: `cd packages/shadow-objects && pnpm exec vitest src/worker --run && pnpm typecheck && cd ../.. && pnpm exec biome check packages/shadow-objects/src/worker`
Expected: PASS, exit 0, no diagnostics.

- [ ] **Step 5: Commit**

```bash
git add packages/shadow-objects/src/worker/MessageRouter.ts packages/shadow-objects/src/worker/MessageRouter.spec.ts
git commit -m "feat: the worker answers an inspection with a snapshot of its kernel, or with the reason it could not" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 3: `RemoteWorkerEnv.inspect()` and the fifth timeout

**Files:**
- Modify: `packages/shadow-objects/src/view/RemoteWorkerEnv.ts` (imports; `WorkerTimeouts`; `DefaultWorkerTimeouts`; three doc comments; a field next to `#changeTrailSerial`; a method after `importScript()`)
- Test: `packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts` (imports; `describe('worker failure')`, `describe('after destroy')`, `describe('the timeouts')`; a new `describe('inspection')` before `describe('the listeners on the worker')`)

**Interfaces:**
- Consumes: `Inspect`, `Inspected`, `WorkerInspectTimeout`, `InspectEvent`, `InspectedEvent` (Task 1), `InspectRequest`, `KernelSnapshot` (phase 1), `waitForMessageOfType()`, `WorkerReportedError`, `WorkerDestroyedError`.
- Produces: `RemoteWorkerEnv.prototype.inspect(request?: InspectRequest, signal?: AbortSignal): Promise<KernelSnapshot>`; `WorkerTimeouts.inspectTimeout: number`; `env.timeouts.inspectTimeout` defaulting to `WorkerInspectTimeout`. `RemoteWorkerEnvOptions` inherits the key through `Partial<WorkerTimeouts>`.

- [ ] **Step 1: Write the failing specs**

Extend the constants import at the top of `RemoteWorkerEnv.spec.ts` with `Inspect`, `Inspected` and `WorkerInspectTimeout`.

In `describe('worker failure', …)`, after `'rejects a pending applyChangeTrail instead of waiting for the change trail timeout'`:

```typescript
    it('rejects a pending inspect instead of waiting for the inspect timeout', async () => {
      const {env, worker} = await startEnv();

      const pending = env.inspect();
      worker.fail();

      await expectWorkerFailedRejection(pending);
    });
```

In `describe('after destroy', …)`, after `'rejects importScript instead of throwing a TypeError'`:

```typescript
    it('rejects inspect instead of throwing a TypeError', async () => {
      const {env} = await destroyed();

      await expectWorkerDestroyedRejection(env.inspect());
    });
```

and in `'settles the requests that were in flight when the teardown arrived'`, add a third pending request:

```typescript
      const pendingChangeTrail = env.applyChangeTrail([], true);
      const pendingImport = env.importScript('./in-flight.js');
      const pendingInspect = env.inspect();

      env.destroy();
      worker.reply({type: Destroyed});

      // their replies can no longer arrive, so none of them waits out its own timeout
      await expectWorkerDestroyedRejection(pendingChangeTrail);
      await expectWorkerDestroyedRejection(pendingImport);
      await expectWorkerDestroyedRejection(pendingInspect);
```

In `describe('the timeouts', …)`:

- `defaultTimeouts` gains `inspectTimeout: WorkerInspectTimeout,` between `changeTrailTimeout` and `destroyTimeout`, and its comment reads "The five resolved timeouts of a fresh environment, so a case can name the one key it is about and let the assertion carry the other four."
- `it('default to the four constants', …)` becomes `it('default to the five constants', …)`.
- The `it.each` title becomes `'take the %s option and leave the other four on their constant'`.
- The comment "The four cases below are the only proof…" becomes "The five cases below…".
- After `'cut a module import off at the configureTimeout'`:

```typescript
    it('cut an inspection off at the inspectTimeout', async () => {
      try {
        vi.useFakeTimers();

        const {env} = await startEnv({inspectTimeout: 1234});
        const settled = trackSettled(env.inspect());

        await vi.advanceTimersByTimeAsync(1233);
        expect(settled.value, 'not before its time').toBe('pending');

        await vi.advanceTimersByTimeAsync(1);
        expectTimedOut(settled, Inspected);
      } finally {
        vi.useRealTimers();
      }
    });
```

Before `describe('the listeners on the worker', …)`:

```typescript
  describe('inspection', () => {
    const snapshot = {takenAt: 1, thread: 'worker', counts: {entities: 0, roots: 0, shadowObjects: 0}, roots: [], globalContexts: []};

    it('posts the request under a serial of its own and resolves with the snapshot the answer carries', async () => {
      const {env, worker} = await startEnv();

      const pending = env.inspect({maxDepth: 2, include: ['props']});

      expect(worker.posted.at(-1)).toEqual({type: Inspect, serial: 1, request: {maxDepth: 2, include: ['props']}});

      worker.reply({type: Inspected, serial: 1, snapshot});

      expect(await pending).toEqual(snapshot);
    });

    // the two answers are told apart by their type, so neither sequence has to know the other
    it('counts its serials apart from the change trails', async () => {
      const {env, worker} = await startEnv();

      const trail = env.applyChangeTrail([], true);
      expect(worker.posted.at(-1).serial).toBe(1);
      worker.reply({type: AppliedChangeTrail, serial: 1});
      await trail;

      const first = env.inspect();
      expect(worker.posted.at(-1).serial, 'the first inspection is number one of its own sequence').toBe(1);
      worker.reply({type: Inspected, serial: 1, snapshot});
      await first;

      const second = env.inspect();
      expect(worker.posted.at(-1).serial, 'the sequence on the wire has no gaps').toBe(2);
      worker.reply({type: Inspected, serial: 2, snapshot});
      await second;
    });

    it('settles only the request the answer belongs to', async () => {
      const {env, worker} = await startEnv();

      const first = env.inspect();
      const second = env.inspect();

      let firstSettled = false;
      first.then(
        () => {
          firstSettled = true;
        },
        () => {
          firstSettled = true;
        },
      );

      worker.reply({type: Inspected, serial: 2, snapshot: {...snapshot, takenAt: 2}});
      worker.reply({type: AppliedChangeTrail, serial: 1});

      expect(await second).toEqual({...snapshot, takenAt: 2});
      await flushMicrotasks();
      expect(firstSettled, 'neither another inspection nor a change trail confirmation with the same number decides this one').toBe(
        false,
      );

      worker.reply({type: Inspected, serial: 1, snapshot});
      expect(await first).toEqual(snapshot);
    });

    it('rejects with the failure the worker reported, as an error of that name', async () => {
      const {env, worker} = await startEnv();

      const pending = env.inspect();
      worker.reply({type: Inspected, serial: 1, error: 'the kernel is in no state to be walked', errorName: 'RangeError'});

      const reason = await expectRejection(pending, 'RangeError');

      expect(reason).toBeInstanceOf(WorkerReportedError);
      expect(reason.message).toBe('the kernel is in no state to be walked');
    });

    // A sender that speaks another protocol may answer with the type alone; the caller gets a
    // rejection rather than an `undefined` it would then read through.
    it('rejects an answer that carries neither a snapshot nor an error', async () => {
      const {env, worker} = await startEnv();

      const pending = env.inspect();
      worker.reply({type: Inspected, serial: 1});

      const reason = await expectRejection(pending, 'Error');

      expect(reason).toBeInstanceOf(WorkerReportedError);
      expect(reason.message).toBe('the worker answered the inspection without a snapshot');
    });

    it("rejects with the reason of the caller's signal and stops listening for the answer", async () => {
      const {env, worker} = await startEnv();
      const listenersBefore = worker.listeners.get('message')!.size;

      const controller = new AbortController();
      const pending = env.inspect({}, controller.signal);
      expect(worker.listeners.get('message')!.size, 'one listener waits for the answer').toBe(listenersBefore + 1);

      const reason = new Error('the caller gave up');
      controller.abort(reason);

      await expect(pending).rejects.toBe(reason);
      expect(worker.listeners.get('message')!.size, 'and it is gone with the wait').toBe(listenersBefore);

      // the answer that arrives afterwards belongs to nobody, and nothing throws on its account
      worker.reply({type: Inspected, serial: 1, snapshot});
      await flushMicrotasks();
    });

    it('rejects a signal that is already aborted before anything goes on the wire', async () => {
      const {env, worker} = await startEnv();
      const postedBefore = worker.posted.length;

      const reason = new Error('never mind');
      await expect(env.inspect({}, AbortSignal.abort(reason))).rejects.toBe(reason);

      expect(worker.posted.length, 'no request was posted').toBe(postedBefore);
    });
  });
```

- [ ] **Step 2: Run the specs to see them fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/view/RemoteWorkerEnv.spec.ts --run -t "inspect|five constants|other four|inspectTimeout"`
Expected: FAIL -- `env.inspect is not a function`, and `timeouts` lacks `inspectTimeout`.

- [ ] **Step 3: Implement in `RemoteWorkerEnv.ts`**

Extend the constants import with `Inspect`, `Inspected`, `WorkerInspectTimeout`; extend the types import with `InspectEvent`, `InspectedEvent`; add `import type {InspectRequest, KernelSnapshot} from '../inspect/types.js';`.

`WorkerTimeouts`:

```typescript
/**
 * How long a {@link RemoteWorkerEnv} waits for each of the five replies a worker owes it,
 * in milliseconds.
 */
export interface WorkerTimeouts {
  /** the `Loaded` handshake at the start */
  loadTimeout: number;
  /** the `ImportedModule` reply to an `importScript()` */
  configureTimeout: number;
  /** the `AppliedChangeTrail` confirmation of a change trail sent with `waitForConfirmation` */
  changeTrailTimeout: number;
  /** the `Inspected` answer to an `inspect()` */
  inspectTimeout: number;
  /** the `Destroyed` acknowledgement of a teardown */
  destroyTimeout: number;
}
```

The `RemoteWorkerEnvOptions` doc: "Every value left out keeps its default — the five `Worker*Timeout` constants." `DefaultWorkerTimeouts` gains `inspectTimeout: WorkerInspectTimeout,` between `changeTrailTimeout` and `destroyTimeout`. In the `resolveTimeouts` doc, "One rule for all four values is easier to hold on to than three that allow it and one that does not" becomes "One rule for all five values is easier to hold on to than four that allow it and one that does not". The `timeouts` getter doc: "The five timeouts this environment holds itself to".

Next to `#changeTrailSerial = 0;`:

```typescript
  #inspectSerial = 0;
```

After `importScript()`:

```typescript
  /**
   * Asks the worker for a snapshot of its Kernel. The request travels as an `Inspect` message
   * under a serial of its own, and the `Inspected` answer that carries the same serial settles
   * the call: with the snapshot, or with a `WorkerReportedError` rebuilt from the failure the
   * worker described. An answer that stays out past `inspectTimeout` rejects with a
   * `WorkerTimeoutError`; a worker that failed or an environment that was torn down rejects right
   * away, before or while the answer is awaited.
   *
   * The caller's `signal` ends the wait with its own reason. The worker is not told: an answer
   * that arrives afterwards carries a serial nobody waits for any more and is discarded like any
   * other unmatched message.
   *
   * The message runs through the same queue as the change trails, so the snapshot reflects every
   * trail posted before this call and none posted after it.
   */
  inspect(request: InspectRequest = {}, signal?: AbortSignal): Promise<KernelSnapshot> {
    const {signal: failure} = this.#workerFailure;
    if (failure.aborted) return Promise.reject(failure.reason);
    if (signal?.aborted) return Promise.reject(signal.reason);

    const worker = this.#worker;
    if (worker == null) return Promise.reject(new WorkerDestroyedError());

    // a sequence of its own next to the one the change trails count on: the two answers are told
    // apart by their type, so neither sequence has to know about the other
    const serial = ++this.#inspectSerial;
    const message: InspectEvent = {type: Inspect, serial, request};
    worker.postMessage(message);

    let snapshot: KernelSnapshot | undefined;

    return waitForMessageOfType(
      worker,
      Inspected,
      this.timeouts.inspectTimeout,
      (data: InspectedEvent) => {
        if (data.serial !== serial) return false;
        if (data.error) throw new WorkerReportedError(data.errorName, data.error);
        snapshot = data.snapshot;
        return true;
      },
      signal === undefined ? failure : AbortSignal.any([failure, signal]),
    ).then(() => {
      // a reply that names neither a snapshot nor an error comes from a sender that does not
      // speak this protocol; it is a rejection, not a value the caller then reads through
      if (snapshot === undefined) {
        throw new WorkerReportedError(undefined, 'the worker answered the inspection without a snapshot');
      }
      return snapshot;
    });
  }
```

- [ ] **Step 4: Run the whole `RemoteWorkerEnv` and `ShadowEnv` suites, typecheck, lint**

Run: `cd packages/shadow-objects && pnpm exec vitest src/view/RemoteWorkerEnv.spec.ts src/view/ShadowEnv.spec.ts --run && pnpm typecheck && cd ../.. && pnpm exec biome check packages/shadow-objects/src/view`
Expected: PASS, exit 0, no diagnostics. `ShadowEnv.spec.ts` is run because `ShadowEnv.inspect()` is the caller of the new method; nothing in it changes, and it must stay green.

- [ ] **Step 5: Commit**

```bash
git add packages/shadow-objects/src/view/RemoteWorkerEnv.ts packages/shadow-objects/src/view/RemoteWorkerEnv.spec.ts
git commit -m "feat: a worker environment can be inspected, and the answer has a deadline of its own" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 4: The `inspect-timeout` attribute of `<shae-worker>`

**Files:**
- Modify: `packages/shadow-objects/src/elements/constants.ts` (after `ATTR_CHANGE_TRAIL_TIMEOUT`)
- Modify: `packages/shadow-objects/src/elements/ShaeWorkerElement.ts` (import; `WorkerTimeoutAttributes`)
- Modify: `packages/shadow-objects-testing/test/worker-element-attributes.test.js` (one case)
- Modify: `packages/shadow-objects-e2e/pages/shae-worker.html`, `packages/shadow-objects-e2e/src/shae-worker.js` (`worker0`), `packages/shadow-objects-e2e/TEST-PLAN.md` (the `shae-worker.spec.ts` row)

**Interfaces:**
- Consumes: `WorkerTimeouts.inspectTimeout` (Task 3).
- Produces: `ATTR_INSPECT_TIMEOUT = 'inspect-timeout'`, exported from `@spearwolf/shadow-objects` through `export * from './elements/constants.js'`; a `<shae-worker inspect-timeout="6600">` builds its `RemoteWorkerEnv` with `{inspectTimeout: 6600}`.

- [ ] **Step 1: Write the failing e2e check and the updated integration case**

`packages/shadow-objects-e2e/pages/shae-worker.html`, the `worker0` element -- add the attribute between `change-trail-timeout` and `destroy-timeout`:

```html
    <shae-worker
      id="worker0"
      src="/mod-hello.js"
      load-timeout="61000"
      configure-timeout="62000"
      change-trail-timeout="6000"
      inspect-timeout="6600"
      destroy-timeout="6500"
    ></shae-worker>
```

`packages/shadow-objects-e2e/src/shae-worker.js`, the `worker0-timeouts-from-attributes` check:

```javascript
  // The five timeout attributes on the element, read once when the worker environment was built.
  // The optional chains are deliberate: this has to report false rather than throw, so that a
  // page which does not carry the values keeps its "no unexpected console errors" guard green.
  testBooleanAction('worker0-timeouts-from-attributes', () => {
    const timeouts = shadowEnv0.envProxy?.timeouts;
    return (
      timeouts?.loadTimeout === 61000 &&
      timeouts?.configureTimeout === 62000 &&
      timeouts?.changeTrailTimeout === 6000 &&
      timeouts?.inspectTimeout === 6600 &&
      timeouts?.destroyTimeout === 6500
    );
  });
```

`packages/shadow-objects-testing/test/worker-element-attributes.test.js`, the case `'a local element ignores the four timeout attributes and reports nothing'`: rename it to `'a local element ignores the five timeout attributes and reports nothing'`, change the comment above it to "The five timeout attributes belong to the worker environment; a local one waits for nothing and has none of them. Reading them here anyway would report the three unreadable values below for an environment that would never have used them.", and extend the markup:

```javascript
    const container = mount(
      `<shae-worker local no-autostart ns="${nextNs()}" load-timeout="abc" configure-timeout="62000" change-trail-timeout="6000" inspect-timeout="-1" destroy-timeout="0"></shae-worker>`,
    );
```

`packages/shadow-objects-e2e/TEST-PLAN.md`, the `shae-worker.spec.ts` row: "the remote one carries the four timeout attributes" becomes "the remote one carries the five timeout attributes".

- [ ] **Step 2: Run the e2e page to see the check fail**

Run: `pnpm -F @spearwolf/shadow-objects build && cd packages/shadow-objects-e2e && pnpm exec playwright test tests/shae-worker.spec.ts --project=chromium`
Expected: `worker0-timeouts-from-attributes` FAILS (`inspectTimeout` is `undefined`); every other case of the page passes.

- [ ] **Step 3: Add the attribute**

`src/elements/constants.ts`, after `ATTR_CHANGE_TRAIL_TIMEOUT`:

```typescript
export const ATTR_INSPECT_TIMEOUT = 'inspect-timeout';
```

`src/elements/ShaeWorkerElement.ts`: add `ATTR_INSPECT_TIMEOUT` to the `./constants.js` import (alphabetical, after `ATTR_DESTROY_TIMEOUT`), and extend the table:

```typescript
const WorkerTimeoutAttributes: [keyof RemoteWorkerEnvOptions, string][] = [
  ['loadTimeout', ATTR_LOAD_TIMEOUT],
  ['configureTimeout', ATTR_CONFIGURE_TIMEOUT],
  ['changeTrailTimeout', ATTR_CHANGE_TRAIL_TIMEOUT],
  ['inspectTimeout', ATTR_INSPECT_TIMEOUT],
  ['destroyTimeout', ATTR_DESTROY_TIMEOUT],
];
```

- [ ] **Step 4: Run both browser suites for the element**

Run:

```bash
pnpm -F @spearwolf/shadow-objects build
cd packages/shadow-objects-testing && pnpm exec vitest test/worker-element-attributes.test.js --run && cd ../..
cd packages/shadow-objects-e2e && pnpm exec playwright test tests/shae-worker.spec.ts --project=chromium && cd ../..
pnpm -F @spearwolf/shadow-objects typecheck
```

Expected: both PASS, typecheck exit 0. (The e2e `webServer` runs `pnpm run preview`, which builds the pages first; the shadow-objects build above is what the pages import.)

- [ ] **Step 5: Commit**

```bash
git add packages/shadow-objects/src/elements/constants.ts packages/shadow-objects/src/elements/ShaeWorkerElement.ts packages/shadow-objects-testing/test/worker-element-attributes.test.js packages/shadow-objects-e2e/pages/shae-worker.html packages/shadow-objects-e2e/src/shae-worker.js packages/shadow-objects-e2e/TEST-PLAN.md
git commit -m "feat: the worker element reads an inspect-timeout attribute next to the four it already has" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 5: Browser-mode test of a local environment built from markup

**Files:**
- Create: `packages/shadow-objects-testing/test/inspect-local-env.test.js`

**Interfaces:**
- Consumes: `ShadowEnv.inspect()` (phase 1), the `mount` / `unmountAll` helpers of `src/mount.js`, the three element registrations.
- Produces: nothing new; the deferred §14 case for the local environment. It proves what happy-dom cannot: `<shae-prop>` values reaching the Kernel's props through real attribute parsing, and the `element` selector path resolving back to the `<shae-ent>` in a real document.

- [ ] **Step 1: Write the spec**

```javascript
import {expect} from '@esm-bundle/chai';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * `ShadowEnv.inspect()` against a local environment built from markup, in real Chromium: the
 * `<shae-prop>` values reach the Kernel's properties through the element's attribute parsing, the
 * View and the Kernel agree on the tree, and the `element` field of the View snapshot points at
 * the `<shae-ent>` that carries the component -- a document query the unit spec under happy-dom
 * cannot vouch for. The global namespace, as in `local-env-entities.test.js`; `unmountAll()`
 * clears it.
 */
describe('inspect a local environment', () => {
  afterEach(() => {
    unmountAll();
  });

  const mountTree = async () => {
    const container = mount(`
      <shae-worker local auto-sync="off" id="env"></shae-worker>
      <shae-ent id="root" token="root">
        <shae-prop name="title" value="hello"></shae-prop>
        <shae-prop name="count" type="number" value="3"></shae-prop>
        <shae-ent id="leaf" token="leaf"></shae-ent>
      </shae-ent>
    `);
    const env = container.querySelector('#env').shadowEnv;
    await env.ready();
    // the picture reflects what the Kernel has applied, so the cycle goes first
    await env.syncWait();
    return {container, env};
  };

  it('joins the view and the kernel of the markup tree', async () => {
    const {env} = await mountTree();
    const snapshot = await env.inspect();

    expect(snapshot.kind).to.equal('local');
    expect(snapshot.error).to.be.undefined;
    expect(snapshot.kernel.thread).to.equal('main');

    expect(snapshot.view.roots, 'one root on the view side').to.have.lengthOf(1);
    expect(snapshot.kernel.roots, 'one root on the kernel side').to.have.lengthOf(1);

    const viewRoot = snapshot.view.roots[0];
    const kernelRoot = snapshot.kernel.roots[0];
    expect(kernelRoot.uuid).to.equal(viewRoot.uuid);
    expect(kernelRoot.token).to.equal('root');
    expect(kernelRoot.children.map((node) => node.token)).to.eql(['leaf']);
    expect(kernelRoot.children[0].uuid).to.equal(viewRoot.children[0].uuid);
  });

  it('carries the <shae-prop> values as the kernel holds them', async () => {
    const {env} = await mountTree();
    const snapshot = await env.inspect();

    const byName = (props) => Object.fromEntries(props.map(({name, value, routes}) => [name, {value, routes}]));
    expect(byName(snapshot.kernel.roots[0].props)).to.eql({title: {value: 'hello', routes: true}, count: {value: 3, routes: true}});
    expect(byName(snapshot.view.roots[0].props), 'the view side holds the same committed values').to.eql(
      byName(snapshot.kernel.roots[0].props),
    );
  });

  it('points at the <shae-ent> behind every component', async () => {
    const {container, env} = await mountTree();
    const snapshot = await env.inspect();

    const root = snapshot.view.roots[0];
    const leaf = root.children[0];
    expect(root.element, 'a selector path is recorded').to.be.a('string');
    expect(document.querySelector(root.element)).to.equal(container.querySelector('#root'));
    expect(document.querySelector(leaf.element)).to.equal(container.querySelector('#leaf'));
  });

  it('survives a JSON round trip', async () => {
    const {env} = await mountTree();
    const snapshot = await env.inspect();

    expect(JSON.parse(JSON.stringify(snapshot))).to.eql(snapshot);
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm -F @spearwolf/shadow-objects build && cd packages/shadow-objects-testing && pnpm exec vitest test/inspect-local-env.test.js --run`
Expected: PASS, four cases. If the props case reports the `count` value as the string `'3'`, the `type="number"` attribute did not reach the converter -- check the markup against `prop-element-types.test.js`, which drives the same path; the framework is not the subject here.

- [ ] **Step 3: Lint and commit**

Run: `pnpm exec biome check packages/shadow-objects-testing/test/inspect-local-env.test.js`
Expected: no diagnostics.

```bash
git add packages/shadow-objects-testing/test/inspect-local-env.test.js
git commit -m "test: a local environment built from markup is inspected in a real browser, props and element paths included" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 6: The e2e page for the worker route

**Files:**
- Create: `packages/shadow-objects-e2e/pages/inspect-worker-env.html`, `packages/shadow-objects-e2e/src/inspect-worker-env.js`, `packages/shadow-objects-e2e/tests/inspect-worker-env.spec.ts`
- Modify: `packages/shadow-objects-e2e/README.md` (the page table), `packages/shadow-objects-e2e/TEST-PLAN.md` (the header counts and the spec table)

**Interfaces:**
- Consumes: `ShadowEnv.inspect()`, `RemoteWorkerEnv.inspect()` (Task 3), the `Inspect` / `Inspected` round trip through the real worker bundle (Task 2), the fixture `public/mod-hello.js` (defines a function Shadow Object `foo` that reads the property `xyz`).
- Produces: fourteen page checks, one Playwright test each in three engines, plus the two harness cases.

- [ ] **Step 1: The page**

`pages/inspect-worker-env.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>inspect-worker-env</title>
  </head>
  <body>
    <section id="tests"></section>
    <script type="module" src="/src/inspect-worker-env.js"></script>
  </body>
</html>
```

`src/inspect-worker-env.js`:

```javascript
import {ComponentContext, RemoteWorkerEnv, ShadowEnv, ViewComponent} from '@spearwolf/shadow-objects';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

runTestSuite(main);

/**
 * `ShadowEnv.inspect()` over a real worker: the request crosses the boundary as an `Inspect`
 * message, the snapshot comes back as `Inspected`, and both survive structured cloning. The unit
 * spec proves the same against a fake worker; this page is where the wire is real.
 */
async function main() {
  const shadowEnv = new ShadowEnv();
  shadowEnv.view = ComponentContext.get();
  shadowEnv.envProxy = new RemoteWorkerEnv();
  window.shadowEnv = shadowEnv;

  await testAsyncAction('inspect-env-ready', () => shadowEnv.ready());
  await testAsyncAction('inspect-importScript', () => shadowEnv.envProxy.importScript('/mod-hello.js'));

  const foo = new ViewComponent('foo');
  foo.setProperty('xyz', 123);
  const bar = new ViewComponent('bar', {parent: foo});
  bar.setProperty('plah', 666);

  // the picture reflects what the Kernel has applied, so the cycle goes first
  await testAsyncAction('inspect-first-sync', () => shadowEnv.syncWait());

  let snapshot;
  await testAsyncAction('inspect-answers', async () => {
    snapshot = await shadowEnv.inspect();
  });
  window.snapshot = snapshot;
  console.log('snapshot', snapshot);

  const kernelFoo = snapshot?.kernel?.roots?.[0];
  const viewFoo = snapshot?.view?.roots?.[0];

  testBooleanAction('inspect-kind-is-worker', () => snapshot.kind === 'worker' && snapshot.error === undefined);
  testBooleanAction('inspect-kernel-was-built-in-the-worker', () => snapshot.kernel?.thread === 'worker');

  testBooleanAction(
    'inspect-view-and-kernel-agree',
    () =>
      snapshot.kernel?.roots.length === 1 &&
      snapshot.view?.roots.length === 1 &&
      kernelFoo.uuid === foo.uuid &&
      viewFoo.uuid === foo.uuid &&
      kernelFoo.token === 'foo' &&
      kernelFoo.children?.length === 1 &&
      kernelFoo.children[0].uuid === bar.uuid &&
      kernelFoo.children[0].token === 'bar' &&
      viewFoo.children?.[0]?.uuid === bar.uuid,
  );

  testBooleanAction('inspect-props-crossed-the-wire', () => {
    const byName = (node) => Object.fromEntries((node?.props ?? []).map(({name, value, routes}) => [name, [value, routes]]));
    return (
      JSON.stringify(byName(kernelFoo)) === JSON.stringify({xyz: [123, true]}) &&
      JSON.stringify(byName(kernelFoo?.children?.[0])) === JSON.stringify({plah: [666, true]})
    );
  });

  testBooleanAction('inspect-shadow-objects-are-described', () => {
    const so = kernelFoo?.shadowObjects?.[0];
    return so?.displayName === 'foo' && so.definedUnder.join() === 'foo' && so.usesProperties.join() === 'xyz';
  });

  testBooleanAction(
    'inspect-registry-crossed-the-wire',
    () => Array.isArray(snapshot.kernel?.registry?.tokens?.foo) && snapshot.kernel.registry.tokens.foo[0] === 'foo',
  );

  testBooleanAction(
    'inspect-snapshot-is-json-safe',
    () => JSON.stringify(JSON.parse(JSON.stringify(snapshot))) === JSON.stringify(snapshot),
  );

  await testAsyncAction('inspect-honours-the-request', async () => {
    const shallow = await shadowEnv.inspect({maxDepth: 0, include: ['props']});
    const root = shallow.kernel?.roots?.[0];
    if (root?.children !== undefined) throw new Error('maxDepth 0 must not walk the children');
    if (root?.childCount !== 1) throw new Error(`childCount should be 1, got ${root?.childCount}`);
    if (root?.shadowObjects !== undefined) throw new Error('an include without shadowObjects must not carry them');
    if (!shallow.kernel?.truncation?.some((note) => note.reason === 'max-depth' && note.uuid === foo.uuid)) {
      throw new Error(`no max-depth note for ${foo.uuid}: ${JSON.stringify(shallow.kernel?.truncation)}`);
    }
  });

  await testAsyncAction('inspect-aborted-signal-rejects-with-its-reason', async () => {
    const reason = new Error('the caller gave up');
    const controller = new AbortController();
    const pending = shadowEnv.inspect({}, controller.signal);
    controller.abort(reason);
    const outcome = await pending.then(
      () => 'resolved',
      (error) => error,
    );
    if (outcome !== reason) throw new Error(`expected the abort reason, got ${outcome}`);
  });

  // the proxy is taken before the teardown: a destroyed ShadowEnv is frozen
  const proxy = shadowEnv.envProxy;
  shadowEnv.destroy();

  await testAsyncAction('inspect-after-destroy-rejects', async () => {
    const outcome = await proxy.inspect({}).then(
      () => 'resolved',
      (error) => error?.name,
    );
    if (outcome !== 'WorkerDestroyedError') throw new Error(`expected WorkerDestroyedError, got ${outcome}`);
  });
}
```

`tests/inspect-worker-env.spec.ts`:

```typescript
import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('inspect-worker-env', () => {
  runPageTests('/pages/inspect-worker-env.html', [
    'inspect-env-ready',
    'inspect-importScript',
    'inspect-first-sync',
    'inspect-answers',
    'inspect-kind-is-worker',
    'inspect-kernel-was-built-in-the-worker',
    'inspect-view-and-kernel-agree',
    'inspect-props-crossed-the-wire',
    'inspect-shadow-objects-are-described',
    'inspect-registry-crossed-the-wire',
    'inspect-snapshot-is-json-safe',
    'inspect-honours-the-request',
    'inspect-aborted-signal-rejects-with-its-reason',
    'inspect-after-destroy-rejects',
  ]);
});
```

The page names no `expectedErrors`: an aborted inspection and a proxy call after the teardown both reject into a handler, and `ShadowEnv.inspect()` races its contenders, so no rejection is left unhandled. If the harness case `no uncaught or logged errors` reports one, that is a defect in the framework, not a permission to add.

- [ ] **Step 2: Run the page in all three engines**

Run: `pnpm -F @spearwolf/shadow-objects build && pnpm -F shadow-objects-e2e test tests/inspect-worker-env.spec.ts`
Expected: PASS, 16 cases per project, 48 in total. On a non-Debian Linux the `test` script first checks the WebKit host libraries and names `pnpm setup:webkit` if they are missing -- run that once, then again.

- [ ] **Step 3: The two tables**

`packages/shadow-objects-e2e/README.md`, the page table, a row after `remote-worker-env`:

```markdown
| `inspect-worker-env` | `ShadowEnv.inspect()` over a real worker: the snapshot crosses the wire, View and Kernel agree, the request limits hold, an abort and a teardown reject |
```

`packages/shadow-objects-e2e/TEST-PLAN.md`: in the spec table of §1, a row after `remote-worker-env.spec.ts`:

```markdown
| `inspect-worker-env.spec.ts` | `pages/inspect-worker-env.html` | 16 | `ShadowEnv.inspect()` over a real worker: the snapshot is built in the worker (`thread: 'worker'`) and comes back JSON-safe, View and Kernel agree on uuids, tokens and props, Shadow Objects and the Registry are described, `maxDepth` and `include` are honoured with a truncation note, an aborted signal rejects with its reason, and the proxy rejects after the teardown. |
```

Then the counts. Run `cd packages/shadow-objects-e2e && pnpm exec playwright test --list --project=chromium | tail -1` and read the number of tests per project; the total is three times that. Replace, in the block quote and in the first paragraph of §1, "693 tests across Chromium, Firefox and WebKit — 231 per project, twelve spec files over twelve pages" and "Twelve spec files, 231 registered test cases per project — 693 across Chromium, Firefox and WebKit" with the new per-project count, its triple, and "thirteen spec files over thirteen pages" / "Thirteen spec files". Update the `Status:` date line to `2026-09-05`.

- [ ] **Step 4: Typecheck the e2e package, lint, commit**

Run: `pnpm -F shadow-objects-e2e typecheck && pnpm exec biome check packages/shadow-objects-e2e/src/inspect-worker-env.js packages/shadow-objects-e2e/tests/inspect-worker-env.spec.ts`
Expected: exit 0, no diagnostics.

```bash
git add packages/shadow-objects-e2e/pages/inspect-worker-env.html packages/shadow-objects-e2e/src/inspect-worker-env.js packages/shadow-objects-e2e/tests/inspect-worker-env.spec.ts packages/shadow-objects-e2e/README.md packages/shadow-objects-e2e/TEST-PLAN.md
git commit -m "test: an inspection crosses a real worker boundary in three engines, and the page says what came back" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 7: Documentation, changelog, the agent guide, the proposal, and the full CI run

**Files:**
- Modify: `packages/shadow-objects/docs/api-reference.md`, `docs/guides.md`, `docs/concepts.md`, `docs/cheat-sheet.md`
- Modify: `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`)
- Modify: `AGENTS.md` (§2, the Inspection bullet)
- Modify: `docs/proposals/web-mcp-shadow-envs.md` (§8.4, §14, §16)
- Test: `pnpm lint:terms`, `pnpm run ci`

No code. Every snippet is the text to insert or the exact phrase to replace.

- [ ] **Step 1: `api-reference.md` -- the `inspect()` section**

In `#### inspect(request?, signal?)` under `ShadowEnv`, after the three-bullet list ("Two things the promise can do, and one it never does.") and before the paragraph beginning "`EnvSnapshot` carries", insert:

```markdown
Over a worker the same call costs one round trip. The request travels to the worker as an `Inspect` message, the Kernel builds the snapshot there -- `kernel.thread` reads `'worker'` -- and the answer comes back as `Inspected`, matched to its request by a serial of its own. The request runs through the same queue as the change trails, so the snapshot reflects every trail posted before the call and none posted after it; that is why the `syncWait()` above is enough on both kinds of environment. An answer that stays out past `inspectTimeout` is reported under `error` as a `WorkerTimeoutError` naming `'inspected'`; a worker that failed or was torn down while it answers rejects the call, as the first bullet says, because the environment is gone with it. See [`RemoteWorkerEnv`](#remoteworkerenv).
```

- [ ] **Step 2: `api-reference.md` -- the proxy paragraph**

In `## Environment Proxies`, replace the sentence

> `createKernelSnapshot(kernel, request)` is the builder both shipped implementations would use, and `LocalShadowObjectEnv` calls it synchronously inside the promise.

with

> `createKernelSnapshot(kernel, request)` is the builder both shipped implementations use: `LocalShadowObjectEnv` calls it synchronously inside the promise, `RemoteWorkerEnv` posts the request to the worker as an `Inspect` message and resolves with the `Inspected` answer.

- [ ] **Step 3: `api-reference.md` -- `RemoteWorkerEnv`**

Exact replacements inside `### RemoteWorkerEnv`:

| Old | New |
| :--- | :--- |
| `// or with one or more of the four timeouts set explicitly` | `// or with one or more of the five timeouts set explicitly` |
| `**The constructor options are the four timeouts, and nothing else.** \`loadTimeout\`, \`configureTimeout\`, \`changeTrailTimeout\` and \`destroyTimeout\` correspond one to one to the four` | `**The constructor options are the five timeouts, and nothing else.** \`loadTimeout\`, \`configureTimeout\`, \`changeTrailTimeout\`, \`inspectTimeout\` and \`destroyTimeout\` correspond one to one to the five` |
| `The declarative half of the same decision is the four` | `The declarative half of the same decision is the five` |
| `\`Readonly<WorkerTimeouts>\`. The four timeouts this environment holds itself to` | `\`Readonly<WorkerTimeouts>\`. The five timeouts this environment holds itself to` |
| `The constructor is therefore the one place these four numbers are set` | `The constructor is therefore the one place these five numbers are set` |
| `along with every later \`applyChangeTrail()\`, \`importScript()\`, \`start()\` and \`workerLoaded\`` | `along with every later \`applyChangeTrail()\`, \`importScript()\`, \`inspect()\`, \`start()\` and \`workerLoaded\`` |
| `so the \`WorkerDestroyedError\` the three methods above promise` | `so the \`WorkerDestroyedError\` the four methods above promise` |
| `An \`applyChangeTrail()\` or \`importScript()\` already on the wire goes the same way` | `An \`applyChangeTrail()\`, \`importScript()\` or \`inspect()\` already on the wire goes the same way` |

In the **Methods** table, after the `applyChangeTrail(changeTrail, waitForConfirmation)` row:

```markdown
| `inspect(request?, signal?)` | Ask the worker for a [`KernelSnapshot`](#kernelsnapshot) of its Kernel. The request goes out as an `Inspect` message under a serial of its own and the promise resolves with the `Inspected` answer that carries the same serial; a failure the worker reports arrives as a `WorkerReportedError`. Rejects with a [`WorkerTimeoutError`](#workertimeouterror) when no answer arrives within `inspectTimeout`, with a `WorkerDestroyedError` after `destroy()`, and with the `signal`'s reason when the caller aborts -- the worker is not told, and its answer is discarded when it arrives. The snapshot reflects every change trail posted before the call and none posted after it. |
```

- [ ] **Step 4: `api-reference.md` -- `WorkerTimeoutError` and the constants**

In `#### WorkerTimeoutError`, the `messageType` row: after `'appliedChangeTrail'` for a change trail sent with a confirmation, insert `, 'inspected'` for an `inspect()` -- the cell reads "… `'appliedChangeTrail'` for a change trail sent with a confirmation, `'inspected'` for an `inspect()`, `'destroyed'` for the acknowledgement of a teardown." The `timeout` row: "which of the four values" becomes "which of the five values". The sentence "`WorkerReplyType` is exported … so a `switch` over the four cases can be exhaustive." becomes "… over the five cases …".

In `### Worker Timeout Constants`, the table gains a row between `WorkerChangeTrailTimeout` and `WorkerDestroyTimeout`:

```markdown
| `WorkerInspectTimeout` | 5000ms | Time to wait for the answer to an inspection. |
```

"When one of the four runs out" becomes "When one of the five runs out"; "a single environment moves any of the four" becomes "any of the five"; "and a declarative one with the four `<shae-worker>` [attributes]" becomes "with the five". The import example gains `WorkerInspectTimeout,` between `WorkerChangeTrailTimeout,` and `WorkerDestroyTimeout,`.

- [ ] **Step 5: `api-reference.md` -- `<shae-worker>`**

In the attributes table, after the `change-trail-timeout` row:

```markdown
| `inspect-timeout` | How long it waits for the answer to an inspection, in milliseconds. Default: `WorkerInspectTimeout` (5000). |
```

"**The four timeout attributes.**" becomes "**The five timeout attributes.**"; in the same paragraph "has none of the four" becomes "has none of the five". In the properties table, the `ShaeWorkerElement.observedAttributes` row: "the four timeout attributes — `load-timeout`, `configure-timeout`, `change-trail-timeout`, `destroy-timeout`" becomes "the five timeout attributes — `load-timeout`, `configure-timeout`, `change-trail-timeout`, `inspect-timeout`, `destroy-timeout`".

- [ ] **Step 6: `guides.md`**

The `<shae-worker>` attribute table row (in *The Container*): replace

> | `load-timeout`, `configure-timeout`, `change-trail-timeout`, `destroy-timeout` | How long the worker environment waits for the load handshake, a module import, a change trail confirmation and the teardown acknowledgement -- in milliseconds, from 1 to 2147483647 |

with

> | `load-timeout`, `configure-timeout`, `change-trail-timeout`, `inspect-timeout`, `destroy-timeout` | How long the worker environment waits for the load handshake, a module import, a change trail confirmation, the answer to an inspection and the teardown acknowledgement -- in milliseconds, from 1 to 2147483647 |

In `### Inspecting an Environment`, after the paragraph beginning "The `syncWait()` in front is the ordering rule." insert:

```markdown
Over a worker the same call works and costs a round trip: the request travels to the worker as an `Inspect` message, the Kernel builds the snapshot there, and the answer comes back as `Inspected`. The request goes through the same queue as the change trails, so the snapshot reflects every trail posted before the call and none posted after it -- the `syncWait()` in front is enough on both kinds of environment, and `snapshot.kernel.thread` says where the picture was taken. An answer that stays out past `inspectTimeout` (the `inspect-timeout` attribute, 5000 ms by default) is reported under `error` as a `WorkerTimeoutError`.
```

- [ ] **Step 7: `concepts.md` and `cheat-sheet.md`**

`concepts.md`, the paragraph beginning "The same clock governs what an inspection shows." -- append one sentence:

```markdown
Over a worker the request queues behind the change trails already on their way, so the Kernel's half reflects exactly those and nothing posted after it.
```

`cheat-sheet.md`, the `<shae-worker>` attribute row: replace

> | `load-timeout`, `configure-timeout`, `change-trail-timeout`, `destroy-timeout` | milliseconds | How long the worker environment waits for each of the four replies a worker owes it. Defaults: 60000 / 60000 / 5000 / 5000.

with

> | `load-timeout`, `configure-timeout`, `change-trail-timeout`, `inspect-timeout`, `destroy-timeout` | milliseconds | How long the worker environment waits for each of the five replies a worker owes it. Defaults: 60000 / 60000 / 5000 / 5000 / 5000.

(the rest of the cell stays). In `## Inspecting an Environment`, after the line `snapshot.kernel?.truncation;               // where maxDepth / maxNodes cut the walk`, add:

```typescript
snapshot.kernel?.thread;                   // 'worker' when the picture was taken inside the worker
```

- [ ] **Step 8: `CHANGELOG.md` of the package**

Build once more and measure, then compare with the numbers of Task 1 Step 1:

```bash
pnpm -F @spearwolf/shadow-objects build
stat -c %s packages/shadow-objects/dist/bundle.js
gzip -c packages/shadow-objects/dist/bundle.js | wc -c
```

Under `## [Unreleased]` → `### New`, after the four existing bullets, add (fill the two sizes in as `<before> → <after>` in kB with one decimal, dividing by 1000):

```markdown
- **New (public API):** `RemoteWorkerEnv.inspect(request?, signal?)` — the worker half of `ShadowEnv.inspect()`. The request crosses into the worker as an `Inspect` message under a serial of its own, `MessageRouter` builds the snapshot with `createKernelSnapshot()` and answers with `Inspected`; a builder that throws is answered with the error, and an inspection that arrives after the teardown is discarded like every other message. The message runs through the same queue as the change trails, so the snapshot reflects every trail posted before the call and none posted after it. Rejects with a `WorkerReportedError` for a failure the worker reported, a `WorkerTimeoutError` when the answer stays out, a `WorkerDestroyedError` after `destroy()`, and the caller's abort reason when the signal aborts. `ShadowEnv.inspect()` is unchanged and now answers for both shipped proxies.
- **New (protocol):** the message types `Inspect` (`'inspect'`) and `Inspected` (`'inspected'`) with their wire shapes `InspectEvent` and `InspectedEvent`; `WorkerReplyType` counts five members. `dist/bundle.js` carries the snapshot builder inside the inlined worker from now on: <before> kB → <after> kB minified, <before> kB → <after> kB gzipped. The `dist/` file list and the shape of `dist/package.json` are unchanged.
- **New (public API):** the fifth worker timeout. `WorkerInspectTimeout` (5000 ms), `WorkerTimeouts.inspectTimeout` and the `RemoteWorkerEnv` constructor option of the same name, vetted by the same rule as the four others, and the `<shae-worker inspect-timeout>` attribute (`ATTR_INSPECT_TIMEOUT`), read once when the worker environment is built and ignored under `local`. `WorkerTimeoutError.messageType` can read `'inspected'`.
```

- [ ] **Step 9: `AGENTS.md` and the proposal**

`AGENTS.md` §2, the Inspection bullet -- replace

> `ShadowEnv.inspect()` -> proxy `inspect()` -> `createKernelSnapshot(kernel)`.

with

> `ShadowEnv.inspect()` -> proxy `inspect()` -> `createKernelSnapshot(kernel)`, synchronously in a `LocalShadowObjectEnv` and as the `Inspect` / `Inspected` message pair through `MessageRouter` in a `RemoteWorkerEnv`.

`docs/proposals/web-mcp-shadow-envs.md`:

1. §8.4, the wire shapes block: rename `InspectMessage` to `InspectEvent` and `InspectedMessage` to `InspectedEvent`, and add after the block: "Both are exported from `src/types.ts` next to `AppliedChangeTrailEvent` and `ImportedModuleEvent`, whose naming they follow. A reply that carries neither `snapshot` nor `error` is rejected on the view side with a `WorkerReportedError`; the router answers an inspection whether or not it carries a serial, since an inspection has no effect besides its answer."
2. §8.4, the paragraph beginning "`RemoteWorkerEnv.inspect()` follows": after "`#inspectSerial`," insert nothing; at its end add "`inspectTimeout` sits between `changeTrailTimeout` and `destroyTimeout` in every ordered list, so the teardown stays last."
3. §14, the `packages/shadow-objects-testing` block: replace "`test/inspect-local-env.test.js` and `test/inspect-worker-env.test.js` -- `<shae-worker>` with and without `local`, …" with "`test/inspect-local-env.test.js` -- `<shae-worker local>`, a small `<shae-ent>` tree with `<shae-prop>` values, `env.inspect()` after `syncWait()`: View and Kernel agree on uuids, tokens and props, and the `element` paths resolve. The worker case lives in the e2e package: that harness runs local environments only." And in the `packages/shadow-objects-e2e` block, before the `tests/model-context.spec.ts` bullet, add "- `pages/inspect-worker-env.html` with `tests/inspect-worker-env.spec.ts` -- `ShadowEnv` + `RemoteWorkerEnv`, `inspect()` after `syncWait()` in three engines: the wire shapes survive structured cloning, `thread` reads `'worker'`, the request limits hold, an abort and a teardown reject."
4. §16, Phase 2: append "Implemented 2026-09-05; see `docs/superpowers/plans/2026-09-05-inspect-phase-2.md`." In the file table, the Phase 2 row: "New" becomes "`shadow-objects-e2e/pages/inspect-worker-env.html` and page, `shadow-objects-testing/test/inspect-local-env.test.js`" and "Changed" gains `elements/constants.ts`.

- [ ] **Step 10: The terminology lint and a count of what still says four**

Run: `pnpm lint:terms && grep -rn "four timeout\|four replies\|four \`Worker\|of the four\b" packages/shadow-objects/docs packages/shadow-objects/src packages/shadow-objects/README.md --include='*.md' --include='*.ts' | grep -v "\.spec\.ts"`
Expected: `lint:terms` exit 0; the grep finds nothing. Every hit it does find is a count this phase missed -- fix it and run again.

- [ ] **Step 11: The full CI sequence**

Run: `pnpm run ci`
Expected: exit 0 -- terminology check, build, typecheck, every vitest suite (the `shadow-objects-testing` suite runs the built `dist/` in Chromium, with the new `inspect-local-env` file), merged coverage, the e2e typecheck, `lint:ci`. Then, because `pnpm run ci` leaves Playwright out: `pnpm -F shadow-objects-e2e test`, expected green in all three projects.

- [ ] **Step 12: Commit**

```bash
git add packages/shadow-objects/docs/api-reference.md packages/shadow-objects/docs/guides.md packages/shadow-objects/docs/concepts.md packages/shadow-objects/docs/cheat-sheet.md packages/shadow-objects/CHANGELOG.md AGENTS.md docs/proposals/web-mcp-shadow-envs.md
git commit -m "docs: an inspection reaches a worker environment, and every count of replies, timeouts and attributes says five" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

## Self-review against the spec

**Spec coverage (§16, Phase 2):**

| Spec item | Task |
| :--- | :--- |
| `Inspect` / `Inspected` in `constants.ts`, `WorkerInspectTimeout`, `WorkerReplyType` with five members (§8.4) | 1 |
| Wire shapes (§8.4, "`types.ts` (wire shapes)" in the §16 table) | 1 |
| `MessageRouter.#onInspect()` behind the `isDestroyed` barrier, error reply, queue ordering (§8.4, §13) | 2 |
| `RemoteWorkerEnv.inspect()`: serial, `waitForMessageOfType`, `WorkerReportedError`, `AbortSignal.any` with the failure signal, discarded late answer (§8.4) | 3 |
| `WorkerTimeouts.inspectTimeout`, `RemoteWorkerEnvOptions`, `resolveTimeouts()` rule (§8.4) | 3 |
| `<shae-worker inspect-timeout>` in `WorkerTimeoutAttributes` (§8.4, §11.4) | 4 |
| `ShadowEnv.inspect()` works for a worker without change; `kind: 'worker'` (§8.5) | 3 (unit, `ShadowEnv.spec` stays green), 6 (e2e asserts `kind`) |
| Unit tests of §14: `MessageRouter.spec` round trip, builder error, discarded after teardown | 2 |
| Unit tests of §14: `RemoteWorkerEnv.spec` serial matching, `inspectTimeout` expiry, rejection after `destroy()`, abort through the caller's signal | 3 |
| Browser-mode tests of §14: local environment | 5 |
| Browser-mode tests of §14: worker environment, wire shapes survive structured cloning | 6 (e2e, see deviation 2) |
| Docs of §15: api-reference (`inspectTimeout`, the attribute, the messages under the worker protocol), guides, concepts, cheat-sheet, changelog | 7 |
| `AGENTS.md`, proposal amendments, green `pnpm run ci` (§15, §16) | 7 |
| §18.6, the builder in the worker bundle: accepted, size measured and recorded | 1, 7 |

Left to phase 3 on purpose: `src/model-context/`, the tools, the subpath export and the dist contract change, `best-practices.md`, the README *Security* sentence, the `filter` request field, the root `CHANGELOG.md` (no build or devDependency change in this phase; a new e2e page is neither).

**Placeholder scan:** every step carries its code or its exact text. The two numbers Task 7 asks for -- the bundle sizes and the Playwright test count -- are measured by the commands given in the same step, not guessed.

**Type consistency:** `InspectEvent {type, serial, request}` and `InspectedEvent {type, serial, snapshot?, error?, errorName?}` are identical in Tasks 1, 2 and 3; `WorkerTimeouts.inspectTimeout` is the key in Tasks 3 and 4 and the `it.each` of Task 3 picks it up from `defaultTimeouts`; the error wording `'the worker answered the inspection without a snapshot'` matches between the implementation and the spec of Task 3; the logger line `'failed to inspect the kernel'` matches between the implementation and the spec of Task 2; `ATTR_INSPECT_TIMEOUT = 'inspect-timeout'` in Task 4 is the attribute the e2e page and the docs of Task 7 name; the test ids of the Task 6 page and its spec are the same fourteen strings.
