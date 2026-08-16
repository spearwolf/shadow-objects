import {expect} from '@esm-bundle/chai';
import {mount, unmountAll} from '../src/mount.js';

/**
 * `shae-ent.ts` and `shae-prop.ts` each call `customElements.define` on their own tag, with no
 * wait on the other. A consumer who imports `@spearwolf/shadow-objects/shae-prop.js` on its own —
 * the package's `exports` map allows exactly that — gets a working `<shae-prop>` immediately, and
 * a `<shae-prop>` that upgrades before `<shae-ent>` does still finds its host once `<shae-ent>`
 * registers.
 *
 * Neither registration module is imported at the top of this file: the first case below needs a
 * Custom Elements registry that starts out with nothing in it, and a static import here would
 * define the tag for every case in the file before any of them runs. `mount.js` only pulls in the
 * main entry point, which does not register any element.
 *
 * The two cases share this file's page, and the suite disables shuffling for this one `describe`:
 * the first case needs the registry empty, and the second one defining `shae-prop` first would
 * take that away from it. The second case does not lean on the first for its own setup, though —
 * it imports `shae-prop.js` itself, idempotently, so it passes the same way filtered down to just
 * itself (`-t`/`.only`).
 */
describe('shae-prop and shae-ent register independently', {shuffle: false}, () => {
  afterEach(() => {
    unmountAll();
  });

  // Mutation that turns this red: gate the `define` call in `shae-prop.ts` behind
  // `customElements.whenDefined(SHAE_ENT)`. Nothing on this page ever defines `shae-ent`, so that
  // promise would never resolve and `shae-prop` would stay undefined forever.
  it('shae-prop.js alone defines the element', async () => {
    expect(customElements.get('shae-prop'), 'nothing on this page has registered it yet').to.be.undefined;

    // no `whenDefined` afterwards: `import()` only resolves once the module's top-level code —
    // the `customElements.define` call included — has run, so the element is already defined by
    // the time this line continues. Waiting on `whenDefined` here would also pass a `define` that
    // merely arrives late instead of one that runs on import, which is the actual claim below.
    await import('@spearwolf/shadow-objects/shae-prop.js');

    expect(customElements.get('shae-prop')).to.exist;
  });

  // Mutation that turns this red: drop `#askPropertiesToReRequestHost()` from the
  // `#wasUpgradedInPlace` branch of `ShaeEntElement.connectedCallback` (`ShaeEntElement.ts:360`).
  // A `<shae-prop>` upgraded before its host exists then never hears the host arrive, and
  // `entNode` stays `undefined`.
  it('a shae-prop registered before shae-ent finds its host once shae-ent is defined', async () => {
    // idempotent: a no-op if the case above already ran and registered shae-prop, and the
    // registration itself when this case runs on its own
    await import('@spearwolf/shadow-objects/shae-prop.js');

    // this element upgrades the moment it is parsed, well before shae-ent exists on the page
    const container = mount(
      '<shae-ent id="p-host" token="probe"><shae-prop id="p-prop" name="x" value="7" type="int"></shae-prop></shae-ent>',
    );
    const prop = container.querySelector('#p-prop');

    expect(prop.entNode, 'shae-ent is not defined yet, so there is no host to find').to.be.undefined;

    await import('@spearwolf/shadow-objects/shae-ent.js');
    await customElements.whenDefined('shae-ent');
    // the re-request `shae-ent` sends on upgrade is picked up a microtask later
    await new Promise((resolve) => setTimeout(resolve, 0));

    const host = container.querySelector('#p-host');

    expect(prop.entNode).to.equal(host);
    expect(prop.viewComponent).to.equal(host.viewComponent);
    expect(prop.value).to.equal(7);
  });
});