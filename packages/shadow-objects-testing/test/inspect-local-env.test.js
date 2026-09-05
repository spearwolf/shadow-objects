import {expect} from '@esm-bundle/chai';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * `ShadowEnv.inspect()` against a local environment built from markup, in real Chromium: the
 * `<shae-prop>` values reach the Kernel's properties through the element's attribute parsing, the
 * View and the Kernel agree on the tree, and the `element` field of the View snapshot points at
 * the `<shae-ent>` that carries the component -- a document query the unit spec under happy-dom
 * cannot vouch for. The global namespace, as in `local-env-entities.test.js`; `unmountAll()`
 * clears it.
 */
describe('inspect a local environment', () => {
  afterEach(() => {
    unmountAll();
  });

  const mountTree = async () => {
    const container = mount(`
      <shae-worker local auto-sync="off" id="env"></shae-worker>
      <shae-ent id="root" token="root">
        <shae-prop name="title" value="hello"></shae-prop>
        <shae-prop name="count" type="number" value="3"></shae-prop>
        <shae-ent id="leaf" token="leaf"></shae-ent>
      </shae-ent>
    `);
    const env = container.querySelector('#env').shadowEnv;
    await env.ready();
    // the picture reflects what the Kernel has applied, so the cycle goes first
    await env.syncWait();
    return {container, env};
  };

  it('joins the view and the kernel of the markup tree', async () => {
    const {env} = await mountTree();
    const snapshot = await env.inspect();

    expect(snapshot.kind).to.equal('local');
    expect(snapshot.error).to.be.undefined;
    expect(snapshot.kernel.thread).to.equal('main');

    expect(snapshot.view.roots, 'one root on the view side').to.have.lengthOf(1);
    expect(snapshot.kernel.roots, 'one root on the kernel side').to.have.lengthOf(1);

    const viewRoot = snapshot.view.roots[0];
    const kernelRoot = snapshot.kernel.roots[0];
    expect(kernelRoot.uuid).to.equal(viewRoot.uuid);
    expect(kernelRoot.token).to.equal('root');
    expect(kernelRoot.children.map((node) => node.token)).to.eql(['leaf']);
    expect(kernelRoot.children[0].uuid).to.equal(viewRoot.children[0].uuid);
  });

  it('carries the <shae-prop> values as the kernel holds them', async () => {
    const {env} = await mountTree();
    const snapshot = await env.inspect();

    const byName = (props) => Object.fromEntries(props.map(({name, value, routes}) => [name, {value, routes}]));
    expect(byName(snapshot.kernel.roots[0].props)).to.eql({
      title: {value: 'hello', routes: true},
      count: {value: 3, routes: true},
    });
    expect(byName(snapshot.view.roots[0].props), 'the view side holds the same committed values').to.eql(
      byName(snapshot.kernel.roots[0].props),
    );
  });

  it('points at the <shae-ent> behind every component', async () => {
    const {container, env} = await mountTree();
    const snapshot = await env.inspect();

    const root = snapshot.view.roots[0];
    const leaf = root.children[0];
    expect(root.element, 'a selector path is recorded').to.be.a('string');
    expect(document.querySelector(root.element)).to.equal(container.querySelector('#root'));
    expect(document.querySelector(leaf.element)).to.equal(container.querySelector('#leaf'));
  });

  it('survives a JSON round trip', async () => {
    const {env} = await mountTree();
    const snapshot = await env.inspect();

    expect(JSON.parse(JSON.stringify(snapshot))).to.eql(snapshot);
  });
});
