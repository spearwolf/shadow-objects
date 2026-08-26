import {expect} from '@esm-bundle/chai';
import {on} from '@spearwolf/eventize';
import {ComponentContext} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * `ShaeEntElement` reads `forward-custom-events` and patches `ViewComponent#dispatchEvent` on
 * top of it, so a Shadow Object's event can reach the DOM as a `CustomEvent`. Runs in real
 * Chromium — the patch depends on Custom Elements upgrade order and on `CustomEvent` bubbling
 * through the real DOM tree, neither of which happy-dom reproduces reliably.
 */

/** Reads `forwardCustomEvents$` as either a boolean or a plain array, for easy comparison. */
const fce = (el) => {
  const val = el.forwardCustomEvents$.value;
  return val instanceof Set ? Array.from(val) : val;
};

/** The attribute value, or `null` when the attribute is absent. */
const attrOf = (el) => (el.hasAttribute('forward-custom-events') ? el.getAttribute('forward-custom-events') : null);

/** The element sets the patch up again one microtask after its component announced the teardown. */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  unmountAll();
});

describe('shae-ent forward-custom-events attribute forms', () => {
  const cases = [
    ['forward-custom-events', true, ''],
    ['forward-custom-events=""', true, ''],
    // a whitespace-only value reads the same as a bare attribute: the signal becomes `true`,
    // not a Set, and the empty string is how `true` is spelled on the attribute. Every form in
    // this table ends up on the canonical spelling of the value it names — the element writes
    // each reflecting signal out to its attribute as it first connects.
    ['forward-custom-events="   "', true, ''],
    ['forward-custom-events="foo"', ['foo'], 'foo'],
    ['forward-custom-events="foo, bar"', ['foo', 'bar'], 'foo,bar'],
    ['forward-custom-events="foo,,bar"', ['foo', 'bar'], 'foo,bar'],
    ['forward-custom-events=" foo , bar "', ['foo', 'bar'], 'foo,bar'],
    ['forward-custom-events="foo,"', ['foo'], 'foo'],
    // a list without entries names no event type, so nothing is forwarded — and "forward
    // nothing" is spelled by leaving the attribute out, which is what the reflection does with it
    ['forward-custom-events=","', false, null],
    ['forward-custom-events=" , , "', false, null],
    // splitting is comma-only: whitespace inside an entry is part of the type name
    ['forward-custom-events="foo foo"', ['foo foo'], 'foo foo'],
    ['', false, null],
  ];

  for (const [form, expectedValue, expectedAttr] of cases) {
    it(`<shae-ent ${form}>`, () => {
      const container = mount(`<shae-ent token="t" ${form}></shae-ent>`);
      const el = container.querySelector('shae-ent');
      expect(fce(el)).to.deep.equal(expectedValue);
      expect(attrOf(el)).to.equal(expectedAttr);
    });
  }
});

describe('shae-ent forward-custom-events runtime changes and reflection', () => {
  // Every case replays the full chain of mutations from a fresh element rather than continuing
  // from a previous `it` — the chain itself, in this order, is the case being pinned.
  const mountFCE = () => {
    const container = mount('<shae-ent token="t" forward-custom-events="foo"></shae-ent>');
    return container.querySelector('shae-ent');
  };

  it('setAttribute to a new list replaces the Set and the reflected attribute', () => {
    const el = mountFCE();
    el.setAttribute('forward-custom-events', 'bar,baz');
    expect(fce(el)).to.deep.equal(['bar', 'baz']);
    expect(attrOf(el)).to.equal('bar,baz');
  });

  it('setAttribute to an empty string switches to "forward everything"', () => {
    const el = mountFCE();
    el.setAttribute('forward-custom-events', 'bar,baz');
    el.setAttribute('forward-custom-events', '');
    expect(fce(el)).to.equal(true);
    expect(attrOf(el)).to.equal('');
  });

  it('removeAttribute switches to "forward nothing" and drops the attribute', () => {
    const el = mountFCE();
    el.setAttribute('forward-custom-events', 'bar,baz');
    el.setAttribute('forward-custom-events', '');
    el.removeAttribute('forward-custom-events');
    expect(fce(el)).to.equal(false);
    expect(attrOf(el)).to.equal(null);
  });

  it('forwardCustomEvents$.set(true) writes the attribute back as an empty string', () => {
    const el = mountFCE();
    el.setAttribute('forward-custom-events', 'bar,baz');
    el.setAttribute('forward-custom-events', '');
    el.removeAttribute('forward-custom-events');
    el.forwardCustomEvents$.set(true);
    expect(attrOf(el)).to.equal('');
  });

  it('forwardCustomEvents$.set(true) replaces a filter list standing in the markup', () => {
    const container = mount('<shae-ent token="t" forward-custom-events="a,b"></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(fce(el)).to.deep.equal(['a', 'b']);

    el.forwardCustomEvents$.set(true);

    expect(fce(el)).to.equal(true);
    expect(attrOf(el)).to.equal('');
  });

  it('a re-append that changes the filter reaches everyone subscribed to the signal', () => {
    const container = mount('<shae-ent token="t"></shae-ent>');
    const el = container.querySelector('shae-ent');

    // an allow-list without entries is the one value that survives in the signal without a
    // matching attribute, so the read-back on the next connect has something to correct
    el.forwardCustomEvents$.set(new Set());

    const seen = [];
    const off = el.forwardCustomEvents$.onChange((val) => seen.push(val));

    el.remove();
    container.append(el);

    off();

    expect(seen).to.deep.equal([false]);
    expect(fce(el)).to.equal(false);
  });

  it('setAttribute to a whitespace-only value normalizes the attribute to the empty string', () => {
    // the write moves the signal from a list to `true`, and it is that change the reflection
    // writes back — which lands on the canonical spelling of `true`
    const el = mountFCE();
    el.setAttribute('forward-custom-events', '   ');
    expect(fce(el)).to.equal(true);
    expect(attrOf(el)).to.equal('');
  });

  it('setAttribute to a whitespace-only value leaves it as written when the signal already says true', () => {
    // the other direction of the same rule: the signal is on `true` before and after, so there is
    // no change for the reflection to write, and the attribute keeps the spelling it was given
    const container = mount('<shae-ent token="t" forward-custom-events></shae-ent>');
    const el = container.querySelector('shae-ent');
    expect(fce(el)).to.equal(true);

    el.setAttribute('forward-custom-events', '   ');

    expect(fce(el)).to.equal(true);
    expect(attrOf(el)).to.equal('   ');
  });

  it('forwardCustomEvents$.set(new Set(...)) writes the joined list back', () => {
    const el = mountFCE();
    el.setAttribute('forward-custom-events', 'bar,baz');
    el.setAttribute('forward-custom-events', '');
    el.removeAttribute('forward-custom-events');
    el.forwardCustomEvents$.set(true);
    el.forwardCustomEvents$.set(new Set(['a', 'b']));
    expect(attrOf(el)).to.equal('a,b');
  });

  it('forwardCustomEvents$.set(new Set()) forwards nothing and drops the attribute', () => {
    // the empty list clears the attribute, and because clearing it is an attribute change, the
    // element reads the value back once and settles on false
    const el = mountFCE();
    el.setAttribute('forward-custom-events', 'bar,baz');
    el.setAttribute('forward-custom-events', '');
    el.removeAttribute('forward-custom-events');
    el.forwardCustomEvents$.set(true);
    el.forwardCustomEvents$.set(new Set(['a', 'b']));
    el.forwardCustomEvents$.set(new Set());
    expect(fce(el)).to.equal(false);
    expect(attrOf(el)).to.equal(null);
  });

  it('forwardCustomEvents$.set(false) removes the attribute', () => {
    const el = mountFCE();
    el.setAttribute('forward-custom-events', 'bar,baz');
    el.setAttribute('forward-custom-events', '');
    el.removeAttribute('forward-custom-events');
    el.forwardCustomEvents$.set(true);
    el.forwardCustomEvents$.set(new Set(['a', 'b']));
    el.forwardCustomEvents$.set(new Set());
    el.forwardCustomEvents$.set(false);
    expect(attrOf(el)).to.equal(null);
  });

  it('setAttribute("forward-custom-events", ",") drops the attribute and forwards nothing', () => {
    // the asymmetry against the "attribute forms" cases above: at runtime there is a change to
    // write back, in markup there is not
    const el = mountFCE();
    el.setAttribute('forward-custom-events', ',');
    expect(fce(el)).to.equal(false);
    expect(attrOf(el)).to.equal(null);

    const domEvents = [];
    el.addEventListener('foo', (e) => domEvents.push(e));
    el.viewComponent.dispatchEvent('foo', {}, false);
    expect(domEvents).to.have.lengthOf(0);
  });
});

describe('shae-ent the dispatchEvent patch', () => {
  const mountPK = ({pAttrs = 'forward-custom-events', kAttrs = ''} = {}) => {
    const container = mount(`<shae-ent id="p" token="p" ${pAttrs}><shae-ent id="k" token="k" ${kAttrs}></shae-ent></shae-ent>`);
    return {p: container.querySelector('#p'), k: container.querySelector('#k')};
  };

  it('patches only the entity whose element carries a filter', () => {
    const {p, k} = mountPK();
    expect(Object.hasOwn(p.viewComponent, 'dispatchEvent')).to.be.true;
    expect(Object.hasOwn(k.viewComponent, 'dispatchEvent')).to.be.false;
  });

  it('forwards a CustomEvent whose type, detail, bubbles and composed match the dispatch', () => {
    const {p} = mountPK();
    const events = [];
    p.addEventListener('foo', (e) => events.push(e));

    p.viewComponent.dispatchEvent('foo', {val: 1}, false);

    expect(events).to.have.lengthOf(1);
    expect(events[0].type).to.equal('foo');
    expect(events[0].detail).to.deep.equal({val: 1});
    expect(events[0].bubbles).to.be.true;
    expect(events[0].composed).to.be.true;
  });

  it('still calls the original eventize listener, it does not replace it', () => {
    const {p} = mountPK();
    const calls = [];
    on(p.viewComponent, 'foo', (data) => calls.push(data));

    p.viewComponent.dispatchEvent('foo', {val: 2}, false);

    expect(calls).to.deep.equal([{val: 2}]);
  });

  it('a named filter lets the listed type reach the DOM element and blocks the rest, but the eventize listener sees both', () => {
    const {p} = mountPK({pAttrs: 'forward-custom-events="foo"'});
    const domFoo = [];
    const domBaz = [];
    const eventizeCalls = [];
    p.addEventListener('foo', (e) => domFoo.push(e));
    p.addEventListener('baz', (e) => domBaz.push(e));
    on(p.viewComponent, 'foo', (data) => eventizeCalls.push(['foo', data]));
    on(p.viewComponent, 'baz', (data) => eventizeCalls.push(['baz', data]));

    p.viewComponent.dispatchEvent('foo', {}, false);
    p.viewComponent.dispatchEvent('baz', {}, false);

    expect(domFoo).to.have.lengthOf(1);
    expect(domBaz).to.have.lengthOf(0);
    expect(eventizeCalls).to.deep.equal([
      ['foo', {}],
      ['baz', {}],
    ]);
  });

  it('never forwards ComponentContext.ReRequestParentRoots to the DOM, even with a bare filter', () => {
    const {p} = mountPK();
    const domEvents = [];
    let eventizeCalled = false;
    p.addEventListener(ComponentContext.ReRequestParentRoots, (e) => domEvents.push(e));
    on(p.viewComponent, ComponentContext.ReRequestParentRoots, () => {
      eventizeCalled = true;
    });

    p.viewComponent.dispatchEvent(ComponentContext.ReRequestParentRoots, undefined, false);

    expect(domEvents).to.have.lengthOf(0);
    expect(eventizeCalled).to.be.true;
  });

  it('never forwards ComponentContext.ReRequestParent to the DOM, even with a bare filter', () => {
    const {p} = mountPK();
    const domEvents = [];
    let eventizeCalled = false;
    p.addEventListener(ComponentContext.ReRequestParent, (e) => domEvents.push(e));
    on(p.viewComponent, ComponentContext.ReRequestParent, () => {
      eventizeCalled = true;
    });

    p.viewComponent.dispatchEvent(ComponentContext.ReRequestParent, undefined, false);

    expect(domEvents).to.have.lengthOf(0);
    expect(eventizeCalled).to.be.true;
  });

  it('never forwards ComponentContext.ReRequestEntHost to the DOM, even with a bare filter', () => {
    const {p} = mountPK();
    const domEvents = [];
    let eventizeCalled = false;
    p.addEventListener(ComponentContext.ReRequestEntHost, (e) => domEvents.push(e));
    on(p.viewComponent, ComponentContext.ReRequestEntHost, () => {
      eventizeCalled = true;
    });

    p.viewComponent.dispatchEvent(ComponentContext.ReRequestEntHost, undefined, false);

    expect(domEvents).to.have.lengthOf(0);
    expect(eventizeCalled).to.be.true;
  });

  it('with traverseChildren the child forwards first, then bubbles into the parent before the parent forwards its own', () => {
    // the original dispatchEvent traverses the children before the patch fires its own event,
    // so the child's CustomEvent (bubbling up through the DOM) reaches the parent's listener
    // before the parent's own CustomEvent does
    const {p, k} = mountPK({kAttrs: 'forward-custom-events'});
    const pEvents = [];
    const kEvents = [];
    p.addEventListener('foo', (e) => pEvents.push(e));
    k.addEventListener('foo', (e) => kEvents.push(e));

    p.viewComponent.dispatchEvent('foo', {}, true);

    expect(kEvents).to.have.lengthOf(1);
    expect(kEvents[0].target).to.equal(k);
    expect(pEvents).to.have.lengthOf(2);
    expect(pEvents[0].target).to.equal(k);
    expect(pEvents[1].target).to.equal(p);
  });

  it('with traverseChildren, composed and bubbles carry both events up to document', () => {
    const {p, k} = mountPK({kAttrs: 'forward-custom-events'});
    const docEvents = [];
    const onDoc = (e) => docEvents.push(e);
    document.addEventListener('foo', onDoc);

    try {
      p.viewComponent.dispatchEvent('foo', {}, true);
      expect(docEvents).to.have.lengthOf(2);
      expect(docEvents[0].target).to.equal(k);
      expect(docEvents[1].target).to.equal(p);
    } finally {
      document.removeEventListener('foo', onDoc);
    }
  });

  it('without traverseChildren only the parent fires, the child gets nothing', () => {
    const {p, k} = mountPK({kAttrs: 'forward-custom-events'});
    const pEvents = [];
    const kEvents = [];
    p.addEventListener('foo', (e) => pEvents.push(e));
    k.addEventListener('foo', (e) => kEvents.push(e));

    p.viewComponent.dispatchEvent('foo', {}, false);

    expect(pEvents).to.have.lengthOf(1);
    expect(kEvents).to.have.lengthOf(0);
  });

  it('two attribute changes in a row do not stack the patch on top of itself', () => {
    const {p} = mountPK({pAttrs: 'forward-custom-events="foo"'});
    p.setAttribute('forward-custom-events', 'foo,zap');

    const domEvents = [];
    const eventizeCalls = [];
    p.addEventListener('zap', (e) => domEvents.push(e));
    on(p.viewComponent, 'zap', (data) => eventizeCalls.push(data));

    p.viewComponent.dispatchEvent('zap', {}, false);

    expect(eventizeCalls).to.have.lengthOf(1);
    expect(domEvents).to.have.lengthOf(1);
  });

  it('removing the attribute unpatches dispatchEvent, only the eventize listener still hears it', () => {
    const {p} = mountPK();
    p.removeAttribute('forward-custom-events');
    expect(Object.hasOwn(p.viewComponent, 'dispatchEvent')).to.be.false;

    const domEvents = [];
    const eventizeCalls = [];
    p.addEventListener('foo', (e) => domEvents.push(e));
    on(p.viewComponent, 'foo', (data) => eventizeCalls.push(data));

    p.viewComponent.dispatchEvent('foo', {}, false);

    expect(eventizeCalls).to.have.lengthOf(1);
    expect(domEvents).to.have.lengthOf(0);
  });

  it('keeps the same ViewComponent and the patch across a remove and a re-append', () => {
    const {p} = mountPK();
    const container = p.parentElement;
    const vc = p.viewComponent;
    expect(Object.hasOwn(vc, 'dispatchEvent')).to.be.true;

    p.remove();
    expect(Object.hasOwn(vc, 'dispatchEvent')).to.be.true;

    container.append(p);
    expect(p.viewComponent).to.equal(vc);
    expect(Object.hasOwn(vc, 'dispatchEvent')).to.be.true;

    const domEvents = [];
    p.addEventListener('foo', (e) => domEvents.push(e));
    p.viewComponent.dispatchEvent('foo', {}, false);
    expect(domEvents).to.have.lengthOf(1);
  });

  it('forwards custom events again after a context sweep took its component down', async () => {
    const {p} = mountPK();
    const vc = p.viewComponent;
    expect(Object.hasOwn(vc, 'dispatchEvent')).to.be.true;

    const ctx = ComponentContext.get();
    ctx.clear();
    expect(Object.hasOwn(vc, 'dispatchEvent'), 'the teardown took the patch with it').to.be.false;

    vc.context = ctx;
    await nextTask();
    expect(Object.hasOwn(vc, 'dispatchEvent'), 'the patch is back').to.be.true;

    const domEvents = [];
    p.addEventListener('foo', (e) => domEvents.push(e));
    p.viewComponent.dispatchEvent('foo', {}, false);
    expect(domEvents, 'and it carries again').to.have.lengthOf(1);
  });

  it('keeps an eventize listener on its ViewComponent across a remove and a re-append', () => {
    const {p} = mountPK();
    const container = p.parentElement;
    const vc = p.viewComponent;

    const calls = [];
    on(vc, 'foo', (data) => calls.push(data));

    p.remove();
    container.append(p);

    expect(p.viewComponent).to.equal(vc);

    p.viewComponent.dispatchEvent('foo', {val: 1}, false);

    expect(calls).to.have.lengthOf(1);
  });

  it('a re-append leaves the signal, the attribute and the patch saying the same thing', () => {
    const {p} = mountPK({pAttrs: 'forward-custom-events=","'});
    const container = p.parentElement;
    expect(fce(p)).to.equal(false);

    const vc = p.viewComponent;
    p.forwardCustomEvents$.set(true);
    expect(attrOf(p)).to.equal('');

    p.remove();
    container.append(p);

    expect(p.viewComponent).to.equal(vc);
    expect(fce(p)).to.equal(true);
    expect(attrOf(p)).to.equal('');
    expect(Object.hasOwn(vc, 'dispatchEvent')).to.be.true;

    const domEvents = [];
    p.addEventListener('foo', (e) => domEvents.push(e));
    p.addEventListener('bar', (e) => domEvents.push(e));
    p.viewComponent.dispatchEvent('foo', {}, false);
    p.viewComponent.dispatchEvent('bar', {}, false);
    expect(domEvents.map((e) => e.type)).to.deep.equal(['foo', 'bar']);
  });

  it('keeps the same ViewComponent and the patch across a namespace change', () => {
    const {p} = mountPK();
    const vc = p.viewComponent;

    p.ns = 'probe-ns';
    expect(p.viewComponent).to.equal(vc);
    expect(Object.hasOwn(vc, 'dispatchEvent')).to.be.true;

    const domEvents = [];
    p.addEventListener('foo', (e) => domEvents.push(e));
    p.viewComponent.dispatchEvent('foo', {}, false);
    expect(domEvents).to.have.lengthOf(1);
  });

  it('an allow-list without entries installs no dispatchEvent patch', () => {
    // the one path on which an empty Set stays in the signal instead of being normalized away by
    // an attribute round-trip — it still behaves like `false`
    const container = mount('<shae-ent token="t"></shae-ent>');
    const el = container.querySelector('shae-ent');
    el.forwardCustomEvents$.set(new Set());
    expect(Object.hasOwn(el.viewComponent, 'dispatchEvent')).to.be.false;

    const domEvents = [];
    el.addEventListener('x', (e) => domEvents.push(e));
    el.viewComponent.dispatchEvent('x', {}, false);
    expect(domEvents).to.have.lengthOf(0);
  });
});
