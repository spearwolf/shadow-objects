import {beforeEach, describe, expect, it, vi} from 'vitest';
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
import {MessageRouter} from './MessageRouter.js';

interface PostedMessage {
  message: any;
  options?: StructuredSerializeOptions;
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
  beforeEach(() => {
    vi.restoreAllMocks();
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

      router.route(message({type: 'nonsense'}));

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('[MessageRouter] unknown message', 'nonsense');
      expect(posted).toHaveLength(0);
    });

    it('names the whole payload when the message carries no type', () => {
      const {posted, router} = setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      router.route(message({}));

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toBe('[MessageRouter] unknown message');
      expect(warn.mock.calls[0][1]).toEqual({});
      expect(posted).toHaveLength(0);
    });
  });

  describe('messages from the kernel to the view', () => {
    it('forwards a kernel message to the view', async () => {
      const {kernel, posted} = setup();

      kernel.dispatchMessageToView({uuid: 'a', type: 'hello', data: {n: 1}});
      await flushMicrotasks();

      expect(posted).toHaveLength(1);
      expect(posted[0].message).toEqual({type: MessageToView, data: {uuid: 'a', type: 'hello', data: {n: 1}}});
      // The options object goes along either way; without transferables its `transfer` is simply
      // undefined, which `postMessage` reads as an empty list. Asserted strictly, because the key
      // being there with no value is the point -- `toEqual` would hold for a bare `{}` as well.
      expect(posted[0].options).toStrictEqual({transfer: undefined});
    });

    // Transferables belong to the structured-clone call, not to the payload: sending them along
    // inside `data` would clone the buffer instead of moving it.
    it('hands the transferables to postMessage instead of into the payload', async () => {
      const {kernel, posted} = setup();
      const buffer = new ArrayBuffer(8);

      kernel.dispatchMessageToView({uuid: 'a', type: 'hello', transferables: [buffer]});
      await flushMicrotasks();

      expect(posted).toHaveLength(1);
      expect(posted[0].options?.transfer?.[0]).toBe(buffer);
      expect('transferables' in posted[0].message.data).toBe(false);
    });

    it('stops forwarding kernel messages after a destroy', async () => {
      const {kernel, posted, router} = setup();
      vi.spyOn(console, 'debug').mockImplementation(() => undefined);

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
      expect(posted[0].message).toEqual({type: ImportedModule, url});
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
      expect(posted[0].message).toEqual({type: ImportedModule, url, error: 'module has no "shadowObjects" export'});
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
      expect(posted[0].message.type).toBe(ImportedModule);
      expect(posted[0].message.error).toBe('Error: missing "importModule" url');
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0][0]).toBe('[MessageRouter] failed to import module');
    });

    it('reports a module that cannot be parsed', async () => {
      const {posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const url = 'data:text/javascript,this is not javascript ###';

      router.route(message({type: Configure, importModule: url}));
      await waitForPosted(posted, 1);

      expect(posted).toHaveLength(1);
      expect(posted[0].message.type).toBe(ImportedModule);
      expect(posted[0].message.url).toBe(url);
      // Only the prefix: the rest of the message is the engine's wording, not ours.
      expect(posted[0].message.error).toMatch(/^SyntaxError/);
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
      expect(warn.mock.calls[0][0]).toContain('importModule: skipping already imported module');
    });
  });

  describe('a change trail that fails', () => {
    // Recorded as it behaves today, not as it ought to behave: one change trail with a serial
    // produces two confirmations for that serial -- first the failure, then the success. Which of
    // the two the waiting caller sees first decides between rejection and resolution.
    it('confirms a failed change trail twice -- once with the error and once without', () => {
      const {kernel, posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      router.route(changeTrailMessage(1, createEntity('a')));
      router.route(changeTrailMessage(2, setParent('a', 'ghost')));

      const messages = posted.map((entry) => entry.message);

      expect(messages).toHaveLength(3);
      expect(messages[0]).toEqual({type: AppliedChangeTrail, serial: 1});
      // What the failure says is the kernel's wording, and the kernel is not the subject here.
      // Asserted is what the router does with it: report it against the serial it came in on.
      expect(messages[1]).toEqual({type: AppliedChangeTrail, serial: 2, error: expect.stringMatching(/.+/)});
      // And then the second confirmation for that same serial, this one carrying no error at all.
      expect(messages[2]).toEqual({type: AppliedChangeTrail, serial: 2});
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0][0]).toBe('[MessageRouter] failed to apply change trail');
      expect(kernel.hasEntity('a')).toBe(true);
    });

    // Two statements in one case. That a trail stops at the entry that throws is the intended
    // behaviour. That the same serial is confirmed twice afterwards is recorded as it behaves
    // today, not as it ought to behave.
    it('stops at the entry that throws and leaves the rest of the trail unapplied', () => {
      const {kernel, posted, router} = setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      router.route(changeTrailMessage(7, createEntity('a'), setParent('a', 'ghost'), createEntity('b')));

      const messages = posted.map((entry) => entry.message);

      expect(kernel.hasEntity('a')).toBe(true);
      expect(kernel.hasEntity('b')).toBe(false);
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({type: AppliedChangeTrail, serial: 7, error: expect.stringMatching(/.+/)});
      expect(messages[1]).toEqual({type: AppliedChangeTrail, serial: 7});
      expect(error).toHaveBeenCalledTimes(1);
    });
  });

  describe('teardown', () => {
    it('confirms the destroy', () => {
      const {posted, router} = setup();
      vi.spyOn(console, 'debug').mockImplementation(() => undefined);

      router.route(message({type: Destroy}));

      expect(posted.map((entry) => entry.message)).toEqual([{type: Destroyed}]);
    });

    // Recorded as it behaves today, not as it ought to behave: the destroy unsubscribes from the
    // kernel and clears the module set, and leaves the entities of that kernel standing.
    it('leaves the entities of the kernel in place', () => {
      const {kernel, router} = setup();
      vi.spyOn(console, 'debug').mockImplementation(() => undefined);

      router.route(changeTrailMessage(1, createEntity('a')));
      router.route(message({type: Destroy}));

      expect(kernel.hasEntity('a')).toBe(true);
    });

    // Recorded as it behaves today, not as it ought to behave: the destroy sets no barrier, so a
    // change trail that arrives afterwards is applied and confirmed like any other.
    it('keeps routing change trails after the destroy', () => {
      const {kernel, posted, router} = setup();
      vi.spyOn(console, 'debug').mockImplementation(() => undefined);

      router.route(message({type: Destroy}));
      router.route(changeTrailMessage(2, createEntity('b')));

      expect(kernel.hasEntity('b')).toBe(true);
      expect(posted.map((entry) => entry.message)).toContainEqual({type: AppliedChangeTrail, serial: 2});
    });

    // Recorded as it behaves today, not as it ought to behave: a second destroy is answered like
    // the first one.
    it('confirms every destroy it is sent', () => {
      const {posted, router} = setup();
      vi.spyOn(console, 'debug').mockImplementation(() => undefined);

      router.route(message({type: Destroy}));
      router.route(message({type: Destroy}));

      expect(posted.map((entry) => entry.message)).toEqual([{type: Destroyed}, {type: Destroyed}]);
    });

    // The cases in this group that open with "recorded as it behaves today" are waiting to be
    // turned around. This one is not: the destroy empties the set of imported modules, so a module
    // that arrives again afterwards is registered again, and that is right as it stands. Were the
    // clear to fall away, a second configure with the same url would be skipped -- its tokens never
    // re-registered, its entities never upgraded -- and nothing else in this file would notice.
    it('clears the set of imported modules so the same module registers again', async () => {
      const {posted, router} = setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(console, 'debug').mockImplementation(() => undefined);
      const url = 'data:text/javascript,export const shadowObjects = {define: {}}';

      router.route(message({type: Configure, importModule: url}));
      await waitForPosted(posted, 1);

      router.route(message({type: Destroy}));

      router.route(message({type: Configure, importModule: url}));
      await waitForPosted(posted, 3);

      expect(posted.map((entry) => entry.message.type)).toEqual([ImportedModule, Destroyed, ImportedModule]);
      expect(posted.map((entry) => entry.message.error)).toEqual([undefined, undefined, undefined]);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  // This router uses the shared default registry, so the case must not write a token into it.
  it('builds its own kernel when none is handed in', () => {
    const {postMessage} = setup();

    const router = new MessageRouter({postMessage});

    expect(router.kernel).toBeInstanceOf(Kernel);
  });

  describe('a message the router cannot read', () => {
    // Recorded as it behaves today, not as it ought to behave: reading `.type` off the message
    // data is the first thing the router does, and on a nullish payload that access throws.
    it.each([null, undefined])('throws when the message data is %s', (value) => {
      const {router} = setup();

      expect(() => router.route(message(value))).toThrow(TypeError);
    });

    // The counterpart, and the line between the two: a primitive has no `type`, the access yields
    // `undefined` and the message ends up in the default branch instead of tearing the worker up.
    it.each(['changeTrail', 42, true])('warns about message data of %s instead of throwing', (value) => {
      const {posted, router} = setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      expect(() => router.route(message(value))).not.toThrow();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('[MessageRouter] unknown message', value);
      expect(posted).toHaveLength(0);
    });
  });
});