import {expect} from '@esm-bundle/chai';
import '@spearwolf/shadow-objects/shae-ent.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * `findShadowRootHost()` names the element a shadow root hangs on, and the answer has to follow
 * the tree the element stands in at that moment.
 *
 * It runs in real Chromium, because the mechanism under test is one happy-dom does not reproduce
 * reliably: `attachShadow` with the upgrade of a custom element inside the resulting root, and
 * what `getRootNode()` answers once a node has left the tree again.
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

afterEach(() => {
  unmountAll();
});

describe('shae-ent and the host of its shadow root', () => {
  it('answers the host of the shadow root it sits in', () => {
    const {host, shadowRoot} = mountInShadowRoot('<shae-ent token="probe"></shae-ent>');
    const ent = shadowRoot.querySelector('shae-ent');

    expect(ent.findShadowRootHost()).to.equal(host);
  });

  it('answers nothing after the element has left the tree', () => {
    const {host, shadowRoot} = mountInShadowRoot('<shae-ent token="probe"></shae-ent>');
    const ent = shadowRoot.querySelector('shae-ent');
    expect(ent.findShadowRootHost()).to.equal(host);

    ent.remove();

    expect(ent.findShadowRootHost()).to.be.undefined;
  });

  it('answers nothing after an ancestor has left the tree', () => {
    // the element keeps a parent element here, so the answer has to come from the state of the
    // whole chain above it and not from the nearest link
    const {host, shadowRoot} = mountInShadowRoot('<div id="in-between"><shae-ent token="probe"></shae-ent></div>');
    const ent = shadowRoot.querySelector('shae-ent');
    expect(ent.findShadowRootHost()).to.equal(host);

    shadowRoot.querySelector('#in-between').remove();

    expect(ent.findShadowRootHost()).to.be.undefined;
  });

  it('answers nothing for an element that sits in the document', () => {
    const ent = mount('<shae-ent token="probe"></shae-ent>').querySelector('shae-ent');

    expect(ent.findShadowRootHost()).to.be.undefined;
  });
});
