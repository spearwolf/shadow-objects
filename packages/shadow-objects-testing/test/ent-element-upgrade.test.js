import {expect} from '@esm-bundle/chai';
import {ComponentContext, ShaeEntElement} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * An element sitting between two entities may become a custom element long after the markup
 * around it was parsed. This spec pins what happens to the entities below it at that moment. It
 * runs in real Chromium — `customElements.define` upgrading elements in place, slot assignment
 * and composed events crossing a shadow boundary are all involved, and none of them is something
 * happy-dom reproduces reliably.
 *
 * A custom element name can be defined only once per document, so every case brings its own name
 * (`late-ent-a`, `late-ent-b`, …) instead of sharing one. That also keeps the file independent of
 * the order its cases run in.
 *
 * Assertions go through `entParentNode?.id` rather than element identity: in the red state the
 * message then names the two ids instead of two serialized elements.
 */

/**
 * The upgrade itself happens synchronously inside `customElements.define`. The wait is for slot
 * assignment, which the browser reports one task later through `slotchange`.
 */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  unmountAll();
});

describe('shae-ent and a late custom element definition', () => {
  it('a late registered entity element adopts the entity below it', async () => {
    const container = mount(
      '<shae-ent id="gp-a" token="gp">' +
        '<late-ent-a id="mid-a" token="mid">' +
        '<shae-ent id="child-a" token="child"></shae-ent>' +
        '</late-ent-a>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const gp = container.querySelector('#gp-a');
    const mid = container.querySelector('#mid-a');
    const child = container.querySelector('#child-a');

    expect(child.entParentNode?.id, 'before the definition the child binds to the outer entity').to.equal('gp-a');

    customElements.define('late-ent-a', class extends ShaeEntElement {});
    await nextTask();

    expect(child.entParentNode?.id).to.equal('mid-a');
    expect(child.viewComponent.parent).to.equal(mid.viewComponent);
    expect(mid.viewComponent.parent, 'the new element keeps its own parent').to.equal(gp.viewComponent);
  });

  it('a late registered entity element adopts an entity inside a shadow root', async () => {
    const container = mount('<shae-ent id="gp-b" token="gp"><div id="host-b"></div></shae-ent>');
    await customElements.whenDefined('shae-ent');

    // the signal never descends into the shadow root — the child asks again from the inside out,
    // and its request leaves the shadow root because it is dispatched as a composed event
    const host = container.querySelector('#host-b');
    host.attachShadow({mode: 'open'}).innerHTML =
      '<late-ent-b id="mid-b" token="mid"><shae-ent id="child-b" token="child"></shae-ent></late-ent-b>';
    await nextTask();

    const child = host.shadowRoot.getElementById('child-b');

    expect(child.entParentNode?.id, 'before the definition the child binds across the shadow boundary').to.equal('gp-b');

    customElements.define('late-ent-b', class extends ShaeEntElement {});
    await nextTask();

    expect(child.entParentNode?.id).to.equal('mid-b');
  });

  it('a late registered entity element inside a closed shadow root adopts the entity in its slot', async () => {
    // a closed shadow root reports no `assignedSlot` for the nodes projected into it, so the way
    // up from the projected child leads past the slot and past the entity holding it. The request
    // itself does not care — it is dispatched as a composed event and walks the real path
    const container = mount(
      '<shae-ent id="gp-k" token="gp">' +
        '<div id="host-k">' +
        '<shae-ent id="child-k" token="child"></shae-ent>' +
        '</div>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    // the shadow root is attached before the definition on purpose: the slot assignment is then
    // already reported and settled by the time the wrapper becomes an entity
    const shadowRoot = container.querySelector('#host-k').attachShadow({mode: 'closed'});
    shadowRoot.innerHTML = '<late-ent-k id="in-k" token="in"><slot></slot></late-ent-k>';
    await nextTask();

    const child = container.querySelector('#child-k');

    expect(child.entParentNode?.id, 'before the definition the child binds across the shadow boundary').to.equal('gp-k');

    customElements.define('late-ent-k', class extends ShaeEntElement {});
    await nextTask();

    expect(child.entParentNode?.id).to.equal('in-k');
    expect(shadowRoot.getElementById('in-k').entParentNode?.id, 'the new element keeps its own parent').to.equal('gp-k');
  });

  it('a late registered entity element adopts the entity inside its own closed shadow root', async () => {
    // a shadow root can be attached to an element before it is defined, and a closed one is
    // invisible from the element it belongs to — `this.shadowRoot` stays null. An element that
    // reads nothing but its own child nodes therefore cannot tell whether anything sits below it
    const container = mount('<shae-ent id="gp-q" token="gp"><late-ent-q id="mid-q" token="mid"></late-ent-q></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const shadowRoot = container.querySelector('#mid-q').attachShadow({mode: 'closed'});
    shadowRoot.innerHTML = '<shae-ent id="child-q" token="child"></shae-ent>';
    await nextTask();

    const child = shadowRoot.getElementById('child-q');

    expect(child.entParentNode?.id, 'before the definition the child binds across the shadow boundary').to.equal('gp-q');

    customElements.define('late-ent-q', class extends ShaeEntElement {});
    await nextTask();

    expect(child.entParentNode?.id).to.equal('mid-q');
  });

  it('a late registered entity element does not reorder the children of its parent', async () => {
    // a re-request that clears the current parent first detaches every sibling and appends it
    // again at the end — this case is the reason the signal leaves the current parent in place
    const container = mount(
      '<shae-ent id="gp-c" token="gp">' +
        '<shae-ent id="s1" token="child"></shae-ent>' +
        '<shae-ent id="s2" token="child"></shae-ent>' +
        '<shae-ent id="s3" token="child"></shae-ent>' +
        '<late-ent-c id="mid-c" token="mid"></late-ent-c>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const gp = container.querySelector('#gp-c');
    const mid = container.querySelector('#mid-c');

    const before = ComponentContext.get()
      .getChildren(gp.viewComponent)
      .map((vc) => vc.uuid);
    expect(before, 'three entities are bound before the definition').to.have.lengthOf(3);

    customElements.define('late-ent-c', class extends ShaeEntElement {});
    await nextTask();

    const after = ComponentContext.get()
      .getChildren(gp.viewComponent)
      .map((vc) => vc.uuid);

    expect(after).to.have.lengthOf(4);
    expect(after.slice(0, 3), 'the order of the existing children is preserved').to.deep.equal(before);
    expect(after[3]).to.equal(mid.viewComponent.uuid);
  });

  it('a late registered entity element adopts every root below it, not every other one', async () => {
    // all three start out as roots, because nothing above them is an entity yet. The candidate
    // list the request walks is the root list itself, and every answered request takes one entry
    // out of it — walking the live list would hand back every second candidate only
    const container = mount(
      '<late-ent-g id="mid-g" token="mid">' +
        '<shae-ent id="r1" token="child"></shae-ent>' +
        '<shae-ent id="r2" token="child"></shae-ent>' +
        '<shae-ent id="r3" token="child"></shae-ent>' +
        '</late-ent-g>',
    );
    await customElements.whenDefined('shae-ent');

    const parentIds = () => ['r1', 'r2', 'r3'].map((id) => container.querySelector(`#${id}`).entParentNode?.id);

    expect(parentIds(), 'before the definition none of them has an entity ancestor').to.deep.equal([
      undefined,
      undefined,
      undefined,
    ]);

    customElements.define('late-ent-g', class extends ShaeEntElement {});
    await nextTask();

    expect(parentIds()).to.deep.equal(['mid-g', 'mid-g', 'mid-g']);
  });

  it('a wrapper without an entity leaves the hierarchy untouched', async () => {
    const container = mount(
      '<shae-ent id="gp-d" token="gp">' +
        '<late-plain-d id="mid-d">' +
        '<shae-ent id="child-d" token="child"></shae-ent>' +
        '</late-plain-d>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const child = container.querySelector('#child-d');

    expect(child.entParentNode?.id).to.equal('gp-d');

    customElements.define('late-plain-d', class extends HTMLElement {});
    await nextTask();

    expect(child.entParentNode?.id, 'an element that is not an entity changes nothing').to.equal('gp-d');
  });

  it('a wrapper with a shadow root adopts the entity projected into its slot', async () => {
    // a guard, not a red case: the slot assignment reports itself through `slotchange`, and the
    // projected child is re-bound on that path
    const container = mount(
      '<shae-ent id="gp-e" token="gp">' +
        '<late-wrap-e id="mid-e">' +
        '<shae-ent id="child-e" token="child"></shae-ent>' +
        '</late-wrap-e>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const child = container.querySelector('#child-e');

    expect(child.entParentNode?.id).to.equal('gp-e');

    customElements.define(
      'late-wrap-e',
      class extends HTMLElement {
        connectedCallback() {
          if (this.shadowRoot) return;
          this.attachShadow({mode: 'open'}).innerHTML = '<shae-ent id="inner-e" token="inner"><slot></slot></shae-ent>';
        }
      },
    );
    await nextTask();

    const inner = container.querySelector('#mid-e').shadowRoot.getElementById('inner-e');

    expect(child.entParentNode?.id).to.equal('inner-e');
    expect(inner.entParentNode?.id).to.equal('gp-e');
  });

  it('a late registered entity element in another namespace leaves the entities alone', async () => {
    // the request travels through the `ComponentContext` of the new element, hence through its
    // namespace, and never reaches a foreign one
    const container = mount(
      '<shae-ent id="gp-f" token="gp">' +
        '<late-ent-f id="mid-f" ns="other" token="mid">' +
        '<shae-ent id="child-f" token="child"></shae-ent>' +
        '</late-ent-f>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const mid = container.querySelector('#mid-f');
    const child = container.querySelector('#child-f');

    expect(child.entParentNode?.id).to.equal('gp-f');

    customElements.define('late-ent-f', class extends ShaeEntElement {});
    await nextTask();

    expect(child.entParentNode?.id).to.equal('gp-f');
    expect(mid.viewComponent.parent).to.be.undefined;
  });
});