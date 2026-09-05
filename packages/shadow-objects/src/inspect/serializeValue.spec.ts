import {createSignal} from '@spearwolf/signalize';
import {describe, expect, it} from 'vitest';
import {SerializeDefaults, serializeValue} from './serializeValue.js';

describe('serializeValue', () => {
  it('passes primitives through and tags what JSON drops', () => {
    expect(serializeValue(null)).toBe(null);
    expect(serializeValue(true)).toBe(true);
    expect(serializeValue(7)).toBe(7);
    expect(serializeValue('x')).toBe('x');
    expect(serializeValue(undefined)).toEqual({$type: 'undefined'});
    expect(serializeValue(10n)).toEqual({$type: 'bigint', value: '10'});
    expect(serializeValue(Symbol('s'))).toEqual({$type: 'symbol', description: 's'});
    expect(serializeValue(Symbol())).toEqual({$type: 'symbol'});
  });

  it('turns the three non-finite numbers into their names', () => {
    expect(serializeValue(NaN)).toBe('NaN');
    expect(serializeValue(Infinity)).toBe('Infinity');
    expect(serializeValue(-Infinity)).toBe('-Infinity');
  });

  it('recurses into plain objects and arrays', () => {
    expect(serializeValue({a: [1, {b: 'c'}], d: undefined})).toEqual({a: [1, {b: 'c'}], d: {$type: 'undefined'}});
    expect(serializeValue(Object.create(null))).toEqual({});
  });

  it('cuts at the depth limit', () => {
    const deep = {l1: {l2: {l3: {l4: 'x'}}}};
    expect(serializeValue(deep, {maxDepth: 2})).toEqual({l1: {l2: {l3: {$type: 'truncated', reason: 'depth'}}}});
  });

  it('cuts arrays, objects and strings at their limits and names the original size', () => {
    expect(serializeValue([1, 2, 3, 4], {maxArrayLength: 2})).toEqual([
      1,
      2,
      {$type: 'truncated', reason: 'length', original: 4},
    ]);
    expect(serializeValue({a: 1, b: 2, c: 3}, {maxObjectEntries: 2})).toEqual({
      a: 1,
      b: 2,
      $truncated: {$type: 'truncated', reason: 'entries', original: 3},
    });
    expect(serializeValue('abcdef', {maxStringLength: 3})).toEqual({
      $type: 'truncated',
      reason: 'string',
      original: 6,
      preview: 'abc',
    });
  });

  it('marks a cycle on the current path and lets a shared object appear twice', () => {
    const shared = {s: 1};
    const cyclic: {shared: unknown; again: unknown; self?: unknown} = {shared, again: shared};
    cyclic.self = cyclic;
    expect(serializeValue(cyclic)).toEqual({shared: {s: 1}, again: {s: 1}, self: {$type: 'circular'}});
  });

  it('reads a signal, and a signal reader, to its current value', () => {
    const sig = createSignal({n: 1});
    expect(serializeValue(sig)).toEqual({$type: 'signal', value: {n: 1}});
    expect(serializeValue(sig.get)).toEqual({$type: 'signal', value: {n: 1}});
  });

  it('names a function', () => {
    function named() {}
    expect(serializeValue(named)).toEqual({$type: 'function', name: 'named'});
    expect(serializeValue(() => {})).toEqual({$type: 'function', name: ''});
  });

  it('tags dates, buffers, maps, sets and errors', () => {
    expect(serializeValue(new Date('2026-09-05T00:00:00.000Z'))).toEqual({$type: 'date', iso: '2026-09-05T00:00:00.000Z'});
    expect(serializeValue(new ArrayBuffer(8))).toEqual({$type: 'array-buffer', byteLength: 8, class: 'ArrayBuffer'});
    expect(serializeValue(new Float32Array(4))).toEqual({$type: 'typed-array', byteLength: 16, class: 'Float32Array'});
    expect(serializeValue(new Map([['k', 1]]))).toEqual({$type: 'object', class: 'Map', preview: {size: 1, entries: [['k', 1]]}});
    expect(serializeValue(new Set([1, 2]))).toEqual({$type: 'object', class: 'Set', preview: {size: 2, entries: [1, 2]}});
    expect(serializeValue(new TypeError('boom'))).toEqual({
      $type: 'object',
      class: 'TypeError',
      preview: {name: 'TypeError', message: 'boom'},
    });
  });

  it('previews a class instance by its own enumerable keys', () => {
    class Vec {
      x = 1;
      y = 2;
      get len() {
        return 3;
      }
    }
    expect(serializeValue(new Vec())).toEqual({$type: 'object', class: 'Vec', preview: {x: 1, y: 2}});
  });

  it('recognises a DOM node by duck typing', () => {
    expect(serializeValue({nodeType: 1, nodeName: 'DIV', id: 'app'})).toEqual({$type: 'dom', nodeName: 'DIV', id: 'app'});
    expect(serializeValue({nodeType: 3, nodeName: '#text'})).toEqual({$type: 'dom', nodeName: '#text'});
  });

  it('survives a getter that throws', () => {
    const hostile = {
      get bad(): number {
        throw new Error('no');
      },
      good: 1,
    };
    expect(serializeValue(hostile)).toEqual({bad: {$type: 'object', class: 'Error', preview: {message: 'no'}}, good: 1});
  });

  it('survives a revoked proxy and a throwing trap', () => {
    const {proxy, revoke} = Proxy.revocable({a: 1}, {});
    revoke();
    expect(serializeValue({p: proxy})).toEqual({
      p: {$type: 'object', class: 'Error', preview: {message: expect.stringContaining('revoked')}},
    });

    const noKeys = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('no keys');
        },
      },
    );
    expect(serializeValue({p: noKeys})).toEqual({p: {$type: 'object', class: 'Error', preview: {message: 'no keys'}}});
  });

  it('marks a signal that holds itself as circular', () => {
    const sig = createSignal<unknown>();
    sig.set(sig);
    expect(serializeValue(sig)).toEqual({$type: 'signal', value: {$type: 'circular'}});
    sig.destroy();
  });

  it('ships the defaults of the proposal', () => {
    expect(SerializeDefaults).toEqual({maxDepth: 3, maxArrayLength: 20, maxObjectEntries: 30, maxStringLength: 200});
    expect(serializeValue([1, 2, 3], {maxArrayLength: NaN}), 'a limit that is not a number reads as the default').toEqual([
      1, 2, 3,
    ]);
  });

  it('produces JSON-safe output', () => {
    const out = serializeValue({s: createSignal(1), f: () => {}, u: undefined, d: new Date(0)});
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });
});
