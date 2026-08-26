import {expect} from '@esm-bundle/chai';
import {ComponentContext} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

/**
 * What a `<shae-ent>` has to survive when it leaves the entity tree: it may have lost its
 * parent node, and it may never have been given a `ViewComponent` at all.
 *
 * Runs in a real browser because both paths hang off the custom element lifecycle, which
 * happy-dom does not reproduce closely enough to be worth trusting here.
 */
describe('shae-ent teardown', () => {
  /** Custom element reactions report their exceptions to the global handler instead of throwing. */
  const collectGlobalErrors = () => {
    const errors = [];
    const onError = (event) => errors.push(event.error ?? event.reason);
    window.addEventListener('error', onError);
    return {
      errors,
      stop: () => window.removeEventListener('error', onError),
    };
  };

  const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    render(`
      <shae-worker local no-autostart auto-sync="off" id="localEnv"></shae-worker>

      <shae-ent id="parent" token="parent">
        <shae-ent id="child" token="child"></shae-ent>
      </shae-ent>
    `);

    await Promise.all(['shae-worker', 'shae-ent'].map((name) => customElements.whenDefined(name)));
  });

  afterEach(() => {
    ComponentContext.get().clear();
    document.getElementById('localEnv')?.shadowEnv.destroy();
  });

  it('reports no parent node once it has been removed from the tree', () => {
    const [child] = findElementsById('child');

    child.remove();

    // the observer hands this straight to onParentChanged(), whose first parameter is
    // declared optional: a node outside any tree simply has no parent to report
    expect(child.getParentNodeForObserver(), 'getParentNodeForObserver()').to.be.undefined;
  });

  it('reports the shadow root, not its host, when it sits directly inside a shadow tree', () => {
    const [parent] = findElementsById('parent');

    const host = document.createElement('div');
    parent.append(host);
    host.attachShadow({mode: 'open'}).innerHTML = '<shae-ent id="shadowed" token="shadowed"></shae-ent>';

    const shadowed = host.shadowRoot.getElementById('shadowed');

    // the node the parent observer has to watch is the one the element is actually a child of:
    // watching the host instead would miss every mutation inside the shadow tree
    expect(shadowed.getParentNodeForObserver(), 'getParentNodeForObserver()').to.equal(host.shadowRoot);
    expect(shadowed.getParentNodeForObserver(), 'getParentNodeForObserver()').to.not.equal(host);

    shadowed.remove();
    host.remove();
  });

  it('detaches from its parent without a view component', async () => {
    const [parent, child] = findElementsById('parent', 'child');
    expect(child.entParentNode, 'entParentNode').to.equal(parent);

    // a shae-ent only ever gets a ViewComponent while it has a ComponentContext; without one
    // there is nothing to detach, and the teardown has to say so instead of reaching into it
    child.viewComponent$.set(undefined);
    child.componentContext$.set(undefined);

    const {errors, stop} = collectGlobalErrors();
    try {
      child.remove();
      await nextTask();

      expect(errors.map(String), 'errors reported while disconnecting').to.eql([]);
      expect(child.entParentNode, 'entParentNode').to.be.undefined;
    } finally {
      stop();
    }
  });
});
