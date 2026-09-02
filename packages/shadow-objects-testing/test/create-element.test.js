import {expect} from '@esm-bundle/chai';
import {ShaeEntElement} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {freshTag} from '../src/freshTag.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * The programmatic path: `document.createElement()` has to hand back a fully upgraded element for
 * all three tags. React, Vue, Svelte and every hand-written wrapper build their elements this way,
 * so it carries as much weight as the markup the parser produces.
 *
 * The Custom Elements specification forbids a constructor from giving its element attributes. A
 * constructor that writes one — a `style` attribute counts — makes the browser abort the upgrade
 * and answer with an `HTMLUnknownElement`. The cases below pin both halves of the consequence:
 * the element arrives upgraded, and `display: contents` still reaches it.
 *
 * It runs in real Chromium, because the upgrade abort and the cascade behind `getComputedStyle`
 * are not something happy-dom reproduces reliably.
 */

/**
 * Builds `<div id="host-el">` with an open shadow root and fills that root with `html`. The
 * elements inside it upgrade because the host itself is connected — the shadow-including tree is
 * what the Custom Elements specification counts.
 */
const mountInShadowRoot = (html) => {
  const host = mount('<div id="host-el"></div>').querySelector('#host-el');
  const shadowRoot = host.attachShadow({mode: 'open'});
  shadowRoot.innerHTML = html;
  return {host, shadowRoot};
};

/**
 * Registers a `ShaeEntElement` subclass under a tag name of its own — the extension point the
 * guides describe — and answers that name.
 */
const defineEntSubclass = () => {
  const tagName = freshTag('probe-ent');
  customElements.define(tagName, class extends ShaeEntElement {});
  return tagName;
};

/**
 * Registers a `ShaeEntElement` subclass under a tag name that carries a dot — legal in a custom
 * element name alongside the mandatory hyphen — and answers that name.
 */
const defineDottedEntSubclass = () => {
  const tagName = freshTag('probe.ent');
  customElements.define(tagName, class extends ShaeEntElement {});
  return tagName;
};

afterEach(() => {
  unmountAll();
});

describe('document.createElement()', () => {
  it('upgrades a shae-ent', () => {
    const el = document.createElement('shae-ent');
    expect(el).to.not.be.an.instanceOf(HTMLUnknownElement);
    expect(el.isShaeEntElement).to.be.true;
  });

  it('upgrades a shae-prop', () => {
    const el = document.createElement('shae-prop');
    expect(el).to.not.be.an.instanceOf(HTMLUnknownElement);
    expect(el.isShaePropElement).to.be.true;
  });

  it('upgrades a shae-worker', () => {
    const el = document.createElement('shae-worker');
    expect(el).to.not.be.an.instanceOf(HTMLUnknownElement);
    expect(el.isShaeWorkerElement).to.be.true;
  });

  it('a created shae-ent gets a view component once it is appended', () => {
    const container = mount('<div id="container"></div>').querySelector('#container');
    const el = document.createElement('shae-ent');
    el.setAttribute('token', 'created-programmatically');

    expect(el.viewComponent, 'an element outside the tree has no view component yet').to.be.undefined;

    container.append(el);

    expect(el.viewComponent).to.exist;
    expect(el.viewComponent.token).to.equal('created-programmatically');
  });
});

describe('display: contents', () => {
  it('reaches a shae-ent that came from markup', () => {
    const el = mount('<shae-ent token="from-markup"></shae-ent>').querySelector('shae-ent');
    expect(getComputedStyle(el).display).to.equal('contents');
  });

  it('reaches a shae-ent that came from createElement', () => {
    const container = mount('<div id="container"></div>').querySelector('#container');
    const el = document.createElement('shae-ent');
    container.append(el);
    expect(getComputedStyle(el).display).to.equal('contents');
  });

  it('reaches a shae-ent inside a shadow root', () => {
    // a rule that only sits in the document does not cross a shadow boundary, so the element has
    // to bring the rule to the root it actually stands in
    const {shadowRoot} = mountInShadowRoot('<shae-ent token="in-a-shadow-root"></shae-ent>');
    const el = shadowRoot.querySelector('shae-ent');
    expect(getComputedStyle(el).display).to.equal('contents');
  });

  it('reaches a ShaeEntElement subclass registered under its own tag', () => {
    // the extension point `docs/guides.md` recommends: a subclass carrying a token of its own. It
    // lays out no box either, so the rule has to name its tag as well
    const tagName = defineEntSubclass();
    const el = mount(`<${tagName} token="a-subclass"></${tagName}>`).querySelector(tagName);
    expect(el.isShaeEntElement).to.be.true;
    expect(getComputedStyle(el).display).to.equal('contents');
  });

  it('reaches a subclass that was built with createElement', () => {
    const tagName = defineEntSubclass();
    const container = mount('<div id="container"></div>').querySelector('#container');
    const el = document.createElement(tagName);
    container.append(el);
    expect(getComputedStyle(el).display).to.equal('contents');
  });

  it('a rule written by the consumer wins without !important', () => {
    const container = mount('<style>shae-ent { display: block; }</style><shae-ent token="styled"></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(getComputedStyle(el).display).to.equal('block');
  });

  it('reaches a tag name that contains a dot', () => {
    // a dot is legal in a custom element name; built into a selector unescaped it reads as a class
    // selector instead, so the tag it was meant to name gets no rule at all. `querySelector` reads
    // the dot the same way, so the element is picked up by position instead of by tag name.
    const tagName = defineDottedEntSubclass();
    const el = mount(`<${tagName} token="dotted"></${tagName}>`).firstElementChild;
    expect(getComputedStyle(el).display).to.equal('contents');
  });

  it('reaches a tag added to a shadow root whose content was replaced via innerHTML', () => {
    const {shadowRoot} = mountInShadowRoot('<shae-ent token="first"></shae-ent>');
    // wholesale replacement takes the previously inserted <style> out of the root along with the
    // rest of the markup, so the root needs a fresh one before it can cover a further tag
    shadowRoot.innerHTML = '<shae-prop name="second"></shae-prop>';
    const el = shadowRoot.querySelector('shae-prop');
    expect(getComputedStyle(el).display).to.equal('contents');
  });
});
