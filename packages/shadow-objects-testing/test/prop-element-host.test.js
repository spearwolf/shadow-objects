import {expect} from '@esm-bundle/chai';
import {ComponentContext} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

/**
 * `ShaePropElement` finds its host by walking `parentElement` and checking `isShaeEntElement`.
 * The flag therefore has to mean "this is a `<shae-ent>`" and nothing else — a `<shae-prop>`
 * carrying it too would swallow the walk at the first prop in the chain.
 */
describe('shae-prop host lookup', () => {
  beforeEach(async () => {
    render(`
      <shae-ent id="host" token="host">
        <shae-prop id="outer" name="outer" value="1">
          <shae-prop id="inner" name="inner" value="2"></shae-prop>
        </shae-prop>
      </shae-ent>
    `);

    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));
  });

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('does not identify itself as an entity element', () => {
    const [outer] = findElementsById('outer');

    expect(outer.isShaePropElement).to.be.true;
    expect(outer.isShaeEntElement).to.be.undefined;
  });

  it('walks past a nested shae-prop to the real host entity', () => {
    const [host, outer, inner] = findElementsById('host', 'outer', 'inner');

    expect(outer.entNode).to.equal(host);
    expect(inner.entNode, 'the inner prop must not mistake the outer prop for its host').to.equal(host);
  });
});