import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  AppliedChangeTrail,
  ChangeTrail,
  ComponentChangeType,
  Configure,
  Destroy,
  Destroyed,
  ImportedModule,
  MessageToView,
} from '../constants.js';
import {Kernel} from '../in-the-dark/Kernel.js';
import {Registry} from '../in-the-dark/Registry.js';
import type {IComponentChangeType} from '../types.js';
import {ConsoleLogger, type ConsoleLoggerConfig} from '../utils/ConsoleLogger.js';
import {MessageRouter} from './MessageRouter.js';

interface PostedMessage {
  message: any;
  options?: StructuredSerializeOptions | undefined;
}

/**
 * Every case gets its own registry. `new Kernel()` without one falls back to the module-wide
 * default registry, and a token defined there would outlive the case that defined it.
 */
const setup = () => {
  const posted: PostedMessage[] = [];
  const kernel = new Kernel(new Registry());
  const postMessage = ((message: any, options?: StructuredSerializeOptions) => {
    posted.push({message, options});
  }) as unknown as typeof self.postMessage;
  const router = new MessageRouter({kernel, postMessage});
  return {kernel, posted, postMessage, router};
};

const message = (data: unknown) => ({data}) as MessageEvent;

const createEntity = (uuid: string, token = 'test-token'): IComponentChangeType => ({
  type: ComponentChangeType.CreateEntities,
  uuid,
  token,
});

const setParent = (uuid: string, parentUuid: string): IComponentChangeType => ({
  type: ComponentChangeType.SetParent,
  uuid,
  parentUuid,
});

const changeTrailMessage = (serial: number | undefined, ...changeTrail: IComponentChangeType[]) =>
  message({type: ChangeTrail, serial, changeTrail});

/** Lets the microtask behind `dispatchMessageToView()` run. */
const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * A dynamic import needs more than one turn of the loop, and how many is not ours to know.
 * Waiting for the message instead of for a fixed delay is what keeps the case from flaking.
 */
const waitForPosted = async (posted: PostedMessage[], count: number, timeout = 2000) => {
  const deadline = Date.now() + timeout;
  while (posted.length < count) {
    if (Date.now() > deadline) {
      throw new Error(`expected ${count} posted messages, got ${posted.length}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

/** The key under which the module double of the upgrade case counts its constructor calls. */
const CALL_COUNTER = 'shadowObjectsSpecCalls';

describe('MessageRouter', () => {
  // `ConsoleLogger.sharedConfig` is a process-wide static object: a case that switches a level on
  // to assert against the router's logger output must not leave that switch on for the cases
  // that run after it.
  let sharedConfigSnapshot: ConsoleLoggerConfig;

  beforeEach(() => {
    vi.restoreAllMocks();
    sharedConfigSnapshot = {...ConsoleLogger.sharedConfig};
  });

  afterEach(() => {
    Object.assign(ConsoleLogger.sharedConfig, sharedConfigSnapshot);
  });

  describe('routing', () => {
    it('applies a change trail and confirms it once', () => {
      const {kernel, posted, router} = setup();

      router.route(changeTrailMessage(42, createEntity('a')));

      expect(kernel.hasEntity('a')).toBe(true);
      expect(posted.map((entry) => entry.message)).toEqual([{type: AppliedChangeTrail, serial: 42}]);
    });

    // The confirmation hangs on the truthiness of `serial`. A missing key and an explicit
    // `undefined` are the same thing to that check.
    it('applies a change trail that carries no serial without confirming it', () => {
      const {kernel, posted, router} = setup();

      router.route(changeTrailMessage(undefined, createEntity('a')));

      expect(kernel.hasEntity('a')).toBe(true);
      expect(posted).toHaveLength(0);
    });

    // The boundary of that truthiness check. It costs nothing in practice: the view side counts
    // up from 1 with `++` (`view/RemoteWorkerEnv.ts`), so a serial of 0 never reaches the worker.
    it('treats a serial of 0 like no serial at all', () => {
      const {kernel, posted, router} = setup();

      router.route(changeTrailMessage(0, createEntity('a')));

      expect(kernel.hasEntity('a')).toBe(true);
      expect(posted).toHaveLength(0);
    });

    it('warns about a message type it does not know', () => {
      const {posted, router} = setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      ConsoleLogger.sharedConfig.enable = true;

      router.route(message({type: 'nonsense'}));

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('%cMessageRouter', ConsoleLogger.sharedStyles.warn, 'unknown message', 'nonsense');
      expect(posted).toHaveLength(0);
    });

    it('names the whole payload when the message carries no type', () => {
      const {posted, router} = setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      ConsoleLogger.sharedConfig.enable = true;

      router.route(message({}));

      expect(warn).toHaveBeenCalledTimes(1);
      const call = warn.mock.calls[0]!;
      expect(call[0]).toBe('%cMessageRouter');
      expect(call[2]).toBe('unknown message');
      expect(call[3]).toEqual({});
      expect(posted).toHaveLength(0);
    });
  });

  describe('messages from the kernel to the view', () => {
    it('forwards a kernel message to the view', async () => {
      const {kernel, posted} = setup();

      kernel.dispatchMessageToView({uuid: 'a', type: 'hello', data: {n: 1}});
      await flushMicrotasks();

      expect(posted).toHaveLength(1);
      expect(posted[0]!.message).toEqual({type: MessageToView, data: {uuid: 'a', type: 'hello', data: {n: 1}}});
      // WebIDL defaults `transfer` to `[]`; without transferables the router hands it an empty
      // list itself rather than leaving the key out, which is the same call either way.
      expect(posted[0]!.options).toStrictEqual({transfer: []});
    });

    // Transferables belong to the structured-clone call, not to the payload: sending them along
    // inside `data` would clone the buffer instead of moving it.
    it('hands the transferables to postMessage instead of into the payload', async () => {
      const {kernel, posted} = setup();
      const buffer = new ArrayBuffer(8);

      kernel.dispatchMessageToView({uuid: 'a', type: 'hello', transferables: [buffer]});
      await flushMicrotasks();

      expect(posted).toHaveLength(1);
      expect(posted[0]!.options?.transfer?.[0]).toBe(buffer);
      expect('transferables' in posted[0]!.message.data).toBe(false);
    });

    it('stops forwarding kernel messages after a destroy', async () => {
      const {kernel, posted, router} = setup();

      // The precondition belongs in the case: without a message that does arrive, the assertion
      // below would also hold for a kernel that never delivers anything to begin with.
      kernel.dispatchMessageToView({uuid: 'a', type: 'before'});
      await flushMicrotasks();
      expect(posted.filter((entry) => entry.message.type === MessageToView)).toHaveLength(1);

      router.route(message({type: Destroy}));

      kernel.dispatchMessageToView({uuid: 'a', type: 'after'});
      await flushMicrotasks();

      expect(posted.filter((entry) => entry.message.type === MessageToView)).toHaveLength(1);
    });
  });

  // The module urls are `data:` urls: `toUrlString()` hands them through unchanged and the loader
  // imports them. Each case waits for its own import before the next one starts -- the import is
  // asynchronous and the router keeps no order, so two imports started without a waiting point in
  // between come back in the order in which they resolve, not in the order in which they started.
  describe('module import', () => {
    it('imports a module and confirms its url', async () => {
      const {posted, router} = setup();
      const url = 'data:text/javascript,export const shadowObjects = {define: {}}';

      router.route(message({type: Configure, importModule: url}));
      await waitForPosted(posted, 1);

      expect(posted).toHaveLength(1);
      expect(posted[0]!.message).toEqual({type: ImportedModule, url});
    });

    it('upgrades the entities that already exist when the module arrives', async () => {
      const {kernel, posted, router} = setup();
      // The module text is a string: neither type-checked nor formatted. The counter is written in
      // dot notation and the token key in double quotes, so the single quotes stay with the spec.
      const url =
        'data:text/javascript,export const shadowObjects = {define: {"test-token": ' +
        'function ShadowObjectDouble() { globalThis.shadowObjectsSpecCalls = ' +
        '(globalThis.shadowObjectsSpecCalls ?? 0) + 1; }}}';

      try {
        router.route(changeTrailMessage(1, createEntity('a', 'test-token')));
        router.route(message({type: Configure, importModule: url}));
        await waitForPosted(posted, 2);

        expect(kernel.hasEntity('a')).toBe(true);
        expect((globalThis as unknown as Record<string, unknown>)[CALL_COUNTER]).toBe(1);
      } finally {
        delete (globalThis as unknown as Record<string, unknown>)[CALL_COUNTER];
      }
    });

    // A module that loads but carries nothing for us is not an error of the import -- the router
    // reports it to the view and stays quiet on the console.
    it('reports a module without the shadow-objects export', async () => {
      const {posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const url = 'data:text/javascript,export const nothing = 1';

      router.route(message({type: Configure, importModule: url}));
      await waitForPosted(posted, 1);

      expect(posted).toHaveLength(1);
      expect(posted[0]!.message).toEqual({type: ImportedModule, url, error: 'module has no "shadowObjects" export'});
      expect(error).not.toHaveBeenCalled();
    });

    it('reports a configure message that carries no url', async () => {
      const {posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      router.route(message({type: Configure}));
      await waitForPosted(posted, 1);

      // Asserted field by field, not with `toEqual` on the whole message: the message carries
      // `url: undefined`, and `toEqual` would wave that key through instead of naming it.
      expect(posted).toHaveLength(1);
      expect(posted[0]!.message.type).toBe(ImportedModule);
      expect(posted[0]!.message.error).toBe('missing "importModule" url');
      expect(posted[0]!.message.errorName).toBe('Error');
      expect(error).toHaveBeenCalledTimes(1);
      const call = error.mock.calls[0]!;
      expect(call[0]).toBe('%cMessageRouter');
      expect(call[2]).toBe('failed to import module');
    });

    it('reports a module that cannot be parsed', async () => {
      const {posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const url = 'data:text/javascript,this is not javascript ###';

      router.route(message({type: Configure, importModule: url}));
      await waitForPosted(posted, 1);

      expect(posted).toHaveLength(1);
      expect(posted[0]!.message.type).toBe(ImportedModule);
      expect(posted[0]!.message.url).toBe(url);
      // Only the name is ours to assert: the wording of the failure comes from the engine.
      expect(posted[0]!.message.errorName).toBe('SyntaxError');
      expect(posted[0]!.message.error, 'the wording belongs to the engine, that there is one belongs to us').toMatch(/.+/);
      expect(error).toHaveBeenCalledTimes(1);
    });

    // The set of imported modules is keyed by module identity, not by url. A second import of the
    // same url resolves to the same module object, so the registration is skipped -- and the view
    // still gets its confirmation, because the url did import.
    it('confirms a module it has already imported without registering it twice', async () => {
      const {posted, router} = setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const url = 'data:text/javascript,export const shadowObjects = {define: {}}';

      router.route(message({type: Configure, importModule: url}));
      await waitForPosted(posted, 1);

      router.route(message({type: Configure, importModule: url}));
      await waitForPosted(posted, 2);

      expect(posted).toHaveLength(2);
      expect(posted.map((entry) => entry.message.error)).toEqual([undefined, undefined]);
      expect(warn).toHaveBeenCalledTimes(1);
      // `ConsoleLogger` prints its namespace as a styled badge: `console.warn('%c<namespace>', styles,
      // ...args)`. The wording of the call starts at the third argument.
      expect(warn.mock.calls[0]![2]).toContain('importModule: skipping already imported module');
    });

    // The skip line is the one report of this branch that asks a getter first, so a logger that is
    // switched off silences it. The instance flag is enough for that -- `isWarn` combines it with
    // the two shared switches -- and it stays inside this test, where a write to the shared config
    // would reach every logger of the thread.
    it('keeps the skip of an already imported module behind the logger switch', async () => {
      const {kernel, posted, router} = setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const url = 'data:text/javascript,export const shadowObjects = {define: {}}';

      kernel.logger.enable = false;

      router.route(message({type: Configure, importModule: url}));
      await waitForPosted(posted, 1);

      router.route(message({type: Configure, importModule: url}));
      await waitForPosted(posted, 2);

      expect(posted).toHaveLength(2);
      expect(posted.map((entry) => entry.message.error)).toEqual([undefined, undefined]);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('a change trail that fails', () => {
    // One serial, one confirmation: the error message ends the trail. The waiting caller resolves
    // or rejects on the first message it sees, so its outcome does not hang on which of two
    // messages reaches it first.
    it('confirms a failed change trail once, with the error', () => {
      const {kernel, posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      router.route(changeTrailMessage(1, createEntity('a')));
      router.route(changeTrailMessage(2, setParent('a', 'ghost')));

      const messages = posted.map((entry) => entry.message);

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({type: AppliedChangeTrail, serial: 1});
      // What the failure says is the kernel's wording, and the kernel is not the subject here.
      // Asserted is what the router does with it: report it against the serial it came in on.
      expect(messages[1]).toEqual({
        type: AppliedChangeTrail,
        serial: 2,
        error: expect.stringMatching(/.+/),
        errorName: 'Error',
        appliedCount: 0,
      });
      expect(error).toHaveBeenCalledTimes(1);
      const call = error.mock.calls[0]!;
      expect(call[0]).toBe('%cMessageRouter');
      expect(call[2]).toBe('failed to apply change trail');
      expect(kernel.hasEntity('a')).toBe(true);
    });

    // A trail is applied entry by entry and the throw ends it where it stands: what came before it
    // stays, what came after it never runs.
    it('stops at the entry that throws and leaves the rest of the trail unapplied', () => {
      const {kernel, posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      router.route(changeTrailMessage(7, createEntity('a'), setParent('a', 'ghost'), createEntity('b')));

      const messages = posted.map((entry) => entry.message);

      expect(kernel.hasEntity('a')).toBe(true);
      expect(kernel.hasEntity('b')).toBe(false);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: AppliedChangeTrail,
        serial: 7,
        error: expect.stringMatching(/.+/),
        errorName: 'Error',
        appliedCount: 1,
      });
      expect(error).toHaveBeenCalledTimes(1);
    });

    // The number travels in a field of its own so that the string stays what it always was: the
    // wording of the throw the kernel met, not the wording of the refusal wrapped around it.
    it('reports the wording of the throw, not the wording of the refusal around it', () => {
      const {posted, router} = setup();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      router.route(changeTrailMessage(3, setParent('a', 'ghost')));

      const message = posted[0]!.message;

      expect(message.error).toContain('not found');
      expect(message.error).not.toMatch(/change trail entries/);
      expect(message.appliedCount).toBe(0);
    });

    // Confirmed is what was asked for: without a serial nobody is waiting, and an unsolicited
    // confirmation carrying `serial: undefined` would meet a guard on the view side that throws
    // every error message against whichever request is running at the time.
    it('does not confirm a failing change trail that carries no serial', () => {
      const {posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      router.route(changeTrailMessage(undefined, setParent('a', 'ghost')));

      expect(posted).toHaveLength(0);
      expect(error).toHaveBeenCalledTimes(1);
      const call = error.mock.calls[0]!;
      expect(call[0]).toBe('%cMessageRouter');
      expect(call[2]).toBe('failed to apply change trail');
    });

    // The name is what a caller on the view side reads to tell one refusal from another, so
    // it travels next to the wording rather than inside it.
    it('names the class the kernel refused with', () => {
      const {posted, router} = setup();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      router.route(changeTrailMessage(1, createEntity('a')));
      router.route(changeTrailMessage(2, createEntity('a')));

      const message = posted.at(-1)!.message;

      expect(message.errorName).toBe('EntityUuidInUseError');
      expect(message.error).toContain('already held by another entity');
      expect(message.appliedCount).toBe(0);
    });
  });

  describe('teardown', () => {
    it('confirms the destroy', () => {
      const {posted, router} = setup();

      router.route(message({type: Destroy}));

      expect(posted.map((entry) => entry.message)).toEqual([{type: Destroyed}]);
    });

    // The teardown takes the kernel down with it, so the `onDestroy` callbacks of the shadow
    // objects run while the thread is still alive rather than being thrown away with it.
    it('clears the entities of the kernel', () => {
      const {kernel, router} = setup();

      router.route(changeTrailMessage(1, createEntity('a')));
      router.route(message({type: Destroy}));

      expect(kernel.hasEntity('a')).toBe(false);
    });

    // Behind the teardown the kernel is empty and nothing of it reaches the view any more, so
    // whatever arrives afterwards is dropped where it comes in.
    it('discards the messages that arrive after the destroy', () => {
      const {kernel, posted, router} = setup();
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
      ConsoleLogger.sharedConfig.enable = true;
      ConsoleLogger.sharedConfig.debug = true;

      router.route(message({type: Destroy}));
      router.route(changeTrailMessage(2, createEntity('b')));
      router.route(message({type: Configure, importModule: 'data:text/javascript,export const shadowObjects = {define: {}}'}));

      expect(kernel.hasEntity('b')).toBe(false);
      expect(posted.map((entry) => entry.message)).toEqual([{type: Destroyed}]);
      expect(router.isDestroyed).toBe(true);
      expect(debug.mock.calls.filter((call) => call[2] === 'discarding a message that arrived after the teardown')).toHaveLength(
        2,
      );
    });

    // One teardown, one confirmation. A second destroy meets the same barrier as everything else
    // that arrives afterwards -- the reply belongs to the destroy that was answered, and there is
    // nobody left waiting behind it.
    it('confirms the first destroy and discards the second', () => {
      const {kernel, posted, router} = setup();
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
      const kernelDestroy = vi.spyOn(kernel, 'destroy');
      ConsoleLogger.sharedConfig.enable = true;
      ConsoleLogger.sharedConfig.debug = true;

      router.route(message({type: Destroy}));
      router.route(message({type: Destroy}));

      expect(posted.map((entry) => entry.message)).toEqual([{type: Destroyed}]);
      expect(kernelDestroy).toHaveBeenCalledTimes(1);
      expect(debug.mock.calls.filter((call) => call[2] === 'discarding a message that arrived after the teardown')).toHaveLength(
        1,
      );
    });

    // The point of taking the kernel down while the thread is still alive: what a Shadow Object
    // closes, reports or releases in its `onDestroy` actually gets the chance to run.
    it('runs the onDestroy of a shadow object', async () => {
      const {posted, router} = setup();
      // The module text is a string: neither type-checked nor formatted. The counter is written in
      // dot notation and the token key in double quotes, so the single quotes stay with the spec.
      const url =
        'data:text/javascript,export const shadowObjects = {define: {"test-token": ' +
        'function ShadowObjectDouble({onDestroy}) { onDestroy(() => { globalThis.shadowObjectsSpecCalls = ' +
        '(globalThis.shadowObjectsSpecCalls ?? 0) + 1; }); }}}';

      try {
        router.route(message({type: Configure, importModule: url}));
        await waitForPosted(posted, 1);

        router.route(changeTrailMessage(1, createEntity('a', 'test-token')));
        expect((globalThis as unknown as Record<string, unknown>)[CALL_COUNTER]).toBeUndefined();

        router.route(message({type: Destroy}));

        expect((globalThis as unknown as Record<string, unknown>)[CALL_COUNTER]).toBe(1);
      } finally {
        delete (globalThis as unknown as Record<string, unknown>)[CALL_COUNTER];
      }
    });

    // Without the confirmation the view sits out its destroy timeout and learns nothing it could
    // act on.
    it('confirms the destroy even when the kernel teardown throws', () => {
      const {kernel, posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(kernel, 'destroy').mockImplementation(() => {
        throw new Error('teardown failed');
      });

      router.route(message({type: Destroy}));

      expect(posted.map((entry) => entry.message)).toEqual([{type: Destroyed}]);
      expect(error).toHaveBeenCalledTimes(1);
      const call = error.mock.calls[0]!;
      expect(call[0]).toBe('%cMessageRouter');
      expect(call[2]).toBe('failed to tear the kernel down');
      expect(router.isDestroyed).toBe(true);
    });

    // The one window the barrier at the switch does not cover: the import is already in flight
    // when the destroy comes in.
    it('discards a module import that resolves after the destroy', async () => {
      const {posted, router} = setup();
      const url = 'data:text/javascript,export const shadowObjects = {define: {"test-token": function ShadowObjectDouble() {}}}';

      router.route(changeTrailMessage(1, createEntity('a')));
      router.route(message({type: Configure, importModule: url}));
      router.route(message({type: Destroy}));

      // the same url resolves from the same module job: once our own import is through, the
      // one the router started before it is through as well, and its continuation ran first
      await import(/* @vite-ignore */ url);
      await flushMicrotasks();

      expect(posted.map((entry) => entry.message.type)).toEqual([AppliedChangeTrail, Destroyed]);
    });
  });

  // This router uses the shared default registry, so the case must not write a token into it.
  it('builds its own kernel when none is handed in', () => {
    const {postMessage} = setup();

    const router = new MessageRouter({postMessage});

    expect(router.kernel).toBeInstanceOf(Kernel);
  });

  describe('a message the router cannot read', () => {
    // An unreadable message costs the message, not the worker.
    it.each([null, undefined])('discards a message it cannot read: %s', (value) => {
      const {posted, router} = setup();
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
      ConsoleLogger.sharedConfig.enable = true;
      ConsoleLogger.sharedConfig.debug = true;

      expect(() => router.route(message(value))).not.toThrow();

      expect(posted).toHaveLength(0);
      expect(debug).toHaveBeenCalledTimes(1);
      expect(debug).toHaveBeenCalledWith(
        '%cMessageRouter',
        ConsoleLogger.sharedStyles.debug,
        'discarding a message it cannot read',
        value,
      );
    });

    // The line runs between primitive and object: a primitive cannot be a message of this
    // protocol, an object without a `type` can -- for the second one see
    // `routing › names the whole payload when the message carries no type`.
    it.each(['changeTrail', 42, true])('discards message data of %s', (value) => {
      const {posted, router} = setup();
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      ConsoleLogger.sharedConfig.enable = true;
      ConsoleLogger.sharedConfig.debug = true;

      expect(() => router.route(message(value))).not.toThrow();

      expect(debug).toHaveBeenCalledTimes(1);
      expect(debug).toHaveBeenCalledWith(
        '%cMessageRouter',
        ConsoleLogger.sharedStyles.debug,
        'discarding a message it cannot read',
        value,
      );
      expect(warn).not.toHaveBeenCalled();
      expect(posted).toHaveLength(0);
    });

    it('writes nothing to the console when debug logging is off', () => {
      const {router} = setup();
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
      ConsoleLogger.sharedConfig.debug = false;

      router.route(message('nonsense'));

      expect(debug).not.toHaveBeenCalled();
    });
  });
});
