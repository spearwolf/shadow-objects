import {afterEach, describe, expect, it} from 'vitest';
import {ComponentContext} from '../view/ComponentContext.js';
import {ViewComponent} from '../view/ViewComponent.js';
import {forwardCustomEventsFrom, isSameFilter} from './forwardCustomEvents.js';

/**
 * Creates a fresh, uniquely named context per test so that the global namespace singleton
 * map cannot leak state between specs.
 */
let ctxCounter = 0;

function makeContext(): ComponentContext {
  return ComponentContext.get(`forwardCustomEvents.spec-${++ctxCounter}`);
}

describe('isSameFilter', () => {
  it('answers no for two lists of different length', () => {
    expect(isSameFilter(new Set(['a']), new Set(['a', 'b']))).toBe(false);
  });

  it('answers no for two lists of the same length naming different types', () => {
    expect(isSameFilter(new Set(['a']), new Set(['b']))).toBe(false);
  });

  it('answers yes for two separate Sets carrying the same types', () => {
    // the case the two above are worth nothing without: a comparison that always says no
    // would pass both of them, and the read-back on connect writes the signal on every
    // reconnect instead of leaving an unchanged filter alone
    expect(isSameFilter(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
  });
});

describe('forwardCustomEventsFrom', () => {
  let ctx: ComponentContext;

  afterEach(() => {
    ctx?.clear();
  });

  it('sets no patch and answers with nothing where the filter forwards nothing', () => {
    ctx = makeContext();
    const vc = new ViewComponent('nothing', {context: ctx});
    const target = document.createElement('div');

    expect(forwardCustomEventsFrom(vc, target, false)).toBeUndefined();
    expect(forwardCustomEventsFrom(vc, target, new Set())).toBeUndefined();
    expect(Object.hasOwn(vc, 'dispatchEvent'), 'and it leaves the component as it found it').toBe(false);
  });

  it('carries one event per dispatch when a second patch lands on a component that already has one', () => {
    ctx = makeContext();
    const vc = new ViewComponent('twice', {context: ctx});
    const target = document.createElement('div');
    const seen: unknown[] = [];
    target.addEventListener('foo', (e) => seen.push((e as CustomEvent).detail));

    forwardCustomEventsFrom(vc, target, true);
    const undo = forwardCustomEventsFrom(vc, target, true);

    vc.dispatchEvent('foo', {n: 1}, false);

    expect(seen, 'the second patch calls through to the prototype, not to the first patch').toEqual([{n: 1}]);

    undo?.();
    expect(Object.hasOwn(vc, 'dispatchEvent'), 'and taking it back leaves nothing behind').toBe(false);
  });
});
