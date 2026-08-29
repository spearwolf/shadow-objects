import {describe, expect, it} from 'vitest';

import '../shae-ent.js';
import '../shae-prop.js';
import '../shae-worker.js';
import {SHAE_ENT, SHAE_PROP, SHAE_WORKER} from './constants.js';
import {ShaeEntElement} from './ShaeEntElement.js';
import {ShaePropElement} from './ShaePropElement.js';
import {ShaeWorkerElement} from './ShaeWorkerElement.js';

/**
 * The three elements answer alike, so the cases run over all three rather than once per class:
 * what is under test is the shape of the slot, and that shape is the same in each of them. On
 * two of the three the slot is `protected`, which only the type layer enforces -- the cast is
 * what lets a spec ask the question a plain JavaScript caller would ask.
 */
const ELEMENTS = [
  {tag: SHAE_ENT, ctor: ShaeEntElement},
  {tag: SHAE_PROP, ctor: ShaePropElement},
  {tag: SHAE_WORKER, ctor: ShaeWorkerElement},
] as const;

describe('the logger slot of the elements holds no setter', () => {
  it.each(ELEMENTS)('stands on the prototype as a getter without a setter: $tag', ({ctor}) => {
    const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, 'logger');

    expect(typeof descriptor?.get).toBe('function');
    expect(descriptor?.set).toBeUndefined();
  });

  it.each(ELEMENTS)('refuses an assignment and keeps the logger it reports through: $tag', ({tag}) => {
    const el = document.createElement(tag) as unknown as {logger: unknown};
    const logger = el.logger;

    expect(() => {
      el.logger = {};
    }).toThrow(TypeError);

    expect(el.logger).toBe(logger);
  });

  it.each(ELEMENTS)('hands out the same logger on every read: $tag', ({tag}) => {
    const el = document.createElement(tag) as unknown as {logger: unknown};

    expect(el.logger).toBe(el.logger);
  });
});
