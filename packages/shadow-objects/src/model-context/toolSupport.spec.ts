import {afterEach, describe, expect, it} from 'vitest';
import {GlobalNS} from '../constants.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../view/LocalShadowObjectEnv.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ViewComponent} from '../view/ViewComponent.js';
import {
  buildRequest,
  describeEnv,
  errorResult,
  GlobalNamespaceName,
  inspectEnvs,
  readInclude,
  runTool,
  type ToolContext,
  ToolError,
  ToolInput,
  textResult,
  toNamespace,
} from './toolSupport.js';

const ctx = (): ToolContext => ({prefix: 'shae-', limits: {}, redact: undefined, isExposed: undefined});

describe('toolSupport', () => {
  describe('ToolInput', () => {
    it('reads typed fields and treats anything but an object as empty', () => {
      const input = new ToolInput({a: 'x', n: 2, list: ['p', 'q'], nil: null});
      expect(input.string('a')).toBe('x');
      expect(input.number('n')).toBe(2);
      expect(input.stringList('list')).toEqual(['p', 'q']);
      expect(input.string('nil')).toBeUndefined();
      expect(input.string('missing')).toBeUndefined();
      expect(new ToolInput(null).string('a')).toBeUndefined();
      expect(new ToolInput('text').number('n')).toBeUndefined();
    });

    it('refuses a field of the wrong type, and a missing required one', () => {
      const input = new ToolInput({a: 1, n: 'two', list: [1], empty: ''});
      expect(() => input.string('a')).toThrow(ToolError);
      expect(() => input.number('n')).toThrow('"n" must be a number');
      expect(() => input.stringList('list')).toThrow('"list" must be a list of strings');
      expect(() => input.requiredString('empty')).toThrow('"empty" is required');
      expect(() => input.requiredString('missing')).toThrow('"missing" is required');
    });

    it('checks the include list against the four names', () => {
      expect(readInclude(new ToolInput({}))).toBeUndefined();
      expect(readInclude(new ToolInput({include: ['props', 'registry']}))).toEqual(['props', 'registry']);
      expect(() => readInclude(new ToolInput({include: ['nope']}))).toThrow('"include" knows only');
    });
  });

  describe('runTool', () => {
    it('answers a refusal and a failure as error results, and rejects only for an abort', async () => {
      const refused = runTool(async () => {
        throw new ToolError('no such thing');
      });
      expect(await refused({})).toEqual(errorResult('no such thing'));

      const failed = runTool(async () => {
        throw new RangeError('too deep');
      });
      expect(await failed({})).toEqual(errorResult('RangeError: too deep'));

      const controller = new AbortController();
      const reason = new Error('stop');
      const aborted = runTool(async (_input, signal) => {
        controller.abort(reason);
        throw signal?.reason;
      });
      await expect(aborted({}, {signal: controller.signal})).rejects.toBe(reason);
    });
  });

  describe('buildRequest', () => {
    it('lets the call win over the defaults, one level down for values', () => {
      expect(
        buildRequest({maxDepth: 2, values: {maxDepth: 1, maxStringLength: 10}}, {maxDepth: 5, values: {maxDepth: 3}}),
      ).toEqual({
        maxDepth: 5,
        values: {maxDepth: 3, maxStringLength: 10},
      });
      expect(buildRequest({}, {})).toEqual({});
    });
  });

  describe('namespaces', () => {
    it('names the global namespace by its symbol description, both ways', () => {
      expect(GlobalNamespaceName).toBe('ShadowObjectsGlobalNS');
      expect(toNamespace(GlobalNamespaceName)).toBe(GlobalNS);
      expect(toNamespace('game')).toBe('game');
    });
  });

  describe('inspectEnvs', () => {
    afterEach(() => {
      for (const ns of ['ts-a', 'ts-b']) {
        ShadowEnv.get(ns)?.destroy();
        ComponentContext.get(ns).dispose();
      }
    });

    it('asks one environment by namespace, or every one, and refuses an unknown name', async () => {
      const a = new ShadowEnv();
      a.view = ComponentContext.get('ts-a');
      a.envProxy = new LocalShadowObjectEnv();
      const vc = new ViewComponent('thing', {context: a.view});
      vc.setProperty('secret', 'hunter2');
      const b = new ShadowEnv();
      b.view = ComponentContext.get('ts-b');
      b.envProxy = new LocalShadowObjectEnv();
      await Promise.all([a.syncWait(), b.syncWait()]);

      const one = await inspectEnvs('ts-a', {}, undefined, ctx());
      expect(one.map((s) => s.namespace)).toEqual(['ts-a']);
      expect(one[0]?.kernel?.roots[0]?.props?.[0]?.value).toBe('hunter2');

      const all = await inspectEnvs(undefined, {}, undefined, ctx());
      expect(all.map((s) => s.namespace)).toEqual(expect.arrayContaining(['ts-a', 'ts-b']));

      const redacted = await inspectEnvs('ts-a', {}, undefined, {...ctx(), redact: (name) => name === 'secret'});
      expect(redacted[0]?.kernel?.roots[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});
      expect(redacted[0]?.view?.roots[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});

      await expect(inspectEnvs('nope', {}, undefined, ctx())).rejects.toThrow('no Shadow Environment holds the namespace "nope"');
    });
  });

  describe('results', () => {
    it('carries the summary, a blank line and the JSON in the text, and the data in structuredContent', () => {
      const result = textResult('one thing', {things: [1]});
      expect(result).toEqual({content: [{type: 'text', text: 'one thing\n\n{"things":[1]}'}], structuredContent: {things: [1]}});
      expect(errorResult('nope')).toEqual({content: [{type: 'text', text: 'nope'}], isError: true});
    });

    it('describes an environment in one line', () => {
      expect(
        describeEnv({
          namespace: 'game',
          isGlobalNamespace: false,
          kind: 'worker',
          state: {viewReady: true, proxyReady: true, isReady: true, isDestroyed: false},
          kernel: {
            takenAt: 0,
            thread: 'worker',
            counts: {entities: 12, roots: 1, shadowObjects: 3},
            roots: [],
            globalContexts: [],
          },
        }),
      ).toBe('game (worker, ready, 12 entities)');
      expect(
        describeEnv({
          namespace: 'ui',
          isGlobalNamespace: false,
          kind: 'custom',
          state: {viewReady: true, proxyReady: false, isReady: false, isDestroyed: false},
          error: {name: 'NotInspectable', message: 'no'},
        }),
      ).toBe('ui (custom, not ready, error: NotInspectable: no)');
    });
  });
});
