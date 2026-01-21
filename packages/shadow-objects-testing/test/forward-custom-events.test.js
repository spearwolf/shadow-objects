import {expect} from '@esm-bundle/chai';
import {ComponentContext} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

describe('forward-custom-events', () => {
  beforeEach(async () => {
    render(`
      <shae-worker local no-autostart auto-sync="no" id="localEnv" no-structured-clone></shae-worker>

      <shae-ent id="a" token="a" forward-custom-events></shae-ent>
      <shae-ent id="b" token="b" forward-custom-events="foo"></shae-ent>
      <shae-ent id="c" token="c" forward-custom-events="foo, bar"></shae-ent>
    `);

    await Promise.all(['shae-worker', 'shae-ent'].map((name) => customElements.whenDefined(name)));
  });

  afterEach(() => {
    ComponentContext.get().clear();
    document.getElementById('localEnv').shadowEnv.destroy();
  });

  it('should forward events as CustomEvents', async () => {
    const [a, b, c, localEnv] = findElementsById('a', 'b', 'c', 'localEnv');

    await localEnv.start();

    const eventsA = [];
    const eventsB = [];
    const eventsC = [];

    a.addEventListener('foo', (e) => eventsA.push(e));
    a.addEventListener('bar', (e) => eventsA.push(e));
    a.addEventListener('baz', (e) => eventsA.push(e));

    b.addEventListener('foo', (e) => eventsB.push(e));
    b.addEventListener('bar', (e) => eventsB.push(e));
    b.addEventListener('baz', (e) => eventsB.push(e));

    c.addEventListener('foo', (e) => eventsC.push(e));
    c.addEventListener('bar', (e) => eventsC.push(e));
    c.addEventListener('baz', (e) => eventsC.push(e));

    // Simulate events arriving at the ViewComponent (from Shadow Objects)
    a.viewComponent.dispatchEvent('foo', {val: 'a-foo'}, false);
    a.viewComponent.dispatchEvent('bar', {val: 'a-bar'}, false);
    a.viewComponent.dispatchEvent('baz', {val: 'a-baz'}, false);

    b.viewComponent.dispatchEvent('foo', {val: 'b-foo'}, false);
    b.viewComponent.dispatchEvent('bar', {val: 'b-bar'}, false);
    b.viewComponent.dispatchEvent('baz', {val: 'b-baz'}, false);

    c.viewComponent.dispatchEvent('foo', {val: 'c-foo'}, false);
    c.viewComponent.dispatchEvent('bar', {val: 'c-bar'}, false);
    c.viewComponent.dispatchEvent('baz', {val: 'c-baz'}, false);

    // Events are synchronous when dispatched via dispatchEvent/emit locally?
    // The on(...) subscription is synchronous.
    // The CustomEvent dispatch is synchronous.
    // So we don't need to wait for syncWait() unless there's an async process involved.
    // But let's check.

    // Check A (all events forwarded)
    expect(eventsA).to.have.length(3);
    expect(eventsA[0].type).to.equal('foo');
    expect(eventsA[0].detail).to.deep.equal({val: 'a-foo'});
    expect(eventsA[1].type).to.equal('bar');
    expect(eventsA[1].detail).to.deep.equal({val: 'a-bar'});
    expect(eventsA[2].type).to.equal('baz');
    expect(eventsA[2].detail).to.deep.equal({val: 'a-baz'});

    // Check B (only 'foo' forwarded)
    expect(eventsB).to.have.length(1);
    expect(eventsB[0].type).to.equal('foo');
    expect(eventsB[0].detail).to.deep.equal({val: 'b-foo'});

    // Check C (only 'foo' and 'bar' forwarded)
    expect(eventsC).to.have.length(2);
    expect(eventsC[0].type).to.equal('foo');
    expect(eventsC[0].detail).to.deep.equal({val: 'c-foo'});
    expect(eventsC[1].type).to.equal('bar');
    expect(eventsC[1].detail).to.deep.equal({val: 'c-bar'});
  });
});
