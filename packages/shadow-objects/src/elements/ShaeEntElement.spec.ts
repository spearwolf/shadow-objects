import {afterEach, describe, expect, it} from 'vitest';

import '../shae-ent.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {ATTR_AUTO_DESTRUCT, SHAE_ENT} from './constants.js';
import type {ShaeEntElement} from './ShaeEntElement.js';

/**
 * A `<shae-ent>` in the document, with the attribute set to `value` where one is given.
 *
 * The attribute is written before the element connects, because that is the only moment at which it
 * can still decide anything: the element reads it once, where it builds its `ViewComponent`.
 */
const connectEnt = (value?: string): ShaeEntElement => {
  const el = document.createElement(SHAE_ENT) as ShaeEntElement;
  if (value != null) {
    el.setAttribute(ATTR_AUTO_DESTRUCT, value);
  }
  document.body.append(el);
  return el;
};

// Each case reads a flag off an entity of the default namespace, and every entity created here goes
// into the same context. Emptying the document takes the elements down, clearing the context takes
// the components with them — without both, a case would answer for what its predecessors left behind.
describe('ShaeEntElement', () => {
  afterEach(() => {
    document.body.replaceChildren();
    ComponentContext.get().clear();
  });

  describe('auto-destruct', () => {
    it('sets the flag on the view component when the bare attribute is present', () => {
      const el = connectEnt('');

      expect(el.viewComponent?.autoDestructionOnParentRemoval).toBe(true);
    });

    it('leaves the flag unset when the attribute is absent', () => {
      const el = connectEnt();

      expect(el.viewComponent?.autoDestructionOnParentRemoval).toBe(false);
    });

    it('reads the attribute as a truthy value, not as a presence', () => {
      expect(connectEnt('true').viewComponent?.autoDestructionOnParentRemoval).toBe(true);
      expect(connectEnt('').viewComponent?.autoDestructionOnParentRemoval).toBe(true);
      expect(connectEnt('false').viewComponent?.autoDestructionOnParentRemoval).toBe(false);
      expect(connectEnt('0').viewComponent?.autoDestructionOnParentRemoval).toBe(false);
    });

    it('keeps the flag it was built with when the attribute is removed afterwards', () => {
      const el = connectEnt('');

      el.removeAttribute(ATTR_AUTO_DESTRUCT);

      expect(el.viewComponent?.autoDestructionOnParentRemoval).toBe(true);
    });
  });
});
