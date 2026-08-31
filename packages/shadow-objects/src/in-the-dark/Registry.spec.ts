import {describe, expect, it} from 'vitest';
import {Registry} from './Registry.js';

describe('Registry', () => {
  it('find tokens by routes', () => {
    const registry = new Registry();

    registry.appendRoute('foo', ['bar', 'plah']);
    registry.appendRoute('plah', ['foo', 'xyz', 'abc']);

    expect(Array.from(registry.findTokensByRoute('foo')).sort()).toEqual(['abc', 'bar', 'foo', 'plah', 'xyz']);
  });

  it('overlapping routes', () => {
    const registry = new Registry();

    registry.appendRoute('testA', ['foo', 'bar']);
    registry.appendRoute('testB', ['bar', 'plah']);

    expect(Array.from(registry.findTokensByRoute('testA')).sort(), 'testA').toEqual(['bar', 'foo', 'testA']);
    expect(Array.from(registry.findTokensByRoute('testB')).sort(), 'testB').toEqual(['bar', 'plah', 'testB']);
  });

  it('prop based routings - simple', () => {
    const registry = new Registry();

    registry.appendRoute('foo', ['bar', 'plah']);
    registry.appendRoute('@x', ['xyz', 'abc']);
    registry.appendRoute('@y', ['abc']);

    expect(Array.from(registry.findTokensByRoute('foo', new Set(['x']))).sort()).toEqual(['abc', 'bar', 'foo', 'plah', 'xyz']);
  });

  it('prop based routings - advanced', () => {
    const registry = new Registry();

    registry.appendRoute('foo', ['bar', 'plah']);
    registry.appendRoute('plah@y', ['abc']);
    registry.appendRoute('abc@x', ['xyz']);

    expect(Array.from(registry.findTokensByRoute('foo', new Set(['x', 'y']))).sort()).toEqual([
      'abc',
      'bar',
      'foo',
      'plah',
      'xyz',
    ]);
  });

  it('merges routes appended to the same prop route twice', () => {
    const registry = new Registry();

    registry.appendRoute('@x', ['abc']);
    registry.appendRoute('@x', ['xyz']);

    expect(Array.from(registry.findTokensByRoute('foo', new Set(['x']))).sort()).toEqual(['abc', 'foo', 'xyz']);
  });

  describe('token resolution is reused', () => {
    class Alpha {}
    class Beta {}

    it('picks up a route appended after a resolution', () => {
      const registry = new Registry();

      registry.appendRoute('foo', ['bar']);
      expect(Array.from(registry.findTokensByRoute('foo')).sort()).toEqual(['bar', 'foo']);

      registry.appendRoute('bar', ['plah']);

      expect(Array.from(registry.findTokensByRoute('foo')).sort()).toEqual(['bar', 'foo', 'plah']);
    });

    it('forgets a route cleared after a resolution', () => {
      const registry = new Registry();

      registry.appendRoute('foo', ['bar']);
      expect(Array.from(registry.findTokensByRoute('foo')).sort()).toEqual(['bar', 'foo']);

      registry.clearRoute('foo');

      expect(Array.from(registry.findTokensByRoute('foo'))).toEqual(['foo']);
    });

    it('hands out a constructor defined after a resolution', () => {
      const registry = new Registry();

      registry.appendRoute('foo', ['bar']);
      expect(registry.findConstructors('foo')).toBeUndefined();

      registry.define('bar', Alpha);

      expect(registry.findConstructors('foo')).toEqual([Alpha]);
    });

    it('picks up a prop route appended after a resolution', () => {
      const registry = new Registry();

      registry.appendRoute('foo', ['bar']);
      // 'x' routes before the first resolution, so both questions are cut to the same resolution key
      // and what the second answer picks up hangs on the invalidation alone.
      registry.appendRoute('bar@x', ['bx']);
      expect(Array.from(registry.findTokensByRoute('foo', new Set(['x']))).sort()).toEqual(['bar', 'bx', 'foo']);

      registry.appendRoute('@x', ['xyz']);

      expect(Array.from(registry.findTokensByRoute('foo', new Set(['x']))).sort()).toEqual(['bar', 'bx', 'foo', 'xyz']);
    });

    it('the returned set belongs to the caller', () => {
      const registry = new Registry();

      registry.appendRoute('foo', ['bar']);

      const first = registry.findTokensByRoute('foo');
      first.add('intruder');
      first.delete('bar');

      expect(Array.from(registry.findTokensByRoute('foo')).sort()).toEqual(['bar', 'foo']);
    });

    it('a property without a routing rule changes nothing', () => {
      const registry = new Registry();

      registry.appendRoute('foo', ['bar']);
      registry.appendRoute('@x', ['xyz']);

      const withoutUnrelated = Array.from(registry.findTokensByRoute('foo', new Set(['x'])));
      const withUnrelated = Array.from(registry.findTokensByRoute('foo', new Set(['x', 'unrelated'])));

      expect(withUnrelated).toEqual(withoutUnrelated);
    });

    it("answers a question with its own answer, not with a neighbour's", () => {
      const build = () => {
        const registry = new Registry();
        registry.appendRoute('foo', ['bar']);
        registry.appendRoute('@x', ['xr']);
        registry.appendRoute('@y', ['yr']);
        registry.appendRoute('bar@y', ['by']);
        return registry;
      };

      const warmed = build();
      warmed.findTokensByRoute('foo', new Set(['y', 'x']));

      const cold = build();

      expect(Array.from(warmed.findTokensByRoute('foo', new Set(['x', 'y'])))).toEqual(
        Array.from(cold.findTokensByRoute('foo', new Set(['x', 'y']))),
      );
    });

    it('defines a constructor for a token found through a prop route', () => {
      const registry = new Registry();

      registry.appendRoute('@x', ['xyz']);
      registry.define('xyz', Alpha);
      expect(registry.findConstructors('foo', new Set(['x']))).toEqual([Alpha]);

      registry.define('foo', Beta);

      expect(registry.findConstructors('foo', new Set(['x']))).toEqual([Beta, Alpha]);
    });
  });

  describe('clear()', () => {
    it('clears prop-based (truthy) routes too, not only plain routes', () => {
      const registry = new Registry();

      registry.appendRoute('foo', ['bar', 'plah']);
      registry.appendRoute('@x', ['xyz']);
      registry.appendRoute('foo@y', ['abc']);

      // sanity: prop routes are active before clear
      expect(Array.from(registry.findTokensByRoute('foo', new Set(['x', 'y']))).sort()).toEqual([
        'abc',
        'bar',
        'foo',
        'plah',
        'xyz',
      ]);

      registry.clear();

      // After clear, even with truthy props, only the input token should come back.
      expect(Array.from(registry.findTokensByRoute('foo', new Set(['x', 'y'])))).toEqual(['foo']);
    });
  });
});
