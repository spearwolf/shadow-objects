import {expect} from '@esm-bundle/chai';
import {GlobalNS, VoidToken} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * `ShaeEntElement` reads `token`, `ns` and `forward-custom-events` from attributes and reflects
 * some of them back. This spec pins the attribute-to-property and property-to-attribute paths
 * for `token` and `ns`, and the element lifecycle across attach/detach/reattach. It runs in real
 * Chromium — the Custom Elements upgrade order that these paths depend on is not something
 * happy-dom reproduces reliably.
 *
 * Several rows below describe a sequence of mutations applied to one element, in order. Each of
 * those rows gets its own `it`, which replays every step up to and including its own from a
 * fresh element rather than continuing where a previous `it` left off — that keeps the file
 * shuffle-safe while still exercising the same sequence the row describes.
 */

afterEach(() => {
  unmountAll();
});

describe('shae-ent token attribute', () => {
  it('token="  x  " is trimmed on the property, the attribute is left alone', () => {
    // the attribute is not written back on first read: ShaeEntElement's constructor reads
    // `token` before it registers the reflecting onChange handler, and connectedCallback reads
    // it again under `beQuiet` — so nothing ever observes the trimmed value as a change
    const container = mount('<shae-ent token="  x  "></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(el.token).to.equal('x');
    expect(el.getAttribute('token')).to.equal('  x  ');
    expect(el.viewComponent.token).to.equal('x');
  });

  it('token="   " collapses to undefined, the attribute is left alone', () => {
    const container = mount('<shae-ent token="   "></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(el.token).to.be.undefined;
    expect(el.getAttribute('token')).to.equal('   ');
    expect(el.viewComponent.token).to.equal(VoidToken);
  });

  it('token="" collapses to undefined, the attribute is left alone', () => {
    const container = mount('<shae-ent token=""></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(el.token).to.be.undefined;
    expect(el.getAttribute('token')).to.equal('');
    expect(el.viewComponent.token).to.equal(VoidToken);
  });

  it('without a token attribute, the property is undefined', () => {
    const container = mount('<shae-ent></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(el.token).to.be.undefined;
    expect(el.hasAttribute('token')).to.be.false;
    expect(el.viewComponent.token).to.equal(VoidToken);
  });

  it('token="a b" comes through unchanged on the property and the attribute', () => {
    const container = mount('<shae-ent token="a b"></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(el.token).to.equal('a b');
    expect(el.getAttribute('token')).to.equal('a b');
    expect(el.viewComponent.token).to.equal('a b');
  });

  it('el.token = "b" reflects to the attribute and the entity', () => {
    const container = mount('<shae-ent token="a b"></shae-ent>');
    const el = container.querySelector('shae-ent');

    el.token = 'b';
    expect(el.token).to.equal('b');
    expect(el.getAttribute('token')).to.equal('b');
    expect(el.viewComponent.token).to.equal('b');
  });

  it('el.token = undefined removes the attribute and voids the entity token', () => {
    const container = mount('<shae-ent token="a b"></shae-ent>');
    const el = container.querySelector('shae-ent');
    el.token = 'b';

    el.token = undefined;
    expect(el.token).to.be.undefined;
    expect(el.hasAttribute('token')).to.be.false;
    expect(el.viewComponent.token).to.equal(VoidToken);
  });

  it('setAttribute("token", "c") reflects to the property and the entity', () => {
    const container = mount('<shae-ent token="a b"></shae-ent>');
    const el = container.querySelector('shae-ent');
    el.token = 'b';
    el.token = undefined;

    el.setAttribute('token', 'c');
    expect(el.token).to.equal('c');
    expect(el.getAttribute('token')).to.equal('c');
    expect(el.viewComponent.token).to.equal('c');
  });

  it('removeAttribute("token") clears the property and voids the entity token', () => {
    // the attribute and the JS property are two ways to reach the same value, and both ways of
    // taking it away end at VoidToken
    const container = mount('<shae-ent token="a b"></shae-ent>');
    const el = container.querySelector('shae-ent');
    el.token = 'b';
    el.token = undefined;
    el.setAttribute('token', 'c');

    el.removeAttribute('token');
    expect(el.token).to.be.undefined;
    expect(el.hasAttribute('token')).to.be.false;
    expect(el.viewComponent.token).to.equal(VoidToken);
  });

  it('removeAttribute("token") on an element that only ever had the attribute', () => {
    const container = mount('<shae-ent token="a"></shae-ent>');
    const el = container.querySelector('shae-ent');

    el.removeAttribute('token');
    expect(el.token).to.be.undefined;
    expect(el.hasAttribute('token')).to.be.false;
    expect(el.viewComponent.token).to.equal(VoidToken);
  });
});

describe('shae-ent ns attribute', () => {
  it('without an ns attribute, ns is the global namespace', () => {
    const container = mount('<shae-ent></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(el.ns).to.equal(GlobalNS);
    expect(el.hasAttribute('ns')).to.be.false;
    expect(el.componentContext.ns).to.equal(GlobalNS);
  });

  it('ns="  local  " is trimmed on both the property and the attribute', () => {
    // unlike token, ns registers its reflecting onChange handler before the first read, so the
    // trimmed value is a change the handler observes and writes back
    const container = mount('<shae-ent ns="  local  "></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(el.ns).to.equal('local');
    expect(el.getAttribute('ns')).to.equal('local');
  });

  it('ns="" falls back to the global namespace, the attribute is left alone', () => {
    // the signal value never changes here (it was already GlobalNS), so the reflecting
    // onChange handler never fires and nothing writes the attribute back
    const container = mount('<shae-ent ns=""></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(el.ns).to.equal(GlobalNS);
    expect(el.getAttribute('ns')).to.equal('');
  });

  it('ns="   " falls back to the global namespace, the attribute is left alone', () => {
    const container = mount('<shae-ent ns="   "></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(el.ns).to.equal(GlobalNS);
    expect(el.getAttribute('ns')).to.equal('   ');
  });

  it('el.ns = "other" swaps the component context, keeps the entity and its identity', () => {
    const container = mount('<shae-ent token="a"></shae-ent>');
    const el = container.querySelector('shae-ent');
    const previousContext = el.componentContext;
    const previousViewComponent = el.viewComponent;
    const previousUuid = el.uuid;

    el.ns = 'other';
    expect(el.getAttribute('ns')).to.equal('other');
    expect(el.componentContext).to.not.equal(previousContext);
    expect(el.viewComponent).to.equal(previousViewComponent);
    expect(el.uuid).to.equal(previousUuid);
    expect(el.viewComponent.context.ns).to.equal('other');
  });

  it('el.ns = "" falls back to the global namespace and removes the attribute', () => {
    // starts from a set namespace on purpose: falling back from the already-global default
    // never changes the signal, so the removeAttribute branch of the reflection would never run
    const container = mount('<shae-ent ns="local"></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(el.hasAttribute('ns')).to.be.true;

    el.ns = '';
    expect(el.ns).to.equal(GlobalNS);
    expect(el.hasAttribute('ns')).to.be.false;
  });

  it('observes exactly ns, token and forward-custom-events', () => {
    expect(customElements.get('shae-ent').observedAttributes).to.deep.equal(['ns', 'token', 'forward-custom-events']);
  });
});

describe('shae-ent lifecycle', () => {
  const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

  // The fixture used by every case below: `a` and `c` are top-level, `b` starts nested in `a`.
  const fixture = () =>
    mount('<shae-ent id="a" token="a"><shae-ent id="b" token="b"></shae-ent></shae-ent><shae-ent id="c" token="c"></shae-ent>');

  it('is upgraded with identity and a component context', () => {
    const container = fixture();
    const a = container.querySelector('#a');
    expect(a.isShaeElement).to.be.true;
    expect(a.isShaeEntElement).to.be.true;
    expect(a.uuid).to.be.a('string');
    expect(a.componentContext).to.exist;
  });

  it('binds to its markup parent', () => {
    const container = fixture();
    const a = container.querySelector('#a');
    const b = container.querySelector('#b');
    expect(b.entParentNode).to.equal(a);
    expect(b.viewComponent.parent.uuid).to.equal(a.uuid);
  });

  it('rebinds to a new DOM parent after being moved', async () => {
    const container = fixture();
    const b = container.querySelector('#b');
    const c = container.querySelector('#c');
    const bUuid = b.uuid;

    c.append(b);
    await nextTask();

    expect(b.entParentNode).to.equal(c);
    expect(b.viewComponent.parent.uuid).to.equal(c.uuid);
    expect(b.uuid).to.equal(bUuid);
  });

  it('drops its context but keeps its identity once removed from the tree', async () => {
    // replicates the full chain, including the prior move to `c`: the case pins removal after
    // a reparent, not removal from the original markup position. The element gives up its
    // component context but keeps its ViewComponent and uuid, so a later reattach lands on the
    // same entity instead of creating a new one.
    const container = fixture();
    const b = container.querySelector('#b');
    const c = container.querySelector('#c');
    const bUuid = b.uuid;
    const bViewComponent = b.viewComponent;

    c.append(b);
    await nextTask();

    b.remove();
    await nextTask();

    expect(b.entParentNode).to.be.undefined;
    expect(b.componentContext).to.be.undefined;
    expect(b.viewComponent).to.equal(bViewComponent);
    expect(b.uuid).to.equal(bUuid);
  });

  it('restores the binding on the same ViewComponent once reattached', async () => {
    // replicates the full chain: moved to `c`, removed, then reattached under `a` — a
    // different parent than the one it was removed from
    const container = fixture();
    const a = container.querySelector('#a');
    const b = container.querySelector('#b');
    const c = container.querySelector('#c');
    const bUuid = b.uuid;

    c.append(b);
    await nextTask();

    b.remove();
    await nextTask();
    const bViewComponent = b.viewComponent;

    a.append(b);
    await nextTask();

    expect(b.viewComponent).to.equal(bViewComponent);
    expect(b.uuid).to.equal(bUuid);
    expect(b.entParentNode).to.equal(a);
    expect(b.viewComponent.parent.uuid).to.equal(a.uuid);
    expect(b.token).to.equal('b');
  });

  it('removing a parent that still contains a child takes both out of the tree', async () => {
    const container = fixture();
    const a = container.querySelector('#a');
    const b = container.querySelector('#b');

    a.remove();
    await nextTask();

    expect(a.componentContext).to.be.undefined;
    expect(b.entParentNode).to.be.undefined;
    expect(b.viewComponent.parent).to.be.undefined;
  });
});