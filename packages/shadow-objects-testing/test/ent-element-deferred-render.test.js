import {expect} from '@esm-bundle/chai';
import {Registry, shadowObjects} from '@spearwolf/shadow-objects/shadow-objects.js';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {freshTag} from '../src/freshTag.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * A custom element that renders `<shae-ent>…<slot></slot></shae-ent>` into its shadow root after it
 * connected — Lit's rendering model, and that of any `attachShadow()` followed by a deferred
 * `append()`. The entities in its light DOM connect together with the host, which is before the
 * entity that should become their parent exists, so their first request for a parent goes
 * unanswered.
 *
 * How the shadow root is filled decides how the entity in it is built, and that is the variable
 * here: `importNode` (what Lit does) and `createElement` construct the element before it is
 * inserted, while `cloneNode` of a template's content leaves it inert until `append()` upgrades it
 * in place. All three must end up with the same entity tree.
 *
 * Real Chromium, because slot assignment, the flattened tree and the moment a custom element is
 * constructed are all involved, and happy-dom reproduces none of them faithfully.
 *
 * Assertions go through `entParentNode?.id` rather than element identity: in the red state the
 * message then names the ids instead of two serialized elements.
 */

/** The collected peer round runs a microtask after the connect; one task later it has settled. */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

const templateOf = (html) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template;
};

/** The same markup, built element by element with `document.createElement`. */
const rebuild = (node) => {
  if (node.nodeType !== Node.ELEMENT_NODE) return document.importNode(node, false);
  const element = document.createElement(node.localName);
  for (const {name, value} of node.attributes) element.setAttribute(name, value);
  for (const child of node.childNodes) element.append(rebuild(child));
  return element;
};

const stamps = {
  importNode: (html) => document.importNode(templateOf(html).content, true),
  createElement: (html) => {
    const fragment = document.createDocumentFragment();
    for (const child of templateOf(html).content.childNodes) fragment.append(rebuild(child));
    return fragment;
  },
  cloneNode: (html) => templateOf(html).content.cloneNode(true),
};

/**
 * Define a host that attaches its shadow root on connect and fills it only when `render()` is
 * called, so the case decides when the framework renders. `renderRoot` is Lit's name for the
 * same thing, and the only way into a closed root from outside.
 */
const defineDeferredHost = (html, {stamp = 'importNode', mode = 'open'} = {}) => {
  const tag = freshTag('deferred-host');
  customElements.define(
    tag,
    class extends HTMLElement {
      #root;

      connectedCallback() {
        this.#root ??= this.attachShadow({mode});
      }

      get renderRoot() {
        return this.#root;
      }

      render() {
        this.#root.append(stamps[stamp](html));
      }
    },
  );
  return tag;
};

const SINGLE = '<shae-ent id="outer" token="outer"><slot></slot></shae-ent>';

afterEach(() => {
  unmountAll();
});

describe('shae-ent rendered into a shadow root after the entities it projects', () => {
  for (const stamp of ['importNode', 'createElement', 'cloneNode']) {
    it(`adopts the projected entity when the shadow root is stamped with ${stamp}`, async () => {
      const hostTag = defineDeferredHost(SINGLE, {stamp});
      const container = mount(`<${hostTag} id="host"><shae-ent id="inner" token="inner"></shae-ent></${hostTag}>`);
      const host = container.querySelector('#host');
      const inner = container.querySelector('#inner');

      expect(inner.entParentNode, 'the projected entity asked before anyone could answer').to.be.undefined;

      host.render();
      await nextTask();

      const outer = host.renderRoot.getElementById('outer');
      expect(inner.entParentNode?.id).to.equal('outer');
      expect(inner.viewComponent.parent, 'and the entity tree says the same').to.equal(outer.viewComponent);
    });
  }

  it('adopts the projected entity from inside a closed shadow root', async () => {
    const hostTag = defineDeferredHost(SINGLE, {mode: 'closed'});
    const container = mount(`<${hostTag} id="host"><shae-ent id="inner" token="inner"></shae-ent></${hostTag}>`);
    const host = container.querySelector('#host');
    const inner = container.querySelector('#inner');

    host.render();
    await nextTask();

    const outer = host.renderRoot.getElementById('outer');
    expect(inner.entParentNode?.id).to.equal('outer');
    expect(inner.viewComponent.parent).to.equal(outer.viewComponent);
  });

  // passes before the fix as well — it guards the fix against binding across namespaces
  it('leaves a projected entity of another namespace a root', async () => {
    const hostTag = defineDeferredHost(SINGLE);
    const container = mount(`<${hostTag} id="host"><shae-ent id="inner" ns="elsewhere" token="inner"></shae-ent></${hostTag}>`);
    const host = container.querySelector('#host');
    const inner = container.querySelector('#inner');

    host.render();
    await nextTask();

    expect(inner.entParentNode, 'an entity of another namespace is no parent').to.be.undefined;
    expect(inner.viewComponent.parent).to.be.undefined;
  });

  it('keeps the adopted entity when the host moves to another container', async () => {
    const hostTag = defineDeferredHost(SINGLE);
    const container = mount(`<${hostTag} id="host"><shae-ent id="inner" token="inner"></shae-ent></${hostTag}>`);
    const host = container.querySelector('#host');
    const inner = container.querySelector('#inner');

    host.render();
    await nextTask();

    mount('').append(host);
    await nextTask();

    const outer = host.renderRoot.getElementById('outer');
    expect(inner.entParentNode?.id).to.equal('outer');
    expect(inner.viewComponent.parent).to.equal(outer.viewComponent);
  });

  // passes before the fix as well — the `slotchange` of the new slot already reaches properties
  it('hands a projected property to the entity rendered above its slot', async () => {
    const hostTag = defineDeferredHost(SINGLE);
    const container = mount(
      `<${hostTag} id="host"><shae-prop id="prop" name="label" value="projected"></shae-prop></${hostTag}>`,
    );
    const host = container.querySelector('#host');

    host.render();
    await nextTask();

    expect(container.querySelector('#prop').entNode?.id).to.equal('outer');
  });

  describe('two nested hosts', () => {
    const setup = () => {
      const worldTag = defineDeferredHost('<shae-ent id="world" token="world"><slot></slot></shae-ent>');
      const displayTag = defineDeferredHost('<shae-ent id="display" token="display"><slot></slot></shae-ent>');
      const container = mount(
        `<${worldTag} id="world-host">` +
          `<${displayTag} id="display-host"><shae-ent id="hero" token="hero"></shae-ent></${displayTag}>` +
          `</${worldTag}>`,
      );
      const worldHost = container.querySelector('#world-host');
      const displayHost = container.querySelector('#display-host');
      const hero = container.querySelector('#hero');

      const expectTree = () => {
        const world = worldHost.renderRoot.getElementById('world');
        const display = displayHost.renderRoot.getElementById('display');
        expect(hero.entParentNode?.id, 'the hero hangs on the closest entity').to.equal('display');
        expect(hero.viewComponent.parent).to.equal(display.viewComponent);
        expect(display.entParentNode?.id, 'the display hangs on the world').to.equal('world');
        expect(display.viewComponent.parent).to.equal(world.viewComponent);
        expect(world.viewComponent.parent, 'the world is the root').to.be.undefined;
      };

      return {worldHost, displayHost, expectTree};
    };

    it('builds the chain when the outer host renders first', async () => {
      const {worldHost, displayHost, expectTree} = setup();
      worldHost.render();
      await nextTask();
      displayHost.render();
      await nextTask();
      expectTree();
    });

    it('builds the chain when the inner host renders first', async () => {
      const {worldHost, displayHost, expectTree} = setup();
      displayHost.render();
      await nextTask();
      worldHost.render();
      await nextTask();
      expectTree();
    });

    it('builds the chain when both hosts render in the same task', async () => {
      const {worldHost, displayHost, expectTree} = setup();
      worldHost.render();
      displayHost.render();
      await nextTask();
      expectTree();
    });
  });
});

describe('the context an adopted entity sees', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  // the symptom a user sees: the entity works, runs its Shadow Objects, and only what its
  // ancestors provide is missing
  it('reads the context provided by the entity rendered above its slot', async () => {
    let stage;
    shadowObjects.define('deferred-provider', function DeferredProvider({provideContext}) {
      provideContext('stage', 'stage-of-outer');
    });
    shadowObjects.define('deferred-consumer', function DeferredConsumer({useContext}) {
      stage = useContext('stage');
    });

    const hostTag = defineDeferredHost('<shae-ent id="outer" token="deferred-provider"><slot></slot></shae-ent>');
    const container = mount(
      '<shae-worker local no-autostart auto-sync="no" id="deferred-env"></shae-worker>' +
        `<${hostTag} id="host"><shae-ent id="inner" token="deferred-consumer"></shae-ent></${hostTag}>`,
    );
    const env = container.querySelector('#deferred-env');

    await env.start();
    await env.shadowEnv.syncWait();

    expect(stage, 'the consumer was created').to.be.a('function');
    expect(stage(), 'nothing provides a stage above a root').to.be.undefined;

    container.querySelector('#host').render();
    await nextTask();
    await env.shadowEnv.syncWait();

    expect(stage()).to.equal('stage-of-outer');
  });
});

describe('shae-ent whose slot starts projecting after it connected', () => {
  // The connect-time round has run and found nothing to adopt, because nothing was projected yet.
  // What changes afterwards is reported by `slotchange` alone, and the event that carries it only
  // reaches entities that are bound to some ancestor — a root listens nowhere.
  it('adopts a projected root once a slot is added to the rendered entity', async () => {
    const hostTag = defineDeferredHost('<shae-ent id="outer" token="outer"></shae-ent>');
    const container = mount(`<${hostTag} id="host"><shae-ent id="inner" token="inner"></shae-ent></${hostTag}>`);
    const host = container.querySelector('#host');
    const inner = container.querySelector('#inner');

    host.render();
    await nextTask();

    expect(inner.entParentNode, 'without a slot the entity projects nothing').to.be.undefined;

    const outer = host.renderRoot.getElementById('outer');
    outer.append(document.createElement('slot'));
    await nextTask();

    expect(inner.entParentNode?.id).to.equal('outer');
    expect(inner.viewComponent.parent).to.equal(outer.viewComponent);
  });

  it('adopts a projected root once its slot attribute names the slot', async () => {
    const hostTag = defineDeferredHost('<shae-ent id="outer" token="outer"><slot name="stage"></slot></shae-ent>');
    const container = mount(`<${hostTag} id="host"><shae-ent id="inner" slot="later" token="inner"></shae-ent></${hostTag}>`);
    const host = container.querySelector('#host');
    const inner = container.querySelector('#inner');

    host.render();
    await nextTask();

    expect(inner.entParentNode, 'a named slot that does not match projects nothing').to.be.undefined;

    inner.setAttribute('slot', 'stage');
    await nextTask();

    const outer = host.renderRoot.getElementById('outer');
    expect(inner.entParentNode?.id).to.equal('outer');
    expect(inner.viewComponent.parent).to.equal(outer.viewComponent);
  });
});
